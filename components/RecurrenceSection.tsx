import React from "react";
import { View, Text, Pressable, TextInput, ScrollView, StyleSheet, useColorScheme } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { AppColors } from "@/constants/colors";
import { RecurrenceType, RECURRENCE_LABELS, DAY_NAMES } from "@/utils/priority";

interface Props {
  recurrenceType: RecurrenceType;
  recurrenceInterval: number;
  recurrenceDayOfWeek: number;
  recurrenceDayOfMonth: number;
  onChange: (updates: {
    recurrenceType?: RecurrenceType;
    recurrenceInterval?: number;
    recurrenceDayOfWeek?: number;
    recurrenceDayOfMonth?: number;
  }) => void;
}

const RECURRENCE_TYPES: RecurrenceType[] = ["none", "daily", "weekly", "monthly", "custom"];

export function RecurrenceSection({
  recurrenceType,
  recurrenceInterval,
  recurrenceDayOfWeek,
  recurrenceDayOfMonth,
  onChange,
}: Props) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? AppColors.dark : AppColors.light;

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>REPEAT</Text>

      <View style={styles.typeRow}>
        {RECURRENCE_TYPES.map((type) => {
          const isActive = recurrenceType === type;
          return (
            <Pressable
              key={type}
              onPress={async () => {
                await Haptics.selectionAsync();
                onChange({ recurrenceType: type });
              }}
              style={[
                styles.typeChip,
                {
                  backgroundColor: isActive ? AppColors.primary + "20" : theme.bgCard,
                  borderColor: isActive ? AppColors.primary : theme.border,
                },
              ]}
            >
              {isActive && type !== "none" && (
                <Ionicons name="repeat" size={11} color={AppColors.primary} />
              )}
              <Text
                style={[
                  styles.typeChipText,
                  {
                    color: isActive ? AppColors.primary : theme.textSecondary,
                    fontFamily: isActive ? "Inter_600SemiBold" : "Inter_400Regular",
                  },
                ]}
              >
                {RECURRENCE_LABELS[type]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {recurrenceType === "weekly" && (
        <View style={styles.subSection}>
          <Text style={[styles.subLabel, { color: theme.textSecondary }]}>Repeat on</Text>
          <View style={styles.dayRow}>
            {DAY_NAMES.map((day, idx) => {
              const isActive = recurrenceDayOfWeek === idx;
              return (
                <Pressable
                  key={day}
                  onPress={async () => {
                    await Haptics.selectionAsync();
                    onChange({ recurrenceDayOfWeek: idx });
                  }}
                  style={[
                    styles.dayChip,
                    {
                      backgroundColor: isActive ? AppColors.primary : theme.bgCard,
                      borderColor: isActive ? AppColors.primary : theme.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.dayChipText,
                      { color: isActive ? "#fff" : theme.textSecondary },
                    ]}
                  >
                    {day}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      {recurrenceType === "monthly" && (
        <View style={styles.subSection}>
          <Text style={[styles.subLabel, { color: theme.textSecondary }]}>Day of month</Text>
          <View style={[styles.inputRow, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
            <Ionicons name="calendar-outline" size={16} color={theme.textSecondary} />
            <TextInput
              value={String(recurrenceDayOfMonth)}
              onChangeText={(t) => {
                const n = parseInt(t, 10);
                if (!isNaN(n) && n >= 1 && n <= 31) {
                  onChange({ recurrenceDayOfMonth: n });
                } else if (t === "") {
                  onChange({ recurrenceDayOfMonth: 1 });
                }
              }}
              keyboardType="number-pad"
              style={[styles.numberInput, { color: theme.text }]}
              maxLength={2}
            />
            <Text style={[styles.inputSuffix, { color: theme.textSecondary }]}>of each month</Text>
          </View>
        </View>
      )}

      {recurrenceType === "custom" && (
        <View style={styles.subSection}>
          <Text style={[styles.subLabel, { color: theme.textSecondary }]}>Repeat interval</Text>
          <View style={[styles.inputRow, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
            <Text style={[styles.inputPrefix, { color: theme.textSecondary }]}>Every</Text>
            <TextInput
              value={String(recurrenceInterval)}
              onChangeText={(t) => {
                const n = parseInt(t, 10);
                if (!isNaN(n) && n >= 1) {
                  onChange({ recurrenceInterval: n });
                } else if (t === "") {
                  onChange({ recurrenceInterval: 1 });
                }
              }}
              keyboardType="number-pad"
              style={[styles.numberInput, { color: theme.text }]}
              maxLength={3}
            />
            <Text style={[styles.inputSuffix, { color: theme.textSecondary }]}>
              {recurrenceInterval === 1 ? "day" : "days"}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
  },
  typeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  typeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  typeChipText: {
    fontSize: 12,
  },
  subSection: {
    gap: 8,
    paddingTop: 4,
  },
  subLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  dayRow: {
    flexDirection: "row",
    gap: 6,
  },
  dayChip: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  dayChipText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  inputPrefix: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  numberInput: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    minWidth: 40,
    textAlign: "center",
  },
  inputSuffix: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    flex: 1,
  },
});
