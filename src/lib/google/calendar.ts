import { google } from "googleapis";

export interface CreateCalendarEventInput {
  accessToken: string;
  title: string;
  description?: string;
  start: Date;
  end: Date;
  timezone: string;
  attendeeEmails: string[];
}

export interface CreateCalendarEventResult {
  googleEventId: string;
  googleCalendarLink: string | null;
}

/**
 * Creates a real event on the caller's primary Google Calendar with the party as attendees.
 * sendUpdates defaults to "all" so Google emails invites; set SKIP_CALENDAR_SEND=true in dev
 * to use "none" instead and avoid notifying real people while testing the flow.
 */
export async function createCalendarEvent(
  input: CreateCalendarEventInput,
): Promise<CreateCalendarEventResult> {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: input.accessToken });

  const calendar = google.calendar({ version: "v3", auth });

  const sendUpdates = process.env.SKIP_CALENDAR_SEND === "true" ? "none" : "all";

  const response = await calendar.events.insert({
    calendarId: "primary",
    sendUpdates,
    requestBody: {
      summary: input.title,
      description: input.description,
      start: { dateTime: input.start.toISOString(), timeZone: input.timezone },
      end: { dateTime: input.end.toISOString(), timeZone: input.timezone },
      attendees: input.attendeeEmails.map((email) => ({ email })),
    },
  });

  if (!response.data.id) {
    throw new Error("Google Calendar did not return an event id");
  }

  return {
    googleEventId: response.data.id,
    googleCalendarLink: response.data.htmlLink ?? null,
  };
}

export interface FreeBusyQueryInput {
  accessToken: string;
  timeMin: Date;
  timeMax: Date;
}

/** Returns the caller's busy intervals in the given range. Used by the (post-v1) freebusy prefill. */
export async function queryFreeBusy(
  input: FreeBusyQueryInput,
): Promise<{ start: Date; end: Date }[]> {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: input.accessToken });

  const calendar = google.calendar({ version: "v3", auth });

  const response = await calendar.freebusy.query({
    requestBody: {
      timeMin: input.timeMin.toISOString(),
      timeMax: input.timeMax.toISOString(),
      items: [{ id: "primary" }],
    },
  });

  const busy = response.data.calendars?.primary?.busy ?? [];
  return busy
    .filter((b) => b.start && b.end)
    .map((b) => ({ start: new Date(b.start!), end: new Date(b.end!) }));
}
