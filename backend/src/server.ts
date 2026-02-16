
import express, { Request, Response } from 'express';
import cors from 'cors';
import { Database } from 'sqlite3';
import { open } from 'sqlite';
import { MkCert } from './mkcert';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import archiver from 'archiver';
import { logger } from './logger';
import { requestIdMiddleware, requestLoggingMiddleware } from './middleware/logging';

const app = express();
const PORT = process.env.PORT || 3001;

// Log startup information
logger.info('='.repeat(60));
logger.info('Starting mkcert-ui server');
logger.info('='.repeat(60));
logger.info('Node.js version', { version: process.version });
logger.info('Environment configuration', {
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: PORT,
    CERT_PATH: process.env.CERT_PATH || '(using default)',
    DB_PATH: process.env.DB_PATH || '(using default)',
    LOG_LEVEL: process.env.LOG_LEVEL || 'INFO',
    CWD: process.cwd()
});

// Add logging middleware
app.use(requestIdMiddleware);
app.use(requestLoggingMiddleware);

app.use(cors());
app.use(express.json());

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
    const publicPath = path.join(__dirname, '../public');
    logger.info('Serving static files in production mode', { publicPath });
    app.use(express.static(publicPath));
}

// Database setup
let db: any;

(async () => {
    try {
        logger.info('Initializing database');
        logger.debug('Server CWD', { cwd: process.cwd() });

        const dbPath = process.env.DB_PATH || path.resolve(process.cwd(), 'database.sqlite');
        logger.info('Database path configured', { dbPath });

        // Ensure the directory for the database exists
        const dbDir = path.dirname(dbPath);
        if (!fs.existsSync(dbDir)) {
            logger.info('Creating database directory', { dbDir });
            fs.mkdirSync(dbDir, { recursive: true });
        }

        logger.info('Opening database connection', { dbPath });
        db = await open({
            filename: dbPath,
            driver: Database
        });
        logger.info('Database connection established successfully');

        logger.debug('Creating certificates table if not exists');
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
        logger.debug('Certificates table ready');

        // Settings table
        logger.debug('Creating settings table if not exists');
        await db.exec(`
        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT
        );
      `);
        logger.debug('Settings table ready');

        // Default settings
        logger.debug('Checking for default settings');
        const certPath = await db.get('SELECT value FROM settings WHERE key = ?', 'cert_path');
        if (!certPath) {
            // Use environment variable if provided, otherwise default to a 'certs' folder
            const defaultCertPath = process.env.CERT_PATH || path.resolve(__dirname, '../certs');
            logger.info('Setting default certificate path', { defaultCertPath });

            if (!fs.existsSync(defaultCertPath)) {
                logger.debug('Creating certificate storage directory', { defaultCertPath });
                fs.mkdirSync(defaultCertPath, { recursive: true });
            }

            await db.run('INSERT INTO settings (key, value) VALUES (?, ?)', 'cert_path', defaultCertPath);
            logger.info('Default certificate path configured', { certPath: defaultCertPath });
        } else {
            logger.info('Using existing certificate path from database', { certPath: certPath.value });
        }

        logger.info('Database initialized successfully');
    } catch (error) {
        logger.error('Failed to initialize database', error);
        throw error;
    }
})();

const mkcert = new MkCert();

// Check mkcert installation on startup
(async () => {
    try {
        const version = await mkcert.getVersion();
        if (version) {
            logger.info('mkcert installation verified on startup', { version });
        } else {
            logger.warn('mkcert is not installed or not found in PATH - certificate operations will fail');
        }
    } catch (error) {
        logger.error('Error checking mkcert installation on startup', error);
    }
})();

// Routes

// Get Status (mkcert installation)
app.get('/api/status', async (req: Request, res: Response) => {
    try {
        const mkcertVersion = await mkcert.getVersion();
        const rootCA = await mkcert.getCARoot();
        const isTrusted = await mkcert.isCATrusted();
        const certPath = await db.get('SELECT value FROM settings WHERE key = ?', 'cert_path');

        const statusInfo = {
            mkcert_version: mkcertVersion,
            root_ca: rootCA,
            cert_path: certPath ? certPath.value : '',
            installed: isTrusted
        };

        logger.debug('Status check completed', statusInfo);
        res.json(statusInfo);
    } catch (error: any) {
        logger.error('Error in /api/status endpoint', {
            error: error.message,
            stack: error.stack,
            requestId: req.requestId
        });
        res.status(500).json({ error: 'Failed to get status', details: error.message });
    }
});

