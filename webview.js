const vscode = acquireVsCodeApi();
const emptyEl = document.getElementById('empty');
const contentEl = document.getElementById('content');
const markdownEl = document.getElementById('markdown');
const hintEl = document.getElementById('hint');
const feedbackEl = document.getElementById('feedback');
const sendBtn = document.getElementById('send');
const approveBtn = document.getElementById('approve');
const annSection = document.getElementById('annotations');
const annListEl = document.getElementById('ann-list');
const annCountEl = document.getElementById('ann-count');
const toolbar = document.getElementById('sel-toolbar');
const popover = document.getElementById('ann-popover');
const popQuote = popover.querySelector('.pop-quote');
const popInput = document.getElementById('pop-input');
const popOk = document.getElementById('pop-ok');
const popCancel = document.getElementById('pop-cancel');
const modalOverlay = document.getElementById('modal-overlay');
const modalCount = document.getElementById('modal-count');
const modalCancel = document.getElementById('modal-cancel');
const modalApprove = document.getElementById('modal-approve');
const modalSend = document.getElementById('modal-send');
const ctxMenu = document.getElementById('ctx-menu');
const setupEl = document.getElementById('setup');
const setupConfigEl = document.getElementById('setup-config');
const setupDoneEl = document.getElementById('setup-done');
const setupTitleEl = document.getElementById('setup-title');
const setupTextEl = document.getElementById('setup-text');
const setupBtn = document.getElementById('setup-btn');
const setupDoneTitleEl = document.getElementById('setup-done-title');
const setupDoneTextEl = document.getElementById('setup-done-text');

let hookConfigured = document.body.dataset.hook === 'true';
let planActive = false;
let configuredViaPanel = false;
let pendingConfigure = false;

const STRINGS = {
  fr: {
    empty: "En attente d'un plan Claude Code…",
    hint: 'Sélectionne du texte dans le plan pour le <b>commenter</b>, proposer un <b>remplacement</b> ou le <b>supprimer</b>.',
    feedbackPh: 'Retour général à envoyer à Claude pour affiner le plan… (optionnel si tu as des annotations)',
    send: 'Renvoyer avec ce retour',
    sendN: n => 'Renvoyer (' + n + ' annotation' + (n > 1 ? 's' : '') + ')',
    approve: 'Approuver le plan',
    tComment: 'Commenter', tReplace: 'Remplacer', tDelete: 'Supprimer',
    cCut: 'Couper', cCopy: 'Copier', cPaste: 'Coller',
    phComment: 'Ton commentaire…', phReplace: 'Texte de remplacement proposé…',
    add: 'Ajouter', save: 'Enregistrer', cancel: 'Annuler',
    lblComment: 'Commentaire', lblReplace: 'Remplacement', lblDelete: 'Suppression',
    remove: 'Retirer', edit: 'Modifier',
    modalTitle: 'Annotations non envoyées',
    modalTextA: 'Tu as ',
    modalTextB: n => ' annotation' + (n > 1 ? 's' : '') + ' sur ce plan. Approuver le plan ne les transmettra pas à Claude.',
    mSend: 'Renvoyer avec mes annotations', mApprove: 'Approuver sans envoyer', mCancel: 'Annuler',
    fbHeader: '--- Annotations sur le plan (les numéros de ligne renvoient au plan markdown) ---',
    fbLine: l => ' (ligne ' + l + ')',
    fbDelete: 'SUPPRIMER', fbReplace: 'REMPLACER', fbComment: 'COMMENTAIRE', fbBy: ' par : ',
    setupTitle: 'Configuration requise',
    setupText: 'Advanced Claude Plan a besoin d\'un hook Claude Code pour recevoir les plans. Ajoute-le automatiquement à ta configuration Claude.',
    setupBtn: 'Configurer automatiquement',
    setupBusy: 'Configuration…',
    setupDoneTitle: 'Hook ajouté ✓',
    setupDoneText: 'Relance ta session « claude » pour l\'activer. Le prochain plan s\'affichera ici.'
  },
  en: {
    empty: 'Waiting for a Claude Code plan…',
    hint: 'Select text in the plan to <b>comment</b>, suggest a <b>replacement</b>, or <b>delete</b> it.',
    feedbackPh: 'General feedback to send to Claude to refine the plan… (optional if you have annotations)',
    send: 'Send back with this feedback',
    sendN: n => 'Send back (' + n + ' annotation' + (n > 1 ? 's' : '') + ')',
    approve: 'Approve plan',
    tComment: 'Comment', tReplace: 'Replace', tDelete: 'Delete',
    cCut: 'Cut', cCopy: 'Copy', cPaste: 'Paste',
    phComment: 'Your comment…', phReplace: 'Suggested replacement text…',
    add: 'Add', save: 'Save', cancel: 'Cancel',
    lblComment: 'Comment', lblReplace: 'Replacement', lblDelete: 'Deletion',
    remove: 'Remove', edit: 'Edit',
    modalTitle: 'Unsent annotations',
    modalTextA: 'You have ',
    modalTextB: n => ' annotation' + (n > 1 ? 's' : '') + " on this plan. Approving the plan won't send them to Claude.",
    mSend: 'Send back with my annotations', mApprove: 'Approve without sending', mCancel: 'Cancel',
    fbHeader: '--- Annotations on the plan (line numbers refer to the markdown plan) ---',
    fbLine: l => ' (line ' + l + ')',
    fbDelete: 'DELETE', fbReplace: 'REPLACE', fbComment: 'COMMENT', fbBy: ' with: ',
    setupTitle: 'Setup required',
    setupText: 'Advanced Claude Plan needs a Claude Code hook to receive plans. Add it automatically to your Claude configuration.',
    setupBtn: 'Configure automatically',
    setupBusy: 'Configuring…',
    setupDoneTitle: 'Hook added ✓',
    setupDoneText: 'Restart your "claude" session to enable it. The next plan will appear here.'
  }
};

