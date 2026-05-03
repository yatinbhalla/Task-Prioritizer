import React, { useCallback, useEffect, useState } from "react";
import {
  View, Text, ScrollView, Pressable, StyleSheet,
  useColorScheme, Platform, ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { AppColors } from "@/constants/colors";
import { useTasks } from "@/contexts/TaskContext";
import { Task, formatDuration, minutesToTimeString } from "@/utils/priority";

const PLAN_KEY = "priority_pulse_daily_plan";
const CAPACITY_MINUTES = 8 * 60;
const START_MINUTES = 9 * 60;

interface PlanBlock {
  taskId: string;
  startMinutes: number;
  durationMinutes: number;
  completed: boolean;
  carriedForward?: boolean;
}

interface DailyPlan {
  date: string;
  blocks: PlanBlock[];
}

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

function autoPlan(todos: Task[]): PlanBlock[] {
  const sorted = [...todos].sort((a, b) => {
    if (b.priority_score !== a.priority_score) return b.priority_score - a.priority_score;
    return new Date(a.deadlineDate).getTime() - new Date(b.deadlineDate).getTime();
  });
  const blocks: PlanBlock[] = [];
  let current = START_MINUTES;
  for (const task of sorted) {
    const dur = task.estimated_duration || 30;
    if (current - START_MINUTES + dur <= CAPACITY_MINUTES) {
      blocks.push({ taskId: task.id, startMinutes: current, durationMinutes: dur, completed: false });
      current += dur;
    }
  }
  return blocks;
}

export default function PlannerScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? AppColors.dark : AppColors.light;
  const insets = useSafeAreaInsets();
  const { tasks, moveTask } = useTasks();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  const [plan, setPlan] = useState<DailyPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const todoMap = Object.fromEntries(tasks.map((t) => [t.id, t]));

  const savePlan = useCallback(async (p: DailyPlan) => {
    await AsyncStorage.setItem(PLAN_KEY, JSON.stringify(p));
    setPlan(p);
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(PLAN_KEY).then((raw) => {
      const today = todayStr();
      if (raw) {
        const stored: DailyPlan = JSON.parse(raw);
        if (stored.date === today) {
          setPlan(stored);
          setIsLoading(false);
          return;
        }
        const carried: PlanBlock[] = stored.blocks
          .filter((b) => !b.completed)
          .map((b) => {
            const task = todoMap[b.taskId];
            if (!task || task.status === "done") return null;
            return { ...b, startMinutes: 0, carriedForward: true };
          })
          .filter(Boolean) as PlanBlock[];
        if (carried.length > 0) {
          const newPlan: DailyPlan = { date: today, blocks: carried };
          savePlan(newPlan);
        } else {
          setPlan({ date: today, blocks: [] });
        }
      } else {
        setPlan({ date: today, blocks: [] });
      }
      setIsLoading(false);
    }).catch(() => {
      setPlan({ date: today, blocks: [] });
      setIsLoading(false);
    });
  }, []);

  const handleAutoPlan = async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const todos = tasks.filter((t) => t.status === "todo");
    const blocks = autoPlan(todos);
    const today = todayStr();
    await savePlan({ date: today, blocks });
  };

  const handleToggleBlock = async (idx: number) => {
    if (!plan) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const block = plan.blocks[idx];
    const updatedBlocks = plan.blocks.map((b, i) =>
      i === idx ? { ...b, completed: !b.completed } : b
    );
    await savePlan({ ...plan, blocks: updatedBlocks });
    if (!block.completed) {
      moveTask(block.taskId, "done");
    }
  };

  const handleRemoveBlock = async (idx: number) => {
    if (!plan) return;
    await Haptics.selectionAsync();
    const updatedBlocks = plan.blocks.filter((_, i) => i !== idx);
    await savePlan({ ...plan, blocks: updatedBlocks });
  };

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.bg }]}>
        <ActivityIndicator color={AppColors.primary} />
      </View>
    );
  }

  const blocks = plan?.blocks ?? [];
  const totalMinutes = blocks.reduce((s, b) => s + b.durationMinutes, 0);
  const completedCount = blocks.filter((b) => b.completed).length;
  const capacityPct = Math.min(totalMinutes / CAPACITY_MINUTES, 1);
  const carriedCount = blocks.filter((b) => b.carriedForward).length;

  const blocksWithTime = blocks.reduce<(PlanBlock & { resolvedStart: number })[]>((acc, b) => {
    const prev = acc[acc.length - 1];
    const start = b.carriedForward
      ? (prev ? prev.resolvedStart + prev.durationMinutes : START_MINUTES)
      : b.startMinutes;
    acc.push({ ...b, resolvedStart: start });
    return acc;
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={[styles.header, { paddingTop: topInset + 16 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={theme.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: theme.text }]}>My Day Plan</Text>
          <Text style={[styles.dateText, { color: theme.textSecondary }]}>
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </Text>
        </View>
        <Pressable
          onPress={handleAutoPlan}
          style={[styles.autoPlanBtn, { backgroundColor: AppColors.primary }]}
        >
          <Ionicons name="flash" size={16} color="#fff" />
          <Text style={styles.autoPlanText}>Auto Plan</Text>
        </Pressable>
      </View>

      <View style={[styles.capacityBar, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
        <View style={styles.capacityInfo}>
          <Text style={[styles.capacityLabel, { color: theme.textSecondary }]}>
            {formatDuration(totalMinutes)} of {formatDuration(CAPACITY_MINUTES)} planned
          </Text>
          <Text style={[styles.capacityCount, { color: theme.textSecondary }]}>
            {completedCount}/{blocks.length} done
          </Text>
        </View>
        <View style={[styles.barBg, { backgroundColor: theme.bgSecondary }]}>
          <View
            style={[
              styles.barFill,
              {
                width: `${capacityPct * 100}%` as any,
                backgroundColor: capacityPct >= 1 ? "#EF4444" : AppColors.primary,
              },
            ]}
          />
        </View>
      </View>

      {carriedCount > 0 && (
        <View style={[styles.carryBanner, { backgroundColor: "#F97316" + "18" }]}>
          <Ionicons name="arrow-forward-circle" size={16} color="#F97316" />
          <Text style={[styles.carryText, { color: "#F97316" }]}>
            {carriedCount} task{carriedCount > 1 ? "s" : ""} carried forward from yesterday
          </Text>
        </View>
      )}

      <ScrollView
        contentContainerStyle={[styles.timeline, { paddingBottom: bottomInset + 80 }]}
        showsVerticalScrollIndicator={false}
      >
        {blocksWithTime.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={56} color={theme.textSecondary} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>No plan yet</Text>
            <Text style={[styles.emptySub, { color: theme.textSecondary }]}>
              Tap "Auto Plan" to build your schedule, or tasks will appear here
            </Text>
          </View>
        ) : (
          blocksWithTime.map((block, idx) => {
            const task = todoMap[block.taskId];
            if (!task) return null;
            const startStr = minutesToTimeString(block.resolvedStart);
            const endStr = minutesToTimeString(block.resolvedStart + block.durationMinutes);
            return (
              <View key={idx} style={styles.blockRow}>
                <View style={styles.timeCol}>
                  <Text style={[styles.timeText, { color: theme.textSecondary }]}>{startStr}</Text>
                  <View style={[styles.timeLineSegment, { backgroundColor: theme.border }]} />
                  <Text style={[styles.timeTextEnd, { color: theme.textSecondary }]}>{endStr}</Text>
                </View>
                <View
                  style={[
                    styles.blockCard,
                    {
                      backgroundColor: theme.bgCard,
                      borderColor: block.completed
                        ? AppColors.status.done + "60"
                        : block.carriedForward
                        ? "#F97316" + "40"
                        : theme.border,
                      opacity: block.completed ? 0.6 : 1,
                    },
                  ]}
                >
                  {block.carriedForward && (
                    <View style={styles.carryTag}>
                      <Ionicons name="arrow-forward-circle" size={10} color="#F97316" />
                      <Text style={styles.carryTagText}>Carried</Text>
                    </View>
                  )}
                  <Text
                    style={[
                      styles.blockTitle,
                      {
                        color: theme.text,
                        textDecorationLine: block.completed ? "line-through" : "none",
                      },
                    ]}
                    numberOfLines={2}
                  >
                    {task.title}
                  </Text>
                  <View style={styles.blockMeta}>
                    <View style={styles.durationTag}>
                      <Ionicons name="hourglass-outline" size={11} color={AppColors.primary} />
                      <Text style={styles.durationText}>{formatDuration(block.durationMinutes)}</Text>
                    </View>
                  </View>
                  <View style={styles.blockActions}>
                    <Pressable
                      onPress={() => handleToggleBlock(idx)}
                      style={[
                        styles.doneBtn,
                        { backgroundColor: block.completed ? AppColors.status.done + "20" : AppColors.primary + "20" },
                      ]}
                    >
                      <Ionicons
                        name={block.completed ? "checkmark-circle" : "checkmark-circle-outline"}
                        size={16}
                        color={block.completed ? AppColors.status.done : AppColors.primary}
                      />
                      <Text style={[styles.doneBtnText, { color: block.completed ? AppColors.status.done : AppColors.primary }]}>
                        {block.completed ? "Done" : "Mark done"}
                      </Text>
                    </Pressable>
                    <Pressable onPress={() => handleRemoveBlock(idx)} hitSlop={8}>
                      <Ionicons name="close" size={16} color={theme.textSecondary} />
                    </Pressable>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 20, paddingBottom: 16, gap: 12,
  },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 20, fontFamily: "Inter_700Bold" },
  dateText: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  autoPlanBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12,
  },
  autoPlanText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 13 },
  capacityBar: {
    marginHorizontal: 20, borderRadius: 12, borderWidth: 1,
    padding: 14, marginBottom: 12, gap: 10,
  },
  capacityInfo: { flexDirection: "row", justifyContent: "space-between" },
  capacityLabel: { fontSize: 13, fontFamily: "Inter_500Medium" },
  capacityCount: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  barBg: { height: 6, borderRadius: 3, overflow: "hidden" },
  barFill: { height: 6, borderRadius: 3 },
  carryBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    marginHorizontal: 20, borderRadius: 10, padding: 10, marginBottom: 12,
  },
  carryText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  timeline: { paddingHorizontal: 20, paddingTop: 4, gap: 0 },
  blockRow: { flexDirection: "row", gap: 12, marginBottom: 12 },
  timeCol: { width: 60, alignItems: "center", paddingTop: 2, gap: 4 },
  timeText: { fontSize: 11, fontFamily: "Inter_500Medium", textAlign: "center" },
  timeTextEnd: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center" },
  timeLineSegment: { flex: 1, width: 1, minHeight: 20 },
  blockCard: { flex: 1, borderRadius: 12, borderWidth: 1, padding: 12, gap: 8 },
  carryTag: {
    flexDirection: "row", alignItems: "center", gap: 4,
    alignSelf: "flex-start",
  },
  carryTagText: { fontSize: 10, fontFamily: "Inter_600SemiBold", color: "#F97316" },
  blockTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", lineHeight: 20 },
  blockMeta: { flexDirection: "row", gap: 8 },
  durationTag: { flexDirection: "row", alignItems: "center", gap: 4 },
  durationText: { fontSize: 12, fontFamily: "Inter_500Medium", color: AppColors.primary },
  blockActions: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  doneBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  doneBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  emptyState: { alignItems: "center", paddingVertical: 80, gap: 12 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  emptySub: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 18, maxWidth: 260 },
});
