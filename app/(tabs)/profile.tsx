import React, { useState } from "react";
import {
  ScrollView, StyleSheet, Text, View, Pressable, TextInput,
  useColorScheme, Platform, Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { AppColors } from "@/constants/colors";
import { useUser } from "@/contexts/UserContext";
import { useTasks } from "@/contexts/TaskContext";
import { router } from "expo-router";

function InfoRow({ icon, label, value, color }: { icon: any; label: string; value: string; color?: string }) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? AppColors.dark : AppColors.light;
  return (
    <View style={[styles.infoRow, { borderBottomColor: theme.border }]}>
      <View style={styles.infoLeft}>
        <Ionicons name={icon} size={16} color={theme.textSecondary} />
        <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>{label}</Text>
      </View>
      <Text style={[styles.infoValue, { color: color ?? theme.text }]}>{value}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? AppColors.dark : AppColors.light;
  const insets = useSafeAreaInsets();
  const { user, saveUser, clearUser } = useUser();
  const { tasks, stats } = useTasks();

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : 0;

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");

  const initials = (user?.name ?? "?")
    .split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

  const doneTasks = tasks.filter((t) => t.status === "done").length;
  const recurringCount = tasks.filter((t) => t.recurrenceType !== "none").length;

  const handleSave = async () => {
    if (!name.trim()) return;
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await saveUser({ name: name.trim(), email: email.trim() || undefined });
    setIsEditing(false);
  };

  const handleClearData = () => {
    Alert.alert(
      "Clear All Data",
      "This will delete your profile and all tasks. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear Everything",
          style: "destructive",
          onPress: async () => {
            await clearUser();
            router.replace("/onboarding");
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: topInset + 16, paddingBottom: bottomInset + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.pageTitle, { color: theme.text }]}>Profile</Text>

        <View style={styles.avatarSection}>
          <View style={[styles.avatar, { backgroundColor: AppColors.primary + "25" }]}>
            <Text style={styles.initials}>{initials}</Text>
          </View>
          {!isEditing && (
            <>
              <Text style={[styles.userName, { color: theme.text }]}>{user?.name ?? "Guest"}</Text>
              {user?.email ? (
                <Text style={[styles.userEmail, { color: theme.textSecondary }]}>{user.email}</Text>
              ) : null}
              <Pressable
                onPress={() => setIsEditing(true)}
                style={[styles.editBtn, { backgroundColor: theme.bgCard, borderColor: theme.border }]}
              >
                <Ionicons name="pencil" size={14} color={AppColors.primary} />
                <Text style={[styles.editBtnText, { color: AppColors.primary }]}>Edit Profile</Text>
              </Pressable>
            </>
          )}
          {isEditing && (
            <View style={styles.editForm}>
              <View style={[styles.inputRow, { backgroundColor: theme.bgCard, borderColor: AppColors.primary }]}>
                <Ionicons name="person-outline" size={16} color={theme.textSecondary} />
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Your name"
                  placeholderTextColor={theme.textSecondary}
                  style={[styles.input, { color: theme.text }]}
                  autoFocus
                />
              </View>
              <View style={[styles.inputRow, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
                <Ionicons name="mail-outline" size={16} color={theme.textSecondary} />
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Email (optional)"
                  placeholderTextColor={theme.textSecondary}
                  style={[styles.input, { color: theme.text }]}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
              <View style={styles.editActions}>
                <Pressable onPress={handleSave} style={styles.saveBtn}>
                  <Text style={styles.saveBtnText}>Save</Text>
                </Pressable>
                <Pressable onPress={() => setIsEditing(false)} style={[styles.cancelBtn, { borderColor: theme.border }]}>
                  <Text style={[styles.cancelBtnText, { color: theme.textSecondary }]}>Cancel</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>

        <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.textSecondary }]}>YOUR STATS</Text>
          <InfoRow icon="layers-outline" label="Total Tasks" value={String(stats.total)} />
          <InfoRow icon="checkmark-circle-outline" label="Completed" value={String(doneTasks)} color="#22C55E" />
          <InfoRow icon="alert-circle-outline" label="Overdue" value={String(stats.overdue)} color={stats.overdue > 0 ? "#EF4444" : undefined} />
          <InfoRow icon="today-outline" label="Due Today" value={String(stats.dueToday)} color={stats.dueToday > 0 ? "#F97316" : undefined} />
          <InfoRow icon="repeat-outline" label="Recurring Tasks" value={String(recurringCount)} />
        </View>

        {user?.createdAt && (
          <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
            <Text style={[styles.cardTitle, { color: theme.textSecondary }]}>ACCOUNT</Text>
            <InfoRow
              icon="calendar-outline"
              label="Member since"
              value={new Date(user.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            />
          </View>
        )}

        <Pressable onPress={handleClearData} style={[styles.dangerBtn, { borderColor: AppColors.priority.critical + "50" }]}>
          <Ionicons name="trash-outline" size={16} color={AppColors.priority.critical} />
          <Text style={[styles.dangerText, { color: AppColors.priority.critical }]}>Clear All Data</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 20, gap: 20 },
  pageTitle: { fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  avatarSection: { alignItems: "center", gap: 10, paddingVertical: 16 },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: "center", justifyContent: "center",
  },
  initials: { fontSize: 28, fontFamily: "Inter_700Bold", color: AppColors.primary },
  userName: { fontSize: 22, fontFamily: "Inter_700Bold" },
  userEmail: { fontSize: 14, fontFamily: "Inter_400Regular" },
  editBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1,
  },
  editBtnText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  editForm: { width: "100%", gap: 10 },
  inputRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
  },
  input: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  editActions: { flexDirection: "row", gap: 10 },
  saveBtn: {
    flex: 1, backgroundColor: AppColors.primary,
    borderRadius: 12, paddingVertical: 12,
    alignItems: "center",
  },
  saveBtnText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 14 },
  cancelBtn: {
    paddingHorizontal: 20, paddingVertical: 12,
    borderRadius: 12, borderWidth: 1, alignItems: "center",
  },
  cancelBtnText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  card: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  cardTitle: {
    fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 1,
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8,
  },
  infoRow: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", paddingHorizontal: 16, paddingVertical: 13,
    borderBottomWidth: 1,
  },
  infoLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  infoLabel: { fontSize: 14, fontFamily: "Inter_400Regular" },
  infoValue: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  dangerBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 14, borderRadius: 12, borderWidth: 1,
  },
  dangerText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
