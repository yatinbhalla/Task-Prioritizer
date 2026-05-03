import React, { useMemo, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
  useColorScheme,
  Platform,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { AppColors } from "@/constants/colors";
import { useTasks } from "@/contexts/TaskContext";
import { TaskCard } from "@/components/TaskCard";
import { Task, TaskStatus, PriorityLevel, STATUS_LABELS, getDaysRemaining, PRIORITY_LABELS } from "@/utils/priority";

type DateFilter = "all" | "today" | "tomorrow" | "thisweek" | "overdue";
type SortMode = "priority" | "deadline" | "created";
type PriorityFilter = "all" | PriorityLevel;

const COLUMNS: { status: TaskStatus; icon: keyof typeof Ionicons.glyphMap }[] = [
  { status: "todo", icon: "list-outline" },
  { status: "inprogress", icon: "sync-outline" },
  { status: "done", icon: "checkmark-circle-outline" },
];

const DATE_FILTERS: { key: DateFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "today", label: "Today" },
  { key: "tomorrow", label: "Tomorrow" },
  { key: "thisweek", label: "This Week" },
  { key: "overdue", label: "Overdue" },
];

const SORT_OPTIONS: { key: SortMode; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: "priority", label: "Priority", icon: "flame-outline" },
  { key: "deadline", label: "Deadline", icon: "time-outline" },
  { key: "created", label: "Recent", icon: "add-circle-outline" },
];

const PRIORITY_FILTERS: { key: PriorityFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "low", label: "Low" },
  { key: "medium", label: "Medium" },
  { key: "high", label: "High" },
  { key: "top", label: "Top" },
  { key: "critical", label: "Critical" },
];

