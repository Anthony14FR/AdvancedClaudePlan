#!/usr/bin/env node
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');

const REGISTRY = path.join(os.homedir(), '.claude', '.advanced-claude-plan-registry.json');

function norm(p) {
  return p ? p.replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase() : '';
}

function resolvePort(cwd) {
  if (process.env.PLAN_VIEWER_PORT) return Number(process.env.PLAN_VIEWER_PORT);
  let instances = {};
  try {
    instances = JSON.parse(fs.readFileSync(REGISTRY, 'utf8')).instances || {};
  } catch (e) {}
  const list = Object.keys(instances).map(k => instances[k]).filter(e => e && e.port);
  if (list.length === 0) return 4756;
  const c = norm(cwd);
  let best = null, bestLen = -1;
  for (const e of list) {
    const ws = norm(e.workspace);
    if (!ws) continue;
    if (c === ws || c.startsWith(ws + '/') || ws.startsWith(c + '/')) {
      if (ws.length > bestLen) { best = e; bestLen = ws.length; }
    }
  }
  if (best) return best.port;
  if (list.length === 1 && !norm(list[0].workspace)) return list[0].port;
  return null;
}

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
  const payload = JSON.stringify({ plan, session_id: data.session_id, cwd });

  const MAX_ATTEMPTS = 60;
  const RETRY_DELAY = 500;
  let attempts = 0;
  let connected = false;
  let everConnected = false;

  function attempt() {
    attempts++;
    connected = false;
    const port = resolvePort(cwd);
    if (port == null) {
      if (everConnected && attempts < MAX_ATTEMPTS) { setTimeout(attempt, RETRY_DELAY); return; }
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
      socket.on('connect', () => { connected = true; everConnected = true; });
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
});
