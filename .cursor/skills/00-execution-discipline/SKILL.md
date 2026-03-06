Name
execution-discipline

Description
Use when user asks for a plan, runbook, lane, sequence, or when changes risk drift. Enforces stop rules, evidence, and minimal diff.

Instructions

Write a lane plan with steps numbered.

Define stop conditions before editing.

Prefer smallest change set.

After each step, capture proof command and output snippet.

If any command fails, stop and report. Do not keep going.

Never change unrelated files.

Never introduce new abstractions unless asked.

Proof checklist

git status --short

git diff --name-only

command output for each validation step