let LANG = /^fr/i.test(navigator.language || 'fr') ? 'fr' : 'en';
function T() { return STRINGS[LANG]; }
function typeLabel(type) { return type === 'comment' ? T().lblComment : type === 'replace' ? T().lblReplace : T().lblDelete; }
function labelForAction(a) {
  const t = T();
  return { comment: t.tComment, replace: t.tReplace, delete: t.tDelete, cut: t.cCut, copy: t.cCopy, paste: t.cPaste }[a];
}

function applyI18n() {
  const t = T();
  emptyEl.textContent = t.empty;
  hintEl.innerHTML = t.hint;
  feedbackEl.placeholder = t.feedbackPh;
  approveBtn.textContent = t.approve;
  popCancel.textContent = t.cancel;
  document.getElementById('modal-title').textContent = t.modalTitle;
  document.getElementById('modal-text-a').textContent = t.modalTextA;
  modalSend.textContent = t.mSend;
  modalApprove.textContent = t.mApprove;
  modalCancel.textContent = t.mCancel;
  document.querySelectorAll('#sel-toolbar button, #ctx-menu button').forEach(b => {
    const span = b.querySelector('span');
    if (span) span.textContent = labelForAction(b.getAttribute('data-action'));
  });
  setupTitleEl.textContent = t.setupTitle;
  setupTextEl.textContent = t.setupText;
  if (!pendingConfigure) setupBtn.textContent = t.setupBtn;
  setupDoneTitleEl.textContent = t.setupDoneTitle;
  setupDoneTextEl.textContent = t.setupDoneText;
  renderAnnList();
}

function updateBaseView() {
  if (planActive) return;
  contentEl.classList.add('hidden');
  if (!hookConfigured) {
    emptyEl.classList.add('hidden');
    setupEl.classList.remove('hidden');
    setupConfigEl.classList.remove('hidden');
    setupDoneEl.classList.add('hidden');
    setupBtn.disabled = false;
    setupBtn.textContent = T().setupBtn;
  } else if (configuredViaPanel) {
    emptyEl.classList.add('hidden');
    setupEl.classList.remove('hidden');
    setupConfigEl.classList.add('hidden');
    setupDoneEl.classList.remove('hidden');
  } else {
    setupEl.classList.add('hidden');
    emptyEl.classList.remove('hidden');
  }
}

let annotations = [];
let seq = 0;
let currentRange = null;
let pendingType = null;
let editingId = null;

