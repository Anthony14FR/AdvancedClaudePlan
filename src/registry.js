/**
 * @file Cross-window registry mapping each running extension instance to the
 * local port it listens on and the workspace it serves. It is stored in a shared
 * file in the user's home directory so the Claude Code hook can route each plan
 * to the window that matches the session's project.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');

/**
 * Absolute path of the shared registry file.
 * @returns {string}
 */
function registryPath() {
  return path.join(os.homedir(), '.claude', '.advanced-claude-plan-registry.json');
}

/**
 * Whether a process is still running.
 * @param {number} pid
 * @returns {boolean}
 */
function isAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return e.code === 'EPERM';
  }
}

/**
 * Read the registry, returning the instances map (empty on any error).
 * @returns {Object.<string, {workspace: (string|null), port: number, pid: number}>}
 */
function readRegistry() {
  try {
    const r = JSON.parse(fs.readFileSync(registryPath(), 'utf8'));
    return r && typeof r.instances === 'object' && r.instances ? r.instances : {};
  } catch (e) {
    return {};
  }
}

/**
 * Atomically write the instances map. Errors are ignored.
 * @param {Object} instances
 */
function writeRegistry(instances) {
  try {
    const p = registryPath();
    fs.mkdirSync(path.dirname(p), { recursive: true });
    const tmp = p + '.' + process.pid + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify({ instances }, null, 2));
    fs.renameSync(tmp, p);
  } catch (e) {}
}

/**
 * Register (or update) this process's instance, pruning dead entries first.
 * @param {number} pid
 * @param {string|null} workspace
 * @param {number} port
 */
function register(pid, workspace, port) {
  const instances = readRegistry();
  for (const k of Object.keys(instances)) {
    if (!instances[k] || !isAlive(Number(k))) delete instances[k];
  }
  instances[String(pid)] = { workspace, port, pid };
  writeRegistry(instances);
}

/**
 * Remove this process's instance from the registry.
 * @param {number} pid
 */
function unregister(pid) {
  const instances = readRegistry();
  delete instances[String(pid)];
  writeRegistry(instances);
}

module.exports = { registryPath, isAlive, readRegistry, writeRegistry, register, unregister };
