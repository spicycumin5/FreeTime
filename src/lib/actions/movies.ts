"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireActivityAccess, requireSession } from "@/lib/actions/guards";
import { addMovieSuggestionSchema, voteMovieSchema } from "@/lib/validation/schemas";
import { searchMovies, type TmdbMovieResult } from "@/lib/tmdb/search";

export async function searchMoviesAction(query: string): Promise<TmdbMovieResult[]> {
  await requireSession();
  return searchMovies(query);
}

export async function addMovieSuggestion(input: {
  activityId: string;
  title: string;
  tmdbId?: number;
  posterUrl?: string;
}) {
  const parsed = addMovieSuggestionSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid movie suggestion");
  }
  const { session, activity } = await requireActivityAccess(parsed.data.activityId);

  await prisma.movieSuggestion.create({
    data: {
      activityId: activity.id,
      suggestedById: session.user.id,
      title: parsed.data.title,
      tmdbId: parsed.data.tmdbId,
      posterUrl: parsed.data.posterUrl || null,
    },
  });

  revalidatePath(`/activities/${activity.id}/movies`);
}

export async function voteMovie(input: { movieSuggestionId: string; value: "UP" | "DOWN" }) {
  const parsed = voteMovieSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid vote");
  }

  const suggestion = await prisma.movieSuggestion.findUnique({
    where: { id: parsed.data.movieSuggestionId },
  });
  if (!suggestion) throw new Error("Movie suggestion not found.");

  const { session, activity } = await requireActivityAccess(suggestion.activityId);

  const existingVote = await prisma.movieVote.findUnique({
    where: {
      movieSuggestionId_userId: {
        movieSuggestionId: suggestion.id,
        userId: session.user.id,
      },
    },
  });

  if (existingVote?.value === parsed.data.value) {
    // Clicking the same vote again removes it (toggle off).
    await prisma.movieVote.delete({ where: { id: existingVote.id } });
  } else {
    await prisma.movieVote.upsert({
      where: {
        movieSuggestionId_userId: {
          movieSuggestionId: suggestion.id,
          userId: session.user.id,
        },
      },
      update: { value: parsed.data.value },
      create: {
        movieSuggestionId: suggestion.id,
        userId: session.user.id,
        value: parsed.data.value,
      },
    });
  }

  revalidatePath(`/activities/${activity.id}/movies`);
}
