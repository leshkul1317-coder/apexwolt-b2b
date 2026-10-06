#!/usr/bin/env bash
set -euo pipefail

if ! pgrep -f "python3 -m http.server 4173" >/dev/null 2>&1; then
  nohup python3 -m http.server 4173 --bind 0.0.0.0 --directory dist \
    >/tmp/apexwolt-preview.log 2>&1 </dev/null &
fi

echo "APEXWOLT preview: open forwarded port 4173 in the PORTS panel."
