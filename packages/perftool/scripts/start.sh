#!/usr/bin/env sh

set -e

PROJECT_DIR="$(dirname "$0")/.."
OPTS="--experimental-specifier-resolution=node"

if [ -z "$PERFTOOL_DEBUG" ]; then
  OPTS="$OPTS --no-warnings"
  set -x
fi

NODE_OPTIONS=$OPTS "$PROJECT_DIR/node_modules/.bin/ts-node-esm" --project "$PROJECT_DIR/tsconfig.json" --files "$PROJECT_DIR/src/index.ts" "$@"
