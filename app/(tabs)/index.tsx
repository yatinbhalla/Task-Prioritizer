import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
  useColorScheme,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { AppColors } from "@/constants/colors";
import { useTasks } from "@/contexts/TaskContext";
import { TaskCard } from "@/components/TaskCard";
import { PriorityBadge } from "@/components/PriorityBadge";
import { PRIORITY_WEIGHT } from "@/utils/priority";

function StatCard({
  label,
  value,
  color,
  icon,
  isDark,
}: {
  label: string;
  value: number;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
  isDark: boolean;
}) {
  const theme = isDark ? AppColors.dark : AppColors.light;
  return (
    <View style={[styles.statCard, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
      <View style={[styles.statIconBg, { backgroundColor: color + "18" }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={[styles.statValue, { color: theme.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{label}</Text>
    </View>
  );
}

export default function DashboardScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? AppColors.dark : AppColors.light;
  const insets = useSafeAreaInsets();
  const { stats, getTopTask, tasks, isLoading } = useTasks();
  const topTask = getTopTask();
  const recentActive = tasks
    .filter((t) => t.status !== "done")
    .sort((a, b) => b.urgencyScore - a.urgencyScore)
    .slice(0, 3);

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : 0;

  const handleAddTask = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push("/task/new");
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.bg }]}>
        <Ionicons name="hourglass-outline" size={32} color={theme.textSecondary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: topInset + 16, paddingBottom: bottomInset + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.greeting, { color: theme.textSecondary }]}>
              {getGreeting()}
            </Text>
            <Text style={[styles.title, { color: theme.text }]}>Dashboard</Text>
          </View>
          <Pressable onPress={handleAddTask} style={styles.addBtn}>
            <Ionicons name="add" size={22} color="#fff" />
          </Pressable>
        </View>

        <View style={styles.statsGrid}>
          <StatCard label="Total" value={stats.total} color="#6B7280" icon="layers-outline" isDark={isDark} />
          <StatCard label="Due Today" value={stats.dueToday} color="#F97316" icon="today-outline" isDark={isDark} />
          <StatCard label="Overdue" value={stats.overdue} color="#EF4444" icon="alert-circle-outline" isDark={isDark} />
          <StatCard label="High Priority" value={stats.highPriority} color="#FF6B35" icon="flame-outline" isDark={isDark} />
        </View>

        {topTask && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>NEXT UP</Text>
            <Pressable
              onPress={() => router.push({ pathname: "/task/[id]", params: { id: topTask.id } })}
              style={[
                styles.nextTaskCard,
                {
                  backgroundColor: theme.bgCard,
                  borderColor: AppColors.primary + "40",
                },
              ]}
            >
              <View style={styles.nextTaskHeader}>
                <View style={[styles.nextTaskTag, { backgroundColor: AppColors.primary + "18" }]}>
                  <Ionicons name="sparkles" size={12} color={AppColors.primary} />
                  <Text style={[styles.nextTaskTagText, { color: AppColors.primary }]}>Recommended</Text>
                </View>
                <Text style={[styles.urgencyScore, { color: theme.textSecondary }]}>
                  Score: {topTask.urgencyScore.toFixed(1)}
                </Text>
              </View>
              <Text style={[styles.nextTaskTitle, { color: theme.text }]}>{topTask.title}</Text>
              {topTask.description ? (
                <Text style={[styles.nextTaskDesc, { color: theme.textSecondary }]} numberOfLines={2}>
                  {topTask.description}
                </Text>
              ) : null}
              <View style={styles.nextTaskFooter}>
                <PriorityBadge priority={topTask.dynamicPriority} />
                <Ionicons name="chevron-forward" size={16} color={AppColors.primary} />
              </View>
            </Pressable>
          </View>
        )}

        {recentActive.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>TOP TASKS</Text>
              <Pressable onPress={() => router.push("/board")}>
                <Text style={[styles.seeAll, { color: AppColors.primary }]}>See all</Text>
              </Pressable>
            </View>
            {recentActive.map((t) => (
              <TaskCard key={t.id} task={t} showMoveButtons={false} />
            ))}
          </View>
        )}

        {tasks.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-done-circle-outline" size={56} color={theme.textSecondary} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>No tasks yet</Text>
            <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
              Tap the + button to add your first task
            </Text>
          </View>
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

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: {
    paddingHorizontal: 20,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  greeting: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginBottom: 2,
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
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 28,
  },
  statCard: {
    width: "47%",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    gap: 8,
  },
  statIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    lineHeight: 32,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
    marginBottom: 12,
  },
  seeAll: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    marginBottom: 12,
  },
  nextTaskCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    gap: 10,
  },
  nextTaskHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  nextTaskTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  nextTaskTagText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  urgencyScore: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  nextTaskTitle: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    lineHeight: 24,
  },
  nextTaskDesc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  nextTaskFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: "Inter_600SemiBold",
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
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
