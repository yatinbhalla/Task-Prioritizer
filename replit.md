# PriorityPulse - Task Prioritization App

## Overview

PriorityPulse is a cross-platform mobile task prioritization app built with React Native and Expo. It helps users decide what to work on next by automatically adjusting task priority based on deadline proximity, effort, and impact scoring.

## User Preferences

Preferred communication style: Simple, everyday language.

## Features

- **Smart Priority Engine**: Auto-escalates priority based on deadline proximity
  - >7 days: Use manual priority
  - ≤5 days: Escalate one level
  - ≤2 days: Escalate two levels
  - ≤24 hours: Force Top priority
  - Overdue: Mark Critical
- **Effort & Impact Scoring**: Each task has effort_score (1–5) and impact_score (1–5)
  - priority_score = (impact_score / effort_score) + urgency_score
  - All sorting uses priority_score as primary key
- **Subtasks**: Tasks can be broken into steps, checkable inline in task detail
- **Recurring Tasks**: Daily/Weekly/Monthly/Custom — auto-spawn on completion
- **Focus Mode (Home Screen)**: 
  - Greeting with user name
  - "Do This Now" card — top task by priority_score
  - Start / Skip buttons
  - Quick stats (Due Today, Overdue, Done Today, Total)
  - "My Day Plan" + "Impact Matrix" shortcut cards
  - Up Next task list
- **My Day Plan**: Auto-schedule tasks into 8-hour time blocks starting at 9AM
  - "Auto Plan My Day" greedy fill by priority_score
  - Timeline view with time ranges
  - Mark done / remove blocks
  - Carry forward unfinished tasks from previous day
- **Impact vs Effort Matrix**: 2×2 grid of active tasks
  - Quick Wins (High Impact, Low Effort)
  - Big Bets (High Impact, High Effort)
  - Fill Ins (Low Impact, Low Effort)
  - Time Wasters (Low Impact, High Effort)
  - Tap a task to adjust effort/impact inline
- **Lightweight Profile/Onboarding**:
  - First-launch name entry ("What should we call you?")
  - Stored locally in AsyncStorage — no passwords or auth
  - Profile tab with stats, edit name/email, clear all data
  - Auto-login on next open
- **Board**: Kanban (To Do / In Progress / Done) with date + priority filters and sort
- **Search**: Text search + filter by priority, status, deadline
- **Dark Mode**: Full dark/light theme

## Architecture

### Frontend (Expo/React Native)
- Framework: Expo SDK 54 with Expo Router (file-based routing)
- State: React Context + AsyncStorage (no backend needed)
- Navigation: 4-tab layout (Focus, Board, Search, Profile) + modal stack

### Backend (Express + TypeScript)
- Port 5000 — proxies all Expo/Metro requests to Metro bundler on port 8081
- Serves landing page at `/` (non-Metro requests)
- Pre-warms Android + iOS bundles on startup

### File Structure
```
app/
  _layout.tsx           # Root layout: QueryClient, UserProvider, TaskProvider
  onboarding.tsx        # First-launch name entry
  planner.tsx           # My Day Plan (modal)
  matrix.tsx            # Impact vs Effort Matrix (modal)
  (tabs)/
    _layout.tsx         # 4 tabs: Focus | Board | Search | Profile
    index.tsx           # Focus Mode (home)
    board.tsx           # Kanban board
    search.tsx          # Search & filter
    profile.tsx         # User profile
  task/
    new.tsx             # New task form (modal)
    [id].tsx            # Task detail/edit (modal)

contexts/
  TaskContext.tsx        # Task CRUD + subtasks + recurring auto-spawn
  UserContext.tsx        # User profile (name, email) in AsyncStorage

utils/
  priority.ts           # Priority engine, scoring, recurrence, formatting

components/
  PriorityBadge.tsx
  TaskCard.tsx           # Shows duration, subtask progress, recurring badge
  SubtaskList.tsx        # Inline subtask list with add/toggle/remove
  RecurrenceSection.tsx
  KeyboardAwareScrollViewCompat.tsx
```

### Task Model
```typescript
interface Task {
  id, title, description, createdDate, deadlineDate,
  manualPriority, dynamicPriority, urgencyScore, status,
  priority_score,          // (impact/effort) + urgency_score
  estimated_duration,      // minutes (default 30)
  effort_score,            // 1-5
  impact_score,            // 1-5
  subtasks: Subtask[],
  recurrenceType, recurrenceInterval?,
  recurrenceDayOfWeek?, recurrenceDayOfMonth?, nextCycleStart?,
}

interface Subtask { id, title, completed }
interface UserProfile { name, email?, createdAt }
interface DailyPlan { date, blocks: PlanBlock[] }
interface PlanBlock { taskId, startMinutes, durationMinutes, completed, carriedForward? }
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
- **Backend**: Port 5000 (Express + Metro proxy + landing page)
- **Frontend**: Expo Metro on port 8081
- Scan the QR code in the Replit URL bar with Expo Go to preview on device
- Pre-warm: bundles compiled on backend startup for ~100ms load time
