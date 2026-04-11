import {
  createInAppNotification,
  type InAppNotificationType,
} from "@/services/firebase";

function clip(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

/** Call after an admin posts a reply on a complaint ticket. */
export async function notifyComplaintReply(
  targetUserId: string,
  ticketId: string,
  complaintTitle: string,
): Promise<void> {
  await createInAppNotification({
    userId: targetUserId,
    type: "complaint_reply",
    title: "Reply to your complaint",
    body: `An administrator replied to “${clip(complaintTitle, 80)}”.`,
    meta: { ticketId },
  });
}

/** Call when an admin changes a student’s enrollment. */
export async function notifyEnrollmentEdited(targetUserId: string): Promise<void> {
  await createInAppNotification({
    userId: targetUserId,
    type: "enrollment_edited",
    title: "Enrollment updated",
    body: "Your course enrollment was updated by an administrator.",
  });
}

export async function notifyAccountBanned(targetUserId: string): Promise<void> {
  await createInAppNotification({
    userId: targetUserId,
    type: "account_banned",
    title: "Account suspended",
    body: "Your account has been suspended. Contact the administration if you believe this is a mistake.",
  });
}

export async function notifyAccountUnbanned(targetUserId: string): Promise<void> {
  await createInAppNotification({
    userId: targetUserId,
    type: "account_unbanned",
    title: "Account reinstated",
    body: "Your account suspension has been lifted. You can use the app again.",
  });
}

export type { InAppNotificationType };
