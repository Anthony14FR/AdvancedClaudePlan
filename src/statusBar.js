/**
 * @file Status-bar toggle that shows or hides the plan panel and reflects its
 * current visibility.
 */

const vscode = require('vscode');
const { isFr } = require('./util');

let item = null;

/**
 * Create the status-bar item bound to the toggle command.
 * @returns {import('vscode').StatusBarItem}
 */
function create() {
  item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  item.command = 'planViewer.toggle';
  update(false);
  item.show();
  return item;
}

/**
 * Refresh the label and tooltip for the current panel visibility.
 * @param {boolean} isOpen whether the panel is currently open
 */
function update(isOpen) {
  if (!item) return;
  const fr = isFr();
  if (isOpen) {
    item.text = '$(eye-closed) ' + (fr ? 'Masquer le plan' : 'Hide plan');
    item.tooltip = fr ? 'Masquer le panneau Advanced Claude Plan' : 'Hide the Advanced Claude Plan panel';
  } else {
    item.text = '$(list-tree) ' + (fr ? 'Afficher le plan' : 'Show plan');
    item.tooltip = fr ? 'Afficher le panneau Advanced Claude Plan' : 'Show the Advanced Claude Plan panel';
  }
}

module.exports = { create, update };