function applyFiltersAndSort(
  tasks: Task[],
  dateFilter: DateFilter,
  priorityFilter: PriorityFilter,
  sortMode: SortMode
): Task[] {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  const tomorrowEnd = new Date(tomorrowStart);
  tomorrowEnd.setHours(23, 59, 59, 999);
  const weekEnd = new Date(todayStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  weekEnd.setHours(23, 59, 59, 999);

  let filtered = tasks.filter((t) => {
    const d = new Date(t.deadlineDate);
    switch (dateFilter) {
      case "today":
        return d >= todayStart && d <= todayEnd;
      case "tomorrow":
        return d >= tomorrowStart && d <= tomorrowEnd;
      case "thisweek":
        return d >= todayStart && d <= weekEnd;
      case "overdue":
        return getDaysRemaining(t.deadlineDate) < 0;
      default:
        return true;
    }
  });

  if (priorityFilter !== "all") {
    filtered = filtered.filter((t) => t.dynamicPriority === priorityFilter);
  }

  return filtered.sort((a, b) => {
    switch (sortMode) {
      case "deadline":
        return getDaysRemaining(a.deadlineDate) - getDaysRemaining(b.deadlineDate);
      case "created":
        return new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime();
      case "priority":
      default:
        if (b.urgencyScore !== a.urgencyScore) return b.urgencyScore - a.urgencyScore;
        return getDaysRemaining(a.deadlineDate) - getDaysRemaining(b.deadlineDate);
    }
  });
}

export default function BoardScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? AppColors.dark : AppColors.light;
  const insets = useSafeAreaInsets();
  const { getTasksByStatus, isLoading } = useTasks();
  const [activeColumn, setActiveColumn] = useState<TaskStatus>("todo");

  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");
  const [sortMode, setSortMode] = useState<SortMode>("priority");
  const [showPriorityFilters, setShowPriorityFilters] = useState(false);

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : 0;

  const handleAddTask = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push("/task/new");
  };

  const rawTodo = getTasksByStatus("todo");
  const rawInprogress = getTasksByStatus("inprogress");
  const rawDone = getTasksByStatus("done");

  const filteredTodo = useMemo(
    () => applyFiltersAndSort(rawTodo, dateFilter, priorityFilter, sortMode),
    [rawTodo, dateFilter, priorityFilter, sortMode]
  );
  const filteredInprogress = useMemo(
    () => applyFiltersAndSort(rawInprogress, dateFilter, priorityFilter, sortMode),
    [rawInprogress, dateFilter, priorityFilter, sortMode]
  );
  const filteredDone = useMemo(
    () => applyFiltersAndSort(rawDone, dateFilter, priorityFilter, sortMode),
    [rawDone, dateFilter, priorityFilter, sortMode]
  );

  const colData: Record<TaskStatus, Task[]> = {
    todo: filteredTodo,
    inprogress: filteredInprogress,
    done: filteredDone,
  };

  const rawColData: Record<TaskStatus, Task[]> = {
    todo: rawTodo,
    inprogress: rawInprogress,
    done: rawDone,
  };

  const hasActiveFilters =
    dateFilter !== "all" || priorityFilter !== "all" || sortMode !== "priority";

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.bg }]}>
        <ActivityIndicator color={AppColors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={[styles.header, { paddingTop: topInset + 16 }]}>
        <Text style={[styles.title, { color: theme.text }]}>Board</Text>
        <Pressable onPress={handleAddTask} style={styles.addBtn}>
          <Ionicons name="add" size={22} color="#fff" />
        </Pressable>
      </View>

      <View style={styles.columnTabs}>
        {COLUMNS.map(({ status }) => {
          const isActive = activeColumn === status;
          const statusColor = AppColors.status[status];
          return (
            <Pressable
              key={status}
              onPress={() => setActiveColumn(status)}
              style={[
                styles.columnTab,
                {
                  borderBottomColor: isActive ? statusColor : "transparent",
                  borderBottomWidth: 2,
                },
              ]}
            >
              <Text
                style={[
                  styles.columnTabText,
                  {
                    color: isActive ? statusColor : theme.textSecondary,
                    fontFamily: isActive ? "Inter_600SemiBold" : "Inter_400Regular",
                  },
                ]}
              >
                {STATUS_LABELS[status]}
              </Text>
              <View
                style={[
                  styles.tabBadge,
                  { backgroundColor: isActive ? statusColor + "20" : theme.bgSecondary },
                ]}
              >
                <Text
                  style={[
                    styles.tabBadgeText,
                    { color: isActive ? statusColor : theme.textSecondary },
                  ]}
                >
                  {rawColData[status].length}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      <View style={[styles.filterBar, { borderBottomColor: theme.border }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {DATE_FILTERS.map((f) => {
            const isActive = dateFilter === f.key;
            return (
              <Pressable
                key={f.key}
                onPress={async () => {
                  await Haptics.selectionAsync();
                  setDateFilter(f.key);
                }}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: isActive ? AppColors.primary + "20" : theme.bgCard,
                    borderColor: isActive ? AppColors.primary : theme.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    {
                      color: isActive ? AppColors.primary : theme.textSecondary,
                      fontFamily: isActive ? "Inter_600SemiBold" : "Inter_400Regular",
                    },
                  ]}
                >
                  {f.label}
                </Text>
              </Pressable>
            );
          })}

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          {SORT_OPTIONS.map((s) => {
            const isActive = sortMode === s.key;
            return (
              <Pressable
                key={s.key}
                onPress={async () => {
                  await Haptics.selectionAsync();
                  setSortMode(s.key);
                }}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: isActive ? "#6B7280" + "20" : theme.bgCard,
                    borderColor: isActive ? "#6B7280" : theme.border,
                  },
                ]}
              >
                <Ionicons
                  name={s.icon}
                  size={11}
                  color={isActive ? "#6B7280" : theme.textSecondary}
                />
                <Text
                  style={[
                    styles.filterChipText,
                    {
                      color: isActive ? "#6B7280" : theme.textSecondary,
                      fontFamily: isActive ? "Inter_600SemiBold" : "Inter_400Regular",
                    },
                  ]}
                >
                  {s.label}
                </Text>
              </Pressable>
            );
          })}

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          <Pressable
            onPress={async () => {
              await Haptics.selectionAsync();
              setShowPriorityFilters((v) => !v);
            }}
            style={[
              styles.filterChip,
              {
                backgroundColor: priorityFilter !== "all"
                  ? AppColors.priority[priorityFilter as PriorityLevel] + "20"
                  : theme.bgCard,
                borderColor: priorityFilter !== "all"
                  ? AppColors.priority[priorityFilter as PriorityLevel]
                  : theme.border,
              },
            ]}
          >
            <Ionicons
              name="funnel-outline"
              size={11}
              color={
                priorityFilter !== "all"
                  ? AppColors.priority[priorityFilter as PriorityLevel]
                  : theme.textSecondary
              }
            />
            <Text
              style={[
                styles.filterChipText,
                {
                  color: priorityFilter !== "all"
                    ? AppColors.priority[priorityFilter as PriorityLevel]
                    : theme.textSecondary,
                  fontFamily: priorityFilter !== "all" ? "Inter_600SemiBold" : "Inter_400Regular",
                },
              ]}
            >
              {priorityFilter === "all" ? "Priority" : PRIORITY_LABELS[priorityFilter as PriorityLevel]}
            </Text>
          </Pressable>
        </ScrollView>

        {showPriorityFilters && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[styles.filterRow, styles.priorityFilterRow]}
          >
            {PRIORITY_FILTERS.map((p) => {
              const isActive = priorityFilter === p.key;
              const color = p.key === "all" ? "#6B7280" : AppColors.priority[p.key as PriorityLevel];
              return (
                <Pressable
                  key={p.key}
                  onPress={async () => {
                    await Haptics.selectionAsync();
                    setPriorityFilter(p.key);
                    setShowPriorityFilters(false);
                  }}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: isActive ? color + "20" : theme.bgCard,
                      borderColor: isActive ? color : theme.border,
                    },
                  ]}
                >
                  {p.key !== "all" && (
                    <View style={[styles.priorityDot, { backgroundColor: color }]} />
                  )}
                  <Text
                    style={[
                      styles.filterChipText,
                      {
                        color: isActive ? color : theme.textSecondary,
                        fontFamily: isActive ? "Inter_600SemiBold" : "Inter_400Regular",
                      },
                    ]}
                  >
                    {p.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: bottomInset + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {colData[activeColumn].length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons
              name={COLUMNS.find((c) => c.status === activeColumn)?.icon ?? "list-outline"}
              size={48}
              color={theme.textSecondary}
            />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>
              {hasActiveFilters ? "No matching tasks" : "No tasks here"}
            </Text>
            <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
              {hasActiveFilters
                ? "Try adjusting your filters"
                : activeColumn === "todo"
                ? "Add a task to get started"
                : activeColumn === "inprogress"
                ? "Move tasks here when you start working"
                : "Complete tasks to see them here"}
            </Text>
            {hasActiveFilters && (
              <Pressable
                onPress={() => {
                  setDateFilter("all");
                  setPriorityFilter("all");
                  setSortMode("priority");
                }}
                style={styles.clearFiltersBtn}
              >
                <Text style={styles.clearFiltersText}>Clear filters</Text>
              </Pressable>
            )}
          </View>
        ) : (
          colData[activeColumn].map((task) => (
            <TaskCard key={task.id} task={task} />
          ))
        )}
      </ScrollView>

      <Pressable
        onPress={handleAddTask}
        style={({ pressed }) => [
          styles.fab,
          { opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.95 : 1 }] },
        ]}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: AppColors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  columnTabs: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 4,
    marginBottom: 0,
  },
  columnTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
  },
  columnTabText: {
    fontSize: 13,
  },
  tabBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  tabBadgeText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  filterBar: {
    borderBottomWidth: 1,
    paddingVertical: 10,
  },
  filterRow: {
    paddingHorizontal: 16,
    gap: 7,
    alignItems: "center",
    flexDirection: "row",
  },
  priorityFilterRow: {
    paddingTop: 8,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 12,
  },
  divider: {
    width: 1,
    height: 16,
    marginHorizontal: 2,
  },
  priorityDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 80,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
  },
  emptySubtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 18,
    maxWidth: 240,
  },
  clearFiltersBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: AppColors.primary + "20",
    borderWidth: 1,
    borderColor: AppColors.primary,
    marginTop: 4,
  },
  clearFiltersText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: AppColors.primary,
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 100,
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: AppColors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: AppColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
});
