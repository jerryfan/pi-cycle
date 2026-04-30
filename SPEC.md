---
id: pi-cycle
title: pi-cycle (Pi extension) — Product + Implementation Spec
version: 0.1.0
status: public
updated_at: 2026-04-26
tags: [pi, extension, openai, model, thinking, hotkey, presets, workflow]
distribution: public
---

# pi-cycle — Product + Implementation Spec

## 0) Executive summary
`pi-cycle` is a public Pi extension that turns model selection into a one-keystroke workflow primitive: press **F8** (default) or use **`/cycle`** to switch a complete working profile — **OpenAI model + thinking level** — as one bundled unit.

The product promise is simple:

> **One shortcut changes the whole work mode. No separate model switch. No separate thinking switch. No mismatch state.**

---

## 1) North Star
### 1.1 North Star outcome
A Pi user can move between distinct work modes — deep reasoning, coding, general-purpose daily work, fast iteration, and value mode — in under two seconds, with confidence that both the model and thinking level changed together.

### 1.2 North Star metric
**Mode-switch confidence:** after a switch, the user can answer “what mode am I in?” and “what did it change?” without opening settings.

Measured by:
- one notification after each activation that includes a 1-sentence “what it’s good for” blurb,
- deterministic cycle order,
- no hidden top-level command surfaces beyond `/cycle`.

### 1.3 Product principles
1. **Bundled intent beats independent toggles**
   - Model and thinking are not separate user concerns during active work; they are one mode decision.
2. **Fast path first, menu when needed**
   - `F8` handles routine switching (configurable).
   - `/cycle` handles visibility and configuration.
3. **Determinism over cleverness**
   - Cycle order is explicit config order, not usage history or inference.
4. **OpenAI-focused, not OpenAI-hardcoded**
   - Defaults target OpenAI/OpenAI Codex models.
   - Configuration discovers the user’s currently available OpenAI-like providers via Pi’s model registry.
5. **Fail loudly, preserve flow**
   - Missing auth/model produces a warning, not a silent no-op or crash.
6. **Public-ready by default**
   - Copy/paste install, stable command vocabulary, local config, low support burden.

### 1.4 Growth North Star (GitHub stars)
Stars are treated as a **lagging indicator of real utility + trust**, not as the primary goal.

**Outcome:** A new Pi user can land on the repo/README, install `pi-cycle`, successfully switch modes, and understand what changed **within 60 seconds**, and feels confident enough to star/recommend.

**Measured by (practical proxies):**
- **Time-to-first-mode-switch:** install → `/reload` → press `F8` (or `/cycle next`) works on the first try.
- **Self-serve debuggability:** if something fails, `/cycle doctor` yields an actionable report without requiring maintainer back-and-forth.
- **Low support burden:** issues are reproducible and include doctor output; docs answer the top FAQs.
- **Trust signals present:** demo GIF, clear limitations (e.g. context vs billing quota), minimal CI, changelog/release plan.

---

## 2) Scope and hard constraints
### 2.1 In scope
- Cycle through named profiles.
- Each profile contains:
  - `provider`
  - `model`
  - `thinkingLevel`
- Register one hotkey: **F8** by default (configurable).
- Register one slash command namespace: **`/cycle`**.
- Provide menu-based configuration for non-JSON users.
- Ship an OpenAI-focused default cycle.
- Persist config locally at `~/.pi/agent/pi-cycle.json` (and read legacy `~/.pi/agent/py-cycle.json` if present).

### 2.2 Hard constraints
These are product constraints, not preferences:

| Constraint | Requirement |
|---|---|
| Command namespace | **Only `/cycle`** may be registered. No `/py-cycle`, `/model-cycle`, `/preset`, etc. |
| Hotkey | Default hotkey MUST be **F8** (and MUST remain configurable without adding new command namespaces). |
| Profile unit | Model and thinking level MUST move together. |
| Configuration | A user MUST be able to configure profiles through menus without editing JSON manually. |
| OpenAI focus | Defaults MUST be OpenAI/OpenAI Codex oriented. |
| Failure visibility | Missing model/auth MUST produce a visible warning. |

