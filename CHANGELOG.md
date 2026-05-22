# Changelog

All notable changes to Kaptur are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] — 2026-05-16

First public release.

### Features

- **Captures** : visible-tab screenshot, region selection with the mouse
- **Konva annotation editor** : rectangle, arrow, text, highlight, blur,
  auto-incrementing numbering, undo/redo, keyboard shortcuts (V/R/A/T/H/B/N,
  `Cmd/Ctrl+Z`, `Delete`)
- **Forensic banner** burned into every screenshot : ISO 8601 timestamp +
  full SHA-256 hash, appended below the image (never overlaps the capture
  content)
- **HTML DOM capture** alongside every screenshot (with SHA-256 hash)
- **Sessions** with name, description, color, archive flag
- **Tags** with autocomplete, normalization (`kebab-case`), merge-on-rename,
  bulk operations
- **Notes** per capture with autosave
- **Full-text search** (MiniSearch) on names, URLs, page titles, domains,
  notes and tags — `Cmd/Ctrl + K` ; supports `session:slug`, `domain:foo`,
  `tag:bar` filters
- **Customizable filename templates** for exports (tokens : `{index}`,
  `{timestamp}`, `{date}`, `{time}`, `{name}`, `{domain}`, `{session}`,
  `{type}`, `{hash}`)
- **Exports** : single PNG (with template), whole session ZIP, full database
  `.kaptur` backup
- **Import** a `.kaptur` file to restore a previous state
- **Persistent storage** requested via `navigator.storage.persist()`

### Notes

- Browser support : Chrome / Edge / Firefox
- Storage : everything in IndexedDB, no remote backend, no telemetry
- The extension makes **zero outbound network requests** and requests the minimum permissions required
