/**
 * @file Manages the Claude Code `PreToolUse` hook entry in the user's
 * `~/.claude/settings.json`: detection, idempotent insertion, path sync and the
 * interactive "Configure hook" command. Writes are refused when the file is not
 * valid JSON, and an existing hook is never duplicated.
 */

const vscode = require('vscode');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { isFr } = require('./util');

const HOOK_TIMEOUT = 345600;

/**
 * Absolute path of the Claude Code settings file.
 * @returns {string}
 */
function claudeSettingsPath() {
  return path.join(os.homedir(), '.claude', 'settings.json');
}

/**
 * Find the plan hook — a `PreToolUse` hook whose command runs a `hook.js` — in a
 * `PreToolUse` array, regardless of its matcher or path.
 * @param {Array} preToolUse
 * @returns {Object|null} the hook object, or `null` when absent
 */
function findPlanHook(preToolUse) {
  if (!Array.isArray(preToolUse)) return null;
  for (const entry of preToolUse) {
    if (entry && Array.isArray(entry.hooks)) {
      for (const h of entry.hooks) {
        if (h && Array.isArray(h.args) && h.args.some(x => typeof x === 'string' && /(^|[\\/])hook\.js$/i.test(x))) {
          return h;
        }
      }
    }
  }
  return null;
}

/**
 * Ensure `settings` contains the plan hook pointing at `scriptPath`, mutating it
 * in place. An existing hook is re-pointed rather than duplicated.
 * @param {Object} settings parsed `settings.json`
 * @param {string} scriptPath absolute path to `hook.js`
 * @returns {{settings: Object, action: ('added'|'synced'|'noop')}}
 */
function applyHookConfig(settings, scriptPath) {
  if (typeof settings !== 'object' || settings === null || Array.isArray(settings)) settings = {};
  const pre = settings.hooks && typeof settings.hooks === 'object' && Array.isArray(settings.hooks.PreToolUse)
    ? settings.hooks.PreToolUse : null;
  const existing = pre ? findPlanHook(pre) : null;
  if (existing) {
    if (!Array.isArray(existing.args) || existing.args[0] !== scriptPath) {
      existing.type = 'command';
      existing.command = 'node';
      existing.args = [scriptPath];
      if (typeof existing.timeout !== 'number') existing.timeout = HOOK_TIMEOUT;
      return { settings, action: 'synced' };
    }
    return { settings, action: 'noop' };
  }
  if (!settings.hooks || typeof settings.hooks !== 'object') settings.hooks = {};
  if (!Array.isArray(settings.hooks.PreToolUse)) settings.hooks.PreToolUse = [];
  settings.hooks.PreToolUse.push({
    matcher: 'ExitPlanMode',
    hooks: [{ type: 'command', command: 'node', args: [scriptPath], timeout: HOOK_TIMEOUT }]
  });
  return { settings, action: 'added' };
}

/**
 * Write `settings.json` with a trailing newline, creating the directory if needed.
 * @param {string} sp
 * @param {Object} settings
 */
function writeClaudeSettings(sp, settings) {
  fs.mkdirSync(path.dirname(sp), { recursive: true });
  fs.writeFileSync(sp, JSON.stringify(settings, null, 2) + '\n', 'utf8');
}

/**
 * Whether the plan hook is currently present in `settings.json`.
 * @returns {boolean}
 */
function isHookConfigured() {
  try {
    const sp = claudeSettingsPath();
    if (!fs.existsSync(sp)) return false;
    const s = JSON.parse(fs.readFileSync(sp, 'utf8'));
    const pre = s && s.hooks && typeof s.hooks === 'object' && Array.isArray(s.hooks.PreToolUse) ? s.hooks.PreToolUse : null;
    return !!(pre && findPlanHook(pre));
  } catch (e) {
    return false;
  }
}

/**
 * Add or re-sync the hook without any UI.
 * @param {string} scriptPath absolute path to `hook.js`
 * @returns {{ok: boolean, action?: string, reason?: string}} `reason` is `'unreadable'`
 *   when the settings file is not valid JSON, or an error message on write failure
 */
function configureHookDirect(scriptPath) {
  const sp = claudeSettingsPath();
  let settings = {};
  try {
    if (fs.existsSync(sp)) settings = JSON.parse(fs.readFileSync(sp, 'utf8'));
  } catch (e) {
    return { ok: false, reason: 'unreadable' };
  }
  if (typeof settings !== 'object' || settings === null || Array.isArray(settings)) settings = {};
  const r = applyHookConfig(settings, scriptPath);
  if (r.action !== 'noop') {
    try {
      writeClaudeSettings(sp, r.settings);
    } catch (e) {
      return { ok: false, reason: e.message };
    }
  }
  return { ok: true, action: r.action };
}

