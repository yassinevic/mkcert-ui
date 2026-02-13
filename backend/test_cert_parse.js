const fs = require("fs");
const forge = require("node-forge");
const path = require("path");

const certPath = path.join(__dirname, "certs", "printer_lan.pem");

try {
  console.log(`Reading cert from: ${certPath}`);
  if (!fs.existsSync(certPath)) {
    console.error("Cert file not found!");
    process.exit(1);
  }

  const certPem = fs.readFileSync(certPath, "utf8");
  console.log("Cert content length:", certPem.length);

  // Attempt to parse
  const cert = forge.pki.certificateFromPem(certPem);

  // Extract Expiry
  console.log("Validity:", cert.validity);
  console.log("Not Before:", cert.validity.notBefore);
  console.log("Not After:", cert.validity.notAfter);

  // Try to convert to ISO string
  if (cert.validity.notAfter) {
    console.log("ISO Expiry:", cert.validity.notAfter.toISOString());
  } else {
    console.log("No expiry date found in parsed cert");
  }
} catch (e) {
  console.error("Error parsing cert:", e);
}
