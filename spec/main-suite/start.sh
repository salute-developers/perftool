#!/usr/bin/env sh

set -ex

REPO_ROOT="$(dirname "$0")/../.."

cd "$REPO_ROOT/packages/perftool"

pnpm pack
mv *.tgz ../../spec/main-suite/perftool.tgz

cd "$REPO_ROOT/spec/main-suite"

REACT_INSTALL_ARG=""
REACT_DOM_INSTALL_ARG=""
TYPESCRIPT_INSTALL_ARG=""

if [ -n "$REACT_VERSION" ]; then
  REACT_INSTALL_ARG="react@$REACT_VERSION"
  REACT_DOM_INSTALL_ARG="react-dom@$REACT_VERSION"
fi

if [ -n "$TYPESCRIPT_VERSION" ]; then
  TYPESCRIPT_INSTALL_ARG="typescript@$TYPESCRIPT_VERSION"
fi

pnpm add ./perftool.tgz "$REACT_INSTALL_ARG" "$REACT_DOM_INSTALL_ARG" "$TYPESCRIPT_INSTALL_ARG"
