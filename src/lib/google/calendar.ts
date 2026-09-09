export interface BuildGoogleCalendarLinkInput {
  title: string;
  description?: string;
  start: Date;
  end: Date;
  attendeeEmails: string[];
}

function toGoogleCalendarUtc(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

/**
 * Builds a Google Calendar "add event" link pre-filled with the activity's details.
 * Each party member clicks it to add the event to their own calendar — this avoids
 * needing the sensitive calendar.events OAuth scope (and the Google verification
 * review that comes with it) just to create one event on the organizer's behalf.
 */
export function buildGoogleCalendarLink(input: BuildGoogleCalendarLinkInput): string {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: input.title,
    dates: `${toGoogleCalendarUtc(input.start)}/${toGoogleCalendarUtc(input.end)}`,
  });
  if (input.description) params.set("details", input.description);
  if (input.attendeeEmails.length > 0) params.set("add", input.attendeeEmails.join(","));

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
