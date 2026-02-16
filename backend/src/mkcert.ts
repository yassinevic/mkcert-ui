
import { exec } from 'child_process';
import util from 'util';
import path from 'path';
import fs from 'fs';
import * as forge from 'node-forge';
import { logger } from './logger';

const execAsync = util.promisify(exec);

export class MkCert {

    async getVersion(): Promise<string | null> {
        try {
            logger.debug('Checking mkcert version');
            const { stdout } = await execAsync('mkcert -version');
            const version = stdout.trim();
            logger.info('mkcert version detected', { version });
            return version;
        } catch (e) {
            logger.error('Failed to get mkcert version', e);
            return null;
        }
    }

    async getCARoot(): Promise<string | null> {
        try {
            logger.debug('Getting mkcert CA root path');
            const { stdout } = await execAsync('mkcert -CAROOT');
            const caRoot = stdout.trim();
            logger.debug('CA root path retrieved', { caRoot });
            return caRoot;
        } catch (e) {
            logger.error('Failed to get mkcert CA root', e);
            return null;
        }
    }

    async isCATrusted(): Promise<boolean> {
        try {
            logger.debug('Checking if mkcert CA is trusted');
            // Check Windows trust store for mkcert CA
            const { stdout } = await execAsync('powershell -Command "Get-ChildItem -Path Cert:\\CurrentUser\\Root | Select-Object -ExpandProperty Subject"');
            const isTrusted = stdout.includes('CN=mkcert');
            logger.debug('CA trust status checked', { isTrusted });
            return isTrusted;
        } catch (e) {
            logger.warn('Failed to check CA trust status', e);
            return false;
        }
    }

    async installCA(): Promise<string> {
        logger.info('Installing mkcert CA');
        try {
            const { stdout, stderr } = await execAsync('mkcert -install');
            logger.info('mkcert CA installed successfully', { output: stdout });
            if (stderr) {
                logger.warn('mkcert install stderr', { stderr });
            }
            return stdout;
        } catch (error: any) {
            logger.error('Failed to install mkcert CA', {
                message: error.message,
                stdout: error.stdout,
                stderr: error.stderr,
                stack: error.stack
            });
            throw error;
        }
    }

    async uninstallCA(): Promise<string> {
        logger.info('Uninstalling mkcert CA');
        try {
            const { stdout, stderr } = await execAsync('mkcert -uninstall');
            logger.info('mkcert CA uninstalled successfully', { output: stdout });
            if (stderr) {
                logger.warn('mkcert uninstall stderr', { stderr });
            }
            return stdout;
        } catch (error: any) {
            logger.error('Failed to uninstall mkcert CA', {
                message: error.message,
                stdout: error.stdout,
                stderr: error.stderr,
                stack: error.stack
            });
            throw error;
        }
    }

    async createCert(domains: string[], outputDir: string, name?: string): Promise<{ certPath: string, keyPath: string }> {
        logger.info('Creating certificate', { domains, outputDir, name });
        
        // Validate output directory
        if (!fs.existsSync(outputDir)) {
            logger.debug('Creating output directory', { outputDir });
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const filenameBase = name ? name.replace(/[^a-z0-9]/gi, '_').toLowerCase() : domains[0].replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const certFile = path.join(outputDir, `${filenameBase}.pem`);
        const keyFile = path.join(outputDir, `${filenameBase}-key.pem`);

        const domainArgs = domains.join(' ');
        const cmd = `mkcert -cert-file "${certFile}" -key-file "${keyFile}" ${domainArgs}`;

        logger.info('Executing mkcert command', { command: cmd });
        
        try {
            const { stdout, stderr } = await execAsync(cmd);
            
            if (stdout) {
                logger.debug('mkcert command output', { stdout });
            }
            if (stderr) {
                logger.warn('mkcert command stderr', { stderr });
            }
            
            // Verify files were created
            if (!fs.existsSync(certFile) || !fs.existsSync(keyFile)) {
                throw new Error('Certificate files were not created');
            }
            
            logger.info('Certificate created successfully', { certFile, keyFile });
            return { certPath: certFile, keyPath: keyFile };
        } catch (error: any) {
            logger.error('Failed to create certificate', {
                command: cmd,
                message: error.message,
                stdout: error.stdout,
                stderr: error.stderr,
                stack: error.stack
            });
            throw error;
        }
    }

    async getCertExpiry(certPath: string): Promise<string | null> {
        logger.debug('Parsing certificate expiry date', { certPath });
        
        try {
            // Validate file exists
            if (!fs.existsSync(certPath)) {
                logger.warn('Certificate file does not exist', { certPath });
                return null;
            }
            
            const certPem = fs.readFileSync(certPath, 'utf8');
            const cert = forge.pki.certificateFromPem(certPem);
            const expiry = cert.validity.notAfter.toISOString();
            logger.debug('Certificate expiry parsed successfully', { certPath, expiry });
            return expiry;
        } catch (e) {
            logger.warn('Could not parse expiry with node-forge, using fallback', {
                certPath,
                error: e
            });
            // Fallback: mkcert default is 2 years + 3 months
            const fallback = new Date();
            fallback.setMonth(fallback.getMonth() + 27); // 2 years + 3 months
            const fallbackExpiry = fallback.toISOString();
            logger.debug('Using fallback expiry date', { fallbackExpiry });
            return fallbackExpiry;
        }
    }
}
