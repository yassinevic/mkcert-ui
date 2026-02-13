
import * as forge from 'node-forge';
import fs from 'fs';
import path from 'path';

const certPath = path.join(__dirname, 'certs', 'printer_lan.pem');

try {
    console.log(`Reading cert from: ${certPath}`);
    const certPem = fs.readFileSync(certPath, 'utf8');
    console.log("Cert content length:", certPem.length);

    // Attempt to parse
    const cert = forge.pki.certificateFromPem(certPem);

    // Extract Expiry
    console.log("Validity:", cert.validity);
    if (cert.validity.notAfter) {
        console.log("ISO Expiry:", cert.validity.notAfter.toISOString());
    } else {
        console.log("No expiry date found in parsed cert");
    }

} catch (e) {
    console.error("Error parsing cert:", e);
}
