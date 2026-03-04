export type PriorityLevel = "low" | "medium" | "high" | "top" | "critical";
export type TaskStatus = "todo" | "inprogress" | "done";

export interface Task {
  id: string;
  title: string;
  description: string;
  createdDate: string;
  deadlineDate: string;
  manualPriority: PriorityLevel;
  dynamicPriority: PriorityLevel;
  urgencyScore: number;
  status: TaskStatus;
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
  const diffMs = deadline.getTime() - now.getTime();
  return diffMs / (1000 * 60 * 60 * 24);
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
  const priorityWeight = 0.6;
  const deadlineWeight = 0.4;

  const manualScore = PRIORITY_WEIGHT[task.manualPriority];
  const dynamicScore = PRIORITY_WEIGHT[task.dynamicPriority];

  const daysInverse = days <= 0 ? 10 : Math.max(0, 10 - Math.min(days, 10));

  return (priorityWeight * ((manualScore + dynamicScore) / 2) * 5) + (deadlineWeight * daysInverse);
}

export function refreshTaskPriorities(tasks: Task[]): Task[] {
  return tasks.map((task) => {
    if (task.status === "done") return task;
    const dynamicPriority = calculateDynamicPriority(task);
    const urgencyScore = calculateUrgencyScore({ ...task, dynamicPriority });
    return { ...task, dynamicPriority, urgencyScore };
  });
}

export function sortTasksByUrgency(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    if (b.urgencyScore !== a.urgencyScore) return b.urgencyScore - a.urgencyScore;
    return getDaysRemaining(a.deadlineDate) - getDaysRemaining(b.deadlineDate);
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
  if (daysInt === 0) return "Due today";
  if (daysInt === 1) return "1 day left";
  return `${daysInt} days left`;
}

export function formatDeadline(deadlineDate: string): string {
  const date = new Date(deadlineDate);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export const PRIORITY_LABELS: Record<PriorityLevel, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  top: "Top",
  critical: "Critical",
};

export const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "To Do",
  inprogress: "In Progress",
  done: "Done",
};

export function generateId(): string {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}
