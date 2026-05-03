import React, { useState } from "react";
import {
  View, Text, ScrollView, Pressable, StyleSheet,
  useColorScheme, Platform, Modal,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { AppColors } from "@/constants/colors";
import { useTasks } from "@/contexts/TaskContext";
import { Task } from "@/utils/priority";

type Quadrant = "quick_wins" | "big_bets" | "fill_ins" | "time_wasters";

const QUADRANTS: {
  key: Quadrant;
  label: string;
  desc: string;
  color: string;
  icon: string;
}[] = [
  { key: "quick_wins", label: "Quick Wins", desc: "High impact, low effort", color: "#22C55E", icon: "flash" },
  { key: "big_bets", label: "Big Bets", desc: "High impact, high effort", color: "#3B82F6", icon: "rocket" },
  { key: "fill_ins", label: "Fill Ins", desc: "Low impact, low effort", color: "#6B7280", icon: "leaf" },
  { key: "time_wasters", label: "Time Wasters", desc: "Low impact, high effort", color: "#EF4444", icon: "warning" },
];

function getQuadrant(task: Task): Quadrant {
  const hi = task.impact_score > 2.5;
  const he = task.effort_score > 2.5;
  if (hi && !he) return "quick_wins";
  if (hi && he) return "big_bets";
  if (!hi && !he) return "fill_ins";
  return "time_wasters";
}

function ScoreRow({ label, value, color, onDec, onInc }: {
  label: string; value: number; color: string;
  onDec: () => void; onInc: () => void;
}) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? AppColors.dark : AppColors.light;
  return (
    <View style={adjStyles.scoreRow}>
      <Text style={[adjStyles.scoreLabel, { color: theme.textSecondary }]}>{label}</Text>
      <View style={adjStyles.scoreControls}>
        <Pressable onPress={onDec} style={[adjStyles.adjBtn, { borderColor: theme.border }]}>
          <Ionicons name="remove" size={16} color={theme.text} />
        </Pressable>
        <View style={adjStyles.scoreDisplay}>
          {[1, 2, 3, 4, 5].map((n) => (
            <View
              key={n}
              style={[adjStyles.dot, { backgroundColor: n <= value ? color : theme.border }]}
            />
          ))}
        </View>
        <Pressable onPress={onInc} style={[adjStyles.adjBtn, { borderColor: theme.border }]}>
          <Ionicons name="add" size={16} color={theme.text} />
        </Pressable>
      </View>
      <Text style={[adjStyles.scoreNum, { color }]}>{value}/5</Text>
    </View>
  );
}

