param (
    [string]$Username = "",
    [string]$TagName = "latest"
)

if ($Username -eq "") {
    Write-Host "Please provide your Docker Hub username." -ForegroundColor Red
    Write-Host "Usage: .\publish.ps1 -Username yourusername [-TagName latest]"
    exit
}

$ImageName = "$Username/mkcert-ui"
$FullImageTag = "$ImageName`:$TagName"

Write-Host "Building Docker image: $FullImageTag..." -ForegroundColor Cyan
docker build -t "$FullImageTag" .

if ($LASTEXITCODE -ne 0) {
    Write-Host "Docker build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "Logging into Docker Hub..." -ForegroundColor Cyan
docker login

if ($LASTEXITCODE -ne 0) {
    Write-Host "Docker login failed!" -ForegroundColor Red
    exit 1
}

Write-Host "Pushing image to Docker Hub..." -ForegroundColor Cyan
docker push "$FullImageTag"

if ($LASTEXITCODE -ne 0) {
    Write-Host "Docker push failed!" -ForegroundColor Red
    exit 1
}

Write-Host "Image successfully published to Docker Hub: $FullImageTag" -ForegroundColor Green
