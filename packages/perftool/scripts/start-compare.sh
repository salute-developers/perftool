#!/usr/bin/env sh

set -e

if [ -n "$PERFTOOL_DEBUG" ]; then
  set -x
fi

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

CWD=$(pwd)
PROJECT_DIR="$(dirname "$SCRIPT_PATH")/.."
TS_NODE_ESM_PATH=$(cd "$PROJECT_DIR" && node -p "require.resolve('ts-node/esm')")
OPTS="--loader $TS_NODE_ESM_PATH --experimental-specifier-resolution=node"

if [ -z "$PERFTOOL_DEBUG" ]; then
  OPTS="$OPTS --no-warnings"
fi

cd "$PROJECT_DIR" && \
 PERFTOOL_CWD=$CWD NODE_OPTIONS=$OPTS TS_NODE_FILES=true node lib/bin/compare.ts "$@"
