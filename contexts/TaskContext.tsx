import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import {
  Task, TaskStatus, Subtask,
  generateId, calculateDynamicPriority, calculateUrgencyScore,
  calculatePriorityScore, refreshTaskPriorities, getDaysRemaining, computeNextDeadline,
} from "@/utils/priority";

const STORAGE_KEY = "priority_pulse_tasks";
const LAST_REFRESH_KEY = "priority_pulse_last_refresh";

interface TaskContextValue {
  tasks: Task[];
  isLoading: boolean;
  addTask: (data: Omit<Task, "id" | "createdDate" | "dynamicPriority" | "urgencyScore" | "priority_score">) => void;
  updateTask: (id: string, data: Partial<Omit<Task, "id" | "createdDate">>) => void;
  deleteTask: (id: string) => void;
  moveTask: (id: string, status: TaskStatus) => void;
  addSubtask: (taskId: string, title: string) => void;
  toggleSubtask: (taskId: string, subtaskId: string) => void;
  removeSubtask: (taskId: string, subtaskId: string) => void;
  getTasksByStatus: (status: TaskStatus) => Task[];
  getTopTask: (skippedIds?: string[]) => Task | null;
  stats: { total: number; dueToday: number; overdue: number; highPriority: number; completedToday: number };
}

const TaskContext = createContext<TaskContextValue | null>(null);

function recompute(t: Task): Task {
  if (t.status === "done") {
    const ps = calculatePriorityScore(t.urgencyScore, t.effort_score, t.impact_score);
    return { ...t, priority_score: ps };
  }
  const dynamicPriority = calculateDynamicPriority(t);
  const urgencyScore = calculateUrgencyScore({ ...t, dynamicPriority });
  const priority_score = calculatePriorityScore(urgencyScore, t.effort_score, t.impact_score);
  return { ...t, dynamicPriority, urgencyScore, priority_score };
}

export function TaskProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const saveTasks = useCallback(async (updated: Task[]) => {
    try { await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); }
    catch (e) { console.error("Failed to save tasks:", e); }
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        const loaded: Task[] = raw ? JSON.parse(raw) : [];
        const refreshed = refreshTaskPriorities(loaded);
        setTasks(refreshed);
        saveTasks(refreshed);
        AsyncStorage.setItem(LAST_REFRESH_KEY, new Date().toISOString());
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [saveTasks]);

  const addTask = useCallback(
    (data: Omit<Task, "id" | "createdDate" | "dynamicPriority" | "urgencyScore" | "priority_score">) => {
      const base: Task = {
        ...data,
        id: generateId(),
        createdDate: new Date().toISOString(),
        dynamicPriority: "low",
        urgencyScore: 0,
        priority_score: 0,
      };
      const newTask = recompute(base);
      setTasks((prev) => { const u = [...prev, newTask]; saveTasks(u); return u; });
    },
    [saveTasks]
  );

  const updateTask = useCallback(
    (id: string, data: Partial<Omit<Task, "id" | "createdDate">>) => {
      setTasks((prev) => {
        const updated = prev.map((t) => {
          if (t.id !== id) return t;
          const merged = { ...t, ...data };
          return recompute(merged);
        });
        saveTasks(updated);
        return updated;
      });
    },
    [saveTasks]
  );

  const deleteTask = useCallback(
    (id: string) => {
      setTasks((prev) => { const u = prev.filter((t) => t.id !== id); saveTasks(u); return u; });
    },
    [saveTasks]
  );

  const moveTask = useCallback(
    (id: string, status: TaskStatus) => {
      setTasks((prev) => {
        const task = prev.find((t) => t.id === id);
        if (!task) return prev;
        let updated = prev.map((t) => (t.id === id ? recompute({ ...t, status }) : t));
        if (status === "done" && task.recurrenceType !== "none") {
          const nextDeadline = computeNextDeadline(task);
          const base: Task = {
            ...task,
            id: generateId(),
            createdDate: new Date().toISOString(),
            status: "todo",
            deadlineDate: nextDeadline,
            nextCycleStart: nextDeadline,
            subtasks: task.subtasks.map((s) => ({ ...s, completed: false })),
          };
          updated = [...updated, recompute(base)];
        }
        saveTasks(updated);
        return updated;
      });
    },
    [saveTasks]
  );

  const addSubtask = useCallback(
    (taskId: string, title: string) => {
      const subtask: Subtask = { id: generateId(), title: title.trim(), completed: false };
      setTasks((prev) => {
        const updated = prev.map((t) =>
          t.id === taskId ? { ...t, subtasks: [...(t.subtasks ?? []), subtask] } : t
        );
        saveTasks(updated);
        return updated;
      });
    },
    [saveTasks]
  );

  const toggleSubtask = useCallback(
    (taskId: string, subtaskId: string) => {
      setTasks((prev) => {
        const updated = prev.map((t) => {
          if (t.id !== taskId) return t;
          return { ...t, subtasks: t.subtasks.map((s) => s.id === subtaskId ? { ...s, completed: !s.completed } : s) };
        });
        saveTasks(updated);
        return updated;
      });
    },
    [saveTasks]
  );

  const removeSubtask = useCallback(
    (taskId: string, subtaskId: string) => {
      setTasks((prev) => {
        const updated = prev.map((t) =>
          t.id === taskId ? { ...t, subtasks: t.subtasks.filter((s) => s.id !== subtaskId) } : t
        );
        saveTasks(updated);
        return updated;
      });
    },
    [saveTasks]
  );

  const getTasksByStatus = useCallback(
    (status: TaskStatus) =>
      tasks
        .filter((t) => t.status === status)
        .sort((a, b) => {
          if (b.priority_score !== a.priority_score) return b.priority_score - a.priority_score;
          return getDaysRemaining(a.deadlineDate) - getDaysRemaining(b.deadlineDate);
        }),
    [tasks]
  );

  const getTopTask = useCallback(
    (skippedIds: string[] = []): Task | null => {
      const active = tasks
        .filter((t) => t.status !== "done" && !skippedIds.includes(t.id))
        .sort((a, b) => {
          if (b.priority_score !== a.priority_score) return b.priority_score - a.priority_score;
          return getDaysRemaining(a.deadlineDate) - getDaysRemaining(b.deadlineDate);
        });
      return active[0] ?? null;
    },
    [tasks]
  );

  const stats = useMemo(() => {
    const active = tasks.filter((t) => t.status !== "done");
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);
    return {
      total: tasks.length,
      dueToday: active.filter((t) => {
        const d = new Date(t.deadlineDate);
        return d >= todayStart && d <= todayEnd;
      }).length,
      overdue: active.filter((t) => getDaysRemaining(t.deadlineDate) < 0).length,
      highPriority: active.filter((t) =>
        t.dynamicPriority === "high" || t.dynamicPriority === "top" || t.dynamicPriority === "critical"
      ).length,
      completedToday: tasks.filter((t) => {
        if (t.status !== "done") return false;
        const d = new Date(t.createdDate);
        return d >= todayStart && d <= todayEnd;
      }).length,
    };
  }, [tasks]);

  const value = useMemo(
    () => ({ tasks, isLoading, addTask, updateTask, deleteTask, moveTask, addSubtask, toggleSubtask, removeSubtask, getTasksByStatus, getTopTask, stats }),
    [tasks, isLoading, addTask, updateTask, deleteTask, moveTask, addSubtask, toggleSubtask, removeSubtask, getTasksByStatus, getTopTask, stats]
  );

  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
}

export function useTasks() {
  const ctx = useContext(TaskContext);
  if (!ctx) throw new Error("useTasks must be used within TaskProvider");
  return ctx;
}
