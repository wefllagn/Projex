#!/bin/sh
set -eu

require_value() {
  value=$(printenv "$1" 2>/dev/null || true)
  if [ -z "$value" ]; then
    printf '%s\n' "$1 is required." >&2
    exit 1
  fi
}

require_value PROJEX_SOURCE_ROOT
require_value PROJEX_RELEASES_ROOT

if [ "$(uname -s)" != "Linux" ]; then
  printf '%s\n' 'Release preparation must run on the target Linux environment.' >&2
  exit 1
fi

source_root=$(realpath "$PROJEX_SOURCE_ROOT")
releases_root=$(realpath -m "$PROJEX_RELEASES_ROOT")
if [ "$releases_root" = "/" ]; then
  printf '%s\n' 'The releases root is too broad.' >&2
  exit 1
fi
case "$releases_root/" in
  "$source_root/"*)
    printf '%s\n' 'The releases root must not be inside the source checkout.' >&2
    exit 1
    ;;
esac
case "$source_root/" in
  "$releases_root/"*)
    printf '%s\n' 'The source checkout must not be inside the releases root.' >&2
    exit 1
    ;;
esac

git -C "$source_root" diff --quiet --
git -C "$source_root" diff --cached --quiet --
if [ -n "$(git -C "$source_root" ls-files --others --exclude-standard)" ]; then
  printf '%s\n' 'The source checkout contains untracked files.' >&2
  exit 1
fi

commit=$(git -C "$source_root" rev-parse HEAD)
case "$commit" in
  *[!0-9a-f]*|'')
    printf '%s\n' 'The source commit is invalid.' >&2
    exit 1
    ;;
esac

mkdir -p "$releases_root"
release_root="$releases_root/$commit"
if [ -e "$release_root" ]; then
  printf '%s\n' 'The commit-addressed release already exists.' >&2
  exit 1
fi

staging=$(mktemp -d "$releases_root/.projex-release-$commit-XXXXXX")
marker="$staging/.projex-release-work"
printf '%s\n' "$commit" > "$marker"
cleanup() {
  if [ -f "$marker" ] && [ "$(cat "$marker")" = "$commit" ]; then
    rm -rf -- "$staging"
  fi
}
trap cleanup EXIT HUP INT TERM

mkdir "$staging/source"
source_archive="$staging/source.tar"
git -C "$source_root" archive --format=tar --output="$source_archive" "$commit"
tar -xf "$source_archive" -C "$staging/source"
rm -f -- "$source_archive"

(
  cd "$staging/source/server"
  npm ci
  npm run prisma:generate
  npx --no-install prisma validate
  npm run build
)
(
  cd "$staging/source/client"
  npm ci
  npm run build
)

mkdir -p "$staging/release/server" "$staging/release/client" "$staging/release/deploy"
cp -R "$staging/source/server/dist" "$staging/source/server/node_modules" "$staging/source/server/prisma" "$staging/release/server/"
cp "$staging/source/server/package.json" "$staging/source/server/package-lock.json" "$staging/release/server/"
cp -R "$staging/source/client/dist/." "$staging/release/client/"
cp -R "$staging/source/deploy/." "$staging/release/deploy/"
printf '{"applicationCommit":"%s","builtOn":"linux"}\n' "$commit" > "$staging/release/release.json"

mv "$staging/release" "$release_root"
rm -f "$marker"
rm -rf -- "$staging"
trap - EXIT HUP INT TERM
printf '%s\n' "Prepared release $commit."
