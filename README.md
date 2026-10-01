# Advanced Claude Plan

> Review, annotate and approve **Claude Code** plan-mode plans in a clean VS Code panel — and send precise, structured feedback back to the agent without leaving your editor.

**Beta** · 🇬🇧 / 🇫🇷 · [Version française](#francais)

---

## Why

When Claude Code enters **plan mode**, it prints the plan in the terminal: cramped, hard to skim, and painful to comment on precisely — especially on large plans. You end up scrolling a wall of text and typing vague feedback.

**Advanced Claude Plan** turns that plan into a proper review surface inside VS Code. You read it comfortably, annotate any passage like a code review, and send Claude **exact, structured feedback** in one click — or approve and let it build. It's the difference between "eh, change the second part" and a line-anchored list of concrete edits the agent understands.

## What you can do

### Read plans, not terminal dumps
- **Full Markdown rendering** — headings, nested lists, tables, task lists, blockquotes, links and inline formatting, laid out to actually be read.
- **Syntax-highlighted code blocks**, with the language **detected automatically** when the plan doesn't specify one.
- **Plan overview at a glance** — sections, steps, files touched, reading time and task progress, plus a sticky outline on wide panels.
- **Callouts** (`> [!NOTE]`, `[!WARNING]`…), step timelines, file-path chips and one-click code copy.
- A clean **light theme** in Claude's colors.

### Annotate like a code review
- **Select any text** in the plan and pick an action:
  - **Comment** — attach a note,
  - **Replace** — propose alternative wording,
  - **Delete** — mark a passage for removal.
- Annotations are **highlighted live** and collected in a summary list.
- **Edit or remove** any annotation afterwards.
- A **right-click menu** with the same tools plus Cut / Copy / Paste.

### Send feedback Claude can act on
- Every annotation carries the **line it refers to**, so Claude pinpoints the exact spot even on a huge plan.
- Your general note **and** every annotation are packaged into a **single structured message** — no copy-pasting.
- **Send back** for a revised plan, or **Approve** to proceed. Try to approve with unsent annotations and a **confirmation** stops you from losing them.

### Get going in seconds
- A guided **one-click setup** gets you running — nothing to configure by hand.
- **Bilingual** 🇫🇷 / 🇬🇧 interface (and feedback), following your VS Code language.

### Stays out of your way
- **Works across multiple windows** — with several projects open, each plan opens in the right one.
- Your plan **isn't lost** if you hide the panel or reload the window.
- A **status-bar button** shows or hides the panel anytime.

---

## License

MIT — see [LICENSE](LICENSE).

---

<a id="francais"></a>

# 🇫🇷 Advanced Claude Plan — Français

> Relis, annote et valide les plans du mode plan de **Claude Code** dans un panneau VS Code clair — et renvoie un retour **précis et structuré** à l'agent sans quitter ton éditeur.

## Pourquoi

Quand Claude Code passe en **mode plan**, il affiche le plan dans le terminal : à l'étroit, dur à parcourir, pénible à commenter précisément — surtout sur les gros plans. On finit par scroller un mur de texte et taper un retour vague.

**Advanced Claude Plan** transforme ce plan en vraie surface de revue dans VS Code. Tu le lis confortablement, tu annotes n'importe quel passage comme une revue de code, et tu envoies à Claude un **retour exact et structuré** en un clic — ou tu approuves et il implémente. C'est la différence entre « euh, change la deuxième partie » et une liste d'éditions concrètes ancrées à la ligne, que l'agent comprend.

## Ce que tu peux faire

### Lire des plans, pas des dumps de terminal
- **Rendu Markdown complet** — titres, listes imbriquées, tables, task lists, citations, liens et formatage inline, mis en page pour être vraiment lus.
- **Blocs de code colorés**, avec le langage **détecté automatiquement** quand le plan ne le précise pas.
- **Vue d'ensemble du plan** — sections, étapes, fichiers touchés, temps de lecture et progression des tâches, plus un sommaire fixe sur les panneaux larges.
- **Encadrés** (`> [!NOTE]`, `[!WARNING]`…), frise d'étapes, chips de fichiers et copie du code en un clic.
- Un **thème clair** épuré aux couleurs de Claude.

### Annoter comme une revue de code
- **Sélectionne du texte** dans le plan et choisis une action :
  - **Commenter** — attacher une note,
  - **Remplacer** — proposer une autre formulation,
  - **Supprimer** — marquer un passage à retirer.
- Les annotations sont **surlignées en direct** et regroupées dans une liste.
- **Modifie ou retire** une annotation à tout moment.
- Un **menu clic droit** avec les mêmes outils + Couper / Copier / Coller.

### Envoyer un retour exploitable par Claude
- Chaque annotation porte la **ligne concernée** : Claude localise la zone exacte même sur un gros plan.
- Ton retour général **et** toutes les annotations sont regroupés en **un seul message structuré** — zéro copier-coller.
- **Renvoyer** pour un plan révisé, ou **Approuver** pour continuer. Si tu approuves avec des annotations non envoyées, une **confirmation** t'empêche de les perdre.

### Démarrer en quelques secondes
- Une **configuration guidée en un clic** — rien à régler à la main.
- Interface (et retour) **bilingue** 🇫🇷 / 🇬🇧, selon la langue de VS Code.

### Sans jamais te gêner
- **Fonctionne sur plusieurs fenêtres** — avec plusieurs projets ouverts, chaque plan s'ouvre dans la bonne.
- Ton plan **n'est pas perdu** si tu masques le panneau ou recharges la fenêtre.
- Un **bouton dans la barre de statut** affiche ou masque le panneau quand tu veux.

---

## Licence

MIT — voir [LICENSE](LICENSE).
