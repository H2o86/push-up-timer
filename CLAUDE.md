# CLAUDE.md - AI Coding Assistant Context & Project Commands

## Project Overview
Push-up Timer Pro is a web application for tracking push-up workouts, supporting smart pyramid workouts, fixed sets, form speed analysis, 7 push-up variations, streak tracking, and Google Sheet backend integration.

## Key Files
- `index.html`: Core single page application HTML structure.
- `style.css`: Modern Glassmorphism CSS design system with mobile safe-area insets.
- `app.js`: Master application logic, UI state management, audio coach, and API client.
- `AGENTS.md`: Full architectural memory and domain logic specifications.

## Common Developer Commands
- **Check JS Syntax:** `node -c app.js`
- **Git Commit & Push:** `git commit -am "Message"` && `git push origin main`
- **Live Preview URL:** `https://h2o86.github.io/push-up-timer/`

## Coding Principles & Best Practices
1. **Empirical Verification:** Always verify syntax using `node -c app.js` before pushing code.
2. **Mobile Usability:** Ensure bottom elements include `calc(3rem + env(safe-area-inset-bottom))` padding.
3. **Null Safety:** Guard all DOM queries (`document.getElementById(...)`) against null.
4. **Admin Protection:** Strictly enforce Admin rights only for `ha19.bqp@gmail.com`.
