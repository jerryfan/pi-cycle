# Changelog

## 0.1.2
- Publish-ready: still-montage demo render script now works without sudo (sets a local npm prefix)

## 0.1.1
- Demo GIF is now rendered as a still-montage (no setup frames)
- Demo includes `pi-oneliner` so model+thinking changes are visible
- Add `tools/vhs/render-demo.sh` and `VETERAN_PRACTICES.md`

## 0.1.0
- Initial public release as **`pi-cycle`**
- Single command surface: `/cycle`
- Default hotkey: `F8` (configurable)
- Cycles **model + thinking level together** via profiles
- Menu-based configuration (`/cycle config`) with add/edit/remove/reorder
- Optional 1-sentence profile blurbs for clear UX
- Robust cycling: skips unusable/unauthorized models with warnings
- OpenAI-focused defaults derived from Pi’s cached `enabledModels` when available
- `/cycle doctor` self-check report
- Optional low-context thinking cap (based on context window usage)
