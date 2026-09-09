const TMDB_API_BASE = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w200";

export interface TmdbMovieResult {
  tmdbId: number;
  title: string;
  year: string | null;
  posterUrl: string | null;
}

export async function searchMovies(query: string): Promise<TmdbMovieResult[]> {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    throw new Error("TMDB_API_KEY is not configured");
  }
  if (!query.trim()) return [];

  const url = new URL(`${TMDB_API_BASE}/search/movie`);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("query", query);
  url.searchParams.set("include_adult", "false");

  const response = await fetch(url, { next: { revalidate: 3600 } });
  if (!response.ok) {
    throw new Error(`TMDB search failed with status ${response.status}`);
  }

  const data = (await response.json()) as {
    results: {
      id: number;
      title: string;
      release_date?: string;
      poster_path: string | null;
    }[];
  };

  return data.results.slice(0, 10).map((movie) => ({
    tmdbId: movie.id,
    title: movie.title,
    year: movie.release_date ? movie.release_date.slice(0, 4) : null,
    posterUrl: movie.poster_path ? `${TMDB_IMAGE_BASE}${movie.poster_path}` : null,
  }));
}
