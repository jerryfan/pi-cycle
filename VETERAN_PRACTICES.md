# Veteran practices (pi-cycle)

This file captures the small, repeatable tricks that keep `pi-cycle` demos and UX **clean**.

---

## Demo GIFs: use a still-montage, not a single take

Goal: the README GIF should show **only the cycling experience** (no install/reload/setup noise).

Pattern:

1. Do all setup **outside** the recording (isolated HOME / isolated agent dir).
2. Record **one short clip per state** (deep/code/general/fast/value).
3. Extract **one stable still** near the end of each clip.
4. Stitch the stills into a looping GIF.

Why this works:
- no unusable “setup frames”
- no timing races (reloads, slow terminals)
- you can re-record only the broken state

In this repo, use:

```bash
bash tools/vhs/render-demo.sh
```

---

## Include pi-oneliner in demos

`pi-cycle` intentionally avoids status/footer clutter. To make mode changes visible in a demo,
use **pi-oneliner** as the always-on footer (model + thinking become obvious).

The demo script sets:

- `PI_ONELINER_PRESET=ultra`

so the footer stays compact and consistent.

---

## OpenAI model switching in demos without real calls

`pi-cycle` activates models via Pi’s model registry. If OpenAI is configured to require an
API key for model activation, missing keys can surface as warnings.

For demo capture (no requests are sent), it’s acceptable to set a placeholder:

- `OPENAI_API_KEY=demo`

This keeps the capture clean while still demonstrating the UX.