// Install Root CA
app.post('/api/install-ca', async (req: Request, res: Response) => {
    try {
        logger.info('CA installation requested', { requestId: req.requestId });
        const output = await mkcert.installCA();
        logger.info('CA installation completed successfully');
        res.json({ success: true, output });
    } catch (error: any) {
        logger.error('Error in /api/install-ca endpoint', {
            error: error.message,
            stack: error.stack,
            requestId: req.requestId
        });
        res.status(500).json({ success: false, error: error.message });
    }
});

// Uninstall Root CA
app.post('/api/uninstall-ca', async (req: Request, res: Response) => {
    try {
        logger.info('CA uninstallation requested', { requestId: req.requestId });
        const output = await mkcert.uninstallCA();
        logger.info('CA uninstallation completed successfully');
        res.json({ success: true, output });
    } catch (error: any) {
        logger.error('Error in /api/uninstall-ca endpoint', {
            error: error.message,
            stack: error.stack,
            requestId: req.requestId
        });
        res.status(500).json({ success: false, error: error.message });
    }
});

// Download Root CA Cert
app.get('/api/ca-download', async (req: Request, res: Response) => {
    try {
        logger.info('Root CA download requested', { requestId: req.requestId });
        const rootCAPath = await mkcert.getCARoot();
        if (!rootCAPath) {
            logger.warn('Root CA path not found');
            return res.status(404).json({ error: 'Root CA path not found' });
        }

        const certFile = path.join(rootCAPath, 'rootCA.pem');
        logger.debug('Checking for root CA file', { certFile });

        if (!fs.existsSync(certFile)) {
            logger.warn('Root CA file does not exist', { certFile });
            return res.status(404).json({ error: 'Root CA file not found' });
        }

        logger.info('Sending root CA file for download', { certFile });
        res.download(certFile, 'rootCA.pem');
    } catch (error: any) {
        logger.error('Error in /api/ca-download endpoint', {
            error: error.message,
            stack: error.stack,
            requestId: req.requestId
        });
        res.status(500).json({ error: error.message });
    }
});

// List Certificates
app.get('/api/certificates', async (req: Request, res: Response) => {
    try {
        logger.debug('Fetching all certificates from database');
        const certs = await db.all('SELECT * FROM certificates');
        logger.debug('Retrieved certificates from database', { count: certs.length });

        // Self-healing: Check for missing expiry dates and update them if possible
        let updatedCount = 0;
        for (const cert of certs) {
            if (!cert.expires_at || cert.expires_at === 'Unknown' || cert.expires_at === null) {
                logger.debug('Certificate missing expiry date, attempting to update', {
                    certId: cert.id,
                    certPath: cert.path_cert
                });

                if (fs.existsSync(cert.path_cert)) {
                    // Try to update expiry
                    const expiry = await mkcert.getCertExpiry(cert.path_cert);
                    if (expiry) {
                        await db.run('UPDATE certificates SET expires_at = ? WHERE id = ?', expiry, cert.id);
                        cert.expires_at = expiry;
                        updatedCount++;
                        logger.info('Updated certificate expiry date', { certId: cert.id, expiry });
                    }
                } else {
                    logger.warn('Certificate file not found on disk', {
                        certId: cert.id,
                        certPath: cert.path_cert
                    });
                }
            }
        }

        if (updatedCount > 0) {
            logger.info('Self-healing completed: updated expiry dates', { updatedCount });
        }

        res.json(certs);
    } catch (error: any) {
        logger.error('Error in GET /api/certificates endpoint', {
            error: error.message,
            stack: error.stack,
            requestId: req.requestId
        });
        res.status(500).json({ error: error.message });
    }
});

