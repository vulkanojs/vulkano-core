const crypto = require('crypto');

class Encrypter {

  constructor(encryptionKey, opts = {}) {

    const { encryption } = app.config || {};
    const salt = opts.salt || (encryption && encryption.salt) || process.env.ENCRYPTION_SALT || 'vulkano-salt-v1';
    const algorithm = opts.algorithm || (encryption && encryption.algorithm) || process.env.ENCRYPTION_ALGORITHM || 'aes-256-cbc';

    this.algorithm = algorithm;
    this.key = crypto.scryptSync(encryptionKey, salt, 32);

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

}

module.exports = Encrypter;
