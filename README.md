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

The application is containerized and can be published to Docker Hub.

1. **Publish Locally (Windows)**:
   Use the provided PowerShell script:
   ```powershell
   .\publish.ps1 -Username your-dockerhub-username
   ```

2. **Automated Publish**:
   A GitHub Action is included in `.github/workflows/docker-publish.yml`. To use it:
   - Add `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN` to your GitHub repository secrets.
   - Pushes to the `main` branch or tagging a release (e.g., `v1.0.0`) will trigger a build and push.

## Configuration

- Certificates are stored in `./certs` (mapped volume).
- Database is stored in `./data`.

## License

MIT
