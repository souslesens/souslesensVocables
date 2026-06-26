// CLI helper: encrypts an LLM API key so it can be stored encrypted in mainConfig.json.
//
// The master passphrase is read from SLS_SECRET_KEY (never passed on the command line as a key).
//
// Two modes:
//   1) Encrypt a key you provide (prints the enc:v1:... value to paste yourself):
//        bash:        SLS_SECRET_KEY="my-passphrase" node bin/AI/encryptKey.js sk-ant-...
//        PowerShell:  $env:SLS_SECRET_KEY="my-passphrase"; node bin/AI/encryptKey.js sk-ant-...
//
//   2) Encrypt the apiKey already in mainConfig.json, in place (you never re-type the key):
//        SLS_SECRET_KEY="my-passphrase" node bin/AI/encryptKey.js --in-place
//
// In both cases the server must have the same SLS_SECRET_KEY set at runtime to decrypt.
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { encryptSecret, isEncrypted } from "./secret.js";

const arg = process.argv[2];

function printUsageAndExit() {
    console.error("Usage:");
    console.error("  SLS_SECRET_KEY=<passphrase> node bin/AI/encryptKey.js <api-key>     # prints enc:v1:...");
    console.error("  SLS_SECRET_KEY=<passphrase> node bin/AI/encryptKey.js --in-place    # encrypts apiKey in mainConfig.json");
    process.exit(1);
}

function encryptInPlace() {
    const configPath = join(process.cwd(), process.env.CONFIG_PATH || "config", "mainConfig.json");
    const text = readFileSync(configPath, "utf8");
    const config = JSON.parse(text);

    const provider = config.llm && config.llm.provider;
    if (!provider || !config.llm[provider]) {
        console.error("No llm." + provider + " section found in " + configPath);
        process.exit(1);
    }
    const current = config.llm[provider].apiKey;
    if (!current) {
        console.error("No apiKey under llm." + provider + " in " + configPath);
        process.exit(1);
    }
    if (isEncrypted(current)) {
        console.log("llm." + provider + ".apiKey is already encrypted — nothing to do.");
        return;
    }

    const encrypted = encryptSecret(current);
    // Targeted text replacement (JSON-escaped) to preserve the file's formatting and other values.
    const replaced = text.split(JSON.stringify(current)).join(JSON.stringify(encrypted));
    if (replaced === text) {
        console.error("Could not locate the apiKey value in " + configPath + " to replace.");
        process.exit(1);
    }
    writeFileSync(configPath, replaced, "utf8");
    console.log("Encrypted llm." + provider + ".apiKey in " + configPath);
    console.log("Reminder: launch bin/www with the same SLS_SECRET_KEY set, otherwise it cannot decrypt.");
}

if (!arg) {
    printUsageAndExit();
}

try {
    if (arg === "--in-place") {
        encryptInPlace();
    } else {
        console.log(encryptSecret(arg));
    }
} catch (error) {
    console.error(error.message);
    process.exit(1);
}
