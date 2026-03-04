import React, { useState } from "react";
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
import { TaskStatus, STATUS_LABELS } from "@/utils/priority";

const COLUMNS: { status: TaskStatus; icon: keyof typeof Ionicons.glyphMap }[] = [
  { status: "todo", icon: "list-outline" },
  { status: "inprogress", icon: "sync-outline" },
  { status: "done", icon: "checkmark-circle-outline" },
];

function ColumnHeader({
  status,
  count,
  isDark,
  icon,
}: {
  status: TaskStatus;
  count: number;
  isDark: boolean;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  const theme = isDark ? AppColors.dark : AppColors.light;
  const statusColor = AppColors.status[status];

  return (
    <View style={[styles.columnHeader, { borderBottomColor: statusColor }]}>
      <View style={styles.columnHeaderLeft}>
        <Ionicons name={icon} size={16} color={statusColor} />
        <Text style={[styles.columnTitle, { color: theme.text }]}>{STATUS_LABELS[status]}</Text>
      </View>
      <View style={[styles.countBadge, { backgroundColor: statusColor + "20" }]}>
        <Text style={[styles.countText, { color: statusColor }]}>{count}</Text>
      </View>
    </View>
  );
}

export default function BoardScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? AppColors.dark : AppColors.light;
  const insets = useSafeAreaInsets();
  const { getTasksByStatus, isLoading } = useTasks();
  const [activeColumn, setActiveColumn] = useState<TaskStatus>("todo");

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : 0;

  const handleAddTask = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push("/task/new");
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.bg }]}>
        <ActivityIndicator color={AppColors.primary} />
      </View>
    );
  }

  const todoCols = getTasksByStatus("todo");
  const inprogressCols = getTasksByStatus("inprogress");
  const doneCols = getTasksByStatus("done");
  const colData: Record<TaskStatus, ReturnType<typeof getTasksByStatus>> = {
    todo: todoCols,
    inprogress: inprogressCols,
    done: doneCols,
  };

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
                  {colData[status].length}
                </Text>
              </View>
            </Pressable>
          );
        })}
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
            <Text style={[styles.emptyTitle, { color: theme.text }]}>No tasks here</Text>
            <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
              {activeColumn === "todo"
                ? "Add a task to get started"
                : activeColumn === "inprogress"
                ? "Move tasks here when you start working"
                : "Complete tasks to see them here"}
            </Text>
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
    marginBottom: 16,
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
  columnHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 10,
    marginBottom: 12,
    borderBottomWidth: 2,
  },
  columnHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  columnTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  countBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  countText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
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
