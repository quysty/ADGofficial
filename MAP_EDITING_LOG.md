# MAP_EDITING_LOG.md

## Purpose

This file records the current map-editing workflow so future Codex sessions can continue without guessing.

Rule from the user: think about file responsibilities before editing, touch as few files as possible, and do not change unrelated code.

## Current Map Setup

- `topo/` is the insurance/original map database.
- `topo-lab/` is the expanded experimental map database currently used by default.
- `explore.js` loads `topo-lab/` by default.
- Use `explore.html?map=base` only when the old insurance map is needed.
- Do not manually edit generated files in `topo-lab/` unless it is a one-off inspection. Persistent map changes should go through `tools/build-map-lab.js`.

## Adding A Custom Building

When the user provides a polygon such as:

```text
1: 692884.962, 6094179.821
2: 692897.708, 6094188.640
3: 692950.018, 6094146.761
4: 692942.770, 6094136.889
closed: yes
```

Add it to `customLabBuildings` in `tools/build-map-lab.js`.

Example:

```js
{
  id: "lab_custom_unnumbered_001",
  displayNumber: 863,
  height: 9,
  ring: [
    [692884.962, 6094179.821],
    [692897.708, 6094188.64],
    [692950.018, 6094146.761],
    [692942.77, 6094136.889],
    [692884.962, 6094179.821]
  ]
}
```

Notes:

- Repeat the first point at the end of `ring`.
- Use `height` for the rendered building height.
- Use `displayNumber` only if the user wants a visible building number.
- If the user says the building number is blank/empty, omit `displayNumber`; the generator will hide its normal number label.

## Hiding Conflicting Buildings

If an old building overlaps the new custom building and creates strange shapes or uneven height, add its number to:

```js
const hiddenDisplayNumbers = new Set([...]);
```

Example from the current state:

```js
const hiddenDisplayNumbers = new Set([683, 863, 877]);
```

Important:

- Old `863` is hidden because it conflicted with the new custom building.
- The custom building is allowed to display `863`; the filter keeps custom buildings even if their display number is also in `hiddenDisplayNumbers`.
- Do not hide nearby buildings casually. Inspect overlap/height first.

## Regenerating The Lab Map

After changing `tools/build-map-lab.js`, regenerate the lab database:

```bash
node tools/build-map-lab.js /Users/terry/Downloads/topoexport-5FAEE9
```

Then run checks:

```bash
node --check tools/build-map-lab.js
git diff --check
```

For dorm data changes, also run:

```bash
node tools/validate-dorm-data.js
```

## Verifying A Custom Building

Use a small Node check against `topo-lab/buildings.geojson`:

```bash
node - <<'NODE'
const fs = require("fs");
const data = JSON.parse(fs.readFileSync("topo-lab/buildings.geojson", "utf8"));
const hits = data.features.filter((feature) => Number(feature.properties?.modelDisplayNumber) === 863);
console.log(hits.map((feature) => ({
  id: feature.id,
  source: feature.properties.mapLabSource,
  height: feature.properties.modelHeightMeters || feature.properties.height,
  hidden: feature.properties.modelHideNormalLabel
})));
NODE
```

Expected for the current custom `863` building:

- One hit.
- `id` is `lab_custom_unnumbered_001`.
- `mapLabSource` is `custom`.
- `height` is `9`.
- `modelHideNormalLabel` is false.

## Browser Cache Check

When testing in the in-app browser, open with a fresh timestamp query so old map data is not reused:

```text
file:///Users/terry/Desktop/anu-dorm-guide/explore.html?t=custom-863-label
```

Change the `t=` value after regeneration.

## Current Custom Building State

Current custom building:

- id: `lab_custom_unnumbered_001`
- visible number: `863`
- height: `9`
- polygon:
  - `692884.962, 6094179.821`
  - `692897.708, 6094188.640`
  - `692950.018, 6094146.761`
  - `692942.770, 6094136.889`

Currently hidden conflicting numbers:

- `683`
- `863`
- `877`
