/**
 * @file Small shared helpers used across the extension.
 */

const vscode = require('vscode');
const path = require('path');

/**
 * Whether the VS Code display language is French.
 * @returns {boolean}
 */
function isFr() {
  return /^fr/i.test(vscode.env.language || '');
}

/**
 * Absolute path of the first workspace folder, or `null` when no folder is open.
 * @returns {string|null}
 */
function firstWorkspacePath() {
  const folders = vscode.workspace.workspaceFolders;
  return folders && folders.length ? folders[0].uri.fsPath : null;
}

/**
 * Absolute path to the bundled Claude Code hook script.
 * @param {import('vscode').ExtensionContext} context
 * @returns {string}
 */
function hookScriptPath(context) {
  return path.join(context.extensionUri.fsPath, 'hook', 'hook.js');
}

module.exports = { isFr, firstWorkspacePath, hookScriptPath };
