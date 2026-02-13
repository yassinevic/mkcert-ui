# Modern mkcert Management UI

A clean, modern web application that acts as a UI wrapper around the mkcert CLI tool.
Allows you to manage local development certificates easily without using the command line.

## Features

- **Dashboard**: Overview of your certificates and expiry status.
- **Certificates**: Create, List, Delete certificates.
- **Settings**: Manage mkcert installation and Root CA.
- **Docker Support**: "Homelab friendly" single container deployment.

## Tech Stack

- **Frontend**: React + Vite + TypeScript (Vanilla CSS / Glassmorphism Design)
- **Backend**: Node.js + Express + SQLite
- **Tools**: mkcert (bundled in Docker)

## Getting Started

### Local Development

Prerequisites:

- Node.js (v18+)
- mkcert (installed on your system and in PATH)

1. **Backend**:

   ```bash
   cd backend
   npm install
   npm run dev
   ```

2. **Frontend**:

   ```bash
   cd frontend
   npm install
   npm run dev
   ```

3. Open `http://localhost:5173`.

### Docker

Running with Docker Compose (recommended for production/homelab):

```bash
docker-compose up --build
```

Access the app at `http://localhost:3000`.

### Docker Hub

The application is containerized and can be published to Docker Hub in multiple ways:

#### 1. Manual Publishing

**On Linux/Mac:**
```bash
./publish.sh your-dockerhub-username [tag]
```

**On Windows (PowerShell):**
```powershell
.\publish.ps1 -Username your-dockerhub-username [-TagName latest]
```

#### 2. Automated Publishing via GitHub Actions

A GitHub Actions workflow is included in `.github/workflows/docker-publish.yml` that automatically builds and pushes multi-platform Docker images (amd64, arm64) to Docker Hub.

**Setup:**
1. Go to your GitHub repository settings
2. Navigate to Secrets and Variables → Actions
3. Add the following secrets:
   - `DOCKERHUB_USERNAME`: Your Docker Hub username
   - `DOCKERHUB_TOKEN`: Your Docker Hub access token (create one at https://hub.docker.com/settings/security)

**Triggers:**
- **Push to main branch**: Builds and pushes with `latest` and `main-<sha>` tags
- **Version tags**: Pushing a tag like `v1.0.0` creates multiple tags:
  - `1.0.0` (full version)
  - `1.0` (major.minor)
  - `1` (major only)
  - `latest` (if on default branch)
- **Manual trigger**: You can also trigger the workflow manually from the Actions tab

#### 3. Pull from Docker Hub

Once published, users can pull your image:
```bash
docker pull your-dockerhub-username/mkcert-ui:latest
docker run -d -p 3000:3000 -v $(pwd)/certs:/app/backend/certs -v $(pwd)/data:/app/backend/data your-dockerhub-username/mkcert-ui:latest
```

## Configuration

- Certificates are stored in `./certs` (mapped volume).
- Database is stored in `./data`.

## License

MIT
