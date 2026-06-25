// Symmetric encryption for secrets stored at rest (e.g. the LLM API key in mainConfig.json).
// AES-256-GCM with a key derived from the SLS_SECRET_KEY environment variable (the master passphrase,
// never stored in the repo). Encrypted values are tagged with the ENC_PREFIX so plaintext values keep
// working unchanged (backward compatible).
import crypto from "crypto";

const ENC_PREFIX = "enc:v1:";

/**
 * Derives the 32-byte AES key from the SLS_SECRET_KEY master passphrase.
 * @returns {Buffer} The derived key.
 * @throws {Error} When SLS_SECRET_KEY is not set.
 */
function getMasterKey() {
    const passphrase = process.env.SLS_SECRET_KEY;
    if (!passphrase) {
        throw new Error("SLS_SECRET_KEY environment variable is not set (required to decrypt the encrypted API key).");
    }
    return crypto.createHash("sha256").update(String(passphrase)).digest();
}

/**
 * True when a value is an encrypted secret produced by encryptSecret.
 * @param {*} value
 * @returns {boolean}
 */
function isEncrypted(value) {
    return typeof value === "string" && value.startsWith(ENC_PREFIX);
}

/**
 * Encrypts a plaintext secret. Format: "enc:v1:<base64(iv)>:<base64(tag)>:<base64(ciphertext)>".
 * @param {string} plaintext
 * @returns {string} The encrypted, self-describing string.
 */
function encryptSecret(plaintext) {
    const key = getMasterKey();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
    const ciphertext = Buffer.concat([cipher.update(String(plaintext), "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return ENC_PREFIX + iv.toString("base64") + ":" + tag.toString("base64") + ":" + ciphertext.toString("base64");
}

/**
 * Decrypts a value if it is an encrypted secret; otherwise returns it unchanged (plaintext support).
 * @param {string} value
 * @returns {string} The plaintext.
 * @throws {Error} When the value is encrypted but malformed or the passphrase is wrong.
 */
function decryptSecret(value) {
    if (!isEncrypted(value)) {
        return value;
    }
    const key = getMasterKey();
    const parts = value.slice(ENC_PREFIX.length).split(":");
    if (parts.length !== 3) {
        throw new Error("Invalid encrypted secret format (expected enc:v1:<iv>:<tag>:<ciphertext>).");
    }
    const iv = Buffer.from(parts[0], "base64");
    const tag = Buffer.from(parts[1], "base64");
    const ciphertext = Buffer.from(parts[2], "base64");
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return plaintext.toString("utf8");
}

export { encryptSecret, decryptSecret, isEncrypted };
