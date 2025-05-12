#!/bin/bash

# Start Supabase locally
supabase status || supabase start

supabase status || supabase migration up --local

cwd=$(pwd)

# Run tests
deno test --allow-net --allow-env --allow-read --unstable-sloppy-imports supabase/functions/sync-clients/test.ts
deno test --allow-net --allow-env --allow-read --unstable-sloppy-imports supabase/functions/sync-releases/test.ts
deno test --allow-net --allow-env --allow-read --unstable-sloppy-imports supabase/functions/sync-tasks/test.ts
deno test --allow-net --allow-env --allow-read --unstable-sloppy-imports supabase/functions/sync-task-statuses/test.ts