### 2.3 Out of scope
- Automatic model selection from prompt content.
- Separate hotkeys for model-only or thinking-only changes.
- A general Pi settings framework.
- A provider marketplace.
- Cloud sync of profile config.

---

## 3) Personas and use cases
### 3.1 Primary persona
A Pi power user who already has multiple OpenAI/OpenAI Codex models available and wants mode switching to be fast, repeatable, and low-friction.

### 3.2 Core use cases
1. **Deep correctness**
   - User switches to the strongest reasoning profile before high-stakes design, review, or diagnosis.
2. **Coding loop**
   - User switches to a code-specialized profile before implementation.
3. **General-purpose daily work**
   - User uses a balanced default for everyday questions and steady deep work without thinking about settings.
4. **Fast iteration**
   - User switches to a lower-cost/lower-latency profile for quick edits or small questions.
5. **Value mode**
   - User switches to a balanced profile when high throughput matters more than peak capability.

---

## 4) Public interface contract
### 4.1 Package identity
- Folder: `public/pi-cycle`
- Package name: `pi-cycle`
- Config file: `~/.pi/agent/pi-cycle.json` (reads legacy `~/.pi/agent/py-cycle.json`)

### 4.2 Hotkey
- **F8** → activate next configured profile (default).

### 4.3 Command surface
Only one command is registered: **`/cycle`**.

Supported forms:

| Command | Behavior |
|---|---|
| `/cycle` | Opens the main menu when UI is available; cycles next in non-UI mode. |
| `/cycle next` | Activates the next profile in config order. |
| `/cycle pick` | Opens a profile picker. |
| `/cycle config` | Opens the configuration menu. |
| `/cycle doctor` | Runs a self-check and reports config/model issues. |
| `/cycle help` | Shows usage summary. |
| `/cycle <profile-name>` | Directly activates a configured profile by name. |

Aliases under `/cycle` are allowed when they do not create a new namespace (for example `/cycle menu`, `/cycle ui`, `/cycle ?`).

### 4.4 Single-command guarantee
The extension MUST NOT register any additional top-level Pi commands. All user-facing actions must remain under `/cycle`.

---

## 5) Default OpenAI profile set
The default profile set is optimized for the job-to-be-done across intelligence/task quality, output-token efficiency, cost predictability, practical role in the cycle, and availability in OpenAI Codex provider mode. Current defaults center on GPT-5.5 based on recent benchmark evidence and first-principles preset design.

| Order | Profile | Provider | Model | Thinking | Intended use |
|---:|---|---|---|---|---|
| 1 | `deep` | `openai-codex` | `gpt-5.5` | `xhigh` | Specs, architecture, hard debugging, high-stakes review. |
| 2 | `code` | `openai-codex` | `gpt-5.5` | `high` | Implementation, debugging, refactors, code review. |
| 3 | `general` | `openai-codex` | `gpt-5.5` | `medium` | Best default: strong reasoning quality with good cost and token balance. |
| 4 | `fast` | `openai-codex` | `gpt-5.5` | `low` | Quick iterations, small edits, routine questions. |
| 5 | `value` | `openai-codex` | `gpt-5.5` | `low` | Cheap-reasoning default; preferred over older GPT-5.x and mini variants. |

### 5.1 Why five profiles?
Five is the intended default maximum for a public preset because it gives broad coverage without making the hotkey cycle feel like a carousel. Users may add more, including legacy/fallback profiles such as GPT-5.2 or GPT-5.3-Codex, but the shipped default cycle should stay compact and GPT-5.5-centered. GPT-5.4-mini should not be the value preset because its output-token efficiency is poor for that job.

---

## 6) Configuration contract
### 6.1 Storage
Configuration is stored locally at:

```text
~/.pi/agent/pi-cycle.json
```

