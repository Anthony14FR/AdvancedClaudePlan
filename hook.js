#!/usr/bin/env node
const http = require('http');

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
  const payload = JSON.stringify({ plan, session_id: data.session_id });
  const port = process.env.PLAN_VIEWER_PORT || 4756;

  const MAX_ATTEMPTS = 60;
  const RETRY_DELAY = 500;
  let attempts = 0;
  let connected = false;

  function attempt() {
    attempts++;
    connected = false;
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
      socket.on('connect', () => { connected = true; });
    });

    req.on('error', err => {
      if (attempts === 1 && !connected && err && err.code === 'ECONNREFUSED') {
        process.exit(0);
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
