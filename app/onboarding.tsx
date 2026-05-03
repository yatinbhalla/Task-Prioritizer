import React, { useState } from "react";
import {
  View, Text, TextInput, Pressable, StyleSheet,
  useColorScheme, Platform, KeyboardAvoidingView, ScrollView,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { AppColors } from "@/constants/colors";
import { useUser } from "@/contexts/UserContext";

export default function OnboardingScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? AppColors.dark : AppColors.light;
  const insets = useSafeAreaInsets();
  const { saveUser } = useUser();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  const handleStart = async () => {
    if (!name.trim()) return;
    setSaving(true);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await saveUser({ name: name.trim(), email: email.trim() || undefined });
    router.replace("/(tabs)");
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <View style={[styles.container, { backgroundColor: theme.bg }]}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingTop: topInset + 40, paddingBottom: bottomInset + 40 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.iconWrap}>
            <View style={[styles.iconBg, { backgroundColor: AppColors.primary + "20" }]}>
              <Ionicons name="flash" size={40} color={AppColors.primary} />
            </View>
          </View>

          <Text style={[styles.headline, { color: theme.text }]}>Welcome to{"\n"}PriorityPulse</Text>
          <Text style={[styles.sub, { color: theme.textSecondary }]}>
            Your smart task planner. Let's get you started — what should we call you?
          </Text>

          <View style={styles.form}>
            <View style={styles.fieldWrap}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>YOUR NAME</Text>
              <View style={[styles.inputRow, { backgroundColor: theme.bgCard, borderColor: name ? AppColors.primary : theme.border }]}>
                <Ionicons name="person-outline" size={18} color={name ? AppColors.primary : theme.textSecondary} />
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g. Alex"
                  placeholderTextColor={theme.textSecondary}
                  style={[styles.input, { color: theme.text }]}
                  autoFocus
                  returnKeyType="next"
                  autoCapitalize="words"
                />
              </View>
            </View>

            <View style={styles.fieldWrap}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>EMAIL (OPTIONAL)</Text>
              <View style={[styles.inputRow, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
                <Ionicons name="mail-outline" size={18} color={theme.textSecondary} />
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  placeholderTextColor={theme.textSecondary}
                  style={[styles.input, { color: theme.text }]}
                  returnKeyType="done"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  onSubmitEditing={handleStart}
                />
              </View>
            </View>

            <Pressable
              onPress={handleStart}
              disabled={!name.trim() || saving}
              style={({ pressed }) => [
                styles.btn,
                {
                  backgroundColor: name.trim() ? AppColors.primary : theme.border,
                  opacity: pressed ? 0.85 : 1,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                },
              ]}
            >
              <Ionicons name="flash" size={20} color="#fff" />
              <Text style={styles.btnText}>Start Planning</Text>
            </Pressable>

            <Pressable
              onPress={async () => {
                await saveUser({ name: "Guest" });
                router.replace("/(tabs)");
              }}
              style={styles.guestBtn}
            >
              <Text style={[styles.guestText, { color: theme.textSecondary }]}>Continue as Guest</Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    paddingHorizontal: 28,
    alignItems: "center",
    gap: 0,
  },
  iconWrap: { marginBottom: 32 },
  iconBg: {
    width: 84,
    height: 84,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  headline: {
    fontSize: 32,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    letterSpacing: -0.5,
    lineHeight: 40,
    marginBottom: 14,
  },
  sub: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 44,
  },
  form: { width: "100%", gap: 20 },
  fieldWrap: { gap: 8 },
  fieldLabel: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 16,
    paddingVertical: 18,
    marginTop: 8,
    shadowColor: AppColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  btnText: {
    color: "#fff",
    fontSize: 17,
    fontFamily: "Inter_700Bold",
  },
  guestBtn: {
    alignItems: "center",
    paddingVertical: 12,
  },
  guestText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
});