const X_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
const COMMENT_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
const REPLACE_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>';
const DELETE_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>';
const TYPE_ICON = { comment: COMMENT_SVG, replace: REPLACE_SVG, delete: DELETE_SVG };

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function inline(s) {
  const codes = [];
  s = s.replace(/`([^`]+)`/g, (m, c) => { codes.push(c); return '@@CODE' + (codes.length - 1) + '@@'; });
  s = escapeHtml(s);
  s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, '<img alt="$1" src="$2">');
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, '<a href="$2">$1</a>');
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/__([^_]+)__/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^*])\*([^*\s][^*]*?)\*/g, '$1<em>$2</em>');
  s = s.replace(/(^|[^_\w])_([^_\s][^_]*?)_/g, '$1<em>$2</em>');
  s = s.replace(/~~([^~]+)~~/g, '<del>$1</del>');
  s = s.replace(/@@CODE(\d+)@@/g, (m, i) => '<code>' + escapeHtml(codes[i]) + '</code>');
  return s;
}

function splitRow(line) {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());
}

function renderList(items) {
  let html = '';
  const stack = [];
  for (const it of items) {
    while (stack.length && it.level < stack[stack.length - 1].level) {
      html += '</li>';
      const s = stack.pop();
      html += s.ordered ? '</ol>' : '</ul>';
    }
    if (!stack.length || it.level > stack[stack.length - 1].level) {
      html += it.ordered ? '<ol>' : '<ul>';
      stack.push({ ordered: it.ordered, level: it.level });
      html += '<li data-line="' + it.line + '">' + itemInner(it);
    } else {
      html += '</li><li data-line="' + it.line + '">' + itemInner(it);
    }
  }
  while (stack.length) {
    html += '</li>';
    const s = stack.pop();
    html += s.ordered ? '</ol>' : '</ul>';
  }
  return html;
}

function itemInner(it) {
  const task = it.text.match(/^\[([ xX])\]\s+(.*)$/);
  if (task) {
    const checked = task[1].toLowerCase() === 'x' ? 'checked' : '';
    return '<span class="task"><input type="checkbox" disabled ' + checked + '> ' + inline(task[2]) + '</span>';
  }
  return inline(it.text);
}

function renderMarkdown(text) {
  const lines = text.replace(/\r/g, '').replace(/\t/g, '  ').split('\n');
  const n = lines.length;
  let html = '';
  let i = 0;
  while (i < n) {
    const line = lines[i];
    const lineNo = i + 1;
    const fence = line.match(/^```(.*)$/);
    if (fence) {
      const lang = fence[1].trim();
      i++;
      const buf = [];
      while (i < n && !/^```/.test(lines[i])) { buf.push(lines[i]); i++; }
      i++;
      html += '<pre data-line="' + lineNo + '"><code class="lang-' + escapeHtml(lang) + '">' + escapeHtml(buf.join('\n')) + '</code></pre>';
      continue;
    }
    if (/^\s*$/.test(line)) { i++; continue; }
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      html += '<h' + h[1].length + ' data-line="' + lineNo + '">' + inline(h[2].replace(/\s+#+\s*$/, '')) + '</h' + h[1].length + '>';
      i++;
      continue;
    }
    if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) { html += '<hr data-line="' + lineNo + '">'; i++; continue; }
    if (line.includes('|') && i + 1 < n && lines[i + 1].includes('-') && /^\s*\|?[\s:|-]*-[\s:|-]*\|?\s*$/.test(lines[i + 1])) {
      const header = splitRow(line);
      const align = splitRow(lines[i + 1]).map(c => {
        const l = c.startsWith(':'), r = c.endsWith(':');
        return l && r ? 'center' : r ? 'right' : l ? 'left' : '';
      });
      i += 2;
      const rows = [];
      while (i < n && lines[i].includes('|') && !/^\s*$/.test(lines[i])) { rows.push(splitRow(lines[i])); i++; }
      let t = '<table data-line="' + lineNo + '"><thead><tr>';
      header.forEach((c, idx) => { t += '<th' + (align[idx] ? ' style="text-align:' + align[idx] + '"' : '') + '>' + inline(c) + '</th>'; });
      t += '</tr></thead><tbody>';
      for (const r of rows) {
        t += '<tr>';
        header.forEach((_, idx) => { t += '<td' + (align[idx] ? ' style="text-align:' + align[idx] + '"' : '') + '>' + inline(r[idx] || '') + '</td>'; });
        t += '</tr>';
      }
      html += t + '</tbody></table>';
      continue;
    }
    if (/^\s*>/.test(line)) {
      const buf = [];
      while (i < n && /^\s*>/.test(lines[i])) { buf.push(lines[i].replace(/^\s*>\s?/, '')); i++; }
      html += '<blockquote data-line="' + lineNo + '">' + renderMarkdown(buf.join('\n')).replace(/ data-line="\d+"/g, '') + '</blockquote>';
      continue;
    }
    if (/^\s*([-*+]|\d+\.)\s+/.test(line)) {
      const items = [];
      while (i < n) {
        const m = lines[i].match(/^(\s*)([-*+]|\d+\.)\s+(.*)$/);
        if (!m) break;
        items.push({ level: Math.floor(m[1].length / 2), ordered: /\d/.test(m[2]), text: m[3], line: i + 1 });
        i++;
      }
      html += renderList(items);
      continue;
    }
    const buf = [];
    while (i < n && !/^\s*$/.test(lines[i]) && !/^```/.test(lines[i]) && !/^(#{1,6})\s/.test(lines[i]) &&
           !/^\s*>/.test(lines[i]) && !/^\s*([-*+]|\d+\.)\s/.test(lines[i]) &&
           !/^\s*([-*_])(\s*\1){2,}\s*$/.test(lines[i])) {
      buf.push(lines[i]);
      i++;
    }
    html += '<p data-line="' + lineNo + '">' + inline(buf.join(' ')) + '</p>';
  }
  return html;
}

