# MAFIA Arcade — Assets Directory

## Current Files
| File | Description |
|------|------------|
| `favicon.png` | App icon (used in `<link rel="icon">`) |
| `og-image.png` | Open Graph image for social sharing (Discord, WhatsApp, Twitter) |

## Sound Effects (Optional)
These files are referenced by `js/effects.js`. The game works fully without them
since `js/design-system.js` generates all core sounds via Web Audio API.

| File | Usage |
|------|-------|
| `sfx-click.mp3` | General button click |
| `sfx-hover.mp3` | Button hover |
| `sfx-slash.mp3` | Kill effect |
| `sfx-reveal.mp3` | Role reveal |
| `sfx-day.mp3` | Day phase start |
| `sfx-night.mp3` | Night phase start |
| `sfx-win.mp3` | Victory |
| `sfx-lose.mp3` | Defeat |

## Notes
- All sound effects in `effects.js` have `.catch()` handlers — missing files won't break anything.
- Core audio (clicks, hover, success, error, coin, heartbeat, gameover, jester) is built
  entirely with Web Audio API in `js/design-system.js` — no external files needed.
- Images (`image_*.png/jpg`) in the project root are design reference files, not game assets.
