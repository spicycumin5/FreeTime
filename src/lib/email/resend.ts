import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export interface SendActivityReminderInput {
  toEmails: string[];
  partyName: string;
  activityTitle: string;
  activityUrl: string;
}

export interface SendReminderResult {
  sent: string[];
  failed: string[];
}

/**
 * Emails each recipient individually (not Resend's batch endpoint) so one bad
 * address can't fail the rest, and failures are attributable to a specific email.
 */
export async function sendActivityReminder(
  input: SendActivityReminderInput,
): Promise<SendReminderResult> {
  if (!resend || !process.env.FROM_EMAIL) {
    console.warn(
      "RESEND_API_KEY/FROM_EMAIL not configured — skipping reminder emails.",
      input.toEmails,
    );
    return { sent: [], failed: input.toEmails };
  }

  const subject = `Time to fill in your availability: ${input.activityTitle}`;
  const html = `
    <p>It's time to schedule <strong>${escapeHtml(input.activityTitle)}</strong> again for ${escapeHtml(input.partyName)}.</p>
    <p><a href="${input.activityUrl}">Fill in your availability</a></p>
  `.trim();

  const results = await Promise.allSettled(
    input.toEmails.map((to) =>
      resend.emails.send({ from: process.env.FROM_EMAIL!, to, subject, html }),
    ),
  );

  const sent: string[] = [];
  const failed: string[] = [];
  results.forEach((result, i) => {
    const email = input.toEmails[i];
    if (result.status === "fulfilled" && !result.value.error) {
      sent.push(email);
    } else {
      failed.push(email);
      console.error(
        "Failed to send reminder email to",
        email,
        result.status === "fulfilled" ? result.value.error : result.reason,
      );
    }
  });

  return { sent, failed };
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
