# AGENTS.md - Push-up Timer Pro Project Guidelines & AI Context

> **Project Name:** Push-up Timer Pro  
> **Repository:** `H2o86/push-up-timer` (Branch: `main`)  
> **Live Web App:** `https://h2o86.github.io/push-up-timer/`  
> **Backend:** Google Apps Script (`Code.gs`) connected to Google Sheet  
> **Admin Account:** `ha19.bqp@gmail.com` (PIN: `HA19@PushUp2026#`)

---

## 📐 Architecture & Technology Stack

1. **Frontend Architecture:**
   - **Core:** Single Page Application (SPA) written in Vanilla HTML5 and ES6+ JavaScript (`app.js`).
   - **Styling:** Modular Vanilla CSS3 (`style.css`) with CSS custom properties (variables), Glassmorphism dark mode, and dynamic safe-area insets (`env(safe-area-inset-bottom)`).
   - **Voice & Audio:** Web Speech API (`speechSynthesis`) for real-time Voice Coach + Web Audio API (`AudioContext`) for countdown beeps.
   - **Local Storage:** `pushup_master_data`, `pushup_current_user`, `pushup_last_manual_settings`, `pushup_api_url`.

2. **Backend Architecture (Google Apps Script `Code.gs`):**
   - **Google Sheets:**
     - `Users`: Stores `Username`, `PIN`, `Email`, `DefaultMin`, `DefaultStep`, `DefaultMax`, `Weight`, `VoiceCoach`, `CreatedAt`.
     - `Workouts`: Stores `Username`, `Reps`, `TimeSeconds`, `SetsCount`, `Calories`, `TempoBadge`, `Variation`, `Date`.
     - `OTP`: Stores `Email`, `OTP`, `CreatedAt` for password recovery.
   - **API Protocol:** RESTful HTTP POST requests via `fetch()` passing JSON payloads with `action` parameters.

---

## 🎯 Key Domain Logic & Algorithms

### 1. Workout Modes (`computeWorkoutPlan()`)
- **Pyramid Auto (`pyramid_auto`):**  
  Given target reps $T$ and odd set count $N$: Calculates optimal `Min` and `Step` to build a symmetric peak pyramid $R_1 \dots R_k \dots R_N$ matching $T$.
- **Pyramid Manual (`pyramid_manual`):**  
  Uses user-defined `Min`, `Step`, and `Max`. Automatically remembers and restores previous workout parameters from `localStorage.pushup_last_manual_settings`.
- **Fixed Sets (`fixed`):**  
  Array of length $N$ sets with constant reps $R$ per set.

### 2. Form & Tempo Analysis (`getTempoRating()`)
- **🚀 FLY:** $< 1.5$ sec/rep (Speed alert: Reminds user to slow down & keep proper form).
- **⚡ HYPER:** $1.5 - 2.2$ sec/rep (Fast paced).
- **💪 STANDARD:** $2.2 - 3.5$ sec/rep (Gold standard for muscle hypertrophy & TUT).
- **🔥 HARD-CORE:** $> 3.5$ sec/rep (Maximum tension & endurance).

### 3. Ranking & Leaderboard Score Formula
$$\text{Score} = \text{Total Reps} + (\text{Streak} \times 20)$$

### 4. Admin Access Policy
- **Sole Admin:** Strictly restricted to account email `ha19.bqp@gmail.com`.
- **Admin Password:** `HA19@PushUp2026#`.

---

## 🛠️ Development & Coding Rules

1. **Mobile Ergonomics First:**
   - Always ensure interactive buttons have adequate padding at the bottom (`margin-bottom: 8rem`, `padding-bottom: 5rem`, `env(safe-area-inset-bottom)`).
   - Never place full-width buttons inside CSS Grid containers with 2 columns without closing the grid container first.

2. **Null-Safety & Error Prevention:**
   - Always wrap DOM element property access (`document.getElementById(...)`) with null checks before accessing `.value` or `.innerText`.
   - Wrap state initialization inside `try...catch` blocks to prevent white-screen crashes on mobile devices.

3. **Backend & Frontend Sync:**
   - Whenever adding new workout parameters or user attributes, update both `app.js` and `Code.gs` simultaneously.
   - Run `node -c app.js` to verify JavaScript syntax before committing changes.

4. **Git Workflow:**
   - Commit message pattern: `[Feature/Fix/Refactor] Brief summary in Vietnamese`.
   - Push to `origin main` to trigger GitHub Pages deployment.
