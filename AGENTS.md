# AGENTS.md instructions for `C:\code\pi\public\pi-cycle`

<INSTRUCTIONS>
Temp file policy:
- Put all temporary files, scratch files, cache artifacts, build outputs, script outputs, exports, screenshots, and throwaway working files in `c:\trash\pi-cycle\<yyyy-mm-dd>-<task>-<runid>`.
- Always create a subfolder under `c:\trash\pi-cycle` to avoid collisions between runs, reruns, repos, and agents.
- Do not create temp files or folders inside this package unless a task explicitly requires a tracked file change.
- If a tool insists on a temp location, redirect it to the active `c:\trash\pi-cycle\...` subfolder whenever possible.
- Only move a file from `c:\trash\pi-cycle\...` into this package once it becomes a durable project artifact.

Authority map:
- Golf / GoFaster business authority: `C:\cases\golf`
- RTE authority: `none`
- Project corpus: `none`
- Project-local SSoT: `C:\code\pi\public\pi-cycle`

Repo class:
- Public Pi extension package

Planning files:
- `SPEC.md` is the durable product specification for this package.
- `README.md` is consumer-facing; other package markdown is reference-only unless explicitly promoted.

Repository hygiene:
- Keep one canonical file per concern whenever possible.
- Never delete or overwrite user-authored files without explicit instruction.
</INSTRUCTIONS>
