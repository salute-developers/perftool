#!/usr/bin/env sh

set -e

case "$(uname -s)" in
  Darwin*)
    TRAVERSED_LINK=$(readlink $0 || true)

    if [ -z "${TRAVERSED_LINK}" ]; then
      TRAVERSED_LINK="start.sh"
    fi

    SCRIPT_PATH="$(dirname "$0")/$TRAVERSED_LINK"
    ;;
  *)          SCRIPT_PATH="$(readlink -f "$0")";;
esac

PROJECT_DIR="$(dirname "$SCRIPT_PATH")/.."
TS_NODE_ESM_PATH=$(cd "$PROJECT_DIR" && node -e "console.log(require.resolve('ts-node/esm'))")
OPTS="--loader $TS_NODE_ESM_PATH --experimental-specifier-resolution=node"

if [ -z "$PERFTOOL_DEBUG" ]; then
  OPTS="$OPTS --no-warnings"
fi

NODE_OPTIONS=$OPTS TS_NODE_PROJECT="$PROJECT_DIR/tsconfig.json" TS_NODE_FILES=true node "$PROJECT_DIR/src/index.ts" "$@"
