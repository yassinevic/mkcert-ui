
import express, { Request, Response } from 'express';
import cors from 'cors';
import { Database } from 'sqlite3';
import { open } from 'sqlite';
import { MkCert } from './mkcert';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import archiver from 'archiver';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../public')));
}

// Database setup
let db: any;

(async () => {
    console.log('Server CWD:', process.cwd());
    const dbPath = process.env.DB_PATH || path.resolve(process.cwd(), 'database.sqlite');

    // Ensure the directory for the database exists
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
    }

    console.log('Using DB at:', dbPath);

    db = await open({
        filename: dbPath,
        driver: Database
    });

    await db.exec(`
    CREATE TABLE IF NOT EXISTS certificates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      domains TEXT,
      created_at TEXT,
      expires_at TEXT,
      status TEXT,
      path_cert TEXT,
      path_key TEXT
    );
  `);

    // Settings table
    await db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

    // Default settings
    const certPath = await db.get('SELECT value FROM settings WHERE key = ?', 'cert_path');
    if (!certPath) {
        // Use environment variable if provided, otherwise default to a 'certs' folder
        const defaultCertPath = process.env.CERT_PATH || path.resolve(__dirname, '../certs');
        if (!fs.existsSync(defaultCertPath)) {
            fs.mkdirSync(defaultCertPath, { recursive: true });
        }
        await db.run('INSERT INTO settings (key, value) VALUES (?, ?)', 'cert_path', defaultCertPath);
    }

    console.log('Database initialized');
})();

const mkcert = new MkCert();

// Routes

// Get Status (mkcert installation)
app.get('/api/status', async (req: Request, res: Response) => {
    const mkcertVersion = await mkcert.getVersion();
    const rootCA = await mkcert.getCARoot();
    const isTrusted = await mkcert.isCATrusted();
    const certPath = await db.get('SELECT value FROM settings WHERE key = ?', 'cert_path');

    res.json({
        mkcert_version: mkcertVersion,
        root_ca: rootCA,
        cert_path: certPath ? certPath.value : '',
        installed: isTrusted
    });
});

// Install Root CA
app.post('/api/install-ca', async (req: Request, res: Response) => {
    try {
        const output = await mkcert.installCA();
        res.json({ success: true, output });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Uninstall Root CA
app.post('/api/uninstall-ca', async (req: Request, res: Response) => {
    try {
        const output = await mkcert.uninstallCA();
        res.json({ success: true, output });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Download Root CA Cert
app.get('/api/ca-download', async (req: Request, res: Response) => {
    try {
        const rootCAPath = await mkcert.getCARoot();
        if (!rootCAPath) return res.status(404).json({ error: 'Root CA path not found' });

        const certFile = path.join(rootCAPath, 'rootCA.pem');
        if (!fs.existsSync(certFile)) {
            return res.status(404).json({ error: 'Root CA file not found' });
        }

        res.download(certFile, 'rootCA.pem');
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// List Certificates
app.get('/api/certificates', async (req: Request, res: Response) => {
    try {
        const certs = await db.all('SELECT * FROM certificates');

        // Self-healing: Check for missing expiry dates and update them if possible
        for (const cert of certs) {
            if (!cert.expires_at || cert.expires_at === 'Unknown' || cert.expires_at === null) {
                if (fs.existsSync(cert.path_cert)) {
                    // Try to update expiry
                    const expiry = await mkcert.getCertExpiry(cert.path_cert);
                    if (expiry) {
                        await db.run('UPDATE certificates SET expires_at = ? WHERE id = ?', expiry, cert.id);
                        cert.expires_at = expiry;
                    }
                }
            }
        }

        res.json(certs);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Create Certificate
app.post('/api/certificates', async (req: Request, res: Response) => {
    const { domains, name } = req.body; // domains is array of strings
    if (!domains || !Array.isArray(domains) || domains.length === 0) {
        return res.status(400).json({ error: 'Invalid domains' });
    }

    try {
        // Check mkcert installation first
        const version = await mkcert.getVersion();
        if (!version) {
            return res.status(500).json({ error: 'mkcert is not installed or not found in PATH' });
        }

        const certPathSetting = await db.get('SELECT value FROM settings WHERE key = ?', 'cert_path');
        const storagePath = certPathSetting ? certPathSetting.value : path.resolve(__dirname, '../certs');

        // Generate cert
        const result = await mkcert.createCert(domains, storagePath, name);

        const expiryDate = await mkcert.getCertExpiry(result.certPath);

        const now = new Date().toISOString();

        await db.run(
            `INSERT INTO certificates (name, domains, created_at, expires_at, status, path_cert, path_key) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            name || domains[0],
            JSON.stringify(domains),
            now,
            expiryDate, // potentially null
            'Valid',
            result.certPath,
            result.keyPath
        );

        res.json({ success: true, cert: result });
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// Download Certificate Zip
app.get('/api/certificates/:id/download', async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const cert = await db.get('SELECT * FROM certificates WHERE id = ?', id);
        if (!cert) return res.status(404).json({ error: 'Not found' });

        if (!fs.existsSync(cert.path_cert) || !fs.existsSync(cert.path_key)) {
            return res.status(404).json({ error: 'Certificate files missing on disk' });
        }

        const zipName = `${cert.name.replace(/[^a-z0-9]/gi, '_')}_cert.zip`;

        // Set headers
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${zipName}"`);

        const archive = archiver('zip', {
            zlib: { level: 9 }
        });

        archive.on('error', (err) => {
            console.error('Archive error:', err);
            res.status(500).send({ error: err.message });
        });

        // Pipe archive data to the response
        archive.pipe(res);

        // Append files
        archive.file(cert.path_cert, { name: path.basename(cert.path_cert) });
        archive.file(cert.path_key, { name: path.basename(cert.path_key) });

        // Finalize the archive
        await archive.finalize();
    } catch (error: any) {
        console.error('Download error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Renew Certificate
app.post('/api/certificates/:id/renew', async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const cert = await db.get('SELECT * FROM certificates WHERE id = ?', id);
        if (!cert) return res.status(404).json({ error: 'Not found' });

        const domains = JSON.parse(cert.domains);
        const outputDir = path.dirname(cert.path_cert);

        // Re-create the certificate with same domains
        const result = await mkcert.createCert(domains, outputDir, cert.name);
        const expiryDate = await mkcert.getCertExpiry(result.certPath);

        await db.run(
            'UPDATE certificates SET expires_at = ? WHERE id = ?',
            expiryDate,
            id
        );

        res.json({ success: true, expires_at: expiryDate });
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// Delete Certificate
app.delete('/api/certificates/:id', async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const cert = await db.get('SELECT * FROM certificates WHERE id = ?', id);
        if (!cert) return res.status(404).json({ error: 'Not found' });

        // Delete files
        if (fs.existsSync(cert.path_cert)) fs.unlinkSync(cert.path_cert);
        if (fs.existsSync(cert.path_key)) fs.unlinkSync(cert.path_key);

        await db.run('DELETE FROM certificates WHERE id = ?', id);
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});


// Basic catch-all for SPA (serve index.html for any unknown route)
if (process.env.NODE_ENV === 'production') {
    app.get('*', (req: Request, res: Response) => {
        // Don't intercept API calls if they somehow fall through (though they are defined before)
        if (req.path.startsWith('/api')) {
            return res.status(404).json({ error: 'Not found' });
        }
        res.sendFile(path.join(__dirname, '../public/index.html'));
    });
}

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
