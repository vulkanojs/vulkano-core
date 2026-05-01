/**
 * VSError — unit tests
 */

global.app = { PRODUCTION: false };

const VSError = require('../../../libs/VSError');

describe('VSError', () => {

  describe('constructor', () => {

    it('creates an instance with the given message and statusCode', () => {
      const err = new VSError('Something failed', 422);
      expect(err.message).toBe('Something failed');
      expect(err.statusCode).toBe(422);
    });

    it('defaults statusCode to 500 when not provided', () => {
      const err = new VSError('Oops');
      expect(err.statusCode).toBe(500);
    });

    it('is an instance of Error', () => {
      expect(new VSError('msg', 400)).toBeInstanceOf(Error);
    });

    it('stores custom props', () => {
      const err = new VSError('msg', 400, { field: 'email' });
      expect(err.customProps.field).toBe('email');
    });

    it('includes a stack trace in non-production mode', () => {
      const err = new VSError('msg', 400);
      expect(err.stack).toBeDefined();
    });

    it('omits stack trace when props.stack = false', () => {
      const err = new VSError('msg', 400, { stack: false });
      expect(err.stack).toBeUndefined();
    });

  });

  describe('VSError.reject', () => {

    it('returns a rejected Promise', async () => {
      await expect(VSError.reject('Denied', 403)).rejects.toBeInstanceOf(VSError);
    });

    it('rejected value has the correct message and statusCode', async () => {
      await expect(VSError.reject('Denied', 403)).rejects.toMatchObject({
        message: 'Denied',
        statusCode: 403
      });
    });

  });

  describe('VSError.notFound', () => {

    it('returns a rejected Promise with 404', async () => {
      await expect(VSError.notFound('Item')).rejects.toMatchObject({
        statusCode: 404
      });
    });

    it('includes the resource name in the message', async () => {
      await expect(VSError.notFound('User')).rejects.toMatchObject({
        message: 'User Not Found'
      });
    });

    it('uses "Object" as default name when none is given', async () => {
      await expect(VSError.notFound()).rejects.toMatchObject({
        message: 'Object Not Found'
      });
    });

  });

});
