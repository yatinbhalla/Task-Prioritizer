import React, { useState } from "react";
import {
  ScrollView, StyleSheet, Text, View, TextInput, Pressable,
  useColorScheme, Platform, Alert,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { KeyboardAwareScrollViewCompat as KeyboardAwareScrollView } from "@/components/KeyboardAwareScrollViewCompat";
import { AppColors } from "@/constants/colors";
import { useTasks } from "@/contexts/TaskContext";
import { PriorityBadge } from "@/components/PriorityBadge";
import { RecurrenceSection } from "@/components/RecurrenceSection";
import { SubtaskList } from "@/components/SubtaskList";
import {
  PriorityLevel, TaskStatus, RecurrenceType,
  PRIORITY_LABELS, STATUS_LABELS, formatDaysRemaining, formatDeadline,
  formatDuration, isOverdue, describeRecurrence,
} from "@/utils/priority";

const PRIORITIES: PriorityLevel[] = ["low", "medium", "high", "top"];
const STATUSES: TaskStatus[] = ["todo", "inprogress", "done"];
const DURATION_OPTIONS = [
  { label: "15m", value: 15 }, { label: "30m", value: 30 },
  { label: "45m", value: 45 }, { label: "1h", value: 60 },
  { label: "1.5h", value: 90 }, { label: "2h", value: 120 },
  { label: "3h", value: 180 },
];

function addDays(date: Date, days: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function ScorePicker({ label, value, onChange, activeColor, theme }: {
  label: string; value: number; onChange: (v: number) => void;
  activeColor: string; theme: any;
}) {
  return (
    <View style={sp.row}>
      <Text style={[sp.label, { color: theme.textSecondary }]}>{label}</Text>
      <View style={sp.dots}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable
            key={n}
            onPress={async () => { await Haptics.selectionAsync(); onChange(n); }}
            style={[sp.dot, { backgroundColor: n <= value ? activeColor : theme.border }]}
          >
            <Text style={[sp.dotText, { color: n <= value ? "#fff" : theme.textSecondary }]}>{n}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={[sp.score, { color: activeColor }]}>{value}/5</Text>
    </View>
  );
}

const sp = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  label: { width: 58, fontSize: 13, fontFamily: "Inter_500Medium" },
  dots: { flex: 1, flexDirection: "row", gap: 6 },
  dot: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  dotText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  score: { width: 32, fontSize: 13, fontFamily: "Inter_700Bold", textAlign: "right" },
});

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? AppColors.dark : AppColors.light;
  const insets = useSafeAreaInsets();
  const { tasks, updateTask, deleteTask, addSubtask, toggleSubtask, removeSubtask } = useTasks();

  const task = tasks.find((t) => t.id === id);

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [priority, setPriority] = useState<PriorityLevel>(task?.manualPriority ?? "medium");
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? "todo");
  const [deadlineDate, setDeadlineDate] = useState(
    task ? new Date(task.deadlineDate).toISOString().split("T")[0] : addDays(new Date(), 7)
  );
  const [dateInput, setDateInput] = useState(
    task ? new Date(task.deadlineDate).toISOString().split("T")[0] : addDays(new Date(), 7)
  );
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>(task?.recurrenceType ?? "none");
  const [recurrenceInterval, setRecurrenceInterval] = useState(task?.recurrenceInterval ?? 1);
  const [recurrenceDayOfWeek, setRecurrenceDayOfWeek] = useState(task?.recurrenceDayOfWeek ?? 0);
  const [recurrenceDayOfMonth, setRecurrenceDayOfMonth] = useState(task?.recurrenceDayOfMonth ?? 1);
  const [duration, setDuration] = useState(task?.estimated_duration ?? 30);
  const [effort, setEffort] = useState(task?.effort_score ?? 3);
  const [impact, setImpact] = useState(task?.impact_score ?? 3);

  if (!task) {
    return (
      <View style={[styles.container, { backgroundColor: theme.bg }]}>
        <View style={[styles.header, { paddingTop: topInset + 12 }]}>
          <Pressable onPress={() => router.back()} style={styles.closeBtn}>
            <Ionicons name="close" size={22} color={theme.text} />
          </Pressable>
        </View>
        <View style={styles.notFound}>
          <Ionicons name="alert-circle-outline" size={48} color={theme.textSecondary} />
          <Text style={[styles.notFoundText, { color: theme.text }]}>Task not found</Text>
        </View>
      </View>
    );
  }

  const overdue = isOverdue(task.deadlineDate) && task.status !== "done";
  const isRecurring = task.recurrenceType && task.recurrenceType !== "none";
  const today = new Date();
  const QUICK_DATES = [
    { label: "Today", value: addDays(today, 0) },
    { label: "Tomorrow", value: addDays(today, 1) },
    { label: "3 days", value: addDays(today, 3) },
    { label: "1 week", value: addDays(today, 7) },
    { label: "2 weeks", value: addDays(today, 14) },
  ];

  const handleSave = async () => {
    if (!title.trim()) { Alert.alert("Required", "Please enter a task title."); return; }
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    updateTask(id, {
      title: title.trim(),
      description: description.trim(),
      manualPriority: priority,
      status,
      deadlineDate: new Date(deadlineDate + "T12:00:00").toISOString(),
      recurrenceType,
      recurrenceInterval,
      recurrenceDayOfWeek,
      recurrenceDayOfMonth,
      estimated_duration: duration,
      effort_score: effort,
      impact_score: impact,
    });
    setIsEditing(false);
  };

  const handleDelete = () => {
    Alert.alert("Delete Task", "Are you sure you want to delete this task?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          deleteTask(id);
          router.back();
        },
      },
    ]);
  };

  const handleDateInput = (text: string) => {
    setDateInput(text);
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
      const date = new Date(text);
      if (!isNaN(date.getTime())) setDeadlineDate(text);
    }
  };

  if (isEditing) {
    return (
      <View style={[styles.container, { backgroundColor: theme.bg }]}>
        <View style={[styles.header, { paddingTop: topInset + 12 }]}>
          <Pressable onPress={() => setIsEditing(false)} style={styles.closeBtn}>
            <Ionicons name="close" size={22} color={theme.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Edit Task</Text>
          <Pressable onPress={handleSave} style={styles.saveBtn}>
            <Text style={styles.saveBtnText}>Save</Text>
          </Pressable>
        </View>

        <KeyboardAwareScrollView
          bottomOffset={20}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scroll, { paddingBottom: bottomInset + 40 }]}
        >
          <View style={styles.formSection}>
            <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>TITLE</Text>
            <TextInput
              value={title} onChangeText={setTitle}
              style={[styles.titleInput, { color: theme.text, borderBottomColor: title ? AppColors.primary : theme.border }]}
              autoFocus multiline
            />
          </View>

          <View style={styles.formSection}>
            <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>DESCRIPTION</Text>
            <TextInput
              value={description} onChangeText={setDescription}
              placeholder="Add details (optional)" placeholderTextColor={theme.textSecondary}
              style={[styles.descInput, { color: theme.text, backgroundColor: theme.bgCard, borderColor: theme.border }]}
              multiline numberOfLines={3}
            />
          </View>

          <View style={styles.formSection}>
            <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>PRIORITY</Text>
            <View style={styles.optionsRow}>
              {PRIORITIES.map((p) => {
                const isActive = priority === p;
                const color = AppColors.priority[p];
                return (
                  <Pressable
                    key={p}
                    onPress={async () => { await Haptics.selectionAsync(); setPriority(p); }}
                    style={[styles.option, { backgroundColor: isActive ? color + "20" : theme.bgCard, borderColor: isActive ? color : theme.border }]}
                  >
                    <View style={[styles.priorityDot, { backgroundColor: color }]} />
                    <Text style={[styles.optionText, { color: isActive ? color : theme.textSecondary }]}>{PRIORITY_LABELS[p]}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.formSection}>
            <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>STATUS</Text>
            <View style={styles.optionsRow}>
              {STATUSES.map((s) => {
                const isActive = status === s;
                const color = AppColors.status[s];
                return (
                  <Pressable
                    key={s}
                    onPress={async () => { await Haptics.selectionAsync(); setStatus(s); }}
                    style={[styles.option, { backgroundColor: isActive ? color + "20" : theme.bgCard, borderColor: isActive ? color : theme.border }]}
                  >
                    <Text style={[styles.optionText, { color: isActive ? color : theme.textSecondary }]}>{STATUS_LABELS[s]}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.formSection}>
            <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>DEADLINE</Text>
            <View style={styles.quickDates}>
              {QUICK_DATES.map((d) => {
                const isActive = deadlineDate === d.value;
                return (
                  <Pressable
                    key={d.label}
                    onPress={async () => { await Haptics.selectionAsync(); setDeadlineDate(d.value); setDateInput(d.value); }}
                    style={[styles.quickDate, { backgroundColor: isActive ? AppColors.primary + "20" : theme.bgCard, borderColor: isActive ? AppColors.primary : theme.border }]}
                  >
                    <Text style={[styles.quickDateText, { color: isActive ? AppColors.primary : theme.textSecondary, fontFamily: isActive ? "Inter_600SemiBold" : "Inter_400Regular" }]}>
                      {d.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={[styles.dateInputRow, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
              <Ionicons name="calendar-outline" size={16} color={theme.textSecondary} />
              <TextInput
                value={dateInput} onChangeText={handleDateInput}
                placeholder="YYYY-MM-DD" placeholderTextColor={theme.textSecondary}
                style={[styles.dateTextInput, { color: theme.text }]} keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.formSection}>
            <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>ESTIMATED DURATION</Text>
            <View style={styles.quickDates}>
              {DURATION_OPTIONS.map((d) => {
                const isActive = duration === d.value;
                return (
                  <Pressable
                    key={d.value}
                    onPress={async () => { await Haptics.selectionAsync(); setDuration(d.value); }}
                    style={[styles.quickDate, { backgroundColor: isActive ? AppColors.primary + "20" : theme.bgCard, borderColor: isActive ? AppColors.primary : theme.border }]}
                  >
                    <Text style={[styles.quickDateText, { color: isActive ? AppColors.primary : theme.textSecondary, fontFamily: isActive ? "Inter_600SemiBold" : "Inter_400Regular" }]}>
                      {d.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={[styles.formSection, styles.scoreCard, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
            <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>EFFORT & IMPACT</Text>
            <ScorePicker label="Effort" value={effort} onChange={setEffort} activeColor="#EF4444" theme={theme} />
            <ScorePicker label="Impact" value={impact} onChange={setImpact} activeColor="#22C55E" theme={theme} />
          </View>

          <View style={styles.formSection}>
            <RecurrenceSection
              recurrenceType={recurrenceType}
              recurrenceInterval={recurrenceInterval}
              recurrenceDayOfWeek={recurrenceDayOfWeek}
              recurrenceDayOfMonth={recurrenceDayOfMonth}
              onChange={(updates) => {
                if (updates.recurrenceType !== undefined) setRecurrenceType(updates.recurrenceType);
                if (updates.recurrenceInterval !== undefined) setRecurrenceInterval(updates.recurrenceInterval);
                if (updates.recurrenceDayOfWeek !== undefined) setRecurrenceDayOfWeek(updates.recurrenceDayOfWeek);
                if (updates.recurrenceDayOfMonth !== undefined) setRecurrenceDayOfMonth(updates.recurrenceDayOfMonth);
              }}
            />
          </View>

          <Pressable
            onPress={handleSave}
            style={({ pressed }) => [styles.submitBtn, { opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }]}
          >
            <Ionicons name="checkmark" size={20} color="#fff" />
            <Text style={styles.submitBtnText}>Save Changes</Text>
          </Pressable>
        </KeyboardAwareScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={[styles.header, { paddingTop: topInset + 12 }]}>
        <Pressable onPress={() => router.back()} style={styles.closeBtn}>
          <Ionicons name="close" size={22} color={theme.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Task Detail</Text>
        <View style={styles.headerActions}>
          <Pressable onPress={() => setIsEditing(true)} style={[styles.iconBtn, { borderColor: theme.border }]}>
            <Ionicons name="pencil" size={16} color={AppColors.primary} />
          </Pressable>
          <Pressable onPress={handleDelete} style={[styles.iconBtn, { borderColor: theme.border }]}>
            <Ionicons name="trash-outline" size={16} color={AppColors.priority.critical} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.detailScroll, { paddingBottom: bottomInset + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.badgeRow}>
          <PriorityBadge priority={task.dynamicPriority} />
          {overdue && (
            <View style={styles.overdueBadge}>
              <Ionicons name="alert-circle" size={12} color={AppColors.priority.critical} />
              <Text style={styles.overdueText}>Overdue</Text>
            </View>
          )}
          {isRecurring && (
            <View style={[styles.tagBadge, { backgroundColor: AppColors.primary + "15", borderColor: AppColors.primary + "30" }]}>
              <Ionicons name="repeat" size={11} color={AppColors.primary} />
              <Text style={[styles.tagText, { color: AppColors.primary }]}>Recurring</Text>
            </View>
          )}
          <View style={[styles.tagBadge, { backgroundColor: AppColors.status[task.status] + "20", borderColor: AppColors.status[task.status] + "50" }]}>
            <Text style={[styles.tagText, { color: AppColors.status[task.status] }]}>{STATUS_LABELS[task.status]}</Text>
          </View>
        </View>

        <Text style={[styles.detailTitle, { color: theme.text }]}>{task.title}</Text>
        {task.description ? (
          <Text style={[styles.detailDesc, { color: theme.textSecondary }]}>{task.description}</Text>
        ) : null}

        <View style={[styles.infoCard, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
          <InfoRow icon="time-outline" label="Deadline" value={formatDeadline(task.deadlineDate)}
            color={overdue ? AppColors.priority.critical : undefined} theme={theme} />
          <Divider theme={theme} />
          <InfoRow icon="hourglass-outline" label="Time left" value={formatDaysRemaining(task.deadlineDate)}
            color={overdue ? AppColors.priority.critical : undefined} theme={theme} bold />
          {task.estimated_duration > 0 && (
            <>
              <Divider theme={theme} />
              <InfoRow icon="timer-outline" label="Duration" value={formatDuration(task.estimated_duration)} theme={theme} />
            </>
          )}
          <Divider theme={theme} />
          <InfoRow icon="flash-outline" label="Priority score" value={task.priority_score.toFixed(2)}
            color={AppColors.primary} theme={theme} bold />
          <Divider theme={theme} />
          <InfoRow icon="speedometer-outline" label="Urgency score" value={task.urgencyScore.toFixed(2)} theme={theme} />
          {isRecurring && (
            <>
              <Divider theme={theme} />
              <InfoRow icon="repeat" label="Recurrence" value={describeRecurrence(task)}
                color={AppColors.primary} theme={theme} />
            </>
          )}
          <Divider theme={theme} />
          <InfoRow icon="create-outline" label="Created" value={formatDeadline(task.createdDate)} theme={theme} />
        </View>

        <View style={[styles.scoreCard, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
          <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>EFFORT & IMPACT</Text>
          <View style={styles.scoreRow}>
            <View style={styles.scoreItem}>
              <Text style={[styles.scoreNum, { color: "#EF4444" }]}>{task.effort_score}</Text>
              <Text style={[styles.scoreItemLabel, { color: theme.textSecondary }]}>Effort</Text>
              <View style={styles.scoreDots}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <View key={n} style={[styles.scoreDot, { backgroundColor: n <= task.effort_score ? "#EF4444" : theme.border }]} />
                ))}
              </View>
            </View>
            <View style={[styles.scoreDivider, { backgroundColor: theme.border }]} />
            <View style={styles.scoreItem}>
              <Text style={[styles.scoreNum, { color: "#22C55E" }]}>{task.impact_score}</Text>
              <Text style={[styles.scoreItemLabel, { color: theme.textSecondary }]}>Impact</Text>
              <View style={styles.scoreDots}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <View key={n} style={[styles.scoreDot, { backgroundColor: n <= task.impact_score ? "#22C55E" : theme.border }]} />
                ))}
              </View>
            </View>
          </View>
        </View>

        <View style={styles.subtaskSection}>
          <SubtaskList
            taskId={task.id}
            subtasks={task.subtasks ?? []}
            onAdd={addSubtask}
            onToggle={toggleSubtask}
            onRemove={removeSubtask}
          />
        </View>

        <View style={styles.statusSection}>
          <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>MOVE TO</Text>
          <View style={styles.statusRow}>
            {STATUSES.map((s) => {
              const isActive = task.status === s;
              const color = AppColors.status[s];
              return (
                <Pressable
                  key={s}
                  onPress={async () => {
                    if (isActive) return;
                    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    updateTask(id, { status: s });
                  }}
                  style={[styles.statusOption, { backgroundColor: isActive ? color + "20" : theme.bgCard, borderColor: isActive ? color : theme.border }]}
                >
                  <Ionicons name={isActive ? "checkmark-circle" : "ellipse-outline"} size={16} color={isActive ? color : theme.textSecondary} />
                  <Text style={[styles.statusOptionText, { color: isActive ? color : theme.textSecondary }]}>{STATUS_LABELS[s]}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function Divider({ theme }: { theme: any }) {
  return <View style={[divStyle.d, { backgroundColor: theme.border }]} />;
}
const divStyle = StyleSheet.create({ d: { height: 1, marginHorizontal: 16 } });

function InfoRow({ icon, label, value, color, theme, bold }: {
  icon: any; label: string; value: string; color?: string; theme: any; bold?: boolean;
}) {
  return (
    <View style={ir.row}>
      <View style={ir.left}>
        <Ionicons name={icon} size={16} color={theme.textSecondary} />
        <Text style={[ir.label, { color: theme.textSecondary }]}>{label}</Text>
      </View>
      <Text style={[ir.value, { color: color ?? theme.text, fontFamily: bold ? "Inter_700Bold" : "Inter_500Medium" }]}>{value}</Text>
    </View>
  );
}
const ir = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14 },
  left: { flexDirection: "row", alignItems: "center", gap: 8 },
  label: { fontSize: 14, fontFamily: "Inter_400Regular" },
  value: { fontSize: 14, fontFamily: "Inter_500Medium", maxWidth: "55%", textAlign: "right" },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 16 },
  closeBtn: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  headerActions: { flexDirection: "row", gap: 8 },
  iconBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  saveBtn: { paddingHorizontal: 16, paddingVertical: 7, backgroundColor: AppColors.primary, borderRadius: 10 },
  saveBtnText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 14 },
  scroll: { paddingHorizontal: 20, gap: 24 },
  detailScroll: { paddingHorizontal: 20, gap: 20 },
  notFound: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  notFoundText: { fontSize: 16, fontFamily: "Inter_500Medium" },
  badgeRow: { flexDirection: "row", gap: 8, alignItems: "center", flexWrap: "wrap" },
  overdueBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: AppColors.priority.critical + "20", borderWidth: 1, borderColor: AppColors.priority.critical + "40" },
  overdueText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: AppColors.priority.critical },
  tagBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  tagText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  detailTitle: { fontSize: 24, fontFamily: "Inter_700Bold", lineHeight: 32, letterSpacing: -0.3 },
  detailDesc: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 22 },
  infoCard: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  scoreCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 14 },
  sectionLabel: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  scoreRow: { flexDirection: "row", alignItems: "center" },
  scoreItem: { flex: 1, alignItems: "center", gap: 4 },
  scoreNum: { fontSize: 28, fontFamily: "Inter_700Bold" },
  scoreItemLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
  scoreDots: { flexDirection: "row", gap: 4 },
  scoreDot: { width: 8, height: 8, borderRadius: 4 },
  scoreDivider: { width: 1, height: 60, marginHorizontal: 16 },
  subtaskSection: { gap: 0 },
  statusSection: { gap: 12 },
  statusRow: { flexDirection: "row", gap: 8 },
  statusOption: { flex: 1, flexDirection: "column", alignItems: "center", gap: 6, paddingVertical: 14, borderRadius: 12, borderWidth: 1.5 },
  statusOptionText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  formSection: { gap: 10 },
  titleInput: { fontSize: 22, fontFamily: "Inter_700Bold", borderBottomWidth: 2, paddingBottom: 8, minHeight: 44 },
  descInput: { fontSize: 15, fontFamily: "Inter_400Regular", borderWidth: 1, borderRadius: 12, padding: 12, minHeight: 80, textAlignVertical: "top", lineHeight: 22 },
  optionsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  option: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5 },
  priorityDot: { width: 8, height: 8, borderRadius: 4 },
  optionText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  quickDates: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  quickDate: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  quickDateText: { fontSize: 13 },
  dateInputRow: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
  dateTextInput: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  submitBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: AppColors.primary, borderRadius: 14, paddingVertical: 16, marginTop: 8, shadowColor: AppColors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 6 },
  submitBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
