/**
 * @file Unit tests for the hook's port resolution: each plan routes to the window
 * whose workspace matches the session directory, and unmatched projects fall back
 * to Claude's native screen (`null`).
 */

const assert = require('assert');
const os = require('os');
const path = require('path');
const fs = require('fs');
const { resolvePort } = require('../hook/hook');

const REGISTRY_PATH = path.join(os.homedir(), '.claude', '.advanced-claude-plan-registry.json');
let registry = { instances: {} };
const realReadFileSync = fs.readFileSync.bind(fs);
fs.readFileSync = (p, enc) => (typeof p === 'string' && p === REGISTRY_PATH) ? JSON.stringify(registry) : realReadFileSync(p, enc);
delete process.env.PLAN_VIEWER_PORT;

const BS = String.fromCharCode(92);
const win = (...p) => p.join(BS);
const A = win('C:', 'proj', 'Alpha');
const B = win('C:', 'proj', 'Beta');
const ASUB = win('C:', 'proj', 'Alpha', 'src');
const C = win('C:', 'proj', 'Gamma');
const setRegistry = instances => { registry = { instances }; };

let passed = 0;
const check = (name, cond) => { assert.ok(cond, name); console.log('ok - ' + name); passed++; };

setRegistry({});
check('empty registry -> default port', resolvePort(A) === 4756);

setRegistry({ '1': { workspace: A, port: 4756 } });
check('single matching window -> its port', resolvePort(A) === 4756);

setRegistry({ '1': { workspace: null, port: 4756 } });
check('single window without folder -> null (native fallback)', resolvePort(A) === null);

setRegistry({ '1': { workspace: B, port: 4756 } });
check('single window on another project -> null', resolvePort(A) === null);

setRegistry({ '1': { workspace: A, port: 4756 }, '2': { workspace: B, port: 4757 } });
check('two windows: project A -> 4756', resolvePort(A) === 4756);
check('two windows: project B -> 4757', resolvePort(B) === 4757);
check('two windows: unrelated project -> null', resolvePort(C) === null);
check('subfolder of A -> A', resolvePort(ASUB) === 4756);
check('case-insensitive match', resolvePort(A.toLowerCase()) === 4756);

process.env.PLAN_VIEWER_PORT = '9999';
check('env override wins', resolvePort(A) === 9999);
delete process.env.PLAN_VIEWER_PORT;

fs.readFileSync = realReadFileSync;
console.log('\nhook.test: ' + passed + ' passed');
