# Advanced Claude Plan

> Review, annotate and approve **Claude Code** plan-mode plans in a readable VS Code panel — and send structured feedback back to the agent without touching the terminal.

**English** · [Version française](#francais)

`v0.9.6` · **Beta (pre-release)** · VS Code ≥ 1.85 · No npm dependencies · UI in 🇬🇧 / 🇫🇷

---

## Overview

When Claude Code proposes a plan (plan mode), it prints it in the terminal — awkward to read and comment on for large plans. **Advanced Claude Plan** intercepts that plan and shows it in a VS Code panel:

- clean Markdown rendering with **syntax highlighting**,
- **selection-based annotations** (comment / replace / delete), like a code review,
- **structured feedback** sent back to Claude automatically, including the **line number** involved,
- one-click **approval** that hands control back to Claude's native flow (mode selection).

If the extension isn't running, the hook fails gracefully and Claude Code falls back to its native approval screen.

## Features

- **Full Markdown rendering**: headings, nested lists, tables, task lists, blockquotes, links, images, inline formatting.
- **Syntax highlighting** via highlight.js, with **language auto-detection** when the fence has no language.
- **Annotations** on any selection:
  - 💬 **Comment** — attach a note,
  - ✏️ **Replace** — suggest replacement text,
  - 🗑 **Delete** — mark a passage for removal,
  - live highlighting, a summary list, and **editable** comment / replace annotations.
- **Line number** of the Markdown plan attached to each annotation and sent to Claude (helps on large plans).
- **Context menu** (right-click): Cut / Copy / Paste plus the annotation tools.
- **Structured feedback**: your general note plus all formatted annotations, sent in a single message.
- **Double confirmation** if you approve while unsent annotations exist.
- **Status-bar button** to show / hide the panel.
- **Internationalization** EN / FR, following the VS Code display language.
- **Resilience**: the plan survives a hide/show and a window reload.
- Clean **light theme** with a Claude-colored accent.

## How it works

```
Claude Code (ExitPlanMode)
      │  PreToolUse hook
      ▼
   hook.js ──POST /plan──▶ Local server (127.0.0.1:4756)
      ▲                            │
      │  allow / deny + feedback   ▼
      └──────────────────────  Webview panel  ◀── you read / annotate / decide
```

1. Claude Code calls the `ExitPlanMode` tool when it proposes a plan.
2. A `PreToolUse` hook (`hook.js`) intercepts the call and sends the plan to the extension's local HTTP server.
3. The hook **keeps the request open**: Claude waits (spinner) until your decision — this is intentional.
4. You read, annotate, then:
   - **Approve** → the hook returns no decision → Claude shows its native approval screen, where you pick the mode (auto / manual / bypass).
   - **Send back with feedback** → the hook returns a denial with your structured feedback as the reason → Claude revises and proposes a new plan.

## Requirements

- **VS Code** ≥ 1.85
- **Node.js** available on the `PATH` (the hook runs with `node`)
- **Claude Code** configured to use hooks

## Installation

Install from the **VS Code Marketplace**: open the **Extensions** view (`Ctrl+Shift+X`), search for **Advanced Claude Plan**, and click **Install**.

The extension starts its local server automatically when VS Code launches. While the hook isn't set up, the panel shows a **Setup required** screen with a one-click **Configure automatically** button that installs the required Claude Code hook for you (see below).

## Hook configuration

**Automatic (recommended).** While the hook isn't configured, the panel shows a **Setup required** screen — click **Configure automatically** and the extension adds the required `PreToolUse` hook to `~/.claude/settings.json` (never duplicating an existing one, and never touching the file if it can't be parsed) and keeps its path up to date across updates. You can also run **"Advanced Claude Plan: Configure Claude Code hook"** from the Command Palette anytime.

Hooks are loaded at **session startup** — restart your `claude` session after the hook is added.

### Manual configuration (optional)

