module.exports = {

  // Secret key used to derive the encryption key. Read from environment variable or empty.
  key: process.env.ENCRYPTION_KEY || '',

  // Salt used in key derivation (scrypt). Unique per project — override via env or config.
  salt: process.env.ENCRYPTION_SALT || 'vulkano-salt-v1',

  // Cipher algorithm passed to Node.js crypto. Must match key length requirements.
  algorithm: process.env.ENCRYPTION_ALGORITHM || 'aes-256-cbc'

};
