# Challenge #001: React TODO App with Persistence

**Date:** 2026-02-06  
**Status:** 🟡 Ready for Dev Agents  
**Difficulty:** Beginner

---

## 📝 Task Description

Build a functional TODO list application using React and TypeScript.

The app should allow users to:
1. Add new TODO items
2. Mark items as complete/incomplete
3. Delete items
4. View all items in a clean list

Data must persist across page reloads using browser localStorage.

---

## ✅ Acceptance Criteria

**Core Features (Required):**
- [ ] Input field to add new TODOs
- [ ] Add button (or Enter key) triggers add
- [ ] List displays all TODO items
- [ ] Each item shows text + checkbox for completion
- [ ] Clicking checkbox toggles complete/incomplete state
- [ ] Delete button removes item from list
- [ ] Data persists in localStorage (survives page refresh)
- [ ] Empty state shown when no TODOs exist

**Technical Requirements:**
- [ ] TypeScript used throughout
- [ ] React hooks (useState, useEffect) for state
- [ ] Tailwind CSS for styling
- [ ] No external state management libraries
- [ ] Clean, readable code with comments

**UI/UX:**
- [ ] Clean, modern design
- [ ] Responsive layout (mobile + desktop)
- [ ] Visual feedback on interactions
- [ ] Consistent spacing and typography

---

## ⚡ Bonus Points (Not Required)

- [ ] Edit existing TODOs (inline or modal)
- [ ] Filter view: All / Active / Completed
- [ ] Clear all completed button
- [ ] Animations (add/remove items)
- [ ] Dark mode toggle
- [ ] Due dates for TODOs

---

## ⏱️ Time Limit

**1 hour** from branch creation

---

## 🧪 Test Verification

After implementation, verify:
1. Add 3 TODOs → all appear in list
2. Mark 1 complete → checkbox shows checked
3. Refresh page → all 3 TODOs still there, complete state preserved
4. Delete 1 TODO → removed from list
5. Refresh page → deleted TODO stays gone

---

## 🏆 Scoring Criteria

Tech Lead will score 1-10 on:

| Criteria | Weight | Notes |
|----------|--------|-------|
| **Functionality** | 40% | All acceptance criteria work |
| **Code Quality** | 25% | Clean, readable, well-organized |
| **UX/Polish** | 20% | Looks good, feels responsive |
| **Bonus Features** | 15% | Extra features implemented |

---

## 🌿 Branches

- `model-kimi-k2-5/task-001-todo-app` → Dev A (kimi-k2.5:cloud)
- `model-qwen3-coder/task-001-todo-app` → Dev B (qwen3-coder-next:cloud)

Each branch starts from `main` with this skeleton:
- React + TypeScript + Vite setup
- Tailwind CSS configured
- Empty App.tsx ready for implementation

---

## 📝 Dev Agent Instructions

**Starting Point:**
```bash
git checkout main
git checkout -b model-YOUR-MODEL/task-001-todo-app
npm install
npm run dev
```

**Task:**
Implement the TODO app in `src/App.tsx` (and create components as needed).

**Commit Message Format:**
```
[task-001] Implement TODO app with localStorage persistence
- Add/remove/complete functionality
- Persist to localStorage
- Responsive Tailwind styling
```

**Time Limit:** 1 hour from branch creation

**When Done:**
1. Commit all changes
2. Push branch to origin
3. Notify Remy for Tech Lead review

---

**May the best model win! 🦞🥊**
