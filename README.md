# Advanced Claude Plan

> Review, annotate and approve **Claude Code** plan-mode plans in a clean VS Code panel — and send precise, structured feedback back to the agent without touching the terminal.

`v0.10.0` · **Beta** · VS Code ≥ 1.85 · No dependencies · UI in 🇬🇧 / 🇫🇷 · [Version française](#francais)

---

## Why

When Claude Code enters **plan mode**, it prints the plan in the terminal: cramped, hard to skim, and painful to comment on precisely — especially on large plans. You end up scrolling a wall of text and typing vague feedback.

**Advanced Claude Plan** turns that plan into a proper review surface inside VS Code. You read it comfortably, annotate any passage like a code review, and send Claude **exact, structured feedback** in one click — or approve and let it build. It's the difference between "eh, change the second part" and a line-anchored list of concrete edits the agent understands.

## What you can do

### Read plans, not terminal dumps
- **Full Markdown rendering** — headings, nested lists, tables, task lists, blockquotes, links and inline formatting, laid out to actually be read.
- **Syntax-highlighted code blocks** with **automatic language detection** when the plan doesn't specify one.
- A clean **light theme** in Claude's colors, with a per-block language badge.

### Annotate like a code review
- **Select any text** in the plan and choose an action from the inline toolbar:
  - **Comment** — attach a note to a passage,
  - **Replace** — propose alternative wording,
  - **Delete** — mark a passage for removal.
- Annotations are **highlighted live** in the plan and collected in a summary list.
- **Edit or remove** any annotation afterwards — nothing is set in stone.
- **Right-click menu** with the same tools plus Cut / Copy / Paste.

### Send feedback Claude can act on
- Every annotation carries the **line number** of the plan it refers to, so Claude pinpoints the exact spot even on a huge plan.
- Your general note **and** every annotation are packaged into a **single structured message** — no copy-pasting, no retyping.
- **Send back** for a revised plan, or **Approve** to proceed. If you try to approve while annotations are still unsent, a **confirmation** stops you from losing them.
- Approving hands control back to Claude's native flow, where you pick the mode (auto / manual).

### Set up in one click
- The panel **guides you**: while the hook isn't configured it shows a **Setup required** screen with a single **Configure automatically** button — no manual file editing.
- It **never duplicates** an existing hook and **never corrupts** your Claude settings (it won't touch the file if it isn't valid JSON), and it keeps the hook's path correct across updates.

### Built to not get in your way
- **Multiple VS Code windows** are supported — each gets its own port and every plan is routed to the window matching the Claude session's project.
- Your plan **survives** hiding/showing the panel and reloading the VS Code window.
- **Bilingual** 🇫🇷 / 🇬🇧 interface (and feedback), following your VS Code display language.
- A **status-bar button** shows/hides the panel anytime.

## How it works

```
Claude Code (ExitPlanMode) ──hook──▶ Advanced Claude Plan panel
                                          │  you read · annotate · decide
        approve / send back  ◀────────────┘
```

A `PreToolUse` hook on Claude Code's `ExitPlanMode` tool forwards the plan to the extension's local panel and waits for your decision. If the extension isn't running, the hook steps aside and Claude falls back to its native approval screen.

## Getting started

1. Install **Advanced Claude Plan** from the VS Code Marketplace.
2. Open the panel — click **Configure automatically** on the Setup screen.
3. Restart your `claude` session. Ask for a plan: it appears in the panel, ready to review.

That's the whole setup. Node must be available on your `PATH` (the hook runs with `node`).

## Settings

| Setting | Default | Description |
|---|---|---|
| `planViewer.port` | `4756` | Port of the local server that receives plans from the hook. If you change it, set `PLAN_VIEWER_PORT` to the same value before launching `claude`. |

## Good to know

- One plan in review at a time.
- Line numbers point to the source **block** (heading, paragraph, list item), not the exact character.
- The approval mode (auto / manual) is chosen on Claude's native screen — a hook can't set it.
- Feedback is sent in your VS Code language (`fr*` → French, otherwise English).

## Development

Build from source: `vsce package`, then `code --install-extension advanced-claude-plan-<version>.vsix`, or open the folder and press `F5`. No runtime dependencies (highlight.js is vendored). Changes to the hook take effect immediately; changes to the extension require repackaging.

## License

MIT — see [LICENSE](LICENSE). Changes are listed in [CHANGELOG.md](CHANGELOG.md).

---

<a id="francais"></a>

# 🇫🇷 Advanced Claude Plan — Français

> Relis, annote et valide les plans du mode plan de **Claude Code** dans un panneau VS Code clair — et renvoie un retour **précis et structuré** à l'agent sans passer par le terminal.

## Pourquoi

Quand Claude Code passe en **mode plan**, il affiche le plan dans le terminal : à l'étroit, dur à parcourir, pénible à commenter précisément — surtout sur les gros plans. On finit par scroller un mur de texte et taper un retour vague.

**Advanced Claude Plan** transforme ce plan en vraie surface de revue dans VS Code. Tu le lis confortablement, tu annotes n'importe quel passage comme une revue de code, et tu envoies à Claude un **retour exact et structuré** en un clic — ou tu approuves et il implémente. C'est la différence entre « euh, change la deuxième partie » et une liste d'éditions concrètes ancrées à la ligne, que l'agent comprend.

## Ce que tu peux faire

### Lire des plans, pas des dumps de terminal
- **Rendu Markdown complet** — titres, listes imbriquées, tables, task lists, citations, liens et formatage inline, mis en page pour être vraiment lus.
- **Blocs de code colorés** avec **auto-détection du langage** quand le plan ne le précise pas.
- Un **thème clair** épuré aux couleurs de Claude, avec un badge de langage par bloc.

### Annoter comme une revue de code
- **Sélectionne du texte** dans le plan et choisis une action dans la barre :
  - **Commenter** — attacher une note,
  - **Remplacer** — proposer une autre formulation,
  - **Supprimer** — marquer un passage à retirer.
- Les annotations sont **surlignées en direct** et regroupées dans une liste.
- **Modifie ou retire** une annotation à tout moment.
- **Menu clic droit** avec les mêmes outils + Couper / Copier / Coller.

### Envoyer un retour exploitable par Claude
- Chaque annotation porte le **numéro de ligne** du plan concerné : Claude localise la zone exacte même sur un gros plan.
- Ton retour général **et** toutes les annotations sont regroupés en **un seul message structuré** — zéro copier-coller.
- **Renvoyer** pour un plan révisé, ou **Approuver** pour continuer. Si tu approuves alors que des annotations ne sont pas envoyées, une **confirmation** t'empêche de les perdre.
- L'approbation rend la main au flux natif de Claude, où tu choisis le mode (auto / manuel).

### Se configurer en un clic
- Le panneau te **guide** : tant que le hook n'est pas configuré, il affiche un écran **« Configuration requise »** avec un unique bouton **« Configurer automatiquement »** — aucune édition de fichier à la main.
- Il ne **duplique jamais** un hook existant et ne **corrompt jamais** ta config Claude (il ne touche pas au fichier s'il n'est pas un JSON valide), et garde le chemin du hook correct à chaque mise à jour.

### Sans jamais te gêner
- **Plusieurs fenêtres VS Code** supportées — chacune a son port, et chaque plan est routé vers la fenêtre correspondant au projet de la session Claude.
- Ton plan **survit** au masquer/afficher du panneau et au rechargement de la fenêtre VS Code.
- Interface (et retour) **bilingue** 🇫🇷 / 🇬🇧, selon la langue de VS Code.
- Un **bouton dans la barre de statut** affiche/masque le panneau quand tu veux.

## Comment ça marche

```
Claude Code (ExitPlanMode) ──hook──▶ Panneau Advanced Claude Plan
                                          │  tu lis · annotes · décides
       approuver / renvoyer  ◀────────────┘
```

Un hook `PreToolUse` sur l'outil `ExitPlanMode` de Claude Code envoie le plan au panneau local et attend ta décision. Si l'extension n'est pas lancée, le hook s'efface et Claude retombe sur son écran d'approbation natif.

## Démarrer

1. Installe **Advanced Claude Plan** depuis le Marketplace VS Code.
2. Ouvre le panneau — clique **« Configurer automatiquement »** sur l'écran de setup.
3. Relance ta session `claude`. Demande un plan : il s'affiche dans le panneau, prêt à relire.

C'est tout le setup. `node` doit être disponible dans le `PATH` (le hook s'exécute avec `node`).

## Réglages

| Réglage | Défaut | Description |
|---|---|---|
| `planViewer.port` | `4756` | Port du serveur local qui reçoit les plans. Si tu le changes, mets `PLAN_VIEWER_PORT` à la même valeur avant de lancer `claude`. |

## Bon à savoir

- Un seul plan en revue à la fois.
- Les numéros de ligne pointent le **bloc** source (titre, paragraphe, item), pas le caractère exact.
- Le mode d'approbation (auto / manuel) se choisit sur l'écran natif de Claude — un hook ne peut pas le forcer.
- Le retour est envoyé dans la langue de VS Code (`fr*` → français, sinon anglais).

## Licence

MIT — voir [LICENSE](LICENSE). Les changements sont dans [CHANGELOG.md](CHANGELOG.md).
