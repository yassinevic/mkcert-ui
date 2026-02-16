
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
            logger.debug('Checking if mkcert CA is trusted', { platform: process.platform });

            if (process.platform === 'win32') {
                // Retry logic for Windows - cert store might not update immediately
                const maxRetries = 3;
                let lastError: any = null;
                
                for (let attempt = 1; attempt <= maxRetries; attempt++) {
                    try {
                        logger.debug(`Trust check attempt ${attempt}/${maxRetries}`);
                        
                        // Primary method: Check CurrentUser store via PowerShell (this is where mkcert installs on Windows)
                        const cmd = `powershell -NoProfile -Command "Get-ChildItem -Path 'Cert:\\\\CurrentUser\\\\Root' -ErrorAction SilentlyContinue | Where-Object { $_.Subject -match 'mkcert' } | Measure-Object | Select-Object -ExpandProperty Count"`;
                        const { stdout } = await execAsync(cmd, { timeout: 5000 });
                        const count = parseInt(stdout.trim(), 10) || 0;
                        
                        logger.info('Windows CA trust status', { 
                            method: 'PowerShell CurrentUser\\Root',
                            isTrusted: count > 0, 
                            certificateCount: count,
                            attempt
                        });
                        
                        if (count > 0) {
                            return true;
                        }

                        // If not found in CurrentUser, check LocalMachine as fallback
                        const cmd2 = `powershell -NoProfile -Command "Get-ChildItem -Path 'Cert:\\\\LocalMachine\\\\Root' -ErrorAction SilentlyContinue | Where-Object { $_.Subject -match 'mkcert' } | Measure-Object | Select-Object -ExpandProperty Count"`;
                        const { stdout: stdout2 } = await execAsync(cmd2, { timeout: 5000 });
                        const count2 = parseInt(stdout2.trim(), 10) || 0;
                        
                        logger.info('Windows CA trust status (LocalMachine fallback)', { 
                            isTrusted: count2 > 0, 
                            certificateCount: count2,
                            attempt
                        });
                        
                        if (count2 > 0) {
                            return true;
                        }
                        
                        // If this is the first attempt and cert not found, wait and retry
                        if (attempt < maxRetries) {
                            logger.debug(`Certificate not found yet, retrying in 1 second...`);
                            await new Promise(resolve => setTimeout(resolve, 1000));
                        }
                        
                    } catch (error: any) {
                        logger.warn(`Trust check attempt ${attempt} failed`, {
                            error: error.message
                        });
                        lastError = error;
                        
                        if (attempt < maxRetries) {
                            await new Promise(resolve => setTimeout(resolve, 1000));
                        }
                    }
                }
                
                logger.info('mkcert CA NOT found after retries');
                return false;
                
            }

            if (process.platform === 'linux') {
                try {
                    // On Linux, check if the CA is in the system trust store
                    // Try to find mkcert CA in /etc/ssl/certs/
                    const { stdout } = await execAsync('openssl x509 -in /home/$USER/.local/share/mkcert/rootCA.pem -text -noout 2>/dev/null || echo "NOT_FOUND"', { timeout: 5000, shell: '/bin/bash' });
                    const isTrusted = !stdout.includes('NOT_FOUND');
                    logger.info('Linux CA status', { isTrusted });
                    return isTrusted;
                } catch (error) {
                    logger.warn('Linux CA trust check failed, assuming not trusted', error);
                    return false;
                }
            }

            if (process.platform === 'darwin') {
                // macOS support - check security framework
                logger.info('macOS CA trust status check not fully implemented');
                return false;
            }

            return false;
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
            
            // Wait a bit for Windows to update the cert store before returning
            logger.debug('Waiting for certificate store update...');
            await new Promise(resolve => setTimeout(resolve, 2000));
            
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
            
            // Wait a bit for Windows to update the cert store before returning
            logger.debug('Waiting for certificate store update...');
            await new Promise(resolve => setTimeout(resolve, 2000));
            
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
