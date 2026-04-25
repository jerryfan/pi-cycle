# Contributing

## Local smoke test

1. Install locally (project-local recommended):

```bash
pi install -l <path-to-pi-cycle>
```

2. In Pi:

```text
/reload
/cycle
```

3. Verify:
- `F8` cycles profiles
- `/cycle pick` opens picker
- `/cycle config` can add/edit/remove/reorder and change hotkey
- `/cycle doctor` reports OK (or clearly explains what’s wrong)
- If a profile’s model is unsupported, cycling skips it with a warning (no stuck state)

## PR expectations

- Keep the single-command rule: only `/cycle` as a top-level command
- Model + thinking must change together (no separate toggles)
- Keep OpenAI-only defaults
- Update `CHANGELOG.md` for user-visible changes
- Keep README concise and practical