If you prefer, add this to `~/.claude/settings.json`, replacing the path with the absolute path to the extension's `hook.js`:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "ExitPlanMode",
        "hooks": [
          { "type": "command", "command": "node", "args": ["/absolute/path/to/hook.js"], "timeout": 345600 }
        ]
      }
    ]
  }
}
```

On Windows, use an escaped path (`"C:\\Users\\you\\...\\hook.js"`). The high `timeout` (4 days) keeps Claude Code from killing the hook while you write your feedback.

## Extension settings

| Setting | Default | Description |
|---|---|---|
| `planViewer.port` | `4756` | Port of the local server that receives plans from the hook. |

If you change the port, set the same value in the `PLAN_VIEWER_PORT` environment variable before launching `claude`.

## Usage

1. Ask Claude Code for a plan (plan mode). On `ExitPlanMode`, the plan appears in the panel.
2. **Read** the plan (clean rendering, highlighted code).
3. **Annotate** by selecting text:
   - **left-click** → floating toolbar (Comment / Replace / Delete),
   - **right-click** → context menu (Cut / Copy / Paste + annotation tools).
   - Click a "Comment" or "Replacement" annotation to **edit** it.
4. Optionally write **general feedback** in the text area.
5. Finish:
   - **Send back with feedback** → sends your note + annotations to Claude, which revises the plan.
   - **Approve plan** → hands control back to Claude (mode selection in the terminal). If unsent annotations exist, a **confirmation** appears.
6. The **status-bar button** (bottom) shows / hides the panel at any time.

### Feedback format sent to Claude

```
<your optional general feedback>

--- Annotations on the plan (line numbers refer to the markdown plan) ---
1. [COMMENT] (line 12) « … » : your note
2. [REPLACE] (line 42) « … » with: « your replacement »
3. [DELETE] (line 58) « … »
```

## Resilience

- **Hide / Show**: the extension remembers the pending plan and restores it in the re-created panel.
- **Reload window**: if you reload VS Code while a plan is pending, the hook automatically reconnects to the restarted server (retries for up to 30 s) and the panel reopens with the plan. After that, Claude regains control on its native screen — never an infinite hang.

## Internationalization

The interface and the feedback sent to Claude are in **French** or **English** depending on the VS Code display language (`fr*` → French, otherwise English).

## Known limitations

- One pending plan at a time.
- Line numbers point to the source **block** (heading, paragraph, list item), not the exact character.
- Approval cannot force the permission mode: that is an **interactive** choice handed to Claude's native screen (a hook cannot set it).
- The Markdown renderer is homemade: it covers the essentials, not every CommonMark/GFM edge case.
- **Paste** (context menu) inserts into the feedback area — the plan itself is read-only.

## Project structure

| File | Role |
|---|---|
| `extension.js` | Activation, local HTTP server, panel lifecycle, status-bar button. |
| `hook.js` | `PreToolUse` hook: sends the plan to the server and waits for the decision (with retry). |
| `webview.html` / `webview.css` / `webview.js` | Panel: Markdown rendering, annotations, context menu, i18n. |
| `highlight.min.js` / `highlight-theme.css` | Vendored highlight.js for syntax highlighting. |
| `package.json` + `package.nls*.json` | Extension manifest (commands, settings) and its localization. |

## Development

- No runtime npm dependency (highlight.js is vendored).
- `hook.js` runs from its source path on every call: editing it takes effect immediately, no repackaging.
- Editing `extension.js` or the webview requires repackaging and reloading the window.

Build and run from source:

```bash
npm install -g @vscode/vsce
vsce package                  # produces claude-plan-viewer-<version>.vsix
code --install-extension claude-plan-viewer-<version>.vsix
```

Or open the folder and press `F5` (Extension Development Host).

---

<a id="francais"></a>

# 🇫🇷 Advanced Claude Plan — Français

> Relis, annote et valide les plans du mode plan de **Claude Code** dans un panneau VS Code lisible — et renvoie un retour structuré à l'agent sans passer par le terminal.

## Aperçu

Quand Claude Code propose un plan (mode plan), il l'affiche dans le terminal — peu confortable à relire et à commenter sur les gros plans. **Advanced Claude Plan** intercepte ce plan et l'affiche dans un panneau VS Code :

- rendu Markdown clair avec **coloration syntaxique**,
- **annotations par sélection** (commenter / remplacer / supprimer), façon revue de code,
- **retour structuré** renvoyé automatiquement à Claude, avec le **numéro de ligne** concerné,
- **approbation** en un clic, qui rend la main au flux natif de Claude (choix du mode).

Si l'extension n'est pas lancée, le hook échoue en douceur et Claude Code retombe sur son écran d'approbation natif.

## Fonctionnalités

- **Rendu Markdown complet** : titres, listes imbriquées, tables, task lists, citations, liens, images, formatage inline.
- **Coloration syntaxique** via highlight.js, avec **auto-détection du langage** quand il n'est pas précisé.
- **Annotations** sur n'importe quelle sélection : 💬 commenter, ✏️ remplacer, 🗑 supprimer — surlignage en direct, liste récapitulative, annotations **éditables**.
- **Numéro de ligne** du plan attaché à chaque annotation et transmis à Claude (utile sur les gros plans).
- **Menu contextuel** (clic droit) : Couper / Copier / Coller + les outils d'annotation.
- **Retour structuré** : ton retour général + toutes les annotations, en un seul message.
- **Double confirmation** si tu approuves alors que des annotations non envoyées existent.
- **Bouton barre de statut** pour afficher / masquer le panneau.
- **Internationalisation** FR / EN, calquée sur la langue de VS Code.
- **Résilience** : le plan survit à un masquer/afficher et à un rechargement de fenêtre.
- **Thème clair** épuré, accent aux couleurs de Claude.

## Fonctionnement

```
Claude Code (ExitPlanMode)
      │  hook PreToolUse
      ▼
   hook.js ──POST /plan──▶ Serveur local (127.0.0.1:4756)
      ▲                            │
      │  allow / deny + retour     ▼
      └──────────────────────  Panneau webview  ◀── tu lis / annotes / décides
