#!/usr/bin/env bash
set -euo pipefail
echo 'Error: CI owns release tags; merge the reviewed release PR into main and follow the Release tag workflow.' >&2
exit 1