For migration, the extension MAY read legacy config at:

```text
~/.pi/agent/py-cycle.json
```

### 6.2 Schema v1
```json
{
  "version": 1,
  "hotkey": "f8",
  "lowContext": {
    "enabled": true,
    "thresholdRemainingPercent": 10,
    "capThinkingLevel": "low"
  },
  "active": "general",
  "profiles": [
    {
      "name": "deep",
      "provider": "openai-codex",
      "model": "gpt-5.5",
      "thinkingLevel": "xhigh",
      "blurb": "Best for specs, architecture, hard debugging, and high-stakes review."
    },
    {
      "name": "code",
      "provider": "openai-codex",
      "model": "gpt-5.5",
      "thinkingLevel": "high",
      "blurb": "Best for implementation, debugging, refactors, and code review."
    },
    {
      "name": "general",
      "provider": "openai-codex",
      "model": "gpt-5.5",
      "thinkingLevel": "medium",
      "blurb": "Best default: strong reasoning quality with good cost and token balance."
    },
    {
      "name": "fast",
      "provider": "openai-codex",
      "model": "gpt-5.5",
      "thinkingLevel": "low",
      "blurb": "Best for quick iterations, small edits, and routine questions."
    },
    {
      "name": "value",
      "provider": "openai-codex",
      "model": "gpt-5.5",
      "thinkingLevel": "low",
      "blurb": "Best cheap-reasoning default; preferred over older GPT-5.x and mini variants."
    }
  ]
}
```

### 6.3 Valid `thinkingLevel` values
- `off`
- `minimal`
- `low`
- `medium`
- `high`
- `xhigh`

Pi may clamp or ignore unsupported thinking levels for a given model. `pi-cycle` should still store the user’s intended profile and rely on Pi’s model/thinking handling.

### 6.4 Validation rules
- `version` must be `1`.
- `profiles` must be a non-empty array.
- Each profile must have non-empty `name`, `provider`, and `model` strings.
- `thinkingLevel` must be one of the valid values above.
- Duplicate names SHOULD be rejected by the menu wizard.
- If config is missing or invalid, the extension falls back to defaults.
- Defaults SHOULD be derived from Pi’s cached enabled models (when available) to avoid recommending non-usable models.

### 6.5 Configuration UX requirements
`/cycle config` MUST provide menu actions for:
- add profile,
- edit profile,
- remove profile,
- move profile up/down,
- set hotkey,
- configure low-context thinking cap,
- reset to defaults,
- reload config.

An advanced JSON editor MAY be exposed, but it MUST NOT be the only supported configuration route.

---

## 7) Runtime behavior
### 7.1 Startup
On session start:
- load config,
- read `active`,
- do **not** automatically change model/thinking just because an active profile is stored.

Rationale: opening Pi should not unexpectedly mutate the user’s current model. Profile application is explicit.

### 7.2 Cycling algorithm
Given ordered profiles `P` and active profile name `A`:
1. Find index of `A` in `P`.
2. If found, activate `(index + 1) % P.length`.
3. If not found, activate `P[0]`.

Cycle order is the order of the `profiles` array in config.

### 7.3 Applying a profile
Applying profile `p` means:
1. find `p.provider/p.model` in `ctx.modelRegistry`,
2. call `pi.setModel(model)`,
3. call `pi.setThinkingLevel(p.thinkingLevel)`,
4. persist `active = p.name`,
5. notify the user with a 1-sentence “good for” blurb.

A profile MAY additionally include an optional `blurb` string in config; if absent, the extension uses built-in blurbs for common names (deep/code/general/fast/value/spark).

A config MAY additionally include `lowContext` policy to cap thinking levels when the **context window** is nearly full (this is not provider/account quota).
### 7.4 Atomicity definition
`pi-cycle` provides **atomic user intent**, not transactional rollback.

