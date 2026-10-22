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

  encrypt(clearText) {

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
    const encrypted = cipher.update(clearText, 'utf8', 'hex');

    return [
      encrypted + cipher.final('hex'),
      Buffer.from(iv).toString('hex'),
    ].join('|');

  }

  dencrypt(encryptedText) {

    const [encrypted, iv] = encryptedText.split('|');

    if (!iv) {
      throw new VSError('IV not found', 500);
    }

    const decipher = crypto.createDecipheriv(
      this.algorithm,
      this.key,
      Buffer.from(iv, 'hex')
    );

    return decipher.update(encrypted, 'hex', 'utf8') + decipher.final('utf8');

  }

  /**
   * Clear the derived keys cache
   */
  static clearKeys() {
    encrypterKeys.clear();
  }

}

module.exports = Encrypter;
