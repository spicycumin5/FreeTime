import { z } from "zod";

export const createPartySchema = z.object({
  name: z.string().trim().min(1, "Party name is required").max(100),
});

export const createActivitySchema = z
  .object({
    title: z.string().trim().min(1, "Title is required").max(150),
    description: z.string().trim().max(2000).optional().or(z.literal("")),
    type: z.enum(["MOVIE_NIGHT", "GENERIC"]),
    rangeStart: z.string().min(1, "Start date is required"), // yyyy-MM-dd
    rangeEnd: z.string().min(1, "End date is required"), // yyyy-MM-dd
    dailyWindowStartMinute: z.coerce.number().int().min(0).max(1440),
    dailyWindowEndMinute: z.coerce.number().int().min(0).max(1440),
    slotGranularityMinutes: z.coerce.number().int().min(15).max(240).default(30),
    durationMinutes: z.coerce.number().int().min(15).max(24 * 60).default(120),
    timezone: z.string().min(1),
    repeat: z.enum(["NONE", "WEEKLY", "MONTHLY"]).default("NONE"),
  })
  .refine((data) => data.rangeStart <= data.rangeEnd, {
    message: "End date must be on or after the start date",
    path: ["rangeEnd"],
  })
  .refine((data) => data.dailyWindowStartMinute < data.dailyWindowEndMinute, {
    message: "Daily window end must be after start",
    path: ["dailyWindowEndMinute"],
  });

export const submitAvailabilitySchema = z.object({
  activityId: z.string().min(1),
  slots: z
    .array(
      z.object({
        startsAt: z.string().min(1), // ISO UTC
        endsAt: z.string().min(1),
      }),
    )
    .max(2000),
});

export const scheduleActivitySchema = z.object({
  activityId: z.string().min(1),
  chosenStart: z.string().min(1), // ISO UTC
  chosenEnd: z.string().min(1),
});

export const addMovieSuggestionSchema = z.object({
  activityId: z.string().min(1),
  title: z.string().trim().min(1, "Title is required").max(200),
  tmdbId: z.coerce.number().int().optional(),
  posterUrl: z.string().url().optional().or(z.literal("")),
});

export const voteMovieSchema = z.object({
  movieSuggestionId: z.string().min(1),
  value: z.enum(["UP", "DOWN"]),
});
