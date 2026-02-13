
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import * as forge from 'node-forge';
import fs from 'fs';
import path from 'path';

(async () => {
    const db = await open({
        filename: './database.sqlite',
        driver: sqlite3.Database
    });

    const certs = await db.all('SELECT * FROM certificates');
    console.log(`Found ${certs.length} certs.`);

    for (const cert of certs) {
        console.log(`Processing ${cert.name} (ID: ${cert.id})`);
        console.log(`Current Expiry: ${cert.expires_at}`);
        console.log(`Cert Path: ${cert.path_cert}`);

        if (fs.existsSync(cert.path_cert)) {
            try {
                const certPem = fs.readFileSync(cert.path_cert, 'utf8');
                const certObj = forge.pki.certificateFromPem(certPem);
                const expiry = certObj.validity.notAfter.toISOString();
                console.log(`Parsed Expiry: ${expiry}`);

                await db.run('UPDATE certificates SET expires_at = ? WHERE id = ?', expiry, cert.id);
                console.log("Updated DB.");
            } catch (e) {
                console.error("Error parsing/updating:", e);
            }
        } else {
            console.error("File does not exist!");
        }
        console.log("---");
    }
})();
