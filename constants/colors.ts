const primary = "#FF6B35";
const navy = "#0A0F1E";
const navyLight = "#131929";
const navyCard = "#1A2235";

export const AppColors = {
  primary,
  navy,
  navyLight,
  navyCard,

  priority: {
    low: "#6B7280",
    medium: "#3B82F6",
    high: "#F97316",
    top: "#EF4444",
    critical: "#7F1D1D",
  },

  priorityBg: {
    low: "rgba(107,114,128,0.15)",
    medium: "rgba(59,130,246,0.15)",
    high: "rgba(249,115,22,0.15)",
    top: "rgba(239,68,68,0.15)",
    critical: "rgba(127,29,29,0.25)",
  },

  status: {
    todo: "#6B7280",
    inprogress: "#3B82F6",
    done: "#22C55E",
  },

  light: {
    bg: "#F8F9FF",
    bgCard: "#FFFFFF",
    bgSecondary: "#F0F2F8",
    text: "#0A0F1E",
    textSecondary: "#6B7280",
    border: "#E5E7EB",
    tint: primary,
    tabIconDefault: "#9CA3AF",
    tabIconSelected: primary,
  },

  dark: {
    bg: navy,
    bgCard: navyCard,
    bgSecondary: navyLight,
    text: "#FFFFFF",
    textSecondary: "#9CA3AF",
    border: "rgba(255,255,255,0.08)",
    tint: primary,
    tabIconDefault: "#6B7280",
    tabIconSelected: primary,
  },
};

export default {
  light: AppColors.light,
  dark: AppColors.dark,
};
