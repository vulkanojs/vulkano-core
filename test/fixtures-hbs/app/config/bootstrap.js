module.exports = (cb) => {
  cb(() => {
    process.stdout.write('VULKANO_TEST_READY\n');
  });
};
