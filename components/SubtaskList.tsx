import React, { useState } from "react";
import {
  View, Text, Pressable, TextInput, StyleSheet, useColorScheme,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { AppColors } from "@/constants/colors";
import { Subtask } from "@/utils/priority";

interface Props {
  taskId: string;
  subtasks: Subtask[];
  onAdd: (taskId: string, title: string) => void;
  onToggle: (taskId: string, subtaskId: string) => void;
  onRemove: (taskId: string, subtaskId: string) => void;
}

export function SubtaskList({ taskId, subtasks, onAdd, onToggle, onRemove }: Props) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? AppColors.dark : AppColors.light;
  const [newTitle, setNewTitle] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const completed = subtasks.filter((s) => s.completed).length;

  const handleAdd = async () => {
    if (!newTitle.trim()) { setIsAdding(false); return; }
    await Haptics.selectionAsync();
    onAdd(taskId, newTitle.trim());
    setNewTitle("");
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={[styles.label, { color: theme.textSecondary }]}>SUBTASKS</Text>
        {subtasks.length > 0 && (
          <Text style={[styles.progress, { color: theme.textSecondary }]}>
            {completed}/{subtasks.length}
          </Text>
        )}
      </View>

      {subtasks.length > 0 && (
        <View style={[styles.list, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
          {subtasks.map((s, idx) => (
            <View key={s.id}>
              {idx > 0 && <View style={[styles.divider, { backgroundColor: theme.border }]} />}
              <View style={styles.row}>
                <Pressable
                  onPress={async () => {
                    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onToggle(taskId, s.id);
                  }}
                  style={styles.checkbox}
                >
                  <Ionicons
                    name={s.completed ? "checkmark-circle" : "ellipse-outline"}
                    size={20}
                    color={s.completed ? AppColors.status.done : theme.textSecondary}
                  />
                </Pressable>
                <Text
                  style={[
                    styles.subtaskText,
                    {
                      color: s.completed ? theme.textSecondary : theme.text,
                      textDecorationLine: s.completed ? "line-through" : "none",
                    },
                  ]}
                  numberOfLines={2}
                >
                  {s.title}
                </Text>
                <Pressable
                  onPress={async () => {
                    await Haptics.selectionAsync();
                    onRemove(taskId, s.id);
                  }}
                  hitSlop={8}
                >
                  <Ionicons name="close" size={16} color={theme.textSecondary} />
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      )}

      {isAdding ? (
        <View style={[styles.addRow, { backgroundColor: theme.bgCard, borderColor: AppColors.primary }]}>
          <TextInput
            value={newTitle}
            onChangeText={setNewTitle}
            placeholder="Enter step..."
            placeholderTextColor={theme.textSecondary}
            style={[styles.addInput, { color: theme.text }]}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleAdd}
            onBlur={() => { if (!newTitle.trim()) setIsAdding(false); }}
          />
          <Pressable onPress={handleAdd}>
            <Ionicons name="checkmark-circle" size={22} color={AppColors.primary} />
          </Pressable>
          <Pressable onPress={() => { setIsAdding(false); setNewTitle(""); }}>
            <Ionicons name="close-circle" size={22} color={theme.textSecondary} />
          </Pressable>
        </View>
      ) : (
        <Pressable
          onPress={() => setIsAdding(true)}
          style={[styles.addBtn, { borderColor: theme.border }]}
        >
          <Ionicons name="add" size={16} color={AppColors.primary} />
          <Text style={[styles.addBtnText, { color: AppColors.primary }]}>Add step</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 10 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
  },
  progress: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  list: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 11,
    gap: 10,
  },
  divider: { height: 1, marginHorizontal: 12 },
  checkbox: { width: 24, alignItems: "center" },
  subtaskText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
  },
  addRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  addInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "dashed",
  },
  addBtnText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
});
