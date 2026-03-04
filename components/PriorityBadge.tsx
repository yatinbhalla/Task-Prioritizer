import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { AppColors } from "@/constants/colors";
import { PriorityLevel, PRIORITY_LABELS } from "@/utils/priority";

interface Props {
  priority: PriorityLevel;
  size?: "sm" | "md";
}

export function PriorityBadge({ priority, size = "md" }: Props) {
  const color = AppColors.priority[priority];
  const bg = AppColors.priorityBg[priority];
  const isSmall = size === "sm";

  return (
    <View style={[styles.badge, { backgroundColor: bg, borderColor: color + "40" }, isSmall && styles.badgeSm]}>
      <View style={[styles.dot, { backgroundColor: color }, isSmall && styles.dotSm]} />
      <Text style={[styles.label, { color }, isSmall && styles.labelSm]}>
        {PRIORITY_LABELS[priority]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    gap: 4,
    alignSelf: "flex-start",
  },
  badgeSm: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotSm: {
    width: 5,
    height: 5,
  },
  label: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.3,
  },
  labelSm: {
    fontSize: 10,
  },
});
