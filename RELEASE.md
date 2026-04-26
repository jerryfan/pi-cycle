# pi-cycle Release Plan (lean, npm-first)

## 0) Demo media (required)

Render the README GIF:

```bash
cd public/pi-cycle
vhs demo.tape
# produces: demo.gif
```

Commit `demo.gif` and ensure README embeds it.

## 1) Quality gate (manual)

Verify in a real Pi session:

- `/reload` loads extension cleanly
- `F8` cycles profiles
- `/cycle` menu opens and shows: next/pick/config/doctor/reload/help
- `/cycle config` can add/edit/remove/reorder and change hotkey
- `/cycle doctor` reports OK (or actionable issues)
- Unsupported models are skipped with a warning (cycling never gets stuck)

## 2) Pack

From `public/`:

```bash
npm run pack:pi-cycle
```

Or from `public/pi-cycle`:

```bash
npm pack --dry-run
```

## 3) Publish

```bash
npm publish --access public
```

(Or from `public/` workspace script: `npm run publish:pi-cycle`)

## 4) GitHub release checklist

- Ensure README has a GIF demo (`demo.gif`) and install snippet: `pi install npm:pi-cycle`
- Tag: `pi-cycle-v<version>`
- GitHub release notes include changelog excerpt + demo GIF
