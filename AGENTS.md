

## Default Working Style

- Use CRG first before broad code exploration when it is relevant to the task.
- Keep replies terse by default.
- Minimize commentary while working. Explain only when blocked, when risk is non-obvious, or when the user asks for detail.
- Prefer patch-first execution when the task is clear, then provide a short summary.
- No commentary unless blocked.
- Patch first, explain after.
- Keep the final response to at most 3 lines or 1 short paragraph by default.
- If the CRG graph may be stale, run `crg update .` before relying on it.

## Response Shape

- Prefer a short paragraph or a few lines over long explanations.
- Do not provide long plans unless the user asks for one.
- When reviewing, prioritize findings and risks first.
- Keep output under 5 lines unless the user asks for more.

## Prompt Patterns

- Use CRG first and fix this. Keep output under 5 lines.
- Use CRG to find the affected flow, make the change, no walkthrough.
- Use CRG minimal context, review only, findings only.
- Use CRG and tell me only the files changed and the reason.

## Workflow Rules

1. Before implementing any new user instruction, restate what was understood.
2. Do not implement until the user explicitly says `go ahead`.
3. don't ever touch working features only fix what user requested edits or  asked for
4. Preserve the TV-first, premium, cinematic product direction unless the user explicitly changes it.

## Cache Cleanup Rules

- If rebuildable cache/output in this project grows beyond `1GB`, clean it proactively.
- Safe cleanup targets include: `.next/`, `out/`, `dist/`, `build/`, `.firebase/`, `coverage/`, `.turbo/`, `.cache/`, and log files like `firebase-debug.log`.
- Never delete source files, `.git`, deployment configuration, Firebase config, lockfiles, environment files, docs, or project memory/reference files.
- Do not delete installed dependency folders such as `node_modules` unless the user explicitly asks.
- Before deleting, confirm the target is generated/rebuildable and not required for current hosting or deployment state.

## Deployment Rules

- Default Firebase deployment account for this repo is `choosindichaalu@gmail.com`.
- Before any Firebase deploy, verify the active Firebase login with `npx firebase login:list`.
- If the active deploy account is not `choosindichaalu@gmail.com`, switch explicitly before deploying.
- Prefer `npx firebase deploy --only hosting --account choosindichaalu@gmail.com` for Hosting deploys in this repo.