function highlightCode() {
  if (typeof hljs === 'undefined') return;
  markdownEl.querySelectorAll('pre code').forEach(block => {
    const langClass = Array.from(block.classList).find(c => c.indexOf('lang-') === 0);
    const lang = langClass ? langClass.slice(5) : '';
    let result;
    try {
      if (lang && hljs.getLanguage(lang)) result = hljs.highlight(block.textContent, { language: lang });
      else result = hljs.highlightAuto(block.textContent);
    } catch (e) { return; }
    block.innerHTML = result.value;
    block.classList.add('hljs');
    const label = lang || result.language;
    if (label) block.parentElement.setAttribute('data-lang', label);
  });
}

const hlSupported = typeof Highlight !== 'undefined' && typeof CSS !== 'undefined' && CSS.highlights;
const highlights = {};
if (hlSupported) {
  for (const t of ['comment', 'replace', 'delete']) {
    highlights[t] = new Highlight();
    CSS.highlights.set('ann-' + t, highlights[t]);
  }
}

function rebuildHighlights() {
  if (!hlSupported) return;
  for (const t of ['comment', 'replace', 'delete']) highlights[t].clear();
  for (const a of annotations) {
    if (a.range) {
      try { highlights[a.type].add(a.range); } catch (e) {}
    }
  }
}

function renderAnnList() {
  annListEl.innerHTML = '';
  for (const a of annotations) {
    const item = document.createElement('div');
    item.className = 'ann-item ' + a.type;

    const icon = document.createElement('span');
    icon.className = 'ann-icon';
    icon.innerHTML = TYPE_ICON[a.type];

    const body = document.createElement('div');
    body.className = 'ann-body';
    const label = document.createElement('div');
    label.className = 'ann-type';
    label.textContent = typeLabel(a.type);
    body.appendChild(label);
    if (a.line) {
      const lineTag = document.createElement('span');
      lineTag.className = 'ann-line';
      lineTag.textContent = 'L' + a.line;
      body.appendChild(lineTag);
    }
    const quote = document.createElement('span');
    quote.className = 'ann-quote';
    quote.textContent = '« ' + a.quote.replace(/\s+/g, ' ').trim() + ' »';
    body.appendChild(quote);
    if (a.type !== 'delete' || a.note) {
      const note = document.createElement('div');
      note.className = 'ann-note' + (a.type === 'delete' ? ' strike' : '');
      note.textContent = a.type === 'replace' ? '→ ' + a.note : a.note;
      body.appendChild(note);
    }

    const remove = document.createElement('button');
    remove.className = 'ann-remove';
    remove.innerHTML = X_SVG;
    remove.title = T().remove;
    remove.addEventListener('click', e => {
      e.stopPropagation();
      annotations = annotations.filter(x => x.id !== a.id);
      rebuildHighlights();
      renderAnnList();
    });

    if (a.type === 'comment' || a.type === 'replace') {
      item.classList.add('editable');
      item.title = T().edit;
      item.addEventListener('click', () => openEditAnnotation(a, item));
    }

    item.appendChild(icon);
    item.appendChild(body);
    item.appendChild(remove);
    annListEl.appendChild(item);
  }
  annCountEl.textContent = annotations.length;
  annSection.classList.toggle('hidden', annotations.length === 0);
  sendBtn.textContent = annotations.length ? T().sendN(annotations.length) : T().send;
}

