const vscode = require('vscode');
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

let server;
let panel;
let statusItem;
let pendingResponse = null;
let currentPlan = null;
let currentLang = null;

function isFr() { return /^fr/i.test(vscode.env.language || ''); }

function activate(context) {
  context.subscriptions.push(
    vscode.commands.registerCommand('planViewer.start', () => startServer(context))
  );
  context.subscriptions.push(
    vscode.commands.registerCommand('planViewer.show', () => ensurePanel(context))
  );
  context.subscriptions.push(
    vscode.commands.registerCommand('planViewer.toggle', () => togglePanel(context))
  );
  context.subscriptions.push(
    vscode.commands.registerCommand('planViewer.configureHook', () => configureHook(context, true))
  );

  statusItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusItem.command = 'planViewer.toggle';
  context.subscriptions.push(statusItem);
  updateStatus();
  statusItem.show();

  startServer(context);
  syncHookPathIfPresent(context);
}

function isHookConfigured() {
  try {
    const sp = claudeSettingsPath();
    if (!fs.existsSync(sp)) return false;
    const s = JSON.parse(fs.readFileSync(sp, 'utf8'));
    const pre = s && s.hooks && typeof s.hooks === 'object' && Array.isArray(s.hooks.PreToolUse) ? s.hooks.PreToolUse : null;
    return !!(pre && findPlanHook(pre));
  } catch (e) { return false; }
}

function sendStatus() {
  if (panel) panel.webview.postMessage({ type: 'status', hookConfigured: isHookConfigured(), lang: vscode.env.language });
}

function configureHookDirect(context) {
  const sp = claudeSettingsPath();
  const scriptPath = path.join(context.extensionUri.fsPath, 'hook.js');
  let settings = {};
  try {
    if (fs.existsSync(sp)) settings = JSON.parse(fs.readFileSync(sp, 'utf8'));
  } catch (e) {
    return { ok: false, reason: 'unreadable' };
  }
  if (typeof settings !== 'object' || settings === null || Array.isArray(settings)) settings = {};
  const r = applyHookConfig(settings, scriptPath);
  if (r.action !== 'noop') {
    try { writeClaudeSettings(sp, r.settings); } catch (e) { return { ok: false, reason: e.message }; }
  }
  return { ok: true, action: r.action };
}

function syncHookPathIfPresent(context) {
  try {
    const sp = claudeSettingsPath();
    if (!fs.existsSync(sp)) return;
    const settings = JSON.parse(fs.readFileSync(sp, 'utf8'));
    const pre = settings && settings.hooks && Array.isArray(settings.hooks.PreToolUse) ? settings.hooks.PreToolUse : null;
    if (!(pre && findPlanHook(pre))) return;
    const r = applyHookConfig(settings, path.join(context.extensionUri.fsPath, 'hook.js'));
    if (r.action === 'synced') writeClaudeSettings(sp, r.settings);
  } catch (e) {}
}

function claudeSettingsPath() {
  return path.join(os.homedir(), '.claude', 'settings.json');
}

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
      if (typeof existing.timeout !== 'number') existing.timeout = 345600;
      return { settings, action: 'synced' };
    }
    return { settings, action: 'noop' };
  }
  if (!settings.hooks || typeof settings.hooks !== 'object') settings.hooks = {};
  if (!Array.isArray(settings.hooks.PreToolUse)) settings.hooks.PreToolUse = [];
  settings.hooks.PreToolUse.push({
    matcher: 'ExitPlanMode',
    hooks: [{ type: 'command', command: 'node', args: [scriptPath], timeout: 345600 }]
  });
  return { settings, action: 'added' };
}

function writeClaudeSettings(sp, settings) {
  fs.mkdirSync(path.dirname(sp), { recursive: true });
  fs.writeFileSync(sp, JSON.stringify(settings, null, 2) + '\n', 'utf8');
}

async function configureHook(context, interactive) {
  const fr = isFr();
  const sp = claudeSettingsPath();
  const scriptPath = path.join(context.extensionUri.fsPath, 'hook.js');

  let settings = {};
  try {
    if (fs.existsSync(sp)) settings = JSON.parse(fs.readFileSync(sp, 'utf8'));
  } catch (e) {
    if (interactive) {
      vscode.window.showWarningMessage(
        fr ? '~/.claude/settings.json est illisible (JSON invalide) — rien n\'a été modifié. Ajoute le hook manuellement (voir le README).'
           : '~/.claude/settings.json is unreadable (invalid JSON) — nothing was changed. Add the hook manually (see the README).');
    }
    return;
  }
  if (typeof settings !== 'object' || settings === null || Array.isArray(settings)) settings = {};

  const pre = settings.hooks && typeof settings.hooks === 'object' && Array.isArray(settings.hooks.PreToolUse)
    ? settings.hooks.PreToolUse : null;
  const hasHook = !!(pre && findPlanHook(pre));

  const applyAndWrite = () => {
    const r = applyHookConfig(settings, scriptPath);
    if (r.action !== 'noop') {
      try { writeClaudeSettings(sp, r.settings); } catch (e) { vscode.window.showErrorMessage('Advanced Claude Plan: ' + e.message); return null; }
    }
    return r.action;
  };

  if (!interactive) {
    if (hasHook) { applyAndWrite(); return; }
    if (context.globalState.get('hookPromptDismissed')) return;
    const yes = fr ? 'Configurer automatiquement' : 'Configure automatically';
    const later = fr ? 'Plus tard' : 'Not now';
    const choice = await vscode.window.showInformationMessage(
      fr ? 'Advanced Claude Plan a besoin d\'un hook Claude Code. L\'ajouter automatiquement à ~/.claude/settings.json ?'
         : 'Advanced Claude Plan needs a Claude Code hook. Add it automatically to ~/.claude/settings.json?',
      yes, later);
    if (choice === yes) {
      if (applyAndWrite() !== null) vscode.window.showInformationMessage(
        fr ? 'Hook ajouté. Relance ta session « claude » pour l\'activer.'
           : 'Hook added. Restart your "claude" session to enable it.');
    } else {
      context.globalState.update('hookPromptDismissed', true);
    }
    return;
  }

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
    context.globalState.update('hookPromptDismissed', false);
    vscode.window.showInformationMessage(
      fr ? 'Hook ajouté. Relance ta session « claude » pour l\'activer.'
         : 'Hook added. Restart your "claude" session to enable it.');
  }
}

