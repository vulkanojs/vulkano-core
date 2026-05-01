/**
 * Encrypter — unit tests
 */

// Encrypter calls `new VSError` in dencrypt when the IV is missing
global.VSError = class VSError extends Error {
  constructor(msg, code) {
    super(msg);
    this.statusCode = code;
  }
};

const Encrypter = require('../../../libs/Encrypter');

describe('Encrypter', () => {

  const KEY = 'test-secret-key-32-chars-padding!';

  it('encrypts and decrypts a string back to the original value', () => {
    const enc = new Encrypter(KEY);
    const original = 'hello vulkano';
    const encrypted = enc.encrypt(original);
    expect(enc.dencrypt(encrypted)).toBe(original);
  });

  it('encrypted output contains an IV segment separated by |', () => {
    const enc = new Encrypter(KEY);
    const encrypted = enc.encrypt('data');
    expect(encrypted).toContain('|');
    const parts = encrypted.split('|');
    expect(parts).toHaveLength(2);
    expect(parts[1]).toHaveLength(32); // 16 bytes → 32 hex chars
  });

  it('two encryptions of the same string produce different ciphertexts (random IV)', () => {
    const enc = new Encrypter(KEY);
    const a = enc.encrypt('same');
    const b = enc.encrypt('same');
    expect(a).not.toBe(b);
  });

  it('different keys produce different ciphertexts', () => {
    const a = new Encrypter('key-one');
    const b = new Encrypter('key-two');
    expect(a.encrypt('data')).not.toBe(b.encrypt('data'));
  });

  it('decrypting with the wrong key throws', () => {
    const enc1 = new Encrypter('correct-key');
    const enc2 = new Encrypter('wrong-key');
    const encrypted = enc1.encrypt('secret');
    expect(() => enc2.dencrypt(encrypted)).toThrow();
  });

  it('dencrypt throws VSError when IV is missing', () => {
    const enc = new Encrypter(KEY);
    expect(() => enc.dencrypt('no-iv-here')).toThrow(VSError);
  });

  it('encrypts and decrypts JSON payloads correctly', () => {
    const enc = new Encrypter(KEY);
    const payload = JSON.stringify({ userId: 42, role: 'admin' });
    expect(enc.dencrypt(enc.encrypt(payload))).toBe(payload);
  });

});
