# PriorityPulse - Task Prioritization App

## Overview

PriorityPulse is a cross-platform mobile task prioritization app built with React Native and Expo. It helps users decide what to work on next by automatically adjusting task priority based on deadline proximity and urgency scoring.

The app combines manual priority settings with automatic deadline-based escalation: tasks become more urgent as their deadlines approach, visually guiding users toward what needs attention first.

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
- **Dashboard**: Stats overview (total, due today, overdue, high priority) + recommended next task
- **Kanban Board**: Three-column view (To Do, In Progress, Done) with tab selector
- **Task Cards**: Priority badge, days remaining, deadline, color-coded by priority level
- **Search & Filter**: Text search + filter chips by priority, status, deadline
- **Add/Edit Tasks**: Full form with title, description, priority picker, status, deadline with quick date options
- **Dark Mode**: Full dark/light theme support
- **Local Storage**: All data persisted via AsyncStorage

## Architecture

### Frontend (Expo/React Native)
- Framework: Expo SDK 54 with Expo Router (file-based routing)
- State: React Context + AsyncStorage (no backend needed)
- Navigation: Three-tab layout (Dashboard, Board, Search) + modal stack for task forms

### File Structure
```
app/
  _layout.tsx          # Root layout with providers (TaskProvider, QueryClient, etc.)
  (tabs)/
    _layout.tsx        # Tab bar (NativeTabs for iOS 26+ liquid glass, Tabs fallback)
    index.tsx          # Dashboard screen
    board.tsx          # Kanban board screen
    search.tsx         # Search & filter screen
  task/
    new.tsx            # New task form (modal)
    [id].tsx           # Task detail/edit (modal)

contexts/
  TaskContext.tsx      # Task state management + CRUD with AsyncStorage

utils/
  priority.ts         # Priority calculation engine + utilities

components/
  PriorityBadge.tsx   # Color-coded priority badge
  TaskCard.tsx        # Task card with actions
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

- **Backend**: Runs on port 5000 (Express server for landing page only)
- **Frontend**: Expo Metro on port 8081 — access via Expo Go QR code or web browser at localhost:8081
- The "Start Frontend" workflow may show as failed due to health check timing, but Metro IS running and accessible
