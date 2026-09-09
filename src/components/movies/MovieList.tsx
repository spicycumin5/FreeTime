"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { voteMovie } from "@/lib/actions/movies";
import { cn } from "cn";

export interface MovieListItem {
  id: string;
  title: string;
  posterUrl: string | null;
  suggestedByName: string;
  score: number;
  upVotes: number;
  downVotes: number;
  myVote: "UP" | "DOWN" | null;
}

export function MovieList({ items }: { items: MovieListItem[] }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function vote(movieSuggestionId: string, value: "UP" | "DOWN") {
    startTransition(async () => {
      try {
        await voteMovie({ movieSuggestionId, value });
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to vote");
      }
    });
  }

  if (items.length === 0) {
    return <p className="text-muted-foreground">No movies suggested yet.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {items.map((item) => (
        <Card key={item.id}>
          <CardContent className="flex items-center gap-3 py-3">
            {item.posterUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.posterUrl}
                alt={`${item.title} poster`}
                width={44}
                height={64}
                className="h-16 w-11 shrink-0 rounded object-cover"
              />
            )}
            <div className="min-w-0 flex-1">
              <p className="font-medium break-words">{item.title}</p>
              <p className="text-xs text-muted-foreground">Suggested by {item.suggestedByName}</p>
            </div>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                size="icon"
                variant={item.myVote === "UP" ? "default" : "outline"}
                disabled={isPending}
                onClick={() => vote(item.id, "UP")}
                aria-label="Upvote"
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
              <span className={cn("w-6 text-center text-sm font-medium", item.score < 0 && "text-destructive")}>
                {item.score}
              </span>
              <Button
                type="button"
                size="icon"
                variant={item.myVote === "DOWN" ? "default" : "outline"}
                disabled={isPending}
                onClick={() => vote(item.id, "DOWN")}
                aria-label="Downvote"
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
