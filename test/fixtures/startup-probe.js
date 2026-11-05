/**
 * Startup probe — boots the fixture app and, as soon as the promise returned by
 * startVulkano() resolves, checks the server is already listening and the
 * project's after-start callback already ran. Prints one JSON line.
 */

const path = require('path');

global.ABS_PATH = __dirname;
global.APP_PATH = path.join(__dirname, 'app');
global.PUBLIC_PATH = path.join(__dirname, 'public');

let afterStartRan = false;
const write = process.stdout.write.bind(process.stdout);

process.stdout.write = (chunk, ...rest) => {
  if (String(chunk).includes('VULKANO_TEST_READY')) {
    afterStartRan = true;
  }
  return write(chunk, ...rest);
};

const startVulkano = require('../../app.js');

startVulkano()
  .then(async () => {
    // Snapshot at the exact moment the promise resolves
    const ranAtResolve = afterStartRan;

    const res = await fetch(`http://localhost:${process.env.PORT}/`).catch((e) => ({ error: e.cause?.code || e.message }));

    process.stdout.write = write;
    write(`PROBE ${JSON.stringify({ afterStartRan: ranAtResolve, status: res.status || null, error: res.error || null })}\n`);
    process.exit(0);
  })
  .catch((err) => {
    write(`PROBE ${JSON.stringify({ rejected: err.message })}\n`);
    process.exit(1);
  });
