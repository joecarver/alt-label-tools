#!/bin/bash

# Start Supabase locally
supabase status || supabase start

supabase status || supabase migration up --local

cwd=$(pwd)

# Run tests
deno test --allow-net --allow-env --allow-read --unstable-sloppy-imports sync-task-statuses/test.ts