function hideToolbar() { toolbar.classList.add('hidden'); }
function hidePopover() { popover.classList.add('hidden'); pendingType = null; editingId = null; }

function showToolbarAt(rect) {
  toolbar.classList.remove('hidden');
  const tw = toolbar.offsetWidth;
  let left = rect.left + rect.width / 2 - tw / 2;
  left = Math.max(6, Math.min(left, window.innerWidth - tw - 6));
  let top = rect.top - toolbar.offsetHeight - 8;
  if (top < 6) top = rect.bottom + 8;
  toolbar.style.left = left + 'px';
  toolbar.style.top = top + 'px';
}

function positionPopover(rect) {
  popover.classList.remove('hidden');
  let left = Math.min(rect.left, window.innerWidth - popover.offsetWidth - 8);
  let top = rect.bottom + 8;
  if (top + popover.offsetHeight > window.innerHeight - 8) top = Math.max(8, rect.top - popover.offsetHeight - 8);
  popover.style.left = Math.max(8, left) + 'px';
  popover.style.top = top + 'px';
}

function openPopover(type) {
  if (!currentRange) return;
  editingId = null;
  pendingType = type;
  hideToolbar();
  hideCtxMenu();
  popQuote.textContent = '« ' + currentRange.toString().replace(/\s+/g, ' ').trim() + ' »';
  popInput.value = '';
  popInput.placeholder = type === 'replace' ? T().phReplace : T().phComment;
  popOk.textContent = T().add;
  positionPopover(currentRange.getBoundingClientRect());
  popInput.focus();
}

function openEditAnnotation(a, anchorEl) {
  editingId = a.id;
  pendingType = a.type;
  popQuote.textContent = '« ' + a.quote.replace(/\s+/g, ' ').trim() + ' »';
  popInput.value = a.note || '';
  popInput.placeholder = a.type === 'replace' ? T().phReplace : T().phComment;
  popOk.textContent = T().save;
  positionPopover(anchorEl.getBoundingClientRect());
  popInput.focus();
  popInput.select();
}

function lineOfRange(range) {
  let node = range.startContainer;
  if (node && node.nodeType === 3) node = node.parentElement;
  while (node && node !== markdownEl && !(node.getAttribute && node.getAttribute('data-line'))) node = node.parentElement;
  return node && node.getAttribute ? node.getAttribute('data-line') : null;
}

function addAnnotation(type, note) {
  if (!currentRange) return;
  annotations.push({ id: ++seq, type, quote: currentRange.toString(), note: note || '', range: currentRange.cloneRange(), line: lineOfRange(currentRange) });
  rebuildHighlights();
  renderAnnList();
  const sel = window.getSelection();
  if (sel) sel.removeAllRanges();
  currentRange = null;
  hideToolbar();
  hidePopover();
}

function fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); } catch (e) {}
  document.body.removeChild(ta);
}

function copySelection() {
  if (!currentRange) return;
  const text = currentRange.toString();
  const done = () => {
    const s = window.getSelection();
    if (s) s.removeAllRanges();
    currentRange = null;
    hideToolbar();
  };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(done, () => { fallbackCopy(text); done(); });
  } else {
    fallbackCopy(text);
    done();
  }
}

