// CLI helper: encrypts an API key so it can be stored encrypted in mainConfig.json.
//
// Usage (the master passphrase is read from SLS_SECRET_KEY, never passed on the command line history
// if you export it first):
//   bash:        SLS_SECRET_KEY="my-passphrase" node bin/AI/encryptKey.js sk-ant-...
//   PowerShell:  $env:SLS_SECRET_KEY="my-passphrase"; node bin/AI/encryptKey.js sk-ant-...
//
// Paste the printed "enc:v1:..." string as the apiKey value in mainConfig.json, and make sure the
// server process has the same SLS_SECRET_KEY set so it can decrypt at runtime.
import { encryptSecret } from "./secret.js";

const plaintext = process.argv[2];
if (!plaintext) {
    console.error("Usage: SLS_SECRET_KEY=<passphrase> node bin/AI/encryptKey.js <api-key>");
    process.exit(1);
}

try {
    console.log(encryptSecret(plaintext));
} catch (error) {
    console.error(error.message);
    process.exit(1);
}
