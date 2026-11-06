# Brief for an invitation template set

Hand this to your illustrator. Everything is delivered as **text-free artwork**; the names, dates, venues and wording are drawn live from the couple's Google Sheet. Please design the pieces to feel like one family (same palette, line weight, motifs).

## Files (one folder per set, e.g. `templates/monsoon/`)
| File | Size | Notes |
|---|---|---|
| `cover-bg.png` | 1180 x 1152 px | Cover page. **No text.** Keep the centre clear: the intro line sits about 29% from the top, the two names fill roughly 33% to 75%, and two small lines of date and venue sit at about 82% to 87%. Borders, garlands, corners and motifs are yours. |
| `scene.jpg` | 1180 x 1152 px | Full-page illustration shown after the cover. **No text.** Optional (leave it out and the page is skipped). |
| `back-bg.png` | 1180 x 1152 px | Back cover. **No text.** One short caption is drawn at about 77% from the top, so keep that band clear. |
| `ornament.png` | about 389 x 33 px, transparent | Small divider shown between the host details and the event details (and above the venue). |
| `icon-<event id>.png` | 300 x 300 px, transparent | Round icon per event, for example `icon-mehndi.png`, `icon-wedding.png`, `icon-reception.png`. Shown at about 100 pt, so keep detail bold. Use the event IDs from the Events tab. |
| `thumb.jpg` | about 300 x 293 px | Thumbnail for the builder's gallery (a downsized cover is fine). |

The cream "paper" pages (hosts, events, venue) are plain colour with a thin border, set by the colours in `template.json`, so no artwork is needed for them unless the artist wants to supply a stylesheet.

## `template.json`
```json
{
  "name": "Monsoon",
  "description": "One line describing the look.",
  "artist": "Artist name",
  "images":  { "cover": "cover-bg.png", "scene": "scene.jpg", "back": "back-bg.png", "ornament": "ornament.png" },
  "fonts":   { "display": "Playfair Display", "body": "EB Garamond" },
  "scale": 1,
  "colors":  { "cardBg": "#f4efe4", "cardBorder": "#9a8a5a", "rule": "#cdbf93", "coverBg": "#1f4a45", "sceneBg": "#d9c58f", "backBg": "#1f4a45" },
  "css": "style.css",
  "elements": { "CoverNames": { "color": "#f7f1e1" }, "EventTitle": { "color": "#1f4a45", "size": 28 } }
}
```
- `fonts`: any Google Fonts names. `scale` multiplies every text size (useful when a font runs large or small).
- `elements`: per-text overrides (`font`, `size`, `color`, `style`, `weight`). The element names are the ones used in the builder and in `Settings_invite_rows.csv` (CoverIntro, CoverNames, FamilyParents, EventTitle and so on). `size` is in points on a 590 pt wide card.
- `css` is optional, for the rare set that needs extra styling.
- Any value the couple sets in their Settings tab overrides the set.

## Licence
Please confirm the artwork may be used on a website and stored in a public code repository, and by how many events or sites.

## Adding a set to the site
1. Put the folder in `templates/`.
2. Add its folder name to `templates/index.json`.
3. Open `invite-builder.html`, pick it in the gallery, and check every page with a few event combinations.
4. To use it for real, set `InviteTemplate` in the Settings tab to the folder name.
