#!/usr/bin/env node
/**
 * @file Claude Code `PreToolUse` hook for `ExitPlanMode`. It reads the plan from
 * stdin, resolves the extension window that matches the session's project via the
 * shared registry, and POSTs the plan to that window's local server. The window's
 * decision (approve or deny with feedback) is written back to stdout as the hook
 * result. When no window matches the project, the hook stays silent so Claude Code
 * falls back to its native plan-approval screen.
 */

const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');

const REGISTRY = path.join(os.homedir(), '.claude', '.advanced-claude-plan-registry.json');
const DEFAULT_PORT = 4756;
const MAX_ATTEMPTS = 60;
const RETRY_DELAY = 500;

/**
 * Normalize a filesystem path for comparison (forward slashes, no trailing
 * slash, lower case).
 * @param {string} p
 * @returns {string}
 */
function norm(p) {
  return p ? p.replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase() : '';
}

/**
 * Resolve the local port to send the plan to for a given session directory.
 * Returns the port of the window whose workspace matches `cwd`, `DEFAULT_PORT`
 * when the registry is empty (startup race / single legacy instance), or `null`
 * when windows exist but none matches the project — in which case the caller lets
 * Claude Code fall back to its native screen.
 * @param {string} cwd the Claude session's working directory
 * @returns {number|null}
 */
function resolvePort(cwd) {
  if (process.env.PLAN_VIEWER_PORT) return Number(process.env.PLAN_VIEWER_PORT);
  let instances = {};
  try {
    instances = JSON.parse(fs.readFileSync(REGISTRY, 'utf8')).instances || {};
  } catch (e) {}
  const list = Object.keys(instances).map(k => instances[k]).filter(e => e && e.port);
  if (list.length === 0) return DEFAULT_PORT;
  const c = norm(cwd);
  let best = null;
  let bestLen = -1;
  for (const e of list) {
    const ws = norm(e.workspace);
    if (!ws) continue;
    if (c === ws || c.startsWith(ws + '/') || ws.startsWith(c + '/')) {
      if (ws.length > bestLen) {
        best = e;
        bestLen = ws.length;
      }
    }
  }
  if (best) return best.port;
  return null;
}

/**
 * Send the plan to the resolved window, retrying while a window is (re)starting,
 * and print its decision. Exits silently (native fallback) when no window serves
 * the project.
 * @param {string} payload JSON body to POST
 * @param {string} cwd session working directory used to resolve the target
 */
function deliver(payload, cwd) {
  let attempts = 0;
  let connected = false;
  let everConnected = false;

  function attempt() {
    attempts++;
    connected = false;
    const port = resolvePort(cwd);
    if (port == null) {
      if (everConnected && attempts < MAX_ATTEMPTS) {
        setTimeout(attempt, RETRY_DELAY);
        return;
      }
      process.exit(0);
      return;
    }

    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path: '/plan',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload)
        }
      },
      res => {
        let body = '';
        res.on('data', chunk => (body += chunk));
        res.on('end', () => {
          try {
            const result = JSON.parse(body);
            if (result.permissionDecision) {
              console.log(
                JSON.stringify({
                  hookSpecificOutput: {
                    hookEventName: 'PreToolUse',
                    permissionDecision: result.permissionDecision,
                    permissionDecisionReason: result.permissionDecisionReason
                  }
                })
              );
            }
          } catch (e) {}
          process.exit(0);
        });
      }
    );

    req.on('socket', socket => {
      socket.on('connect', () => {
        connected = true;
        everConnected = true;
      });
    });

    req.on('error', err => {
      if (attempts === 1 && !everConnected && err && err.code === 'ECONNREFUSED') {
        process.exit(0);
        return;
      }
      if (attempts < MAX_ATTEMPTS) {
        setTimeout(attempt, RETRY_DELAY);
      } else {
        process.exit(0);
      }
    });

    req.write(payload);
    req.end();
  }

  attempt();
}

/** Read the hook payload from stdin and deliver it. */
function main() {
  let input = '';
  process.stdin.on('data', chunk => (input += chunk));
  process.stdin.on('end', () => {
    let data;
    try {
      data = JSON.parse(input);
    } catch (e) {
      process.exit(0);
    }
    const plan = data.tool_input && data.tool_input.plan ? data.tool_input.plan : '';
    const cwd = data.cwd || process.cwd();
    deliver(JSON.stringify({ plan, session_id: data.session_id, cwd }), cwd);
  });
}

if (require.main === module) main();

module.exports = { resolvePort, norm };
