---
name: architecture-check
description: Scans src/ for violations of the non-negotiable architecture rules in CLAUDE.md — forbidden DOM/time/random APIs outside allowed files, ad-hoc any/@ts-ignore, and Math.random usage. Use before committing non-trivial changes to game modules.
---

# architecture-check

Scan `src/` for violations of the frozen architecture rules.

## Checks

Run these from the repo root and report any hits with file:line and a one-line reason:

1. **Deterministic by construction** — no non-deterministic APIs anywhere under `src/` except `src/main.ts`:
   ```bash
   grep -rnE "Math\.random|Date\.now|performance\.now|setTimeout|setInterval|requestAnimationFrame" src/ --include="*.ts" | grep -v "src/main.ts"
   ```

2. **Pure logic has no DOM access** — only `src/main.ts`, `src/render.ts`, `src/input-dom.ts` may touch `window`, `document`, `localStorage`, or the canvas:
   ```bash
   grep -rnE "\b(window|document|localStorage|HTMLCanvasElement|CanvasRenderingContext2D)\b" src/ --include="*.ts" \
     | grep -vE "src/(main|render|input-dom)\.ts"
   ```

3. **Strict TypeScript** — no `any`, no `as` casts to concrete types, no `@ts-ignore`, no `enum`:
   ```bash
   grep -rnE "\bany\b|@ts-ignore|@ts-expect-error|\benum\b" src/ --include="*.ts"
   ```

4. **Numbers live in `tuning.ts`** — scan for suspicious numeric literals outside `tuning.ts` and tests (heuristic only; report but let the human judge):
   ```bash
   grep -rnE "[^a-zA-Z0-9_]([0-9]{2,}\.?[0-9]*)" src/ --include="*.ts" \
     | grep -vE "src/tuning\.ts|: 0|= 0|\\* 0\\.5|1 / 60"
   ```

## Output

For each check:
- **PASS** if no hits, with a single-line note.
- **FAIL** listing every hit as `file:line — snippet`, grouped by rule.

End with a one-line verdict: `OK` or `N violations across M rules — fix before commit`.

Do not auto-fix. Report only; the human (or a follow-up prompt) decides.
