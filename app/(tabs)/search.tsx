import React, { useState, useMemo } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  TextInput,
  Pressable,
  useColorScheme,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppColors } from "@/constants/colors";
import { useTasks } from "@/contexts/TaskContext";
import { TaskCard } from "@/components/TaskCard";
import { PriorityLevel, TaskStatus, PRIORITY_LABELS, STATUS_LABELS } from "@/utils/priority";

const PRIORITIES: (PriorityLevel | "all")[] = ["all", "low", "medium", "high", "top", "critical"];
const STATUSES: (TaskStatus | "all")[] = ["all", "todo", "inprogress", "done"];
const DEADLINE_FILTERS = ["all", "today", "week", "overdue"] as const;
type DeadlineFilter = (typeof DEADLINE_FILTERS)[number];

export default function SearchScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? AppColors.dark : AppColors.light;
  const insets = useSafeAreaInsets();
  const { tasks } = useTasks();

  const [query, setQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<PriorityLevel | "all">("all");
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "all">("all");
  const [deadlineFilter, setDeadlineFilter] = useState<DeadlineFilter>("all");

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : 0;

  const filtered = useMemo(() => {
    const now = new Date();
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    const weekEnd = new Date();
    weekEnd.setDate(weekEnd.getDate() + 7);

    return tasks.filter((task) => {
      if (query && !task.title.toLowerCase().includes(query.toLowerCase()) &&
        !task.description.toLowerCase().includes(query.toLowerCase())) return false;
      if (priorityFilter !== "all" && task.dynamicPriority !== priorityFilter) return false;
      if (statusFilter !== "all" && task.status !== statusFilter) return false;
      if (deadlineFilter !== "all") {
        const deadline = new Date(task.deadlineDate);
        if (deadlineFilter === "today" && deadline > todayEnd) return false;
        if (deadlineFilter === "week" && deadline > weekEnd) return false;
        if (deadlineFilter === "overdue" && deadline >= now) return false;
      }
      return true;
    }).sort((a, b) => b.urgencyScore - a.urgencyScore);
  }, [tasks, query, priorityFilter, statusFilter, deadlineFilter]);

  const chipStyle = (active: boolean, color?: string) => ({
    ...styles.chip,
    backgroundColor: active ? (color ? color + "22" : AppColors.primary + "22") : theme.bgSecondary,
    borderColor: active ? (color ? color + "60" : AppColors.primary + "60") : "transparent",
  });

  const chipTextStyle = (active: boolean, color?: string) => ({
    ...styles.chipText,
    color: active ? (color ?? AppColors.primary) : theme.textSecondary,
    fontFamily: active ? "Inter_600SemiBold" : "Inter_400Regular",
  });

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={[styles.header, { paddingTop: topInset + 16 }]}>
        <Text style={[styles.title, { color: theme.text }]}>Search</Text>
        <View style={[styles.searchBar, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
          <Ionicons name="search" size={16} color={theme.textSecondary} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search tasks..."
            placeholderTextColor={theme.textSecondary}
            style={[styles.searchInput, { color: theme.text, fontFamily: "Inter_400Regular" }]}
            autoCorrect={false}
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery("")}>
              <Ionicons name="close-circle" size={16} color={theme.textSecondary} />
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.filtersSection}>
          <Text style={[styles.filterLabel, { color: theme.textSecondary }]}>Priority</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {PRIORITIES.map((p) => {
              const color = p !== "all" ? AppColors.priority[p] : undefined;
              return (
                <Pressable
                  key={p}
                  onPress={() => setPriorityFilter(p)}
                  style={chipStyle(priorityFilter === p, color)}
                >
                  <Text style={chipTextStyle(priorityFilter === p, color)}>
                    {p === "all" ? "All" : PRIORITY_LABELS[p]}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <Text style={[styles.filterLabel, { color: theme.textSecondary }]}>Status</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {STATUSES.map((s) => {
              const color = s !== "all" ? AppColors.status[s] : undefined;
              return (
                <Pressable
                  key={s}
                  onPress={() => setStatusFilter(s)}
                  style={chipStyle(statusFilter === s, color)}
                >
                  <Text style={chipTextStyle(statusFilter === s, color)}>
                    {s === "all" ? "All" : STATUS_LABELS[s]}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <Text style={[styles.filterLabel, { color: theme.textSecondary }]}>Deadline</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {DEADLINE_FILTERS.map((d) => (
              <Pressable
                key={d}
                onPress={() => setDeadlineFilter(d)}
                style={chipStyle(deadlineFilter === d)}
              >
                <Text style={chipTextStyle(deadlineFilter === d)}>
                  {d === "all" ? "All" : d === "today" ? "Due Today" : d === "week" ? "This Week" : "Overdue"}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <View style={[styles.results, { paddingBottom: bottomInset + 100 }]}>
          <Text style={[styles.resultsCount, { color: theme.textSecondary }]}>
            {filtered.length} {filtered.length === 1 ? "task" : "tasks"} found
          </Text>
          {filtered.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={48} color={theme.textSecondary} />
              <Text style={[styles.emptyTitle, { color: theme.text }]}>No tasks found</Text>
              <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
                Try adjusting your search or filters
              </Text>
            </View>
          ) : (
            filtered.map((t) => <TaskCard key={t.id} task={t} />)
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 8,
    gap: 14,
  },
  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  filtersSection: {
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 10,
  },
  filterLabel: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.8,
    marginTop: 4,
  },
  chips: {
    paddingVertical: 2,
    gap: 8,
    flexDirection: "row",
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
  },
  results: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  resultsCount: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    marginBottom: 12,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
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
  },
});
