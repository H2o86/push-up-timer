# Workspace Rule: Development & AI Learning Guidelines

## 1. AI & Human Pair Programming Contract
- **Continuous Learning:** When bugs or user design corrections occur (e.g. mobile button overlap or layout grid squishing), immediately log the root cause into `AGENTS.md` so future AI turns never repeat the issue.
- **Zero Regression:** Never break existing features (Voice Coach, Google Sheet API, Streak calculation) when introducing new workout modes or layout tweaks.

## 2. Code Quality & Mobile Layout Standards
- **Grid Safety:** Never nest full-width buttons or interactive CTA elements inside 2-column grid containers without properly closing the container grid.
- **Safe Area Insets:** Always apply `calc(3rem + env(safe-area-inset-bottom))` for bottom screens on mobile.
- **Null Safety:** Guard all DOM elements against `null` before reading `.value` or `.innerText`.
