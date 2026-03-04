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
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { KeyboardAwareScrollViewCompat as KeyboardAwareScrollView } from "@/components/KeyboardAwareScrollViewCompat";
import { AppColors } from "@/constants/colors";
import { useTasks } from "@/contexts/TaskContext";
import { PriorityLevel, TaskStatus, PRIORITY_LABELS, STATUS_LABELS } from "@/utils/priority";

const PRIORITIES: PriorityLevel[] = ["low", "medium", "high", "top"];
const STATUSES: TaskStatus[] = ["todo", "inprogress", "done"];

function addDays(date: Date, days: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

export default function NewTaskScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? AppColors.dark : AppColors.light;
  const insets = useSafeAreaInsets();
  const { addTask } = useTasks();

  const today = new Date();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<PriorityLevel>("medium");
  const [status, setStatus] = useState<TaskStatus>("todo");
  const [deadlineDate, setDeadlineDate] = useState(addDays(today, 7));
  const [dateInput, setDateInput] = useState(addDays(today, 7));

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  const QUICK_DATES = [
    { label: "Today", value: addDays(today, 0) },
    { label: "Tomorrow", value: addDays(today, 1) },
    { label: "3 days", value: addDays(today, 3) },
    { label: "1 week", value: addDays(today, 7) },
    { label: "2 weeks", value: addDays(today, 14) },
    { label: "1 month", value: addDays(today, 30) },
  ];

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert("Required", "Please enter a task title.");
      return;
    }
    if (!deadlineDate) {
      Alert.alert("Required", "Please set a deadline.");
      return;
    }
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    addTask({
      title: title.trim(),
      description: description.trim(),
      manualPriority: priority,
      deadlineDate: new Date(deadlineDate + "T12:00:00").toISOString(),
      status,
    });
    router.back();
  };

  const handleDateInput = (text: string) => {
    setDateInput(text);
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
      const date = new Date(text);
      if (!isNaN(date.getTime())) setDeadlineDate(text);
    }
  };

  const selectQuickDate = async (value: string) => {
    await Haptics.selectionAsync();
    setDeadlineDate(value);
    setDateInput(value);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={[styles.header, { paddingTop: topInset + 12 }]}>
        <Pressable onPress={() => router.back()} style={styles.closeBtn}>
          <Ionicons name="close" size={22} color={theme.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text }]}>New Task</Text>
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
            placeholder="What needs to be done?"
            placeholderTextColor={theme.textSecondary}
            style={[
              styles.titleInput,
              { color: theme.text, borderBottomColor: title ? AppColors.primary : theme.border },
            ]}
            autoFocus
            returnKeyType="next"
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
              {
                color: theme.text,
                backgroundColor: theme.bgCard,
                borderColor: theme.border,
              },
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
                  onPress={() => selectQuickDate(d.value)}
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
          <Text style={[styles.dateHint, { color: theme.textSecondary }]}>
            Enter date as YYYY-MM-DD or tap a quick option above
          </Text>
        </View>

        <Pressable
          onPress={handleSave}
          style={({ pressed }) => [
            styles.submitBtn,
            { opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
          ]}
        >
          <Ionicons name="checkmark" size={20} color="#fff" />
          <Text style={styles.submitBtnText}>Create Task</Text>
        </Pressable>
      </KeyboardAwareScrollView>
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
  formSection: {
    gap: 10,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
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
  dateHint: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: -4,
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