- The product unit is one profile.
- Applying the profile attempts both model and thinking changes.
- If the model cannot be found, the profile is not activated.
- If auth/model activation fails, the user is warned; thinking may still be applied because Pi can clamp/handle model support.

### 7.5 Feedback contract
On successful activation:
- show a notification such as `Mode: deep — Best for specs, architecture, and high-stakes review.`

On failure:
- show a warning or error notification,
- do not silently swallow missing model/auth/config problems.

---

## 8) Menu UI contract
### 8.1 `/cycle` main menu
Must expose:
- Cycle next,
- Pick profile,
- Configure,
- Doctor,
- Reload config,
- Help,
- Close.

### 8.2 `/cycle pick`
Must show available configured profiles with enough detail to distinguish them:
- profile name,
- provider/model,
- thinking level,
- active marker when applicable.

### 8.3 `/cycle config`
Must support profile management through menus/wizards. Model selection should be based on `ctx.modelRegistry.getAvailable()` filtered to OpenAI-like providers (provider name contains `openai`) for public defaults and user relevance.

---

## 9) Error handling and recovery
| Scenario | Expected behavior |
|---|---|
| Config file missing | Use defaults; write config on next change. |
| Config invalid JSON | Fall back to defaults; do not crash. |
| Profiles empty | Warn or fall back to defaults. |
| Model missing from registry | Warn; do not activate that profile. |
| Model auth unavailable | Warn; continue gracefully. |
| Config write fails | Warn/error; keep session usable. |
| UI unavailable and `/cycle` invoked | Cycle next instead of opening menu. |

---

## 10) Documentation requirements
Public package documentation must answer these questions quickly:
1. What does it do? — cycles model + thinking together.
2. How do I install it? — `pi install npm:pi-cycle`.
3. How do I use it? — `/cycle`, `F8`.
4. Where is config? — `~/.pi/agent/pi-cycle.json` (legacy: `~/.pi/agent/py-cycle.json`).
5. What are the defaults? — OpenAI-focused profile table.
6. How do I configure it? — `/cycle config`.

---

## 11) Success rubric
This rubric measures both product fit and implementation readiness. A public release should score **95+/100**.

| Category | Weight | Full-credit bar | Current score |
|---|---:|---|---:|
| North Star fit | 15 | One-keystroke mode switching is the central design; model+thinking always treated as one workflow unit. | 15/15 |
| Single command discipline | 10 | Exactly one top-level command namespace (`/cycle`); all sub-actions remain inside it. | 10/10 |
| Hotkey ergonomics | 10 | Default hotkey is memorable, documented, and directly cycles next. | 10/10 |
| OpenAI-focused defaults | 10 | Default profiles reflect the target OpenAI/OpenAI Codex model set and cover deep/code/general/fast/value modes. | 10/10 |
| Menu-based configuration | 15 | Add/edit/remove/reorder/reset can be done through menus without manual JSON editing. | 14/15 |
| Determinism and persistence | 10 | Cycle order is explicit, stable, and persisted locally; active profile is remembered without auto-mutating startup state. | 10/10 |
| Feedback and observability | 10 | Activation produces visible feedback (notification) with a clear 1-sentence blurb. | 10/10 |
| Failure handling | 10 | Missing model/auth/config issues warn clearly and do not crash the session. | 9/10 |
| Public packaging/docs | 10 | Package metadata, README, spec, feature doc, changelog, license, demo media, and workspace integration are present. | 10/10 |

**Current score: 98/100**

### 11.1 Remaining points to reach 100/100
- Add an automated smoke check that at least loads the extension in a real Pi session (CI-friendly if feasible).
- Consider richer model metadata in the model picker UI (optional polish).

### 11.2 GitHub stars success rubric (repo readiness)
This rubric measures how “star-worthy” the repo looks to a new visitor by optimizing for **time-to-value, trust, and low friction**. Target: **95+/100**.

