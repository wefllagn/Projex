#!/usr/bin/env bash
# Run as your ordinary Ubuntu build user, never root. Creates a new immutable artifact.
set -euo pipefail
[[ $(uname -s) == Linux && $EUID -ne 0 ]] || { echo 'Run on Ubuntu as a non-root build user' >&2; exit 1; }
source_tree=$(realpath "${1:?Source checkout required}")
expected=${2:?Expected full commit SHA required}
[[ $expected =~ ^[a-f0-9]{40}$ ]] || exit 1
[[ $(git -C "$source_tree" rev-parse HEAD) == "$expected" && -z $(git -C "$source_tree" status --porcelain) ]] || { echo 'Source must be clean at the exact release commit' >&2; exit 1; }
[[ $(node -p 'process.versions.node.split(".")[0]') == 24 ]] || { echo 'Node 24 required' >&2; exit 1; }
artifact="${PWD}/origin-release-${expected}.tar.gz"
[[ ! -e $artifact ]] || { echo 'Output already exists; retained' >&2; exit 1; }
work=$(mktemp -d)
# Keep failed builds for inspection; no broad cleanup.
git -C "$source_tree" archive "$expected" | tar -x -C "$work"
cd "$work/server"
npm ci
DATABASE_URL=postgresql://build_only@127.0.0.1:5432/build_only npx --no-install prisma generate
DATABASE_URL=postgresql://build_only@127.0.0.1:5432/build_only npx --no-install prisma validate
npm run type-check
npm run build
cd "$work/client"
npm ci
VITE_API_BASE_URL=/api/v1 npm run build
cd "$work"
node --input-type=module - "$expected" <<'JS'
import fs from 'node:fs';
fs.writeFileSync('release.json', JSON.stringify({commit:process.argv[2],nodeMajor:24,nodeVersion:process.version,platform:process.platform,arch:process.arch,builtAt:new Date().toISOString(),migrations:fs.readdirSync('server/prisma/migrations').filter(n=>/^\d/.test(n)).sort()},null,2)+'\n');
JS
# Hash the whole artifact, including dependencies and generated client. Do not ship private .env files.
[[ -z $(find . -name .env -o -name '*.key' -o -name '*.pem') ]] || { echo 'Unexpected private configuration in artifact' >&2; exit 1; }
find . -type f ! -name SHA256SUMS -print0 | sort -z | xargs -0 sha256sum > SHA256SUMS
tar -czf "$artifact" .
sha256sum "$artifact"
printf 'Build directory retained: %s\nArtifact: %s\n' "$work" "$artifact"
