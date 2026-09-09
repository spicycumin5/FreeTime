import { prisma } from "@/lib/db";
import { requireActivityAccess } from "@/lib/actions/guards";
import { ActivityNav } from "@/components/activities/activity-nav";
import { MovieSearch } from "@/components/movies/MovieSearch";
import { MovieList } from "@/components/movies/MovieList";

export default async function MoviesPage({
  params,
}: {
  params: Promise<{ activityId: string }>;
}) {
  const { activityId } = await params;
  const { session, activity } = await requireActivityAccess(activityId);

  const suggestions = await prisma.movieSuggestion.findMany({
    where: { activityId: activity.id },
    include: { votes: true, suggestedBy: true },
    orderBy: { createdAt: "asc" },
  });

  const items = suggestions
    .map((s) => {
      const up = s.votes.filter((v) => v.value === "UP").length;
      const down = s.votes.filter((v) => v.value === "DOWN").length;
      const myVote = s.votes.find((v) => v.userId === session.user.id)?.value ?? null;
      return {
        id: s.id,
        title: s.title,
        posterUrl: s.posterUrl,
        suggestedByName: s.suggestedBy.name ?? s.suggestedBy.email ?? "Someone",
        score: up - down,
        upVotes: up,
        downVotes: down,
        myVote,
      };
    })
    .sort((a, b) => b.score - a.score);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{activity.title}</h1>
      </div>

      <ActivityNav activityId={activity.id} showMovies />

      <MovieSearch activityId={activity.id} />
      <MovieList items={items} />
    </div>
  );
}
