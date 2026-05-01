/**
 * Signals Jest's globalSetup that the server is ready
 * by printing a unique marker to stdout.
 */
module.exports = (cb) => {
  cb(() => {
    process.stdout.write('VULKANO_TEST_READY\n');
  });
};