// Create Certificate
app.post('/api/certificates', async (req: Request, res: Response) => {
    const { domains, name } = req.body; // domains is array of strings

    logger.info('Certificate creation requested', {
        domains,
        name,
        requestId: req.requestId
    });

    if (!domains || !Array.isArray(domains) || domains.length === 0) {
        logger.warn('Invalid domains provided for certificate creation', {
            domains,
            requestId: req.requestId
        });
        return res.status(400).json({ error: 'Invalid domains' });
    }

    try {
        // Check mkcert installation first
        logger.debug('Verifying mkcert installation');
        const version = await mkcert.getVersion();
        if (!version) {
            logger.error('mkcert is not installed or not found in PATH');
            return res.status(500).json({ error: 'mkcert is not installed or not found in PATH' });
        }

        logger.debug('Fetching certificate storage path from database');
        const certPathSetting = await db.get('SELECT value FROM settings WHERE key = ?', 'cert_path');
        const storagePath = certPathSetting ? certPathSetting.value : path.resolve(__dirname, '../certs');
        logger.debug('Using certificate storage path', { storagePath });

        // Generate cert
        logger.info('Starting certificate generation', { domains, storagePath, name });
        const result = await mkcert.createCert(domains, storagePath, name);
        logger.info('Certificate files generated successfully', result);

        logger.debug('Parsing certificate expiry date');
        const expiryDate = await mkcert.getCertExpiry(result.certPath);

        const now = new Date().toISOString();

        logger.debug('Saving certificate to database', {
            name: name || domains[0],
            domains,
            expiryDate
        });

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

        logger.info('Certificate created and saved successfully', {
            name: name || domains[0],
            certPath: result.certPath
        });

        res.json({ success: true, cert: result });
    } catch (error: any) {
        logger.error('Error in POST /api/certificates endpoint', {
            domains,
            name,
            error: error.message,
            stack: error.stack,
            requestId: req.requestId
        });
        res.status(500).json({ error: error.message });
    }
});

// Download Certificate Zip
app.get('/api/certificates/:id/download', async (req: Request, res: Response) => {
    const { id } = req.params;

    logger.info('Certificate download requested', {
        certId: id,
        requestId: req.requestId
    });

    try {
        logger.debug('Fetching certificate from database', { certId: id });
        const cert = await db.get('SELECT * FROM certificates WHERE id = ?', id);

        if (!cert) {
            logger.warn('Certificate not found in database', { certId: id });
            return res.status(404).json({ error: 'Not found' });
        }

        logger.debug('Verifying certificate files exist on disk', {
            certPath: cert.path_cert,
            keyPath: cert.path_key
        });

        if (!fs.existsSync(cert.path_cert) || !fs.existsSync(cert.path_key)) {
            logger.error('Certificate files missing on disk', {
                certId: id,
                certPath: cert.path_cert,
                keyPath: cert.path_key,
                certExists: fs.existsSync(cert.path_cert),
                keyExists: fs.existsSync(cert.path_key)
            });
            return res.status(404).json({ error: 'Certificate files missing on disk' });
        }

        const zipName = `${cert.name.replace(/[^a-z0-9]/gi, '_')}_cert.zip`;
        logger.debug('Creating zip archive for download', { zipName });

        // Set headers
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${zipName}"`);

        const archive = archiver('zip', {
            zlib: { level: 9 }
        });

        archive.on('error', (err) => {
            logger.error('Archive error during certificate download', {
                certId: id,
                error: err.message,
                stack: err.stack
            });
            res.status(500).send({ error: err.message });
        });

        // Pipe archive data to the response
        archive.pipe(res);

        // Append files
        logger.debug('Adding files to archive', {
            certFile: path.basename(cert.path_cert),
            keyFile: path.basename(cert.path_key)
        });

        archive.file(cert.path_cert, { name: path.basename(cert.path_cert) });
        archive.file(cert.path_key, { name: path.basename(cert.path_key) });

        // Finalize the archive
        await archive.finalize();
        logger.info('Certificate download completed successfully', {
            certId: id,
            zipName
        });
    } catch (error: any) {
        logger.error('Error in GET /api/certificates/:id/download endpoint', {
            certId: id,
            error: error.message,
            stack: error.stack,
            requestId: req.requestId
        });
        res.status(500).json({ error: error.message });
    }
});