function pasteIntoFeedback() {
  if (!navigator.clipboard || !navigator.clipboard.readText) return;
  navigator.clipboard.readText().then(text => {
    if (!text) return;
    const el = feedbackEl;
    const start = el.selectionStart != null ? el.selectionStart : el.value.length;
    const end = el.selectionEnd != null ? el.selectionEnd : el.value.length;
    el.value = el.value.slice(0, start) + text + el.value.slice(end);
    const pos = start + text.length;
    el.focus();
    try { el.setSelectionRange(pos, pos); } catch (e) {}
  }, () => {});
}

markdownEl.addEventListener('mouseup', e => {
  if (e.button === 2) return;
  setTimeout(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.toString().trim()) { hideToolbar(); return; }
    const anchor = sel.anchorNode;
    if (!anchor || !markdownEl.contains(anchor)) { hideToolbar(); return; }
    currentRange = sel.getRangeAt(0).cloneRange();
    showToolbarAt(currentRange.getBoundingClientRect());
  }, 0);
});

const ctxPos = { x: -1, y: -1 };

function hideCtxMenu() { ctxMenu.classList.add('hidden'); ctxPos.x = -1; ctxPos.y = -1; }

function showCtxMenu(x, y) {
  hideToolbar();
  hidePopover();
  ctxMenu.classList.remove('hidden');
  ctxPos.x = x; ctxPos.y = y;
  const w = ctxMenu.offsetWidth, h = ctxMenu.offsetHeight;
  ctxMenu.style.left = Math.max(8, Math.min(x, window.innerWidth - w - 8)) + 'px';
  ctxMenu.style.top = Math.max(8, Math.min(y, window.innerHeight - h - 8)) + 'px';
}

markdownEl.addEventListener('contextmenu', e => {
  e.preventDefault();
  if (!ctxMenu.classList.contains('hidden') && Math.abs(e.clientX - ctxPos.x) < 5 && Math.abs(e.clientY - ctxPos.y) < 5) {
    hideCtxMenu();
    return;
  }
  const sel = window.getSelection();
  const hasSel = !!(sel && !sel.isCollapsed && sel.toString().trim() && markdownEl.contains(sel.anchorNode));
  currentRange = hasSel ? sel.getRangeAt(0).cloneRange() : null;
  ctxMenu.querySelectorAll('button').forEach(b => {
    const a = b.getAttribute('data-action');
    b.disabled = a !== 'paste' && !hasSel;
  });
  showCtxMenu(e.clientX, e.clientY);
});

ctxMenu.addEventListener('mousedown', e => e.preventDefault());
ctxMenu.querySelectorAll('button').forEach(btn => {
  btn.addEventListener('click', () => {
    if (btn.disabled) return;
    const type = btn.getAttribute('data-action');
    hideCtxMenu();
    if (type === 'copy' || type === 'cut') { copySelection(); return; }
    if (type === 'paste') { pasteIntoFeedback(); return; }
    if (type === 'delete') { addAnnotation('delete'); return; }
    if (type === 'comment' || type === 'replace') { openPopover(type); return; }
  });
});

toolbar.addEventListener('mousedown', e => e.preventDefault());
toolbar.querySelectorAll('button').forEach(btn => {
  btn.addEventListener('click', () => {
    const type = btn.getAttribute('data-action');
    if (type === 'delete') { addAnnotation('delete'); return; }
    openPopover(type);
  });
});

popOk.addEventListener('click', () => {
  const note = popInput.value.trim();
  if (!note) { popInput.focus(); return; }
  if (editingId != null) {
    const a = annotations.find(x => x.id === editingId);
    if (a) a.note = note;
    hidePopover();
    renderAnnList();
  } else {
    addAnnotation(pendingType, note);
  }
});
popCancel.addEventListener('click', () => { hidePopover(); currentRange = null; });
popInput.addEventListener('keydown', e => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') popOk.click();
  if (e.key === 'Escape') popCancel.click();
});

document.addEventListener('mousedown', e => {
  if (!toolbar.contains(e.target) && !markdownEl.contains(e.target)) hideToolbar();
  if (!popover.contains(e.target) && !toolbar.contains(e.target) && !annListEl.contains(e.target)) {
    if (!popover.classList.contains('hidden')) { hidePopover(); currentRange = null; }
  }
  if (e.button !== 2 && !ctxMenu.contains(e.target)) hideCtxMenu();
});

