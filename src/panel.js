/**
 * @file Webview panel that renders the plan, hosts the review UI and drives the
 * one-click hook setup. A single panel instance is reused across shows.
 */

const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const hookConfig = require('./hookConfig');
const { hookScriptPath, isFr } = require('./util');

/**
 * Create the panel controller.
 * @param {import('vscode').ExtensionContext} context
 * @param {Object} handlers
 * @param {function(): boolean} handlers.onApprove approve the pending plan; returns
 *   `true` when a plan was pending (and thus consumed)
 * @param {function(string): boolean} handlers.onFeedback deny the pending plan with
 *   feedback; returns `true` when a plan was pending
 * @param {function(): boolean} handlers.hasPendingPlan whether a plan is awaiting a decision
 * @param {function(): void} handlers.onVisibilityChange called when the panel opens or closes
 * @returns {{show: function, toggle: function, showPlan: function, isOpen: function, dispose: function}}
 */
function create(context, handlers) {
  let panel = null;
  let currentPlan = null;
  let currentLang = null;

  /** @returns {boolean} whether the panel is currently open */
  function isOpen() {
    return !!panel;
  }

  function sendStatus() {
    if (panel) {
      panel.webview.postMessage({ type: 'status', hookConfigured: hookConfig.isHookConfigured(), lang: vscode.env.language });
    }
  }

  function buildHtml() {
    const uri = (rel) => panel.webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, ...rel.split('/')));
    const html = fs.readFileSync(path.join(context.extensionUri.fsPath, 'media', 'webview.html'), 'utf8');
    return html
      .replace('{{cssUri}}', uri('media/webview.css'))
      .replace('{{jsUri}}', uri('media/webview.js'))
      .replace('{{hljsUri}}', uri('media/vendor/highlight.min.js'))
      .replace('{{fontsCssUri}}', uri('media/fonts/fonts.css'))
      .replace('{{hljsCssUri}}', uri('media/vendor/highlight.css'))
      .replace('{{hookConfigured}}', String(hookConfig.isHookConfigured()));
  }

  function ensurePanel() {
    if (panel) return;
    panel = vscode.window.createWebviewPanel(
      'planViewer',
      'Advanced Claude Plan',
      vscode.ViewColumn.Beside,
      { enableScripts: true, retainContextWhenHidden: true }
    );
    panel.webview.html = buildHtml();
    panel.webview.onDidReceiveMessage(msg => {
      if (msg.type === 'ready') {
        sendStatus();
        if (currentPlan != null && handlers.hasPendingPlan()) {
          panel.webview.postMessage({ type: 'plan', plan: currentPlan, lang: currentLang });
        }
        return;
      }
      if (msg.type === 'configureHook') {
        const fr = isFr();
        const res = hookConfig.configureHookDirect(hookScriptPath(context));
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
      if (msg.type === 'approve') {
        if (handlers.onApprove()) dispose();
      } else if (msg.type === 'feedback') {
        if (handlers.onFeedback(msg.text)) dispose();
      }
    });
    panel.onDidDispose(() => {
      panel = null;
      handlers.onVisibilityChange();
    });
    handlers.onVisibilityChange();
  }

  /** Open (or reveal) the panel. */
  function show() {
    ensurePanel();
    panel.reveal(vscode.ViewColumn.Beside);
  }

  /** Toggle the panel's visibility. */
  function toggle() {
    if (panel) panel.dispose();
    else show();
  }

  /**
   * Display a plan, opening the panel if needed.
   * @param {string} plan markdown plan text
   * @param {string} lang VS Code display language for the webview
   */
  function showPlan(plan, lang) {
    currentPlan = plan;
    currentLang = lang;
    ensurePanel();
    panel.reveal(vscode.ViewColumn.Beside, true);
    panel.webview.postMessage({ type: 'plan', plan, lang });
  }

  /** Close the panel if open. */
  function dispose() {
    if (panel) panel.dispose();
  }

  return { show, toggle, showPlan, isOpen, dispose };
}

module.exports = { create };
