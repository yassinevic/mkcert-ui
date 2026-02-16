#!/usr/bin/env bash
set -euo pipefail

echo "Adding rootCA.pem to the macOS System keychain (requires sudo)..."
sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain "./rootCA.pem"
echo "Done. You may need to restart browsers."
