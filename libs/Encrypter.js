const crypto = require('node:crypto');

/**
 * Derived keys cache
 *
 * crypto.scryptSync is intentionally slow (~30-90 ms of CPU that blocks the
 * event loop) and Jwt creates a new Encrypter on every encode/decode. The
 * derived key only depends on the encryption key and the salt, so it is
 * computed once per pair and reused.
 *
 * The limit protects against unbounded growth when Encrypter is used with
 * dynamic keys. Set it via app.config.encryption.keysLimit or
 * ENCRYPTER_KEYS_LIMIT in .env (default 1000).
 */
const encrypterKeys = new Map();

/**
 * Authenticated cipher (opt-in in 2.x)
 *
 * Without ENCRYPT_ALGORITHM, encrypt() keeps writing `algorithm` (aes-256-cbc)
 * so projects already in production change nothing, and a rollback to an older
 * core still reads every value. With ENCRYPT_ALGORITHM (a GCM cipher with a
 * 32-byte key, e.g. aes-256-gcm), encrypt() writes `ciphertext|iv|authTag`.
 * An invalid value is logged and ignored (values stay on `algorithm`).
 *
 * dencrypt() always reads both formats, so ENCRYPT_ALGORITHM can be turned on
 * or off at any time.
 */
const DEFAULT_AUTH_ALGORITHM = 'aes-256-gcm';

function authAlgorithm(name) {

  if (!name) {
    return null;
  }

  const info = crypto.getCipherInfo(name);

  if (info && info.mode === 'gcm' && info.keyLength === 32) {
    return name;
  }

  console.error(`[Encrypter] ENCRYPT_ALGORITHM "${name}" is not a 256-bit GCM cipher. Ignored: values are still encrypted with the legacy algorithm.`);
  return null;

}

const AUTH_ALGORITHM = authAlgorithm(process.env.ENCRYPT_ALGORITHM);

// Logged once per process: a legacy value read while GCM is on. When it stops
// showing up, every legacy value is gone.
let legacyLogged = false;

class Encrypter {

  constructor(encryptionKey, opts = {}) {

    const { encryption } = (typeof app !== 'undefined' && app.config) ? app.config : {};
    const salt = opts.salt || (encryption && encryption.salt) || process.env.ENCRYPTION_SALT || 'vulkano-salt-v1';
    const algorithm = opts.algorithm || (encryption && encryption.algorithm) || process.env.ENCRYPTION_ALGORITHM || 'aes-256-cbc';

    const keysLimit = Number((encryption && encryption.keysLimit) || process.env.ENCRYPTER_KEYS_LIMIT) || 1000;
    const cacheKey = `${salt}\u0000${encryptionKey}`;

    if (!encrypterKeys.has(cacheKey)) {

      if (encrypterKeys.size >= keysLimit) {
        encrypterKeys.clear();
      }

      encrypterKeys.set(cacheKey, crypto.scryptSync(encryptionKey, salt, 32));

    }

    this.algorithm = algorithm;
    this.key = encrypterKeys.get(cacheKey);

  }

  /**
   * Encrypt: `ciphertext|iv|authTag` with ENCRYPT_ALGORITHM, else the legacy
   * `ciphertext|iv` with `algorithm`
   */
  encrypt(clearText) {

    if (!AUTH_ALGORITHM) {
      return this._encryptLegacy(clearText);
    }

    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(AUTH_ALGORITHM, this.key, iv);
    const encrypted = cipher.update(clearText, 'utf8', 'hex') + cipher.final('hex');

    return [
      encrypted,
      iv.toString('hex'),
      cipher.getAuthTag().toString('hex')
    ].join('|');

  }

  _encryptLegacy(clearText) {

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
    const encrypted = cipher.update(clearText, 'utf8', 'hex');

    return [
      encrypted + cipher.final('hex'),
      iv.toString('hex')
    ].join('|');

  }

  /**
   * Decrypt either format
   *
   * GCM values have an auth tag: a wrong key or a tampered value always throws.
   * Legacy values (CBC) don't: a wrong key only throws when the padding happens
   * to be invalid, so compare the result when that matters.
   */
  dencrypt(encryptedText) {

    const [encrypted, iv, authTag] = encryptedText.split('|');

    if (!iv) {
      throw new VSError('IV not found', 500);
    }

    const legacy = Encrypter.isLegacy(encryptedText);

    if (legacy && AUTH_ALGORITHM && !legacyLogged) {
      legacyLogged = true;
      console.warn(`[Encrypter] Legacy ${this.algorithm} value decrypted. Re-encrypt stored values before removing the fallback.`);
    }

    const decipher = crypto.createDecipheriv(
      legacy ? this.algorithm : (AUTH_ALGORITHM || DEFAULT_AUTH_ALGORITHM),
      this.key,
      Buffer.from(iv, 'hex'),
      legacy ? undefined : { authTagLength: 16 }
    );

    if (!legacy) {
      decipher.setAuthTag(Buffer.from(authTag, 'hex'));
    }

    return decipher.update(encrypted, 'hex', 'utf8') + decipher.final('utf8');

  }

  /**
   * True for a value written with the legacy `algorithm` (`ciphertext|iv`).
   * Use it to migrate stored values: dencrypt + encrypt with ENCRYPT_ALGORITHM on.
   */
  static isLegacy(encryptedText) {
    return String(encryptedText).split('|').length === 2;
  }

  /**
   * Clear the derived keys cache
   */
  static clearKeys() {
    encrypterKeys.clear();
  }

}

module.exports = Encrypter;
