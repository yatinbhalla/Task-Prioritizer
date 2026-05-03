import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import {
  Task,
  TaskStatus,
  PriorityLevel,
  RecurrenceType,
  generateId,
  calculateDynamicPriority,
  calculateUrgencyScore,
  refreshTaskPriorities,
  getDaysRemaining,
  computeNextDeadline,
} from "@/utils/priority";

const STORAGE_KEY = "priority_pulse_tasks";
const LAST_REFRESH_KEY = "priority_pulse_last_refresh";

interface TaskContextValue {
  tasks: Task[];
  isLoading: boolean;
  addTask: (data: Omit<Task, "id" | "createdDate" | "dynamicPriority" | "urgencyScore">) => void;
  updateTask: (id: string, data: Partial<Omit<Task, "id" | "createdDate">>) => void;
  deleteTask: (id: string) => void;
  moveTask: (id: string, status: TaskStatus) => void;
  getTasksByStatus: (status: TaskStatus) => Task[];
  getTopTask: () => Task | null;
  stats: {
    total: number;
    dueToday: number;
    overdue: number;
    highPriority: number;
  };
}

const TaskContext = createContext<TaskContextValue | null>(null);

export function TaskProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const saveTasks = useCallback(async (updatedTasks: Task[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedTasks));
    } catch (e) {
      console.error("Failed to save tasks:", e);
    }
  }, []);

  const loadAndRefresh = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      let loaded: Task[] = raw ? JSON.parse(raw) : [];
      const refreshed = refreshTaskPriorities(loaded);
      setTasks(refreshed);
      await saveTasks(refreshed);
      await AsyncStorage.setItem(LAST_REFRESH_KEY, new Date().toISOString());
    } catch (e) {
      console.error("Failed to load tasks:", e);
    } finally {
      setIsLoading(false);
    }
  }, [saveTasks]);

  useEffect(() => {
    loadAndRefresh();
  }, [loadAndRefresh]);

  const addTask = useCallback(
    (data: Omit<Task, "id" | "createdDate" | "dynamicPriority" | "urgencyScore">) => {
      const dynamicPriority = calculateDynamicPriority(data);
      const newTask: Task = {
        ...data,
        id: generateId(),
        createdDate: new Date().toISOString(),
        dynamicPriority,
        urgencyScore: calculateUrgencyScore({ ...data, dynamicPriority }),
      };
      setTasks((prev) => {
        const updated = [...prev, newTask];
        saveTasks(updated);
        return updated;
      });
    },
    [saveTasks]
  );

  const updateTask = useCallback(
    (id: string, data: Partial<Omit<Task, "id" | "createdDate">>) => {
      setTasks((prev) => {
        const updated = prev.map((t) => {
          if (t.id !== id) return t;
          const merged = { ...t, ...data };
          if (data.manualPriority || data.deadlineDate) {
            const dynamicPriority = calculateDynamicPriority(merged);
            const urgencyScore = calculateUrgencyScore({ ...merged, dynamicPriority });
            return { ...merged, dynamicPriority, urgencyScore };
          }
          return merged;
        });
        saveTasks(updated);
        return updated;
      });
    },
    [saveTasks]
  );

  const deleteTask = useCallback(
    (id: string) => {
      setTasks((prev) => {
        const updated = prev.filter((t) => t.id !== id);
        saveTasks(updated);
        return updated;
      });
    },
    [saveTasks]
  );

  const moveTask = useCallback(
    (id: string, status: TaskStatus) => {
      setTasks((prev) => {
        const task = prev.find((t) => t.id === id);
        if (!task) return prev;

        const updatedTask = { ...task, status };
        let updated = prev.map((t) => (t.id === id ? updatedTask : t));

        if (status === "done" && task.recurrenceType !== "none") {
          const nextDeadline = computeNextDeadline(task);
          const nextCycleStart = nextDeadline;
          const dynamicPriority = calculateDynamicPriority({ ...task, deadlineDate: nextDeadline });
          const urgencyScore = calculateUrgencyScore({ ...task, deadlineDate: nextDeadline, dynamicPriority });

          const nextTask: Task = {
            ...task,
            id: generateId(),
            createdDate: new Date().toISOString(),
            status: "todo",
            deadlineDate: nextDeadline,
            nextCycleStart,
            dynamicPriority,
            urgencyScore,
          };
          updated = [...updated, nextTask];
        }

        saveTasks(updated);
        return updated;
      });
    },
    [saveTasks]
  );

  const getTasksByStatus = useCallback(
    (status: TaskStatus) => {
      return tasks
        .filter((t) => t.status === status)
        .sort((a, b) => {
          if (b.urgencyScore !== a.urgencyScore) return b.urgencyScore - a.urgencyScore;
          return getDaysRemaining(a.deadlineDate) - getDaysRemaining(b.deadlineDate);
        });
    },
    [tasks]
  );

  const getTopTask = useCallback((): Task | null => {
    const active = tasks
      .filter((t) => t.status !== "done")
      .sort((a, b) => b.urgencyScore - a.urgencyScore);
    return active[0] ?? null;
  }, [tasks]);

  const stats = useMemo(() => {
    const active = tasks.filter((t) => t.status !== "done");
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    return {
      total: tasks.length,
      dueToday: active.filter((t) => {
        const d = new Date(t.deadlineDate);
        return d >= todayStart && d <= today;
      }).length,
      overdue: active.filter((t) => getDaysRemaining(t.deadlineDate) < 0).length,
      highPriority: active.filter((t) =>
        t.dynamicPriority === "high" || t.dynamicPriority === "top" || t.dynamicPriority === "critical"
      ).length,
    };
  }, [tasks]);

  const value = useMemo(
    () => ({ tasks, isLoading, addTask, updateTask, deleteTask, moveTask, getTasksByStatus, getTopTask, stats }),
    [tasks, isLoading, addTask, updateTask, deleteTask, moveTask, getTasksByStatus, getTopTask, stats]
  );

  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
}

export function useTasks() {
  const ctx = useContext(TaskContext);
  if (!ctx) throw new Error("useTasks must be used within TaskProvider");
  return ctx;
}
