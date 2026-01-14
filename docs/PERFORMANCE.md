# Performance Checklist

This checklist covers a quick "no memory growth" sanity check after gameplay sessions.

## Manual memory-growth sanity check

1. Run the game locally: `npm run dev`.
2. Open the game in Chrome and open DevTools.
3. Go to the **Performance** panel and enable **Memory** (or open the **Memory** panel).
4. Play 10 short runs:
   - Start a run, pass a few pipes, die, restart.
   - Repeat 10 times.
5. Observe:
   - Heap size returns near baseline after each restart.
   - No steady upward slope after multiple runs.
6. Optional: take 3 heap snapshots (start, mid, end).

## Expected outcomes

- Pipe count on screen stays bounded (despawn removes off-screen pairs).
- Heap size may spike during gameplay but should stabilize after restarts.
- No continuous memory climb across repeated runs.