/**
 * When the hook is already present, keep its path in sync with `scriptPath`.
 * No-op when the hook is absent or the file is unreadable.
 * @param {string} scriptPath absolute path to `hook.js`
 */
function syncHookPathIfPresent(scriptPath) {
  try {
    const sp = claudeSettingsPath();
    if (!fs.existsSync(sp)) return;
    const settings = JSON.parse(fs.readFileSync(sp, 'utf8'));
    const pre = settings && settings.hooks && Array.isArray(settings.hooks.PreToolUse) ? settings.hooks.PreToolUse : null;
    if (!(pre && findPlanHook(pre))) return;
    const r = applyHookConfig(settings, scriptPath);
    if (r.action === 'synced') writeClaudeSettings(sp, r.settings);
  } catch (e) {}
}

/**
 * Interactive "Configure Claude Code hook" command: prompt to add the hook, or
 * to re-sync it when already present, and report the outcome.
 * @param {string} scriptPath absolute path to `hook.js`
 * @returns {Promise<void>}
 */
async function configureHook(scriptPath) {
  const fr = isFr();
  const sp = claudeSettingsPath();

  let settings = {};
  try {
    if (fs.existsSync(sp)) settings = JSON.parse(fs.readFileSync(sp, 'utf8'));
  } catch (e) {
    vscode.window.showWarningMessage(
      fr ? '~/.claude/settings.json est illisible (JSON invalide) — rien n\'a été modifié. Ajoute le hook manuellement (voir le README).'
         : '~/.claude/settings.json is unreadable (invalid JSON) — nothing was changed. Add the hook manually (see the README).');
    return;
  }
  if (typeof settings !== 'object' || settings === null || Array.isArray(settings)) settings = {};

  const pre = settings.hooks && typeof settings.hooks === 'object' && Array.isArray(settings.hooks.PreToolUse)
    ? settings.hooks.PreToolUse : null;
  const hasHook = !!(pre && findPlanHook(pre));

  const applyAndWrite = () => {
    const r = applyHookConfig(settings, scriptPath);
    if (r.action !== 'noop') {
      try {
        writeClaudeSettings(sp, r.settings);
      } catch (e) {
        vscode.window.showErrorMessage('Advanced Claude Plan: ' + e.message);
        return null;
      }
    }
    return r.action;
  };

  if (hasHook) {
    const sync = fr ? 'Resynchroniser' : 'Re-sync';
    const cancel = fr ? 'Annuler' : 'Cancel';
    const choice = await vscode.window.showInformationMessage(
      fr ? 'Le hook Claude Code est déjà présent — aucun doublon ne sera créé. Resynchroniser son chemin ?'
         : 'The Claude Code hook is already present — no duplicate will be created. Re-sync its path?',
      sync, cancel);
    if (choice === sync) {
      const a = applyAndWrite();
      if (a !== null) vscode.window.showInformationMessage(
        fr ? (a === 'noop' ? 'Déjà à jour.' : 'Chemin resynchronisé. Relance « claude » si besoin.')
           : (a === 'noop' ? 'Already up to date.' : 'Path re-synced. Restart "claude" if needed.'));
    }
    return;
  }

  const yes = fr ? 'Configurer automatiquement' : 'Configure automatically';
  const later = fr ? 'Plus tard' : 'Not now';
  const choice = await vscode.window.showInformationMessage(
    fr ? 'Advanced Claude Plan a besoin d\'un hook Claude Code. L\'ajouter automatiquement à ~/.claude/settings.json ?'
       : 'Advanced Claude Plan needs a Claude Code hook. Add it automatically to ~/.claude/settings.json?',
    yes, later);
  if (choice === yes && applyAndWrite() !== null) {
    vscode.window.showInformationMessage(
      fr ? 'Hook ajouté. Relance ta session « claude » pour l\'activer.'
         : 'Hook added. Restart your "claude" session to enable it.');
  }
}

module.exports = {
  claudeSettingsPath,
  findPlanHook,
  applyHookConfig,
  writeClaudeSettings,
  isHookConfigured,
  configureHookDirect,
  syncHookPathIfPresent,
  configureHook
};