```

1. Claude Code appelle l'outil `ExitPlanMode` en proposant un plan.
2. Un hook `PreToolUse` (`hook.js`) intercepte l'appel et envoie le plan au serveur HTTP local de l'extension.
3. Le hook **garde la requête ouverte** : Claude reste en attente (spinner) jusqu'à ta décision — c'est voulu.
4. Tu lis, annotes, puis :
   - **Approuver** → le hook ne renvoie aucune décision → Claude affiche son écran natif, où tu choisis le mode (auto / manuel / bypass).
   - **Renvoyer avec ce retour** → le hook renvoie un refus avec ton retour comme motif → Claude révise et repropose un plan.

## Prérequis

- **VS Code** ≥ 1.85
- **Node.js** dans le `PATH` (le hook s'exécute avec `node`)
- **Claude Code** configuré pour utiliser les hooks

## Installation

Depuis le **Marketplace VS Code** : ouvre la vue **Extensions** (`Ctrl+Shift+X`), cherche **Advanced Claude Plan**, puis clique **Installer**.

L'extension démarre son serveur local automatiquement au lancement de VS Code. Tant que le hook n'est pas configuré, le panneau affiche un écran **« Configuration requise »** avec un bouton **« Configurer automatiquement »** qui installe le hook Claude Code requis à ta place (voir ci-dessous).

### Depuis les sources (développement)

```bash
npm install -g @vscode/vsce
vsce package
code --install-extension claude-plan-viewer-<version>.vsix
```

Ou ouvre le dossier et appuie sur `F5` (Extension Development Host).

## Configuration du hook

**Automatique (recommandé).** Tant que le hook n'est pas configuré, le panneau affiche un écran **« Configuration requise »** — clique **« Configurer automatiquement »** et l'extension ajoute le hook `PreToolUse` requis à `~/.claude/settings.json` (sans jamais dupliquer un hook existant, ni toucher au fichier s'il est illisible) et maintient son chemin à jour à chaque mise à jour. Tu peux aussi lancer **« Advanced Claude Plan : configurer le hook Claude Code »** depuis la palette à tout moment.

Les hooks se chargent au **démarrage de la session** : relance ta session `claude` après l'ajout du hook.

### Configuration manuelle (optionnel)

Si tu préfères, ajoute ceci dans `~/.claude/settings.json`, en remplaçant le chemin par le chemin absolu vers le `hook.js` de l'extension :

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "ExitPlanMode",
        "hooks": [
          { "type": "command", "command": "node", "args": ["/chemin/absolu/vers/hook.js"], "timeout": 345600 }
        ]
      }
    ]
  }
}
```

