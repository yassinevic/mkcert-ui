# Install mkcert Root CA for current user (Windows)
# Requires PowerShell. Run as the target user.

Write-Host "Importing rootCA.pem into CurrentUser\\Root..." -ForegroundColor Cyan
Import-Certificate -FilePath "./rootCA.pem" -CertStoreLocation "Cert:\\CurrentUser\\Root" | Out-Null
Write-Host "Done. You may need to restart browsers." -ForegroundColor Green
