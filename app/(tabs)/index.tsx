import React, { useState } from "react";
import {
  ScrollView, StyleSheet, Text, View, Pressable, useColorScheme, Platform,
} from "react-native";
import { router, Redirect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { AppColors } from "@/constants/colors";
import { useTasks } from "@/contexts/TaskContext";
import { useUser } from "@/contexts/UserContext";
import { TaskCard } from "@/components/TaskCard";
import { PriorityBadge } from "@/components/PriorityBadge";
import { formatDaysRemaining, formatDuration, isOverdue } from "@/utils/priority";

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function StatPill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={[styles.statPill, { backgroundColor: color + "18" }]}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: color + "CC" }]}>{label}</Text>
    </View>
  );
}

export default function FocusScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? AppColors.dark : AppColors.light;
  const insets = useSafeAreaInsets();
  const { user, isLoading: userLoading } = useUser();
  const { tasks, stats, getTopTask, isLoading } = useTasks();
  const [skippedIds, setSkippedIds] = useState<string[]>([]);

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : 0;

  if (!userLoading && !user) return <Redirect href="/onboarding" />;
  if (isLoading || userLoading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.bg }]}>
        <Ionicons name="flash" size={32} color={AppColors.primary} />
      </View>
    );
  }

  const topTask = getTopTask(skippedIds);
  const recentActive = tasks
    .filter((t) => t.status !== "done" && t.id !== topTask?.id)
    .sort((a, b) => b.priority_score - a.priority_score)
    .slice(0, 3);

  const overdueTask = topTask ? isOverdue(topTask.deadlineDate) && topTask.status !== "done" : false;

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: topInset + 16, paddingBottom: bottomInset + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.greeting, { color: theme.textSecondary }]}>
              {getGreeting()}, {user?.name ?? "there"}
            </Text>
            <Text style={[styles.title, { color: theme.text }]}>Focus</Text>
          </View>
          <Pressable
            onPress={() => router.push("/task/new")}
            style={styles.addBtn}
          >
            <Ionicons name="add" size={22} color="#fff" />
          </Pressable>
        </View>

        <View style={styles.statsRow}>
          <StatPill label="Due Today" value={stats.dueToday} color="#F97316" />
          <StatPill label="Overdue" value={stats.overdue} color="#EF4444" />
          <StatPill label="Done Today" value={stats.completedToday} color="#22C55E" />
          <StatPill label="Total" value={stats.total} color="#6B7280" />
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>DO THIS NOW</Text>
          {topTask ? (
            <Pressable
              onPress={() => router.push({ pathname: "/task/[id]", params: { id: topTask.id } })}
              style={[styles.focusCard, { backgroundColor: theme.bgCard, borderColor: AppColors.primary + "50" }]}
            >
              <View style={styles.focusCardHeader}>
                <PriorityBadge priority={topTask.dynamicPriority} />
                {overdueTask && (
                  <View style={styles.overduePill}>
                    <Ionicons name="alert-circle" size={11} color={AppColors.priority.critical} />
                    <Text style={styles.overdueText}>Overdue</Text>
                  </View>
                )}
                <View style={{ flex: 1 }} />
                <Text style={[styles.scoreText, { color: theme.textSecondary }]}>
                  Score: {topTask.priority_score.toFixed(1)}
                </Text>
              </View>

              <Text style={[styles.focusTitle, { color: theme.text }]} numberOfLines={2}>
                {topTask.title}
              </Text>

              {topTask.description ? (
                <Text style={[styles.focusDesc, { color: theme.textSecondary }]} numberOfLines={2}>
                  {topTask.description}
                </Text>
              ) : null}

              <View style={styles.focusMeta}>
                <View style={styles.metaItem}>
                  <Ionicons name="time-outline" size={13} color={theme.textSecondary} />
                  <Text style={[styles.metaText, { color: theme.textSecondary }]}>
                    {formatDaysRemaining(topTask.deadlineDate)}
                  </Text>
                </View>
                {topTask.estimated_duration > 0 && (
                  <View style={styles.metaItem}>
                    <Ionicons name="hourglass-outline" size={13} color={theme.textSecondary} />
                    <Text style={[styles.metaText, { color: theme.textSecondary }]}>
                      {formatDuration(topTask.estimated_duration)}
                    </Text>
                  </View>
                )}
                {topTask.subtasks?.length > 0 && (
                  <View style={styles.metaItem}>
                    <Ionicons name="list-outline" size={13} color={theme.textSecondary} />
                    <Text style={[styles.metaText, { color: theme.textSecondary }]}>
                      {topTask.subtasks.filter((s) => s.completed).length}/{topTask.subtasks.length} steps
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.focusActions}>
                <Pressable
                  onPress={async () => {
                    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    router.push({ pathname: "/task/[id]", params: { id: topTask.id } });
                  }}
                  style={styles.startBtn}
                >
                  <Ionicons name="play" size={16} color="#fff" />
                  <Text style={styles.startBtnText}>Start</Text>
                </Pressable>
                <Pressable
                  onPress={async () => {
                    await Haptics.selectionAsync();
                    setSkippedIds((prev) => [...prev, topTask.id]);
                  }}
                  style={[styles.skipBtn, { borderColor: theme.border }]}
                >
                  <Text style={[styles.skipBtnText, { color: theme.textSecondary }]}>Skip</Text>
                </Pressable>
              </View>
            </Pressable>
          ) : (
            <View style={[styles.emptyFocus, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
              <Ionicons name="checkmark-done-circle" size={36} color="#22C55E" />
              <Text style={[styles.emptyFocusText, { color: theme.text }]}>All caught up!</Text>
              <Text style={[styles.emptyFocusSub, { color: theme.textSecondary }]}>No urgent tasks right now</Text>
            </View>
          )}
        </View>

        <View style={styles.actionsRow}>
          <Pressable
            onPress={() => router.push("/planner")}
            style={[styles.actionCard, { backgroundColor: theme.bgCard, borderColor: theme.border }]}
          >
            <View style={[styles.actionIconBg, { backgroundColor: "#3B82F6" + "20" }]}>
              <Ionicons name="calendar" size={22} color="#3B82F6" />
            </View>
            <Text style={[styles.actionCardTitle, { color: theme.text }]}>My Day Plan</Text>
            <Text style={[styles.actionCardSub, { color: theme.textSecondary }]}>Auto-schedule today</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} style={styles.actionArrow} />
          </Pressable>

          <Pressable
            onPress={() => router.push("/matrix")}
            style={[styles.actionCard, { backgroundColor: theme.bgCard, borderColor: theme.border }]}
          >
            <View style={[styles.actionIconBg, { backgroundColor: "#8B5CF6" + "20" }]}>
              <Ionicons name="grid" size={22} color="#8B5CF6" />
            </View>
            <Text style={[styles.actionCardTitle, { color: theme.text }]}>Impact Matrix</Text>
            <Text style={[styles.actionCardSub, { color: theme.textSecondary }]}>Effort vs impact</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} style={styles.actionArrow} />
          </Pressable>
        </View>

        {recentActive.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionRow}>
              <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>UP NEXT</Text>
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
            <Ionicons name="flash-outline" size={56} color={theme.textSecondary} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>Ready to focus?</Text>
            <Text style={[styles.emptySub, { color: theme.textSecondary }]}>
              Add your first task to get started
            </Text>
          </View>
        )}
      </ScrollView>

      <Pressable
        onPress={async () => {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          router.push("/task/new");
        }}
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
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  scroll: { paddingHorizontal: 20 },
  headerRow: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", marginBottom: 20,
  },
  greeting: { fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 2 },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  addBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: AppColors.primary, alignItems: "center", justifyContent: "center",
  },
  statsRow: { flexDirection: "row", gap: 8, marginBottom: 24 },
  statPill: {
    flex: 1, borderRadius: 12, paddingVertical: 10,
    alignItems: "center", gap: 2,
  },
  statValue: { fontSize: 20, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 10, fontFamily: "Inter_500Medium", textAlign: "center" },
  section: { marginBottom: 24 },
  sectionLabel: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 1, marginBottom: 12 },
  sectionRow: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", marginBottom: 12,
  },
  seeAll: { fontSize: 13, fontFamily: "Inter_500Medium" },
  focusCard: {
    borderRadius: 18, padding: 18, borderWidth: 1.5, gap: 12,
    shadowColor: AppColors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12, shadowRadius: 12, elevation: 4,
  },
  focusCardHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  overduePill: {
    flexDirection: "row", alignItems: "center", gap: 3,
    paddingHorizontal: 7, paddingVertical: 3,
    backgroundColor: AppColors.priority.critical + "20", borderRadius: 6,
  },
  overdueText: { fontSize: 10, fontFamily: "Inter_600SemiBold", color: AppColors.priority.critical },
  scoreText: { fontSize: 11, fontFamily: "Inter_400Regular" },
  focusTitle: { fontSize: 20, fontFamily: "Inter_700Bold", lineHeight: 26, letterSpacing: -0.3 },
  focusDesc: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  focusMeta: { flexDirection: "row", gap: 14 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  focusActions: { flexDirection: "row", gap: 10, marginTop: 4 },
  startBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, backgroundColor: AppColors.primary, borderRadius: 12, paddingVertical: 13,
    shadowColor: AppColors.primary, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  startBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_700Bold" },
  skipBtn: {
    paddingHorizontal: 20, paddingVertical: 13,
    borderRadius: 12, borderWidth: 1,
  },
  skipBtnText: { fontSize: 15, fontFamily: "Inter_500Medium" },
  emptyFocus: {
    borderRadius: 18, padding: 32, borderWidth: 1,
    alignItems: "center", gap: 8,
  },
  emptyFocusText: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  emptyFocusSub: { fontSize: 13, fontFamily: "Inter_400Regular" },
  actionsRow: { flexDirection: "row", gap: 12, marginBottom: 24 },
  actionCard: {
    flex: 1, borderRadius: 16, padding: 16, borderWidth: 1, gap: 6,
  },
  actionIconBg: {
    width: 42, height: 42, borderRadius: 12,
    alignItems: "center", justifyContent: "center", marginBottom: 4,
  },
  actionCardTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  actionCardSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  actionArrow: { alignSelf: "flex-end", marginTop: 4 },
  emptyState: { alignItems: "center", paddingVertical: 60, gap: 12 },
  emptyTitle: { fontSize: 20, fontFamily: "Inter_600SemiBold" },
  emptySub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  fab: {
    position: "absolute", right: 20, bottom: 100,
    width: 56, height: 56, borderRadius: 18,
    backgroundColor: AppColors.primary, alignItems: "center", justifyContent: "center",
    shadowColor: AppColors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
});
