/**
 * @file Unit tests for hook configuration: the plan hook is added once, never
 * duplicated, re-synced when its path changes, and unrelated settings are kept.
 */

const assert = require('assert');
const Module = require('module');

// Stub the `vscode` module so the extension code can be required under plain Node.
const origLoad = Module._load;
Module._load = function (request) {
  if (request === 'vscode') return { env: { language: 'en' } };
  return origLoad.apply(this, arguments);
};

const { findPlanHook, applyHookConfig } = require('../src/hookConfig');

const BS = String.fromCharCode(92);
const win = (...p) => p.join(BS);
const SCRIPT = win('C:', 'Users', 'x', '.vscode', 'extensions', 'pub.acp-0.10.0', 'hook', 'hook.js');
const STALE = win('C:', 'Users', 'x', 'Documents', 'proj', 'hook.js');

let passed = 0;
const check = (name, cond) => { assert.ok(cond, name); console.log('ok - ' + name); passed++; };
const preHooks = s => (s.hooks && s.hooks.PreToolUse) || [];
const countPlanHooks = s => {
  let n = 0;
  for (const e of preHooks(s)) for (const h of (e.hooks || [])) {
    if ((h.args || []).some(a => /(^|[\\/])hook\.js$/i.test(a))) n++;
  }
  return n;
};

let r = applyHookConfig({}, SCRIPT);
check('empty settings -> added', r.action === 'added');
check('empty settings -> exactly one hook', countPlanHooks(r.settings) === 1);

r = applyHookConfig(r.settings, SCRIPT);
check('re-apply -> noop, no duplicate', r.action === 'noop' && countPlanHooks(r.settings) === 1);

r = applyHookConfig({ hooks: { PreToolUse: [{ matcher: 'ExitPlanMode', hooks: [{ type: 'command', command: 'node', args: [STALE], timeout: 345600 }] }] } }, SCRIPT);
check('stale path -> synced, no duplicate, path updated',
  r.action === 'synced' && countPlanHooks(r.settings) === 1 && r.settings.hooks.PreToolUse[0].hooks[0].args[0] === SCRIPT);

r = applyHookConfig({ hooks: { PreToolUse: [{ matcher: '.*', hooks: [{ type: 'command', command: 'node', args: ['/old/hook.js'] }] }] } }, SCRIPT);
check('different matcher -> detected, no duplicate, matcher preserved',
  countPlanHooks(r.settings) === 1 && r.settings.hooks.PreToolUse[0].matcher === '.*');

r = applyHookConfig({
  model: 'x',
  hooks: {
    PreToolUse: [
      { matcher: 'Bash', hooks: [{ type: 'command', command: 'node', args: ['/x/other.js'] }] },
      { matcher: 'ExitPlanMode', hooks: [{ type: 'command', command: 'node', args: [STALE] }] }
    ],
    PostToolUse: [{ matcher: 'Edit', hooks: [{ type: 'command', command: 'fmt' }] }]
  }
}, SCRIPT);
check('mixed settings -> no duplicate, unrelated data preserved',
  countPlanHooks(r.settings) === 1 &&
  r.settings.hooks.PreToolUse.some(e => e.matcher === 'Bash') &&
  Array.isArray(r.settings.hooks.PostToolUse) &&
  r.settings.model === 'x');

check('findPlanHook detects a hook.js entry', !!findPlanHook([{ matcher: 'ExitPlanMode', hooks: [{ args: [SCRIPT] }] }]));
check('findPlanHook returns null when absent', findPlanHook([{ matcher: 'Bash', hooks: [{ args: ['/x/other.js'] }] }]) === null);

Module._load = origLoad;
console.log('\nhookConfig.test: ' + passed + ' passed');
