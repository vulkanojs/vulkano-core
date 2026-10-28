module.exports = {

  // Secret key used to derive the encryption key. Read from environment variable or empty.
  key: process.env.ENCRYPTION_KEY || '',

  // Salt used in key derivation (scrypt). Unique per project — override via env or config.
  salt: process.env.ENCRYPTION_SALT || 'vulkano-salt-v1',

  // Legacy cipher (CBC). Encrypts while ENCRYPT_ALGORITHM is unset and always
  // decrypts `ciphertext|iv` values
  algorithm: process.env.ENCRYPTION_ALGORITHM || 'aes-256-cbc'

};
