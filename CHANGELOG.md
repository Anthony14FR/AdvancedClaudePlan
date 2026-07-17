# Changelog

All notable changes to **Advanced Claude Plan** are documented here. This project
follows [Keep a Changelog](https://keepachangelog.com/) and
[Semantic Versioning](https://semver.org/). The extension is pre-1.0 (**Beta**) and
published on the Marketplace pre-release channel.

## [0.10.0] - 2026-07-17

### Added
- **Multi-window / multi-project support.** Each VS Code window binds its own free
  port and registers itself; the hook routes every plan to the window whose
  workspace matches the Claude session's directory (`cwd`). No more `EADDRINUSE`
  when a second window is open, and each plan lands in the right window. A plan
  for a project with no open window falls back to Claude's native screen.

## [0.9.6] - 2026-07-17

### Added
- Guided **Setup required** screen inside the panel with a one-click **Configure
  automatically** button, and a clear "hook added — restart your `claude` session"
  confirmation.
- Real-time hook status: the panel reflects whether the Claude Code hook is
  configured instead of always showing "waiting for a plan".

### Changed
- Publish-ready metadata: publisher, repository, MIT license, `AI` category,
  keywords, a 128×128 transparent icon, and French/English localization of the
  manifest (NLS).

### Fixed
- Hook auto-configuration never creates a duplicate and never corrupts
  `~/.claude/settings.json` — the file is left untouched if it isn't valid JSON.
  Covered by unit tests.

## [0.9.0] - 2026-07-17

### Added
- **Automatic hook configuration**: the extension writes the required `PreToolUse`
  hook to `~/.claude/settings.json` and keeps its path in sync across updates, so
  users no longer edit the file by hand.

## [0.8.0] - 2026-07-17

### Added
- Resilience: a pending plan survives hiding/showing the panel and reloading the
  VS Code window — the hook reconnects to the restarted local server.

## [0.7.0] - 2026-07-17

### Added
- Full 🇫🇷/🇬🇧 internationalization of the panel and of the feedback sent to Claude.
- Right-click context menu (Cut / Copy / Paste + annotation tools).
- Editable comment and replacement annotations.
- Line numbers attached to each annotation and sent to Claude to locate the change
  on large plans.

## [0.5.0] - 2026-07-17

### Added
- Selection annotations (comment / replace / delete) with live highlighting and a
  structured feedback message sent back to Claude.
- Double confirmation before approving a plan while unsent annotations exist.

### Changed
- Airbnb-style light UI in Claude's colors, with clean SVG icons.

## [0.4.0] - 2026-07-17

### Added
- Syntax highlighting with language auto-detection (highlight.js).

## [0.2.0] - 2026-07-17

### Added
- Complete Markdown renderer: headings, nested lists, tables, task lists, code
  blocks, blockquotes, inline formatting, links and images.

## [0.1.0] - 2026-07-17

### Added
- Initial release: read Claude Code plan-mode plans in a VS Code panel; approve or
  send back feedback through a `PreToolUse` hook on `ExitPlanMode`.