// Renew Certificate
app.post('/api/certificates/:id/renew', async (req: Request, res: Response) => {
    const { id } = req.params;

    logger.info('Certificate renewal requested', {
        certId: id,
        requestId: req.requestId
    });

    try {
        logger.debug('Fetching certificate from database', { certId: id });
        const cert = await db.get('SELECT * FROM certificates WHERE id = ?', id);

        if (!cert) {
            logger.warn('Certificate not found in database', { certId: id });
            return res.status(404).json({ error: 'Not found' });
        }

        const domains = JSON.parse(cert.domains);
        const outputDir = path.dirname(cert.path_cert);

        logger.info('Starting certificate renewal', {
            certId: id,
            certName: cert.name,
            domains,
            outputDir
        });

        // Re-create the certificate with same domains
        const result = await mkcert.createCert(domains, outputDir, cert.name);
        logger.info('Certificate renewed successfully', {
            certId: id,
            certPath: result.certPath
        });

        logger.debug('Parsing renewed certificate expiry date');
        const expiryDate = await mkcert.getCertExpiry(result.certPath);

        logger.debug('Updating certificate expiry in database', { certId: id, expiryDate });
        await db.run(
            'UPDATE certificates SET expires_at = ? WHERE id = ?',
            expiryDate,
            id
        );

        logger.info('Certificate renewal completed successfully', {
            certId: id,
            expiresAt: expiryDate
        });

        res.json({ success: true, expires_at: expiryDate });
    } catch (error: any) {
        logger.error('Error in POST /api/certificates/:id/renew endpoint', {
            certId: id,
            error: error.message,
            stack: error.stack,
            requestId: req.requestId
        });
        res.status(500).json({ error: error.message });
    }
});

// Delete Certificate
app.delete('/api/certificates/:id', async (req: Request, res: Response) => {
    const { id } = req.params;

    logger.info('Certificate deletion requested', {
        certId: id,
        requestId: req.requestId
    });

    try {
        logger.debug('Fetching certificate from database', { certId: id });
        const cert = await db.get('SELECT * FROM certificates WHERE id = ?', id);

        if (!cert) {
            logger.warn('Certificate not found in database', { certId: id });
            return res.status(404).json({ error: 'Not found' });
        }

        // Delete files
        logger.debug('Deleting certificate files from disk', {
            certPath: cert.path_cert,
            keyPath: cert.path_key
        });

        if (fs.existsSync(cert.path_cert)) {
            fs.unlinkSync(cert.path_cert);
            logger.debug('Certificate file deleted', { path: cert.path_cert });
        } else {
            logger.warn('Certificate file not found on disk', { path: cert.path_cert });
        }

        if (fs.existsSync(cert.path_key)) {
            fs.unlinkSync(cert.path_key);
            logger.debug('Key file deleted', { path: cert.path_key });
        } else {
            logger.warn('Key file not found on disk', { path: cert.path_key });
        }

        logger.debug('Removing certificate from database', { certId: id });
        await db.run('DELETE FROM certificates WHERE id = ?', id);

        logger.info('Certificate deleted successfully', {
            certId: id,
            certName: cert.name
        });

        res.json({ success: true });
    } catch (error: any) {
        logger.error('Error in DELETE /api/certificates/:id endpoint', {
            certId: id,
            error: error.message,
            stack: error.stack,
            requestId: req.requestId
        });
        res.status(500).json({ error: error.message });
    }
});


// Basic catch-all for SPA (serve index.html for any unknown route)
if (process.env.NODE_ENV === 'production') {
    app.get('*', (req: Request, res: Response) => {
        // Don't intercept API calls if they somehow fall through (though they are defined before)
        if (req.path.startsWith('/api')) {
            logger.warn('API route not found', { path: req.path, method: req.method });
            return res.status(404).json({ error: 'Not found' });
        }
        res.sendFile(path.join(__dirname, '../public/index.html'));
    });
}

app.listen(PORT, () => {
    logger.info('='.repeat(60));
    logger.info(`Server is now listening on http://localhost:${PORT}`);
    logger.info('Server started successfully');
    logger.info('='.repeat(60));
});
