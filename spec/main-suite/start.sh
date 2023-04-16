#!/usr/bin/env sh

set -ex

REPO_ROOT="$(dirname "$0")/../.."

cd "$REPO_ROOT/packages/perftool"

pnpm pack
mv *.tgz ../../spec/main-suite/perftool.tgz

cd "$REPO_ROOT/spec/main-suite"
pnpm add ./perftool.tgz

if [ -n "$REACT_VERSION" ]; then
  pnpm add "react@$REACT_VERSION" "react-dom@$REACT_VERSION"
fi