| Category | Weight | Full-credit bar | Current score |
|---|---:|---|---:|
| Value proposition clarity | 15 | README explains *what it is* and *why it matters* in the first screen; includes “why star” bullets. | 15/15 |
| Time-to-first-success | 15 | Copy/paste install + `/reload` + one obvious action (`F8` or `/cycle next`) works immediately. | 14/15 |
| Proof (demo) | 10 | README includes a real demo GIF and provides a reproducible way to regenerate it. | 10/10 |
| Trust & diagnostics | 15 | `/cycle doctor` exists; troubleshooting tells users what to do; errors are actionable. | 15/15 |
| Compatibility & defaults | 10 | Defaults are OpenAI-focused and derived from `enabledModels`; skips unusable models; legacy config handled. | 10/10 |
| Maintainership signals | 15 | CHANGELOG + RELEASE plan exist; minimal CI gate exists; semantic versioning expectations are clear. | 14/15 |
| Community friction | 10 | Issue templates + PR template guide contributors and reduce maintainer triage load. | 10/10 |
| Accuracy & guardrails | 10 | No overclaims; clear statements about limitations (e.g. context window vs billing quota). | 9/10 |

**Stars readiness score: 97/100**

---

## 12) Acceptance tests
### 12.1 Install/load
1. `pi install npm:pi-cycle` installs the package.
2. `/reload` loads the extension without registering any command except `/cycle`.
3. `/hotkeys` (or equivalent Pi UI) shows the configured hotkey (default `F8`) for `pi-cycle: cycle model+thinking profile`.

### 12.2 Cycle behavior
1. Pressing the configured hotkey (default **F8**) activates the next configured profile.
2. `/cycle next` activates the same next profile as the hotkey.
3. Cycle order follows `profiles[]` order.
4. Invalid/missing `active` starts from the first profile.

### 12.3 Profile application
1. Activating a profile changes the current model to that profile’s provider/model when available and authorized.
2. Activating a profile sets the configured thinking level.
3. A notification is shown that includes the profile name and a 1-sentence blurb.
4. Config persists `active`.

### 12.4 Command/menu behavior
1. `/cycle` opens the main menu in UI mode.
2. `/cycle pick` opens a profile picker.
3. `/cycle config` opens menu-based configuration.
4. `/cycle doctor` runs a self-check and shows a report.
5. `/cycle <profile-name>` directly activates that profile.
6. `/cycle help` shows usage.
7. No other top-level commands are registered by this extension.

### 12.5 Configuration behavior
1. User can add a profile via menus.
2. User can edit provider/model/thinking via menus.
3. User can remove a profile via menus.
4. User can move a profile up/down via menus.
5. User can reset defaults via menu confirmation.
6. User can recover from invalid JSON without crashing the session.

### 12.6 Failure behavior
1. Missing model shows a warning and does not crash.
2. Missing auth shows a warning and does not crash.
3. Config write failure shows an error/warning and leaves the current session usable.

---

## 13) Release checklist
- [x] Package folder exists at `public/pi-cycle`.
- [x] Package name is `pi-cycle`.
- [x] `package.json` declares Pi extension entry `./index.ts`.
- [x] Hotkey is `F8` by default (and configurable via `/cycle config`).
- [x] Only `/cycle` is registered.
- [x] `SPEC.md` is inside `public/pi-cycle`.
- [x] `FEATURES.md` captures the 95+/100 product idea.
- [x] README exists and includes a demo GIF.
- [x] `demo.tape` exists and can regenerate the GIF.
- [x] LICENSE exists.
- [x] CHANGELOG exists.
- [x] CONTRIBUTING + RELEASE docs exist.
- [x] GitHub issue/PR templates exist.
- [x] Minimal CI exists (npm pack dry-run).
- [ ] Automated package smoke check added (beyond npm pack).

---

## 14) Change policy
This spec is the source of truth for `pi-cycle` v0.1.x. Minor changes may refine wording, defaults, menu labels, and docs. Changes that alter the command namespace, hotkey, config schema, or bundled model+thinking principle require a spec update and version bump.
