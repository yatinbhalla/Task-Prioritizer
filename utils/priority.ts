export type PriorityLevel = "low" | "medium" | "high" | "top" | "critical";
export type TaskStatus = "todo" | "inprogress" | "done";
export type RecurrenceType = "none" | "daily" | "weekly" | "monthly" | "custom";

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  createdDate: string;
  deadlineDate: string;
  manualPriority: PriorityLevel;
  dynamicPriority: PriorityLevel;
  urgencyScore: number;
  priority_score: number;
  status: TaskStatus;
  recurrenceType: RecurrenceType;
  recurrenceInterval?: number;
  recurrenceDayOfWeek?: number;
  recurrenceDayOfMonth?: number;
  nextCycleStart?: string;
  estimated_duration: number;
  effort_score: number;
  impact_score: number;
  subtasks: Subtask[];
}

export const PRIORITY_WEIGHT: Record<PriorityLevel, number> = {
  low: 1,
  medium: 2,
  high: 3,
  top: 4,
  critical: 5,
};

const PRIORITY_ORDER: PriorityLevel[] = ["low", "medium", "high", "top", "critical"];

function escalatePriority(base: PriorityLevel, levels: number): PriorityLevel {
  const idx = PRIORITY_ORDER.indexOf(base);
  const newIdx = Math.min(idx + levels, PRIORITY_ORDER.length - 1);
  return PRIORITY_ORDER[newIdx];
}

export function getDaysRemaining(deadlineDate: string): number {
  const now = new Date();
  const deadline = new Date(deadlineDate);
  return (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
}

export function calculateDynamicPriority(task: Pick<Task, "manualPriority" | "deadlineDate">): PriorityLevel {
  const days = getDaysRemaining(task.deadlineDate);
  if (days < 0) return "critical";
  if (days <= 1) return "top";
  if (days <= 2) return escalatePriority(task.manualPriority, 2);
  if (days <= 5) return escalatePriority(task.manualPriority, 1);
  return task.manualPriority;
}

export function calculateUrgencyScore(task: Pick<Task, "manualPriority" | "deadlineDate" | "dynamicPriority">): number {
  const days = getDaysRemaining(task.deadlineDate);
  const manualScore = PRIORITY_WEIGHT[task.manualPriority];
  const dynamicScore = PRIORITY_WEIGHT[task.dynamicPriority];
  const daysInverse = days <= 0 ? 10 : Math.max(0, 10 - Math.min(days, 10));
  return (0.6 * ((manualScore + dynamicScore) / 2) * 5) + (0.4 * daysInverse);
}

export function calculatePriorityScore(urgencyScore: number, effort_score: number, impact_score: number): number {
  const safe_effort = Math.max(1, effort_score);
  return (impact_score / safe_effort) + urgencyScore;
}

export function refreshTaskPriorities(tasks: Task[]): Task[] {
  return tasks.map((task) => {
    const migratedTask: Task = {
      estimated_duration: 30,
      effort_score: 3,
      impact_score: 3,
      subtasks: [],
      recurrenceType: "none",
      priority_score: 0,
      ...task,
    };
    if (migratedTask.status === "done") {
      return {
        ...migratedTask,
        priority_score: calculatePriorityScore(
          migratedTask.urgencyScore,
          migratedTask.effort_score,
          migratedTask.impact_score
        ),
      };
    }
    const dynamicPriority = calculateDynamicPriority(migratedTask);
    const urgencyScore = calculateUrgencyScore({ ...migratedTask, dynamicPriority });
    const priority_score = calculatePriorityScore(urgencyScore, migratedTask.effort_score, migratedTask.impact_score);
    return { ...migratedTask, dynamicPriority, urgencyScore, priority_score };
  });
}

export function isOverdue(deadlineDate: string): boolean {
  return getDaysRemaining(deadlineDate) < 0;
}

export function formatDaysRemaining(deadlineDate: string): string {
  const days = getDaysRemaining(deadlineDate);
  if (days < 0) {
    const overdueDays = Math.abs(Math.floor(days));
    return overdueDays === 0 ? "Overdue today" : `${overdueDays}d overdue`;
  }
  if (days < 1) {
    const hours = Math.floor(days * 24);
    return hours <= 0 ? "Due now" : `${hours}h left`;
  }
  const daysInt = Math.floor(days);
  if (daysInt === 1) return "1 day left";
  return `${daysInt} days left`;
}

export function formatDeadline(deadlineDate: string): string {
  return new Date(deadlineDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function minutesToTimeString(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${m.toString().padStart(2, "0")} ${ampm}`;
}

export const PRIORITY_LABELS: Record<PriorityLevel, string> = {
  low: "Low", medium: "Medium", high: "High", top: "Top", critical: "Critical",
};

export const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "To Do", inprogress: "In Progress", done: "Done",
};

export const RECURRENCE_LABELS: Record<RecurrenceType, string> = {
  none: "No repeat", daily: "Daily", weekly: "Weekly", monthly: "Monthly", custom: "Custom",
};

export const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const DAY_NAMES_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function computeNextDeadline(task: Task): string {
  const base = new Date();
  base.setHours(12, 0, 0, 0);
  switch (task.recurrenceType) {
    case "daily":
      base.setDate(base.getDate() + 1);
      return base.toISOString();
    case "weekly": {
      const targetDay = task.recurrenceDayOfWeek ?? 0;
      let daysUntil = (targetDay - base.getDay() + 7) % 7;
      if (daysUntil === 0) daysUntil = 7;
      base.setDate(base.getDate() + daysUntil);
      return base.toISOString();
    }
    case "monthly": {
      const targetDay = task.recurrenceDayOfMonth ?? 1;
      const next = new Date(base);
      next.setDate(targetDay);
      next.setHours(12, 0, 0, 0);
      if (next <= base) next.setMonth(next.getMonth() + 1);
      return next.toISOString();
    }
    case "custom": {
      base.setDate(base.getDate() + (task.recurrenceInterval ?? 1));
      return base.toISOString();
    }
    default:
      return task.deadlineDate;
  }
}

export function describeRecurrence(task: Task): string {
  switch (task.recurrenceType) {
    case "daily": return "Repeats daily";
    case "weekly": return `Repeats every ${DAY_NAMES_FULL[task.recurrenceDayOfWeek ?? 0]}`;
    case "monthly": return `Repeats on the ${task.recurrenceDayOfMonth ?? 1}${ordinal(task.recurrenceDayOfMonth ?? 1)} of each month`;
    case "custom": return `Repeats every ${task.recurrenceInterval ?? 1} day${(task.recurrenceInterval ?? 1) > 1 ? "s" : ""}`;
    default: return "";
  }
}

function ordinal(n: number): string {
  if (n >= 11 && n <= 13) return "th";
  switch (n % 10) {
    case 1: return "st"; case 2: return "nd"; case 3: return "rd"; default: return "th";
  }
}

export function generateId(): string {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}
