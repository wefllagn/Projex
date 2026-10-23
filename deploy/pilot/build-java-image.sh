#!/usr/bin/env bash
set -euo pipefail
[[ $(uname -s) == Linux ]] || { echo 'Linux Docker host required' >&2; exit 1; }
[[ ${1:-} =~ ^eclipse-temurin:17-jdk-jammy@sha256:[a-f0-9]{64}$ ]] || { echo 'Usage: build-java-image.sh eclipse-temurin:17-jdk-jammy@sha256:<verified digest>' >&2; exit 1; }
# No application tree, credentials, socket or environment are in the build context.
context=$(mktemp -d)
trap 'rm -f "$context/Dockerfile"; rmdir "$context"' EXIT
cp "$(dirname "$0")/Java.Dockerfile" "$context/Dockerfile"
docker build --pull=false --build-arg "JAVA_BASE=$1" --tag origin-java:pilot "$context"
docker image inspect --format '{{.Id}}' origin-java:pilot
