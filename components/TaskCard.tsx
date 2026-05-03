import React, { useRef } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { AppColors } from "@/constants/colors";
import { Task, formatDaysRemaining, formatDeadline, isOverdue, STATUS_LABELS, TaskStatus } from "@/utils/priority";
import { PriorityBadge } from "./PriorityBadge";
import { useTasks } from "@/contexts/TaskContext";

interface Props {
  task: Task;
  showMoveButtons?: boolean;
}

const STATUS_ORDER: TaskStatus[] = ["todo", "inprogress", "done"];

export function TaskCard({ task, showMoveButtons = true }: Props) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? AppColors.dark : AppColors.light;
  const { moveTask, deleteTask } = useTasks();
  const overdue = isOverdue(task.deadlineDate) && task.status !== "done";
  const isRecurring = task.recurrenceType && task.recurrenceType !== "none";
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const currentIdx = STATUS_ORDER.indexOf(task.status);
  const nextStatus = currentIdx < STATUS_ORDER.length - 1 ? STATUS_ORDER[currentIdx + 1] : null;
  const prevStatus = currentIdx > 0 ? STATUS_ORDER[currentIdx - 1] : null;

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.97, duration: 80, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start();
    router.push({ pathname: "/task/[id]", params: { id: task.id } });
  };

  const handleMove = async (status: TaskStatus) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    moveTask(task.id, status);
  };

  const handleDelete = async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    deleteTask(task.id);
  };

  const priorityColor = AppColors.priority[task.dynamicPriority];
  const days = formatDaysRemaining(task.deadlineDate);

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable
        onPress={handlePress}
        style={[
          styles.card,
          {
            backgroundColor: theme.bgCard,
            borderColor: theme.border,
            borderLeftColor: priorityColor,
          },
        ]}
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <PriorityBadge priority={task.dynamicPriority} size="sm" />
            {overdue && (
              <View style={styles.overdueBadge}>
                <Text style={styles.overdueText}>Overdue</Text>
              </View>
            )}
            {isRecurring && (
              <View style={[styles.recurBadge, { backgroundColor: AppColors.primary + "15" }]}>
                <Ionicons name="repeat" size={10} color={AppColors.primary} />
              </View>
            )}
          </View>
          <Pressable onPress={handleDelete} hitSlop={8} style={styles.deleteBtn}>
            <Ionicons name="trash-outline" size={14} color={theme.textSecondary} />
          </Pressable>
        </View>

        <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>
          {task.title}
        </Text>

        {task.description ? (
          <Text style={[styles.description, { color: theme.textSecondary }]} numberOfLines={2}>
            {task.description}
          </Text>
        ) : null}

        <View style={styles.footer}>
          <View style={styles.deadlineRow}>
            <Ionicons
              name={overdue ? "alert-circle" : "time-outline"}
              size={12}
              color={overdue ? AppColors.priority.critical : theme.textSecondary}
            />
            <Text
              style={[
                styles.deadline,
                {
                  color: overdue ? AppColors.priority.critical : theme.textSecondary,
                  fontFamily: overdue ? "Inter_600SemiBold" : "Inter_400Regular",
                },
              ]}
            >
              {days}
            </Text>
            <Text style={[styles.deadlineSub, { color: theme.textSecondary }]}>
              · {formatDeadline(task.deadlineDate)}
            </Text>
          </View>

          {showMoveButtons && (
            <View style={styles.actions}>
              {prevStatus && (
                <Pressable
                  onPress={() => handleMove(prevStatus)}
                  style={[styles.actionBtn, { borderColor: theme.border }]}
                >
                  <Ionicons name="arrow-back-outline" size={12} color={theme.textSecondary} />
                </Pressable>
              )}
              {nextStatus && (
                <Pressable
                  onPress={() => handleMove(nextStatus)}
                  style={[styles.actionBtn, { backgroundColor: AppColors.primary + "15", borderColor: AppColors.primary + "30" }]}
                >
                  <Ionicons name="arrow-forward-outline" size={12} color={AppColors.primary} />
                </Pressable>
              )}
            </View>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderLeftWidth: 3,
    gap: 8,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  overdueBadge: {
    backgroundColor: AppColors.priority.critical + "25",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: AppColors.priority.critical + "40",
  },
  overdueText: {
    fontSize: 10,
    color: AppColors.priority.critical,
    fontFamily: "Inter_600SemiBold",
  },
  recurBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteBtn: {
    padding: 4,
  },
  title: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    lineHeight: 20,
  },
  description: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 17,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 2,
  },
  deadlineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flex: 1,
  },
  deadline: {
    fontSize: 11,
  },
  deadlineSub: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  actions: {
    flexDirection: "row",
    gap: 6,
  },
  actionBtn: {
    width: 26,
    height: 26,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
