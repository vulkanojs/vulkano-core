/**
 * Encrypter — unit tests
 */

const { setupGlobals } = require('../helpers/globals');
setupGlobals(); // Encrypter calls `new VSError` in dencrypt when the IV is missing

// GCM on: a wrong key always throws. The legacy (CBC) default is covered by
// `Encrypter — ENCRYPT_ALGORITHM` below.
process.env.ENCRYPT_ALGORITHM = 'aes-256-gcm';
const Encrypter = require('../../../libs/Encrypter');
delete process.env.ENCRYPT_ALGORITHM;

describe('Encrypter', () => {

  const KEY = 'test-secret-key-32-chars-padding!';

  it('encrypts and decrypts a string back to the original value', () => {
    const enc = new Encrypter(KEY);
    const original = 'hello vulkano';
    const encrypted = enc.encrypt(original);
    expect(enc.dencrypt(encrypted)).toBe(original);
  });

  it('encrypted output is ciphertext|iv|authTag', () => {
    const enc = new Encrypter(KEY);
    const parts = enc.encrypt('data').split('|');
    expect(parts).toHaveLength(3);
    expect(parts[1]).toHaveLength(24); // 12-byte GCM IV → 24 hex chars
    expect(parts[2]).toHaveLength(32); // 16-byte auth tag → 32 hex chars
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

  it('decrypting with the wrong key always throws (auth tag)', () => {
    const enc1 = new Encrypter('correct-key');
    const enc2 = new Encrypter('wrong-key');
    for (let i = 0; i < 2000; i++) {
      expect(() => enc2.dencrypt(enc1.encrypt(`secret-${i}`))).toThrow();
    }
  });

  it('a tampered ciphertext or auth tag throws', () => {
    const enc = new Encrypter(KEY);
    const [encrypted, iv, tag] = enc.encrypt('secret').split('|');
    const flip = (hex) => (hex[0] === '0' ? '1' : '0') + hex.slice(1);
    expect(() => enc.dencrypt([flip(encrypted), iv, tag].join('|'))).toThrow();
    expect(() => enc.dencrypt([encrypted, iv, flip(tag)].join('|'))).toThrow();
    expect(() => enc.dencrypt([encrypted, iv, tag.slice(0, 8)].join('|'))).toThrow();
  });

  it('decrypts legacy ciphertext|iv values written with aes-256-cbc', () => {
    const crypto = require('node:crypto');
    const enc = new Encrypter(KEY);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', enc.key, iv);
    const legacy = `${cipher.update('old token', 'utf8', 'hex')}${cipher.final('hex')}|${iv.toString('hex')}`;
    expect(enc.dencrypt(legacy)).toBe('old token');
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

describe('Encrypter — custom opts', () => {

  const KEY = 'opts-test-key';

  it('custom salt produces different key than default salt', () => {
    const enc1 = new Encrypter(KEY, { salt: 'salt-a' });
    const enc2 = new Encrypter(KEY, { salt: 'salt-b' });
    const plain = 'same plaintext';
    expect(enc1.encrypt(plain)).not.toBe(enc2.encrypt(plain));
  });

  it('cannot decrypt across different salts', () => {
    const enc1 = new Encrypter(KEY, { salt: 'salt-a' });
    const enc2 = new Encrypter(KEY, { salt: 'salt-b' });
    const encrypted = enc1.encrypt('secret');
    expect(() => enc2.dencrypt(encrypted)).toThrow();
  });

  it('same key + same custom salt round-trips correctly', () => {
    const opts = { salt: 'custom-salt-xyz' };
    const enc = new Encrypter(KEY, opts);
    const plain = 'round trip test';
    expect(enc.dencrypt(enc.encrypt(plain))).toBe(plain);
  });

  it('opts.salt overrides app.config salt', () => {
    setupGlobals({ app: { config: { encryption: { salt: 'config-salt' } } } });
    const encWithOpts = new Encrypter(KEY, { salt: 'override-salt' });
    const encFromConfig = new Encrypter(KEY);
    const cipher = encWithOpts.encrypt('data');
    expect(() => encFromConfig.dencrypt(cipher)).toThrow();
    setupGlobals();
  });

  it('app.config salt is used when no opts.salt is given', () => {
    setupGlobals({ app: { config: { encryption: { salt: 'config-salt', algorithm: 'aes-256-cbc' } } } });
    const enc1 = new Encrypter(KEY);
    const enc2 = new Encrypter(KEY);
    expect(enc1.dencrypt(enc2.encrypt('hello'))).toBe('hello');
    setupGlobals();
  });

  it('custom algorithm is applied (aes-256-cbc round-trip)', () => {
    const enc = new Encrypter(KEY, { algorithm: 'aes-256-cbc', salt: 'fixed-salt' });
    expect(enc.algorithm).toBe('aes-256-cbc');
    expect(enc.dencrypt(enc.encrypt('algo test'))).toBe('algo test');
  });

});

describe('Encrypter — ENCRYPT_ALGORITHM', () => {

  let errorSpy;
  let warnSpy;

  // Encrypter reads ENCRYPT_ALGORITHM once, when the module loads
  function load(value) {
    if (value === undefined) {
      delete process.env.ENCRYPT_ALGORITHM;
    } else {
      process.env.ENCRYPT_ALGORITHM = value;
    }
    let Lib;
    jest.isolateModules(() => {
      Lib = require('../../../libs/Encrypter');
    });
    return Lib;
  }

  beforeEach(() => {
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
    warnSpy.mockRestore();
    delete process.env.ENCRYPT_ALGORITHM;
  });

  it('without it, keeps writing legacy ciphertext|iv values (no change in production)', () => {
    const enc = new (load(undefined))('env-key');
    const encrypted = enc.encrypt('legacy');
    expect(encrypted.split('|')).toHaveLength(2);
    expect(enc.dencrypt(encrypted)).toBe('legacy');
    expect(errorSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('with a 256-bit GCM cipher, writes ciphertext|iv|authTag without logging an error', () => {
    const enc = new (load('aes-256-gcm'))('env-key');
    const encrypted = enc.encrypt('gcm');
    expect(encrypted.split('|')).toHaveLength(3);
    expect(enc.dencrypt(encrypted)).toBe('gcm');
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it.each(['aes-256-cbc', 'aes-128-gcm', 'not-a-cipher'])('logs and ignores %s (keeps legacy values)', (value) => {
    const enc = new (load(value))('env-key');
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining(`ENCRYPT_ALGORITHM "${value}"`));
    const encrypted = enc.encrypt('fallback');
    expect(encrypted.split('|')).toHaveLength(2);
    expect(enc.dencrypt(encrypted)).toBe('fallback');
  });

  it('turning it off still reads GCM values (safe rollback of the opt-in)', () => {
    const gcm = new (load('aes-256-gcm'))('env-key').encrypt('written with gcm');
    const enc = new (load(undefined))('env-key');
    expect(enc.dencrypt(gcm)).toBe('written with gcm');
  });

  it('with GCM on, reading a legacy value warns once per process', () => {
    const legacy = new (load(undefined))('env-key').encrypt('old');
    const enc = new (load('aes-256-gcm'))('env-key');
    expect(enc.dencrypt(legacy)).toBe('old');
    expect(enc.dencrypt(legacy)).toBe('old');
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Legacy aes-256-cbc value decrypted'));
  });

  it('isLegacy tells both formats apart', () => {
    const Lib = load('aes-256-gcm');
    const legacy = new (load(undefined))('env-key').encrypt('old');
    expect(Lib.isLegacy(legacy)).toBe(true);
    expect(Lib.isLegacy(new Lib('env-key').encrypt('new'))).toBe(false);
  });

});

describe('Encrypter — derived keys cache', () => {

  const crypto = require('node:crypto');

  let scryptSpy;

  beforeEach(() => {
    Encrypter.clearKeys();
    scryptSpy = jest.spyOn(crypto, 'scryptSync');
  });

  afterEach(() => {
    scryptSpy.mockRestore();
    delete process.env.ENCRYPTER_KEYS_LIMIT;
    setupGlobals();
  });

  it('derives the key only once for the same key + salt', () => {
    const enc1 = new Encrypter('cache-key');
    const enc2 = new Encrypter('cache-key');
    expect(scryptSpy).toHaveBeenCalledTimes(1);
    expect(enc1.key).toBe(enc2.key);
    expect(enc2.dencrypt(enc1.encrypt('cached'))).toBe('cached');
  });

  it('derives a separate key for a different salt', () => {
    const enc1 = new Encrypter('cache-key', { salt: 'salt-a' });
    const enc2 = new Encrypter('cache-key', { salt: 'salt-b' });
    expect(scryptSpy).toHaveBeenCalledTimes(2);
    expect(() => enc2.dencrypt(enc1.encrypt('secret'))).toThrow();
  });

  it('derives a separate key for a different encryption key', () => {
    new Encrypter('cache-key-one');
    new Encrypter('cache-key-two');
    expect(scryptSpy).toHaveBeenCalledTimes(2);
  });

  it('clears the cache when ENCRYPTER_KEYS_LIMIT is reached', () => {
    process.env.ENCRYPTER_KEYS_LIMIT = '2';
    new Encrypter('limit-1');
    new Encrypter('limit-2');
    new Encrypter('limit-3'); // limit reached → cache cleared
    new Encrypter('limit-1'); // derived again
    expect(scryptSpy).toHaveBeenCalledTimes(4);
  });

  it('app.config.encryption.keysLimit overrides ENCRYPTER_KEYS_LIMIT', () => {
    process.env.ENCRYPTER_KEYS_LIMIT = '100';
    setupGlobals({ app: { config: { encryption: { keysLimit: 1 } } } });
    new Encrypter('config-limit-1');
    new Encrypter('config-limit-2'); // limit reached → cache cleared
    new Encrypter('config-limit-1'); // derived again
    expect(scryptSpy).toHaveBeenCalledTimes(3);
  });

  it('clearKeys forces the key to be derived again', () => {
    new Encrypter('clear-key');
    Encrypter.clearKeys();
    new Encrypter('clear-key');
    expect(scryptSpy).toHaveBeenCalledTimes(2);
  });

});
