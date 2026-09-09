"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { searchMoviesAction, addMovieSuggestion } from "@/lib/actions/movies";
import type { TmdbMovieResult } from "@/lib/tmdb/search";

export function MovieSearch({ activityId }: { activityId: string }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TmdbMovieResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState<number | null>(null);
  const router = useRouter();

  useEffect(() => {
    const trimmed = query.trim();
    const timeout = setTimeout(async () => {
      if (!trimmed) {
        setResults([]);
        return;
      }
      setSearching(true);
      try {
        const movies = await searchMoviesAction(trimmed);
        setResults(movies);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Movie search failed");
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => clearTimeout(timeout);
  }, [query]);

  async function handleAdd(movie: TmdbMovieResult) {
    setAdding(movie.tmdbId);
    try {
      await addMovieSuggestion({
        activityId,
        title: movie.year ? `${movie.title} (${movie.year})` : movie.title,
        tmdbId: movie.tmdbId,
        posterUrl: movie.posterUrl ?? undefined,
      });
      setQuery("");
      setResults([]);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add movie");
    } finally {
      setAdding(null);
    }
  }

  async function handleManualAdd() {
    const trimmed = query.trim();
    if (!trimmed) return;
    setAdding(-1);
    try {
      await addMovieSuggestion({ activityId, title: trimmed });
      setQuery("");
      setResults([]);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add movie");
    } finally {
      setAdding(null);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <Input
          className="min-w-0 flex-1"
          placeholder="Search for a movie to suggest..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Button
          type="button"
          variant="outline"
          className="shrink-0"
          disabled={!query.trim() || adding === -1}
          onClick={handleManualAdd}
        >
          Add as typed
        </Button>
      </div>
      {searching && <p className="text-xs text-muted-foreground">Searching...</p>}
      {results.length > 0 && (
        <div className="flex flex-col divide-y rounded-md border">
          {results.map((movie) => (
            <div key={movie.tmdbId} className="flex items-center justify-between gap-3 p-2">
              <div className="flex min-w-0 items-center gap-3">
                {movie.posterUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={movie.posterUrl} alt="" className="h-12 w-8 shrink-0 rounded object-cover" />
                )}
                <span className="truncate text-sm">
                  {movie.title} {movie.year && <span className="text-muted-foreground">({movie.year})</span>}
                </span>
              </div>
              <Button
                type="button"
                className="shrink-0"
                size="sm"
                variant="outline"
                disabled={adding === movie.tmdbId}
                onClick={() => handleAdd(movie)}
              >
                Add
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
