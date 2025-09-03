# Movie Query Fix

The issue is that your movie fetching query is missing `series_id` and `episode_number` fields.

## Current Query (Missing Fields)
```typescript
const { data, error } = await withRetry(async () => {
  const result = await supabase
    .from('movies')
    .select(`
      id,
      title,
      genre,
      view_count,
      poster_url,
      landscape_poster_url,
      badge,
      synopsis,
      episodes,
      duration_seconds,
      created_at
    `)
    .range(startRange, endRange)
    .order('created_at', { ascending: false });
```

## Fixed Query (With Required Fields)
```typescript
const { data, error } = await withRetry(async () => {
  const result = await supabase
    .from('movies')
    .select(`
      id,
      title,
      genre,
      view_count,
      poster_url,
      landscape_poster_url,
      badge,
      synopsis,
      episodes,
      duration_seconds,
      created_at,
      series_id,
      episode_number
    `)
    .range(startRange, endRange)
    .order('created_at', { ascending: false });
```

The added fields (`series_id` and `episode_number`) are essential for the `MovieDetailPage` component to:
1. Determine if a movie is part of a series
2. Fetch and display other episodes in the series
3. Show the episodes grid properly