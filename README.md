# Alt Label Tools

A comprehensive system for managing music release tasks and metadata, built with Supabase Edge Functions, Cloudflare Workers, and Astro.

## System Architecture

### Backend Components

1. **Supabase Database**
   - Stores applicationdata
   - Maintains relationships between:
     - Clients
     - Releases
     - Tasks
     - Task statuses
     - Artists
     - Mastering engineers/designers

### Frontend Components

1. **Astro Frontend**
   - Displays aggregated metadata from Supabase
   - Provides interface for task management
   - Implements API routes for manual task updates

2. **API Routes**
   - `/api/update-task-completion`: Handles manual task completion changes
   - `/api/task-summary`: Fetches the latest task summary from Supabase, providing frontend reactivity
   - Updates Supabase database
   - Maintains data consistency across platforms

## Data Flow
1. **Task Management**
   - Frontend displays tasks from Supabase
   - Manual updates flow through Astro API routes
   - Real-time updates maintain consistency

## Environment Setup

Required environment variables:
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_ANON_KEY`: Supabase anonymous key
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`: For Google Drive integration
- `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`: For Google Drive authentication
- `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY_ID`: For Google Drive JWT signing

## Development

1. **Supabase Functions**
   - Located in `supabase/functions/`
   - Deploy using Supabase CLI
   - Environment variables managed via `set-supabase-secrets.sh`

2. **Cloudflare Worker**
   - Located in `supabase-cron-worker/`
   - Deploys to Cloudflare Workers
   - Manages scheduled sync operations

3. **Frontend**
   - Built with Astro
   - Located in `frontend/`
   - Implements UI and API routes

## Security

- API keys and secrets managed through environment variables
- Service account authentication for Google Drive integration
- JWT-based authentication for Supabase functions
- Secure API endpoints with proper validation 