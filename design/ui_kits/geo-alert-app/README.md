# Geo-Alert PWA — UI kit

Click-thru recreation of the Geo-Alert app's core screens, built from the spec in `geo-alert/PLAN.md` and `geo-alert/tasks/mock-api.yaml`.

## Run

Open `index.html` directly. No build step.

## Screens

1. **Login** — Google OAuth entry
2. **Map** — main view: full-bleed Leaflet-style map, top app bar, FAB, bottom sheet with marker list
3. **Marker detail** — full-screen sheet with photos, description, comments, like/dislike
4. **Create marker** — form with TTL, tags, privacy
5. **Activity feed** — subscribed cards list with marker activity

## Components

- `TopAppBar.jsx` — frosted-glass top bar over map
- `MapCanvas.jsx` — fake Leaflet view with tile pattern, radius circles, markers
- `MarkerPin.jsx` — heat-colored pin (5 colors)
- `BottomSheet.jsx` — three-snap height sheet
- `MarkerCard.jsx` — list item
- `MarkerDetailSheet.jsx` — full-screen marker
- `CreateMarkerSheet.jsx` — form
- `FeedScreen.jsx` — activity list
- `LoginScreen.jsx` — Google sign-in
- `Avatar.jsx`, `Tag.jsx`, `Button.jsx`, `Icon.jsx` — primitives

## Status

These are static visual recreations with click-thru navigation. The map is a styled background — no real Leaflet integration (the real frontend will use `react-leaflet`). All data is mocked from the OpenAPI examples.
