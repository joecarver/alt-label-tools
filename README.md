# Alt Label Tools

A comprehensive system for managing music release tasks and metadata, built with Supabase Edge Functions, Cloudflare Workers, and Astro.

## System Architecture

### Backend Components

1. **Supabase Edge Functions**
   - `sync-clients`: Synchronizes label client data from Notion to Supabase
   - `sync-releases`: Syncs release information for each client
   - `sync-tasks`: Updates task data for all releases
   - `sync-task-statuses`: Manages task completion states
   - `monitor-sync-health`: Ensures synchronization processes are running correctly

2. **Cloudflare Workers**
   - Acts as a scheduler to trigger Supabase Edge Functions
   - Runs on a cron schedule to maintain data synchronization
   - Handles error reporting and monitoring

3. **Notion Integration**
   - Serves as the source of truth for:
     - Label client information
     - Release metadata
     - Task tracking and completion status
   - Structured with databases for releases and tasks

4. **Supabase Database**
   - Stores synchronized data from Notion
   - Maintains relationships between:
     - Clients
     - Releases
     - Tasks
     - Task statuses

### Frontend Components

1. **Astro Frontend**
   - Displays aggregated metadata from Supabase
   - Provides interface for task management
   - Implements API routes for manual task updates

2. **API Routes**
   - `/api/update-task-completion`: Handles manual task completion changes
   - `/api/task-summary`: Fetches the latest task summary from Supabase, providing frontend reactivity
   - Updates both Supabase database and Notion backend
   - Maintains data consistency across platforms

## Data Flow

1. **Synchronization Process**
   - Cloudflare Worker triggers sync functions on schedule
   - Edge Functions pull data from Notion API
   - Data is transformed and stored in Supabase
   - Health monitoring ensures sync reliability

2. **Task Management**
   - Frontend displays tasks from Supabase
   - Manual updates flow through Astro API routes
   - Changes propagate to both Supabase and Notion
   - Real-time updates maintain consistency

## Environment Setup

Required environment variables:
- `NOTION_API_KEY`: For Notion API access
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