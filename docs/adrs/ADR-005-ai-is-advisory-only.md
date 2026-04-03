# ADR-005: AI Is Advisory Only

## Status
Accepted

## Context
Zephix includes AI capabilities (analysis, suggestions, insights). The platform must define whether AI can autonomously mutate state or only advise humans who then decide.

## Decision
AI is advisory only. No autonomous AI actions. AI surfaces provide suggestions, explanations, and recommendations — never direct state mutation.

- AI can analyze documents, generate insights, and recommend actions
- AI cannot create, update, or delete any domain entity on its own
- All AI-suggested actions require explicit human confirmation before execution
- AI maturity progresses through trusted platform signals, not autonomous agency

## Why
- Enterprise customers require human accountability for state changes
- Autonomous AI actions create audit and compliance risks
- Advisory AI builds trust incrementally — users learn to rely on suggestions before granting more authority
- Governance-aware platforms must maintain clear human-in-the-loop decision points

## Consequences
- AI services return suggestions, not mutations
- Frontend AI surfaces show recommendations with "Apply" or "Dismiss" actions
- AI confidence scores are explanatory, not decision-making thresholds
- No background AI jobs that modify project, task, or governance state
- AI analysis results are stored separately from domain entities

## What This Does Not Decide
- Whether AI can pre-fill form fields (advisory, user confirms before submit)
- Whether AI can prioritize notifications or inbox items (read-only ranking)
- Future AI maturity stages that may expand advisory scope with explicit approval