const adjStyles = StyleSheet.create({
  scoreRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  scoreLabel: { width: 60, fontSize: 13, fontFamily: "Inter_500Medium" },
  scoreControls: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  adjBtn: { width: 28, height: 28, borderRadius: 8, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  scoreDisplay: { flex: 1, flexDirection: "row", gap: 4, justifyContent: "center" },
  dot: { width: 12, height: 12, borderRadius: 6 },
  scoreNum: { width: 32, fontSize: 14, fontFamily: "Inter_700Bold", textAlign: "right" },
});

export default function MatrixScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? AppColors.dark : AppColors.light;
  const insets = useSafeAreaInsets();
  const { tasks, updateTask } = useTasks();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [editEffort, setEditEffort] = useState(3);
  const [editImpact, setEditImpact] = useState(3);

  const activeTasks = tasks.filter((t) => t.status !== "done");
  const grouped: Record<Quadrant, Task[]> = {
    quick_wins: [], big_bets: [], fill_ins: [], time_wasters: [],
  };
  activeTasks.forEach((t) => grouped[getQuadrant(t)].push(t));

  const openAdjuster = async (task: Task) => {
    await Haptics.selectionAsync();
    setSelectedTask(task);
    setEditEffort(task.effort_score);
    setEditImpact(task.impact_score);
  };

  const saveAdjust = async () => {
    if (!selectedTask) return;
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    updateTask(selectedTask.id, { effort_score: editEffort, impact_score: editImpact });
    setSelectedTask(null);
  };

  const QuadrantBox = ({ q, tasks: qtasks }: { q: typeof QUADRANTS[0]; tasks: Task[] }) => (
    <View style={[styles.quadrant, { borderColor: q.color + "30", backgroundColor: q.color + "08" }]}>
      <View style={styles.qHeader}>
        <Ionicons name={q.icon as any} size={14} color={q.color} />
        <Text style={[styles.qLabel, { color: q.color }]}>{q.label}</Text>
        <View style={[styles.qBadge, { backgroundColor: q.color + "20" }]}>
          <Text style={[styles.qBadgeText, { color: q.color }]}>{qtasks.length}</Text>
        </View>
      </View>
      <Text style={[styles.qDesc, { color: theme.textSecondary }]}>{q.desc}</Text>
      {qtasks.length === 0 ? (
        <Text style={[styles.emptyQ, { color: theme.textSecondary }]}>No tasks here</Text>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} style={styles.qList} nestedScrollEnabled>
          {qtasks.slice(0, 5).map((t) => (
            <Pressable
              key={t.id}
              onPress={() => openAdjuster(t)}
              style={[styles.taskPill, { backgroundColor: q.color + "15", borderColor: q.color + "30" }]}
            >
              <Text style={[styles.taskPillText, { color: theme.text }]} numberOfLines={1}>{t.title}</Text>
              <Ionicons name="create-outline" size={11} color={q.color} />
            </Pressable>
          ))}
          {qtasks.length > 5 && (
            <Text style={[styles.moreText, { color: theme.textSecondary }]}>+{qtasks.length - 5} more</Text>
          )}
        </ScrollView>
      )}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={[styles.header, { paddingTop: topInset + 16 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={theme.text} />
        </Pressable>
        <View>
          <Text style={[styles.title, { color: theme.text }]}>Impact Matrix</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            {activeTasks.length} active task{activeTasks.length !== 1 ? "s" : ""}
          </Text>
        </View>
      </View>

      <View style={styles.axisLabels}>
        <Text style={[styles.axisLabelV, { color: theme.textSecondary }]}>⬆ High Impact</Text>
      </View>

      <View style={[styles.grid, { paddingBottom: bottomInset + 16 }]}>
        <View style={styles.gridRow}>
          <QuadrantBox q={QUADRANTS[0]} tasks={grouped.quick_wins} />
          <QuadrantBox q={QUADRANTS[1]} tasks={grouped.big_bets} />
        </View>
        <View style={styles.axisH}>
          <Text style={[styles.axisLabelH, { color: theme.textSecondary }]}>Low Effort ➡ High Effort</Text>
        </View>
        <View style={styles.gridRow}>
          <QuadrantBox q={QUADRANTS[2]} tasks={grouped.fill_ins} />
          <QuadrantBox q={QUADRANTS[3]} tasks={grouped.time_wasters} />
        </View>
      </View>

      <Modal visible={!!selectedTask} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setSelectedTask(null)}>
          <Pressable
            style={[styles.adjPanel, { backgroundColor: theme.bgCard }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.panelHandle} />
            <Text style={[styles.panelTitle, { color: theme.text }]} numberOfLines={2}>
              {selectedTask?.title}
            </Text>
            <Text style={[styles.panelSub, { color: theme.textSecondary }]}>
              Adjust effort and impact to reposition this task
            </Text>
            <View style={styles.scores}>
              <ScoreRow
                label="Effort"
                value={editEffort}
                color="#EF4444"
                onDec={() => setEditEffort((v) => Math.max(1, v - 1))}
                onInc={() => setEditEffort((v) => Math.min(5, v + 1))}
              />
              <ScoreRow
                label="Impact"
                value={editImpact}
                color="#22C55E"
                onDec={() => setEditImpact((v) => Math.max(1, v - 1))}
                onInc={() => setEditImpact((v) => Math.min(5, v + 1))}
              />
            </View>
            <View style={styles.panelActions}>
              <Pressable onPress={saveAdjust} style={styles.saveBtn}>
                <Text style={styles.saveBtnText}>Save</Text>
              </Pressable>
              <Pressable
                onPress={() => router.push({ pathname: "/task/[id]", params: { id: selectedTask!.id } })}
                style={[styles.viewBtn, { borderColor: theme.border }]}
              >
                <Text style={[styles.viewBtnText, { color: theme.text }]}>View Task</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 20, paddingBottom: 12, gap: 12,
  },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 20, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 12, fontFamily: "Inter_400Regular" },
  axisLabels: { alignItems: "center", paddingBottom: 4 },
  axisLabelV: { fontSize: 11, fontFamily: "Inter_500Medium" },
  grid: { flex: 1, paddingHorizontal: 12, gap: 0 },
  gridRow: { flex: 1, flexDirection: "row", gap: 8 },
  quadrant: {
    flex: 1, borderRadius: 14, borderWidth: 1,
    padding: 12, gap: 6, overflow: "hidden",
  },
  qHeader: { flexDirection: "row", alignItems: "center", gap: 5 },
  qLabel: { fontSize: 12, fontFamily: "Inter_700Bold", flex: 1 },
  qBadge: { width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  qBadgeText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  qDesc: { fontSize: 10, fontFamily: "Inter_400Regular" },
  emptyQ: { fontSize: 11, fontFamily: "Inter_400Regular", fontStyle: "italic", textAlign: "center", marginTop: 4 },
  qList: { flex: 1 },
  taskPill: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 8, paddingVertical: 5,
    borderRadius: 8, borderWidth: 1, marginBottom: 4,
  },
  taskPillText: { flex: 1, fontSize: 11, fontFamily: "Inter_500Medium" },
  moreText: { fontSize: 10, fontFamily: "Inter_400Regular", textAlign: "center" },
  axisH: { alignItems: "center", paddingVertical: 4 },
  axisLabelH: { fontSize: 11, fontFamily: "Inter_500Medium" },
  modalOverlay: {
    flex: 1, justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  adjPanel: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, gap: 16,
  },
  panelHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: "#D1D5DB", alignSelf: "center", marginBottom: 4,
  },
  panelTitle: { fontSize: 16, fontFamily: "Inter_700Bold", lineHeight: 22 },
  panelSub: { fontSize: 13, fontFamily: "Inter_400Regular" },
  scores: { gap: 16 },
  panelActions: { flexDirection: "row", gap: 10 },
  saveBtn: {
    flex: 1, backgroundColor: AppColors.primary,
    borderRadius: 12, paddingVertical: 14, alignItems: "center",
  },
  saveBtnText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 15 },
  viewBtn: {
    paddingHorizontal: 20, paddingVertical: 14,
    borderRadius: 12, borderWidth: 1, alignItems: "center",
  },
  viewBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
});