function togglePanel(context) {
  if (panel) {
    panel.dispose();
  } else {
    ensurePanel(context);
    panel.reveal(vscode.ViewColumn.Beside);
  }
}

function updateStatus() {
  if (!statusItem) return;
  const fr = isFr();
  if (panel) {
    statusItem.text = '$(eye-closed) ' + (fr ? 'Masquer le plan' : 'Hide plan');
    statusItem.tooltip = fr ? 'Masquer le panneau Advanced Claude Plan' : 'Hide the Advanced Claude Plan panel';
  } else {
    statusItem.text = '$(list-tree) ' + (fr ? 'Afficher le plan' : 'Show plan');
    statusItem.tooltip = fr ? 'Afficher le panneau Advanced Claude Plan' : 'Show the Advanced Claude Plan panel';
  }
}

function startServer(context) {
  if (server) {
    ensurePanel(context);
    panel.reveal(vscode.ViewColumn.Beside);
    return;
  }
  const port = vscode.workspace.getConfiguration('planViewer').get('port', 4756);
  server = http.createServer((req, res) => {
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
        currentPlan = data.plan || '';
        currentLang = vscode.env.language;
        ensurePanel(context);
        panel.reveal(vscode.ViewColumn.Beside, true);
        panel.webview.postMessage({ type: 'plan', plan: currentPlan, lang: currentLang });
        pendingResponse = res;
      });
      return;
    }
    res.writeHead(404);
    res.end();
  });
  server.listen(port, '127.0.0.1', () => {
    const msg = isFr() ? `Advanced Claude Plan actif (port ${port})` : `Advanced Claude Plan active (port ${port})`;
    vscode.window.setStatusBarMessage(msg, 4000);
  });
  server.on('error', err => {
    vscode.window.showErrorMessage(`Advanced Claude Plan: ${err.message}`);
    server = undefined;
  });
  ensurePanel(context);
}

function ensurePanel(context) {
  if (panel) return;
  panel = vscode.window.createWebviewPanel(
    'planViewer',
    'Advanced Claude Plan',
    vscode.ViewColumn.Beside,
    { enableScripts: true, retainContextWhenHidden: true }
  );
  const cssUri = panel.webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'webview.css'));
  const jsUri = panel.webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'webview.js'));
  const hljsUri = panel.webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'highlight.min.js'));
  const hljsCssUri = panel.webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'highlight-theme.css'));
  let html = fs.readFileSync(path.join(context.extensionUri.fsPath, 'webview.html'), 'utf8');
  html = html
    .replace('{{cssUri}}', cssUri)
    .replace('{{jsUri}}', jsUri)
    .replace('{{hljsUri}}', hljsUri)
    .replace('{{hljsCssUri}}', hljsCssUri)
    .replace('{{hookConfigured}}', String(isHookConfigured()));
  panel.webview.html = html;
  panel.webview.onDidReceiveMessage(msg => {
    if (msg.type === 'ready') {
      sendStatus();
      if (pendingResponse && currentPlan != null && panel) {
        panel.webview.postMessage({ type: 'plan', plan: currentPlan, lang: currentLang });
      }
      return;
    }
    if (msg.type === 'configureHook') {
      const fr = isFr();
      const res = configureHookDirect(context);
      if (res.ok) {
        sendStatus();
        vscode.window.showInformationMessage(fr ? 'Hook configuré. Relance ta session « claude ».' : 'Hook configured. Restart your "claude" session.');
      } else if (res.reason === 'unreadable') {
        vscode.window.showWarningMessage(fr ? '~/.claude/settings.json illisible (JSON invalide) — rien n\'a été modifié.' : '~/.claude/settings.json is unreadable (invalid JSON) — nothing was changed.');
      } else {
        vscode.window.showErrorMessage('Advanced Claude Plan: ' + res.reason);
      }
      return;
    }
    if (!pendingResponse) return;
    if (msg.type === 'approve') {
      respond({});
      if (panel) panel.dispose();
    } else if (msg.type === 'feedback') {
      respond({ permissionDecision: 'deny', permissionDecisionReason: msg.text });
      if (panel) panel.dispose();
    }
  });
  panel.onDidDispose(() => {
    panel = undefined;
    updateStatus();
  });
  updateStatus();
}

function respond(result) {
  pendingResponse.writeHead(200, { 'Content-Type': 'application/json' });
  pendingResponse.end(JSON.stringify(result));
  pendingResponse = null;
  currentPlan = null;
  currentLang = null;
}

function deactivate() {
  if (server) server.close();
}

module.exports = { activate, deactivate };
