
import { exec } from 'child_process';
import util from 'util';
import path from 'path';
import fs from 'fs';
import * as forge from 'node-forge';

const execAsync = util.promisify(exec);

export class MkCert {

    async getVersion(): Promise<string | null> {
        try {
            const { stdout } = await execAsync('mkcert -version');
            return stdout.trim();
        } catch (e) {
            return null;
        }
    }

    async getCARoot(): Promise<string | null> {
        try {
            const { stdout } = await execAsync('mkcert -CAROOT');
            return stdout.trim();
        } catch (e) {
            return null;
        }
    }

    async isCATrusted(): Promise<boolean> {
        try {
            // Check Windows trust store for mkcert CA
            const { stdout } = await execAsync('powershell -Command "Get-ChildItem -Path Cert:\\CurrentUser\\Root | Select-Object -ExpandProperty Subject"');
            return stdout.includes('CN=mkcert');
        } catch (e) {
            return false;
        }
    }

    async installCA(): Promise<string> {
        const { stdout } = await execAsync('mkcert -install');
        return stdout;
    }

    async uninstallCA(): Promise<string> {
        const { stdout } = await execAsync('mkcert -uninstall');
        return stdout;
    }

    async createCert(domains: string[], outputDir: string, name?: string): Promise<{ certPath: string, keyPath: string }> {
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const filenameBase = name ? name.replace(/[^a-z0-9]/gi, '_').toLowerCase() : domains[0].replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const certFile = path.join(outputDir, `${filenameBase}.pem`);
        const keyFile = path.join(outputDir, `${filenameBase}-key.pem`);

        const domainArgs = domains.join(' ');
        const cmd = `mkcert -cert-file "${certFile}" -key-file "${keyFile}" ${domainArgs}`;

        console.log(`Executing: ${cmd}`);
        await execAsync(cmd);

        return { certPath: certFile, keyPath: keyFile };
    }

    async getCertExpiry(certPath: string): Promise<string | null> {
        try {
            const certPem = fs.readFileSync(certPath, 'utf8');
            const cert = forge.pki.certificateFromPem(certPem);
            return cert.validity.notAfter.toISOString();
        } catch (e) {
            console.warn("Could not parse expiry with node-forge", e);
            // Fallback: mkcert default is 2 years + 3 months
            const fallback = new Date();
            fallback.setMonth(fallback.getMonth() + 27); // 2 years + 3 months
            return fallback.toISOString();
        }
    }
}
