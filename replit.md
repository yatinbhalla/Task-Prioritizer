# PriorityPulse - Task Prioritization App

## Overview

PriorityPulse is a cross-platform mobile task prioritization app built with React Native and Expo. It helps users decide what to work on next by automatically adjusting task priority based on deadline proximity and urgency scoring.

## User Preferences

Preferred communication style: Simple, everyday language.

## Features

- **Smart Priority Engine**: Auto-escalates priority based on deadline proximity
  - >7 days: Use manual priority
  - ≤5 days: Escalate one level
  - ≤2 days: Escalate two levels
  - ≤24 hours: Force Top priority
  - Overdue: Mark Critical
- **Urgency Scoring**: Numeric score combining priority weight and deadline proximity for intelligent sorting
- **Recurring Tasks**: Tasks auto-spawn the next cycle when marked Done
  - Daily: spawns next day at midnight
  - Weekly: spawns on chosen weekday
  - Monthly: spawns on chosen day of month
  - Custom: spawns every N days
  - Repeat icon badge on task cards for recurring tasks
- **Dashboard**: Stats overview (total, due today, overdue, high priority) + recommended next task
- **Kanban Board**: Three-column view (To Do, In Progress, Done) with tab selector
  - Filter chips: Date (All / Today / Tomorrow / This Week / Overdue)
  - Sort chips: Priority / Deadline / Recently Created
  - Priority filter: All / Low / Medium / High / Top / Critical
  - "Clear filters" button when filters are active
- **Task Cards**: Priority badge, days remaining, deadline, color-coded, recurring icon
- **Search & Filter**: Text search + filter chips by priority, status, deadline
- **Add/Edit Tasks**: Full form with title, description, priority, status, deadline, recurrence
- **Dark Mode**: Full dark/light theme support
- **Local Storage**: All data persisted via AsyncStorage (with migration for old tasks)

## Architecture

### Frontend (Expo/React Native)
- Framework: Expo SDK 54 with Expo Router (file-based routing)
- State: React Context + AsyncStorage (no backend needed)
- Navigation: Three-tab layout (Dashboard, Board, Search) + modal stack for task forms

### Backend (Express + TypeScript)
- Port 5000 — proxies all Expo/Metro requests to Metro bundler on port 8081
- Serves landing page at `/` (non-Metro requests)
- Pre-warms Android + iOS bundles on startup for fast Expo Go loading (~100ms vs 21s cold)
- Key proxy routes: `/status`, `/assets/?unstable_path=...`, `/symbolicate`, `*.bundle`, `*.map`

### File Structure
```
app/
  _layout.tsx          # Root layout with providers
  (tabs)/
    _layout.tsx        # Tab bar
    index.tsx          # Dashboard screen
    board.tsx          # Kanban board with filters/sort
    search.tsx         # Search & filter screen
  task/
    new.tsx            # New task form
    [id].tsx           # Task detail/edit

contexts/
  TaskContext.tsx      # Task CRUD + recurring task auto-spawn logic

utils/
  priority.ts         # Priority engine, recurrence types, computeNextDeadline

components/
  PriorityBadge.tsx   # Color-coded priority badge
  TaskCard.tsx        # Task card (shows repeat icon for recurring tasks)
  RecurrenceSection.tsx  # Shared recurrence picker UI (used in new + edit)
  KeyboardAwareScrollViewCompat.tsx
```

### Task Model
```typescript
interface Task {
  id, title, description, createdDate, deadlineDate,
  manualPriority, dynamicPriority, urgencyScore, status,
  recurrenceType: "none" | "daily" | "weekly" | "monthly" | "custom",
  recurrenceInterval?,   // custom: days between cycles
  recurrenceDayOfWeek?,  // weekly: 0-6
  recurrenceDayOfMonth?, // monthly: 1-31
  nextCycleStart?,
}
```

### Priority Color Coding
- Low → Grey (#6B7280)
- Medium → Blue (#3B82F6)
- High → Orange (#F97316)
- Top → Red (#EF4444)
- Critical → Dark Red (#7F1D1D)

### Theme
- Primary accent: Electric Orange (#FF6B35)
- Dark background: Navy (#0A0F1E)
- Font: Inter

## Running the App

- **Backend**: Port 5000 (Express + Metro proxy)
- **Frontend**: Expo Metro on port 8081
- Scan the QR code in the Replit URL bar with Expo Go (Android) to preview on device
- Pre-warm: bundles are compiled on backend startup so Expo Go loads in ~100ms
