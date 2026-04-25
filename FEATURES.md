# pi-cycle — Features (95+/100 public-ready)

Rating target: **95+/100+**.

## Core idea
**One shortcut = one mode change.** Real workflow modes are a bundle: **model + thinking**. `pi-cycle` treats them as one unit so you never have to manage them separately.

## Features
1. **Unified cycle (model + thinking together)**
   - Each profile sets both `provider/model` and `thinkingLevel` in one activation.

2. **Single command surface: `/cycle` only**
   - No extra top-level commands.
   - `/cycle` opens a menu UI by default.
   - All actions live under `/cycle ...` (e.g. `/cycle next`, `/cycle config`, `/cycle doctor`).

3. **One hotkey**
   - Default: **F8** cycles to the next profile.
   - Configurable via `/cycle config` → `hotkey`.

4. **Menu-based configuration (no JSON required)**
   - Add/edit/remove/reorder profiles via interactive menus.
   - Configure hotkey.
   - Configure optional low-context thinking cap.

5. **OpenAI-focused defaults that actually work**
   - Defaults are derived from Pi’s cached `enabledModels` when available.
   - Avoids recommending models that are present in registries but not usable for your account.

6. **Clear feedback, low ambiguity**
   - Every switch shows a notification: `Mode: <name> — <1-sentence purpose>`.
   - No footer/status-bar artifacts (plays nicely with `pi-oneliner`).

7. **Graceful failure handling**
   - If a model isn’t available or auth is missing, `pi-cycle` warns and **skips** to the next profile.

8. **Doctor / self-check**
   - `/cycle doctor` validates config + models + thinking compatibility and shows a report.

9. **Optional adaptive thinking when context is nearly full**
   - When context remaining is low (e.g. <= 10%), cap thinking level to reduce surprises near the limit.
   - Note: this is based on **context window usage**, not provider billing quota.
