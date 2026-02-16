#!/usr/bin/env bash
set -euo pipefail

if [ ! -f "./rootCA.pem" ]; then
  echo "rootCA.pem not found in current directory." >&2
  exit 1
fi

echo "Installing rootCA.pem into system trust store (requires sudo)..."
sudo cp "./rootCA.pem" /usr/local/share/ca-certificates/mkcert-rootCA.crt
sudo update-ca-certificates
echo "Done. You may need to restart browsers."
