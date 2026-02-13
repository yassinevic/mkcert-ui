#!/bin/bash

# Docker Hub publishing script for mkcert-ui
# Usage: ./publish.sh <dockerhub-username> [tag]

set -e

USERNAME="${1:-}"
TAG_NAME="${2:-latest}"

if [ -z "$USERNAME" ]; then
    echo "❌ Please provide your Docker Hub username."
    echo "Usage: ./publish.sh <dockerhub-username> [tag]"
    echo "Example: ./publish.sh myusername latest"
    exit 1
fi

IMAGE_NAME="$USERNAME/mkcert-ui"
FULL_IMAGE_TAG="$IMAGE_NAME:$TAG_NAME"

echo "🔨 Building Docker image: $FULL_IMAGE_TAG..."
docker build -t "$FULL_IMAGE_TAG" .

if [ $? -ne 0 ]; then
    echo "❌ Docker build failed!"
    exit 1
fi

echo "🔐 Logging into Docker Hub..."
docker login

if [ $? -ne 0 ]; then
    echo "❌ Docker login failed!"
    exit 1
fi

echo "📤 Pushing image to Docker Hub..."
docker push "$FULL_IMAGE_TAG"

if [ $? -ne 0 ]; then
    echo "❌ Docker push failed!"
    exit 1
fi

echo "✅ Image successfully published to Docker Hub: $FULL_IMAGE_TAG"
