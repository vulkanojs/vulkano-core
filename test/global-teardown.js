const fs = require('fs');
const path = require('path');
const os = require('os');

const PID_FILE = path.join(os.tmpdir(), 'vulkano-test-server.pid');

module.exports = async function globalTeardown() {

  try {
    const pid = parseInt(fs.readFileSync(PID_FILE, 'utf8'), 10);
    process.kill(pid, 'SIGTERM');
    fs.unlinkSync(PID_FILE);
  } catch (_) {
    // server may have already exited
  }

};
