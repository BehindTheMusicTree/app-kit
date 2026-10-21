# app-kit-ui

`@behindthemusictree/app-kit-ui` — the styled BehindTheMusicTree components (popups, OAuth callback
screen, genre tree) built on the headless `@behindthemusictree/app-kit`. Install it to get the
BTMT look; skip it and compose your own UI on app-kit's hooks to get a different one.

## Subpaths

```tsx
import { BasePopup, AuthPopup, NetworkErrorPopup, TrackUploadPopup } from "@behindthemusictree/app-kit-ui/popup";
import { AuthCallbackHandler } from "@behindthemusictree/app-kit-ui/auth";
import { GenreTreeView, TrackListSidebar, TrackItem, Rating } from "@behindthemusictree/app-kit-ui/genre-tree";
import "@behindthemusictree/app-kit-ui/genre-tree/styles.css";
```

## Peers

`@behindthemusictree/app-kit` (one copy only, so the Session/Player/Popup contexts are shared),
`@behindthemusictree/ui`, `@tanstack/react-query`, `next`, `react`, `react-dom`. Tailwind must
scan `node_modules/@behindthemusictree/app-kit-ui/dist/**`.

## Theme contract

Colors come from CSS variables, defined by `@behindthemusictree/brand` (`tokens/theme.css`) or by
your own stylesheet:

| Token | Used for |
| --- | --- |
| `--color-primary`, `--color-primary-hover` | Primary actions |
| `--color-text` | Body text |
| `--color-neutral-100` … `--color-neutral-700` (100, 200, 300, 500, 600, 700) | Surfaces, borders, muted text |
| `--color-red-500`, `--color-red-600`, `--color-red-700` | Errors |
| `--color-green-500` | Playing state |
| `--color-blue-500` | Links and highlights |

Third-party brand colors (Spotify, Google) stay literal.

## Extension points

- `GenreTreeView` takes `className` on its root (no outer margin by default) and
  `showDisplayOptions` (default `true`) to hide the "Tree display options" group.
- Render props (`renderArtistLink`, `renderSummary`, `renderTracksToolbar`, …) replace pieces of
  the genre detail panel.
