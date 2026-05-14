const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const PID_FILE = path.join(os.tmpdir(), 'vulkano-test-server-hbs.pid');

module.exports = async function globalTeardownHbs() {

  try {
    const pid = parseInt(fs.readFileSync(PID_FILE, 'utf8'), 10);
    process.kill(pid, 'SIGTERM');
    fs.unlinkSync(PID_FILE);
  } catch (_) {
    // server may have already exited
  }

};