Sur Windows, échappe les antislashs (`"C:\\Users\\toi\\...\\hook.js"`). Le `timeout` élevé (4 jours) évite que Claude Code ne tue le hook pendant que tu rédiges ton retour.

## Réglages

| Réglage | Défaut | Description |
|---|---|---|
| `planViewer.port` | `4756` | Port du serveur local qui reçoit les plans depuis le hook. |

Si tu changes le port, définis la même valeur dans `PLAN_VIEWER_PORT` avant de lancer `claude`.

## Utilisation

1. Demande un plan à Claude Code. Dès l'`ExitPlanMode`, il s'affiche dans le panneau.
2. **Relis**, puis **annote** en sélectionnant du texte : **clic gauche** → barre flottante ; **clic droit** → menu contextuel (couper/copier/coller + outils). Clique une annotation commentaire/remplacement pour la **modifier**.
3. Rédige éventuellement un **retour général**.
4. **Renvoyer avec ce retour** (révision) ou **Approuver le plan** (rend la main à Claude ; confirmation si annotations non envoyées).

### Format du retour envoyé à Claude

```
<ton retour général éventuel>

--- Annotations sur le plan (les numéros de ligne renvoient au plan markdown) ---
1. [COMMENTAIRE] (ligne 12) « … » : ta note
2. [REMPLACER] (ligne 42) « … » par : « ton remplacement »
3. [SUPPRIMER] (ligne 58) « … »
```

## Résilience

- **Masquer / Afficher** : l'extension mémorise le plan en attente et le restaure dans le panneau recréé.
- **Reload window** : le hook se reconnecte automatiquement au serveur redémarré (retry jusqu'à 30 s) et le panneau se rouvre avec le plan. Passé ce délai, Claude reprend la main sur son écran natif — jamais de blocage infini.

## Limitations connues

- Un seul plan en attente à la fois.
- Numéros de ligne au niveau **bloc** (titre, paragraphe, item), pas au caractère près.
- L'approbation ne peut pas forcer le mode de permission : choix **interactif** rendu à l'écran natif de Claude.
- Rendu Markdown maison : couvre l'essentiel, pas tous les cas limites CommonMark/GFM.
- **Coller** (menu contextuel) insère dans la zone de retour — le plan est en lecture seule.

## Structure du projet

| Fichier | Rôle |
|---|---|
| `extension.js` | Activation, serveur HTTP local, cycle de vie du panneau, bouton de statut. |
| `hook.js` | Hook `PreToolUse` : envoie le plan et attend la décision (avec retry). |
| `webview.html` / `webview.css` / `webview.js` | Panneau : rendu Markdown, annotations, menu contextuel, i18n. |
| `highlight.min.js` / `highlight-theme.css` | highlight.js (vendorisé) pour la coloration syntaxique. |
| `package.json` + `package.nls*.json` | Manifeste de l'extension et sa localisation. |
