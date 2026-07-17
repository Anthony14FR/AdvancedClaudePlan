/**
 * @file Extension entry point. Wires the local plan server, the webview panel,
 * the status bar and the hook configuration together.
 */

const vscode = require('vscode');
const server = require('./server');
const panel = require('./panel');
const statusBar = require('./statusBar');
const hookConfig = require('./hookConfig');
const { firstWorkspacePath, hookScriptPath, isFr } = require('./util');

let planServer = null;
let panelController = null;
let currentRespond = null;

/**
 * Activate the extension: create the status bar and panel, start the plan server,
 * register commands and keep the hook path in sync.
 * @param {import('vscode').ExtensionContext} context
 */
function activate(context) {
  context.subscriptions.push(statusBar.create());

  panelController = panel.create(context, {
    onApprove: () => {
      if (!currentRespond) return false;
      currentRespond({});
      currentRespond = null;
      return true;
    },
    onFeedback: (text) => {
      if (!currentRespond) return false;
      currentRespond({ permissionDecision: 'deny', permissionDecisionReason: text });
      currentRespond = null;
      return true;
    },
    hasPendingPlan: () => currentRespond != null,
    onVisibilityChange: () => statusBar.update(panelController.isOpen())
  });

  const basePort = vscode.workspace.getConfiguration('planViewer').get('port', 4756);
  planServer = server.create({
    basePort,
    workspace: firstWorkspacePath(),
    onPlan: (data, respond) => {
      currentRespond = respond;
      panelController.showPlan(data.plan || '', vscode.env.language);
    }
  });
  planServer.start(
    (port) => {
      const msg = isFr() ? `Advanced Claude Plan actif (port ${port})` : `Advanced Claude Plan active (port ${port})`;
      vscode.window.setStatusBarMessage(msg, 4000);
    },
    (err) => vscode.window.showErrorMessage(`Advanced Claude Plan: ${err.message}`)
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('planViewer.start', () => panelController.show()),
    vscode.commands.registerCommand('planViewer.show', () => panelController.show()),
    vscode.commands.registerCommand('planViewer.toggle', () => panelController.toggle()),
    vscode.commands.registerCommand('planViewer.configureHook', () => hookConfig.configureHook(hookScriptPath(context)))
  );

  hookConfig.syncHookPathIfPresent(hookScriptPath(context));
}

/**
 * Deactivate the extension: unregister and close the local plan server.
 */
function deactivate() {
  if (planServer) planServer.close();
}

module.exports = { activate, deactivate };
