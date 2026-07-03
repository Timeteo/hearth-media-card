# hearth-media-card

A cinematic now-playing sheet for Home Assistant dark dashboards. The album art bleeds edge-to-edge behind a dark scrim (gradient, not blur — safe on old WebViews), the full uncropped cover sits as a tile on the right, and the track title — not the speaker name — is the headline. An accent hairline along the bottom edge shows progress. When nothing is playing or paused, the card renders nothing at all.

Companion to [hearth-weather-card](https://github.com/Timeteo/hearth-weather-card). Zero dependencies, no build step.

## Install

### HACS (custom repository)
1. HACS → Custom repositories → add this repo, category **Dashboard**.
2. Install **Hearth Media Card**.

### Manual
1. Copy `dist/hearth-media-card.js` to `/config/www/`.
2. Add a dashboard resource: `/local/hearth-media-card.js`, type **module**.

## Usage

```yaml
type: custom:hearth-media-card
exclude:
  - media_player.this_dashboards_device
```

With no `entities` list, the card watches every `media_player` and shows the first one playing (paused players keep the sheet visible so you can resume; `idle`/`off` hides it).

## Options

| Option | Default | Description |
|---|---|---|
| `entities` | all media players | Priority-ordered list of players to watch |
| `exclude` | `[]` | Players to never show (e.g. the wall tablet itself) |
| `height` | `230` | Sheet height in px |
| `accent` | `#FFB27A` | Accent color (eyebrow, play ring, progress) |
| `margin` | `0` | Host margin — use negative values (e.g. `0 -64px -40px`) to escape view padding and bleed to the screen edges |

Controls: previous / play-pause / next, sized for touch.

## License

MIT
