import type { Href } from "expo-router";

/**
 * Mirrors web FloatingChatbot `handleCommand` navigation shortcuts (EN + AR).
 * `isAdminArea` selects admin vs student route targets.
 */
export function tryChatCommand(
  message: string,
  isAdminArea: boolean,
): { reply: string; href: Href } | null {
  const lower = message.toLowerCase();

  if (message.includes("البروفايل") || message === "بروفايلي") {
    return {
      reply: "👤 جاري فتح البروفايل...",
      href: isAdminArea ? "/(app)/(admin)/profile-settings" : "/(app)/(user)/profile-settings",
    };
  }
  if (
    message.includes("تسجيل مواد") ||
    message.includes("تسجيل") ||
    message.includes("مواد")
  ) {
    return {
      reply: "📚 جاري فتح تسجيل المواد...",
      href: isAdminArea ? "/(app)/(admin)/enrollments" : "/(app)/(user)/enroll-courses",
    };
  }
  if (message.includes("تقييم") || message.includes("قيم")) {
    return {
      reply: "⭐ جاري فتح صفحة التقييم...",
      href: isAdminArea ? "/(app)/(admin)/feedback" : "/(app)/(user)/rate-courses",
    };
  }
  if (message.includes("شكواي") || message.includes("شكاوى")) {
    return {
      reply: "📋 جاري فتح صفحة شكواي...",
      href: isAdminArea ? "/(app)/(admin)/complaints" : "/(app)/(user)/my-complaints",
    };
  }
  if (message.includes("شكوى جديدة") || message.includes("تقديم شكوى")) {
    return {
      reply: "✏️ جاري فتح نموذج شكوى جديدة...",
      href: isAdminArea ? "/(app)/(admin)/complaints" : "/(app)/(user)/submit-complaint",
    };
  }

  if (lower.includes("profile")) {
    return {
      reply: "👤 Opening profile...",
      href: isAdminArea ? "/(app)/(admin)/profile-settings" : "/(app)/(user)/profile-settings",
    };
  }
  if (lower.includes("enroll") || lower.includes("registration")) {
    return {
      reply: "📚 Opening registration...",
      href: isAdminArea ? "/(app)/(admin)/enrollments" : "/(app)/(user)/enroll-courses",
    };
  }
  if (lower.includes("rate") || lower.includes("rating")) {
    return {
      reply: "⭐ Opening rating page...",
      href: isAdminArea ? "/(app)/(admin)/feedback" : "/(app)/(user)/rate-courses",
    };
  }
  if (lower.includes("my tickets") || lower.includes("complaints")) {
    return {
      reply: "📋 Opening my tickets...",
      href: isAdminArea ? "/(app)/(admin)/complaints" : "/(app)/(user)/my-complaints",
    };
  }
  if (lower.includes("new ticket") || lower.includes("new complaint")) {
    return {
      reply: "✏️ Opening new complaint...",
      href: isAdminArea ? "/(app)/(admin)/complaints" : "/(app)/(user)/submit-complaint",
    };
  }

  return null;
}
