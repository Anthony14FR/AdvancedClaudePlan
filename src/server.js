/**
 * @file Local HTTP server that receives plans from the Claude Code hook. It binds
 * the first free port starting at the configured base, advertises itself in the
 * cross-window registry, and forwards each plan to a callback.
 */

const http = require('http');
const registry = require('./registry');

const PORT_SCAN_RANGE = 20;

/**
 * Create the plan server.
 * @param {Object} opts
 * @param {number} opts.basePort first port to try
 * @param {string|null} opts.workspace workspace path advertised in the registry
 * @param {function(Object, function(Object): void): void} opts.onPlan called with
 *   `(planData, respond)` for each received plan; call `respond(result)` once to
 *   answer the hook
 * @returns {{start: function, close: function, port: function, isRunning: function}}
 */
function create({ basePort, workspace, onPlan }) {
  let boundPort = null;
  let server = http.createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/plan') {
      let body = '';
      req.on('data', chunk => (body += chunk));
      req.on('end', () => {
        let data;
        try {
          data = JSON.parse(body);
        } catch (e) {
          res.writeHead(400);
          res.end();
          return;
        }
        const respond = (result) => {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(result));
        };
        onPlan(data, respond);
      });
      return;
    }
    res.writeHead(404);
    res.end();
  });

  /**
   * Begin listening, scanning ports until one is free, then register.
   * @param {function(number): void} [onListening] called with the bound port
   * @param {function(Error): void} [onError] called on a fatal (non-`EADDRINUSE`) error
   */
  function start(onListening, onError) {
    const candidates = [];
    for (let i = 0; i < PORT_SCAN_RANGE; i++) candidates.push(basePort + i);
    let attemptIdx = 0;
    let listening = false;

    const tryListen = () => {
      if (attemptIdx < candidates.length) server.listen(candidates[attemptIdx], '127.0.0.1');
      else server.listen(0, '127.0.0.1');
    };

    server.on('listening', () => {
      listening = true;
      boundPort = server.address().port;
      registry.register(process.pid, workspace, boundPort);
      if (onListening) onListening(boundPort);
    });

    server.on('error', err => {
      if (!listening && err && err.code === 'EADDRINUSE') {
        attemptIdx++;
        tryListen();
        return;
      }
      server = null;
      if (onError) onError(err);
    });

    tryListen();
  }

  /** Unregister and stop the server. */
  function close() {
    registry.unregister(process.pid);
    if (server) server.close();
  }

  return {
    start,
    close,
    port: () => boundPort,
    isRunning: () => !!server
  };
}

module.exports = { create };
