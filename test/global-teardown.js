const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

function pidFile(name) {
  return path.join(os.tmpdir(), `vulkano-test-server-${name}.pid`);
}

function killServer(name) {
  try {
    const pid = parseInt(fs.readFileSync(pidFile(name), 'utf8'), 10);
    process.kill(pid, 'SIGTERM');
    fs.unlinkSync(pidFile(name));
  } catch (_) {
    // server may have already exited
  }
}

module.exports = async function globalTeardown() {
  killServer('default');
  killServer('hbs');
  killServer('secured');
  killServer('prod');
  killServer('prod-hbs');
};
