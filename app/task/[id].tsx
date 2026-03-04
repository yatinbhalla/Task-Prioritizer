import React, { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  TextInput,
  Pressable,
  useColorScheme,
  Platform,
  Alert,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { KeyboardAwareScrollViewCompat as KeyboardAwareScrollView } from "@/components/KeyboardAwareScrollViewCompat";
import { AppColors } from "@/constants/colors";
import { useTasks } from "@/contexts/TaskContext";
import { PriorityBadge } from "@/components/PriorityBadge";
import {
  PriorityLevel,
  TaskStatus,
  PRIORITY_LABELS,
  STATUS_LABELS,
  formatDaysRemaining,
  formatDeadline,
  isOverdue,
} from "@/utils/priority";

const PRIORITIES: PriorityLevel[] = ["low", "medium", "high", "top"];
const STATUSES: TaskStatus[] = ["todo", "inprogress", "done"];

function addDays(date: Date, days: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? AppColors.dark : AppColors.light;
  const insets = useSafeAreaInsets();
  const { tasks, updateTask, deleteTask } = useTasks();

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

  const today = new Date();
  const QUICK_DATES = [
    { label: "Today", value: addDays(today, 0) },
    { label: "Tomorrow", value: addDays(today, 1) },
    { label: "3 days", value: addDays(today, 3) },
    { label: "1 week", value: addDays(today, 7) },
    { label: "2 weeks", value: addDays(today, 14) },
  ];

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert("Required", "Please enter a task title.");
      return;
    }
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    updateTask(id, {
      title: title.trim(),
      description: description.trim(),
      manualPriority: priority,
      status,
      deadlineDate: new Date(deadlineDate + "T12:00:00").toISOString(),
    });
    setIsEditing(false);
  };

  const handleDelete = () => {
    Alert.alert("Delete Task", "Are you sure you want to delete this task?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
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
          <Pressable
            onPress={() => setIsEditing(false)}
            style={styles.closeBtn}
          >
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
              value={title}
              onChangeText={setTitle}
              style={[
                styles.titleInput,
                { color: theme.text, borderBottomColor: title ? AppColors.primary : theme.border },
              ]}
              autoFocus
              multiline
            />
          </View>

          <View style={styles.formSection}>
            <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>DESCRIPTION</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Add details (optional)"
              placeholderTextColor={theme.textSecondary}
              style={[
                styles.descInput,
                { color: theme.text, backgroundColor: theme.bgCard, borderColor: theme.border },
              ]}
              multiline
              numberOfLines={3}
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
                    onPress={async () => {
                      await Haptics.selectionAsync();
                      setPriority(p);
                    }}
                    style={[
                      styles.option,
                      {
                        backgroundColor: isActive ? color + "20" : theme.bgCard,
                        borderColor: isActive ? color : theme.border,
                      },
                    ]}
                  >
                    <View style={[styles.priorityDot, { backgroundColor: color }]} />
                    <Text style={[styles.optionText, { color: isActive ? color : theme.textSecondary }]}>
                      {PRIORITY_LABELS[p]}
                    </Text>
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
                    onPress={async () => {
                      await Haptics.selectionAsync();
                      setStatus(s);
                    }}
                    style={[
                      styles.option,
                      {
                        backgroundColor: isActive ? color + "20" : theme.bgCard,
                        borderColor: isActive ? color : theme.border,
                      },
                    ]}
                  >
                    <Text style={[styles.optionText, { color: isActive ? color : theme.textSecondary }]}>
                      {STATUS_LABELS[s]}
                    </Text>
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
                    onPress={async () => {
                      await Haptics.selectionAsync();
                      setDeadlineDate(d.value);
                      setDateInput(d.value);
                    }}
                    style={[
                      styles.quickDate,
                      {
                        backgroundColor: isActive ? AppColors.primary + "20" : theme.bgCard,
                        borderColor: isActive ? AppColors.primary : theme.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.quickDateText,
                        {
                          color: isActive ? AppColors.primary : theme.textSecondary,
                          fontFamily: isActive ? "Inter_600SemiBold" : "Inter_400Regular",
                        },
                      ]}
                    >
                      {d.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={[styles.dateInputRow, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
              <Ionicons name="calendar-outline" size={16} color={theme.textSecondary} />
              <TextInput
                value={dateInput}
                onChangeText={handleDateInput}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={theme.textSecondary}
                style={[styles.dateTextInput, { color: theme.text }]}
                keyboardType="numeric"
              />
            </View>
          </View>

          <Pressable
            onPress={handleSave}
            style={({ pressed }) => [
              styles.submitBtn,
              { opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
            ]}
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
          <Pressable
            onPress={() => setIsEditing(true)}
            style={[styles.editBtn, { borderColor: theme.border }]}
          >
            <Ionicons name="pencil" size={16} color={AppColors.primary} />
          </Pressable>
          <Pressable onPress={handleDelete} style={[styles.editBtn, { borderColor: theme.border }]}>
            <Ionicons name="trash-outline" size={16} color={AppColors.priority.critical} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.detailScroll, { paddingBottom: bottomInset + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.detailBadgeRow}>
          <PriorityBadge priority={task.dynamicPriority} />
          {overdue && (
            <View style={styles.overdueBadge}>
              <Ionicons name="alert-circle" size={12} color={AppColors.priority.critical} />
              <Text style={styles.overdueText}>Overdue</Text>
            </View>
          )}
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: AppColors.status[task.status] + "20", borderColor: AppColors.status[task.status] + "50" },
            ]}
          >
            <Text style={[styles.statusText, { color: AppColors.status[task.status] }]}>
              {STATUS_LABELS[task.status]}
            </Text>
          </View>
        </View>

        <Text style={[styles.detailTitle, { color: theme.text }]}>{task.title}</Text>

        {task.description ? (
          <Text style={[styles.detailDesc, { color: theme.textSecondary }]}>{task.description}</Text>
        ) : null}

        <View style={[styles.infoCard, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
          <View style={styles.infoRow}>
            <View style={styles.infoLeft}>
              <Ionicons name="time-outline" size={16} color={theme.textSecondary} />
              <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Deadline</Text>
            </View>
            <Text style={[styles.infoValue, { color: overdue ? AppColors.priority.critical : theme.text }]}>
              {formatDeadline(task.deadlineDate)}
            </Text>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <View style={styles.infoRow}>
            <View style={styles.infoLeft}>
              <Ionicons name="hourglass-outline" size={16} color={theme.textSecondary} />
              <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Time left</Text>
            </View>
            <Text
              style={[
                styles.infoValue,
                { color: overdue ? AppColors.priority.critical : theme.text, fontFamily: "Inter_600SemiBold" },
              ]}
            >
              {formatDaysRemaining(task.deadlineDate)}
            </Text>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <View style={styles.infoRow}>
            <View style={styles.infoLeft}>
              <Ionicons name="speedometer-outline" size={16} color={theme.textSecondary} />
              <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Urgency score</Text>
            </View>
            <Text style={[styles.infoValue, { color: AppColors.primary, fontFamily: "Inter_700Bold" }]}>
              {task.urgencyScore.toFixed(2)}
            </Text>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <View style={styles.infoRow}>
            <View style={styles.infoLeft}>
              <Ionicons name="create-outline" size={16} color={theme.textSecondary} />
              <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Created</Text>
            </View>
            <Text style={[styles.infoValue, { color: theme.text }]}>
              {formatDeadline(task.createdDate)}
            </Text>
          </View>
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
                  style={[
                    styles.statusOption,
                    {
                      backgroundColor: isActive ? color + "20" : theme.bgCard,
                      borderColor: isActive ? color : theme.border,
                    },
                  ]}
                >
                  <Ionicons
                    name={isActive ? "checkmark-circle" : "ellipse-outline"}
                    size={16}
                    color={isActive ? color : theme.textSecondary}
                  />
                  <Text style={[styles.statusOptionText, { color: isActive ? color : theme.textSecondary }]}>
                    {STATUS_LABELS[s]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },
  editBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtn: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    backgroundColor: AppColors.primary,
    borderRadius: 10,
  },
  saveBtnText: {
    color: "#fff",
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  scroll: {
    paddingHorizontal: 20,
    gap: 24,
  },
  detailScroll: {
    paddingHorizontal: 20,
    gap: 20,
  },
  detailBadgeRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    flexWrap: "wrap",
  },
  overdueBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: AppColors.priority.critical + "20",
    borderWidth: 1,
    borderColor: AppColors.priority.critical + "40",
  },
  overdueText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: AppColors.priority.critical,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  detailTitle: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    lineHeight: 32,
    letterSpacing: -0.3,
  },
  detailDesc: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
  },
  infoCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  infoLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  infoLabel: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  infoValue: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  divider: {
    height: 1,
    marginHorizontal: 16,
  },
  statusSection: {
    gap: 12,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
  },
  statusRow: {
    flexDirection: "row",
    gap: 8,
  },
  statusOption: {
    flex: 1,
    flexDirection: "column",
    alignItems: "center",
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  statusOptionText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
  },
  notFound: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  notFoundText: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
  },
  formSection: {
    gap: 10,
  },
  titleInput: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    borderBottomWidth: 2,
    paddingBottom: 8,
    minHeight: 44,
  },
  descInput: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    minHeight: 80,
    textAlignVertical: "top",
    lineHeight: 22,
  },
  optionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  optionText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  quickDates: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  quickDate: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  quickDateText: {
    fontSize: 13,
  },
  dateInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dateTextInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: AppColors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 8,
    shadowColor: AppColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  submitBtnText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
});