document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (!modalOverlay.classList.contains('hidden')) hideConfirm();
  if (!ctxMenu.classList.contains('hidden')) hideCtxMenu();
});

function buildFeedback() {
  const t = T();
  const parts = [];
  const gen = feedbackEl.value.trim();
  if (gen) parts.push(gen);
  if (annotations.length) {
    const lines = [t.fbHeader];
    annotations.forEach((a, idx) => {
      const q = a.quote.replace(/\s+/g, ' ').trim();
      const loc = a.line ? t.fbLine(a.line) : '';
      if (a.type === 'delete') lines.push((idx + 1) + '. [' + t.fbDelete + ']' + loc + ' « ' + q + ' »' + (a.note ? ' — ' + a.note : ''));
      else if (a.type === 'replace') lines.push((idx + 1) + '. [' + t.fbReplace + ']' + loc + ' « ' + q + ' »' + t.fbBy + '« ' + a.note + ' »');
      else lines.push((idx + 1) + '. [' + t.fbComment + ']' + loc + ' « ' + q + ' » : ' + a.note);
    });
    parts.push(lines.join('\n'));
  }
  return parts.join('\n\n');
}

function resetView() {
  planActive = false;
  contentEl.classList.add('hidden');
  annotations = [];
  currentRange = null;
  rebuildHighlights();
  renderAnnList();
  feedbackEl.value = '';
  hideToolbar();
  hidePopover();
  ctxMenu.classList.add('hidden');
  modalOverlay.classList.add('hidden');
  updateBaseView();
}

function doSend() {
  const text = buildFeedback();
  if (!text.trim()) { feedbackEl.focus(); return; }
  vscode.postMessage({ type: 'feedback', text });
  resetView();
}

function doApprove() {
  vscode.postMessage({ type: 'approve' });
  resetView();
}

function showConfirm() {
  modalCount.textContent = annotations.length;
  document.getElementById('modal-text-b').textContent = T().modalTextB(annotations.length);
  modalOverlay.classList.remove('hidden');
}

function hideConfirm() { modalOverlay.classList.add('hidden'); }

sendBtn.addEventListener('click', doSend);
approveBtn.addEventListener('click', () => {
  if (annotations.length > 0) { showConfirm(); return; }
  doApprove();
});
modalCancel.addEventListener('click', hideConfirm);
modalApprove.addEventListener('click', () => { hideConfirm(); doApprove(); });
modalSend.addEventListener('click', () => { hideConfirm(); doSend(); });
modalOverlay.addEventListener('mousedown', e => { if (e.target === modalOverlay) hideConfirm(); });

window.addEventListener('message', event => {
  const msg = event.data;
  if (msg.type === 'status') {
    if (msg.lang) { LANG = /^fr/i.test(msg.lang) ? 'fr' : 'en'; applyI18n(); }
    hookConfigured = msg.hookConfigured;
    if (pendingConfigure && hookConfigured) { configuredViaPanel = true; pendingConfigure = false; }
    if (!hookConfigured) pendingConfigure = false;
    updateBaseView();
    return;
  }
  if (msg.type === 'plan') {
    if (msg.lang) LANG = /^fr/i.test(msg.lang) ? 'fr' : 'en';
    applyI18n();
    planActive = true;
    configuredViaPanel = false;
    hookConfigured = true;
    emptyEl.classList.add('hidden');
    setupEl.classList.add('hidden');
    contentEl.classList.remove('hidden');
    annotations = [];
    currentRange = null;
    markdownEl.innerHTML = renderMarkdown(msg.plan || '');
    highlightCode();
    rebuildHighlights();
    renderAnnList();
    feedbackEl.value = '';
    window.scrollTo(0, 0);
  }
});

setupBtn.addEventListener('click', () => {
  if (hookConfigured) return;
  pendingConfigure = true;
  setupBtn.disabled = true;
  setupBtn.textContent = T().setupBusy;
  vscode.postMessage({ type: 'configureHook' });
});

applyI18n();
updateBaseView();
vscode.postMessage({ type: 'ready' });
