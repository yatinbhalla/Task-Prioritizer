# Task-Prioritizer: Smart Task Planning & Prioritization

A full-stack, cross-platform task management platform built with TypeScript/React Native that intelligently prioritizes tasks using dynamic scoring algorithms.

**Live Demo:** [https://replit.com/@yatinbhalla42/Task-Prioritizer](https://replit.com/@yatinbhalla42/Task-Prioritizer)

---

## Table of Contents
1. [Overview](#overview)
2. [Tech Stack](#tech-stack)
3. [Project Layout](#project-layout)
4. [Architecture](#architecture)
5. [Application State](#application-state)
6. [Pages](#pages)
7. [Components](#components)
8. [Priority Scoring](#priority-scoring)
9. [Hooks & Utilities](#hooks--utilities)
10. [Known Limitations](#known-limitations)

---

## Overview

**Task-Prioritizer** eliminates decision fatigue by automatically prioritizing tasks using multi-factor scoring. Combines urgency metrics (deadline proximity), impact assessment (effort vs. impact), and manual overrides for intelligent task ranking.

**Value Proposition:**
- AI-driven task prioritization
- Impact Matrix visualization (Eisenhower canvas)
- Daily time-block planning with capacity modeling
- Cross-platform (iOS, Android, Web) via Expo

**Tech Composition:** 87.5% TypeScript, 7.1% JavaScript, 5.4% HTML

---

## Tech Stack

**Frontend:** React Native 0.81.5 | Expo Router 6.0 | React 19.1 | TypeScript 5.9
**State:** React Context API | AsyncStorage | TanStack React Query 5.83
**Backend:** Express 5.0 | Node.js (tsx) | PostgreSQL | Drizzle ORM
**Build:** Metro Bundler | esbuild | Babel | ESLint

---

## Project Layout
app/ # Expo Router pages ├── _layout.tsx # Root layout + providers ├── (tabs)/ # Tabbed navigation ├── onboarding.tsx # User setup ├── planner.tsx # Daily planning ├── matrix.tsx # Impact matrix └── task/[id].tsx # Task detail

contexts/ # React Context ├── TaskContext.tsx # Task state (8KB) └── UserContext.tsx # User profile (1.7KB)

components/ # Reusable UI ├── TaskCard.tsx ├── SubtaskList.tsx ├── RecurrenceSection.tsx ├── PriorityBadge.tsx ├── ErrorBoundary.tsx └── ErrorFallback.tsx

server/ # Express backend ├── index.ts # Main server ├── routes.ts # API routes └── storage.ts # Database init

utils/ └── priority.ts # Scoring algorithms (7.1KB)

lib/ └── query-client.ts # React Query config


---

## Architecture

### Authentication & Login

**Model:** Lightweight, local-first
- Onboarding: Name (required) + Email (optional)
- UserContext persists to AsyncStorage
- Guest mode available
- No backend auth (client-side only)

### Roles & RBAC

**Current:** Single-user personal task management
**Future:** Admin → Full visibility; Member → Personal + assigned; Viewer → Read-only

### Application State - AppContext

**TaskContext** manages task lifecycle via React Context + AsyncStorage

**Operations:**
- addTask() | updateTask() | deleteTask() | moveTask()
- addSubtask() | toggleSubtask() | removeSubtask()
- getTasksByStatus() | getTopTask()
- stats: { total, dueToday, overdue, highPriority, completedToday }

**UserContext:**
- saveUser() | clearUser()

---

## Pages

| Page | File | Purpose |
|------|------|---------|
| **Onboarding** | `app/onboarding.tsx` | User profile setup |
| **Home/Dashboard** | `app/(tabs)/index.tsx` | Task stats, quick actions |
| **Impact Matrix** | `app/matrix.tsx` | 2x2 canvas visualization |
| **Daily Planner** | `app/planner.tsx` | Time-block scheduling |
| **Task Detail** | `app/task/[id].tsx` | Deep edit functionality |
| **Task Create** | `app/task/new.tsx` | Quick task entry |

---

## Components

| Component | Purpose |
|-----------|---------|
| **TaskCard** | Task display with metadata |
| **SubtaskList** | Subtask management |
| **RecurrenceSection** | Recurrence configuration |
| **PriorityBadge** | Visual priority indicator |
| **ErrorBoundary** | Error handling wrapper |
| **ErrorFallback** | Error UI fallback |

---

## Priority Scoring

### Three-Layer System

**Layer 1:** Manual Priority (low, medium, high, top, critical)
**Layer 2:** Dynamic Priority (auto-escalate by deadline proximity)
**Layer 3:** Priority Score = (Impact / Effort) + Urgency Score

**Sort:** priority_score DESC, then deadline ASC

### AI Planner (Auto-Plan)
1. Fetch all "todo" tasks
2. Sort by priority_score
3. Fill 8-hour capacity (480 min)
4. Allocate each task estimated_duration
5. Mark overflow tasks

---

## Hooks & Utilities

**useTasks()** - Task state & operations
**useUser()** - User profile management

**Utilities:**
- calculateDynamicPriority() - Auto-escalate
- calculatePriorityScore() - Final ranking
- getDaysRemaining() - Deadline math
- formatDuration() - Time formatting
- generateId() - Unique IDs

---

## Known Limitations

- ❌ No backend auth (local-only)
- ❌ No database persistence (AsyncStorage only)
- ❌ Single-user (no collaboration)
- ⚠️ In-memory only (<500 tasks optimal)
- ⚠️ No complex recurrence rules
- ❌ Limited error logging
- ✅ Express ready for API extension

---

## Getting Started

```bash
# Install
git clone https://github.com/yatinbhalla/Task-Prioritizer.git
cd Task-Prioritizer
npm install

# Dev
npm run expo:dev           # Terminal 1
npm run server:dev         # Terminal 2

# Prod
npm run expo:static:build && npm run server:build && npm run server:prod
