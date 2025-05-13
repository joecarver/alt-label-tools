# Alt Label Tools - Supabase Backend

The backend system built with Supabase Edge Functions and Cloudflare Workers for managing music release tasks and metadata synchronization.

## System Architecture

### Edge Functions

1. **Sync Functions**
   - `sync-clients`: Synchronizes label client data from Notion
   - `sync-releases`: Syncs release information for each client
   - `sync-tasks`: Updates task data for all releases
   - `sync-task-statuses`: Manages task completion states
   - `monitor-sync-health`: Ensures synchronization processes are running correctly

2. **Shared Utilities**
   - `_shared/utils.ts`: Common utilities and Supabase client setup
   - `_shared/clients.ts`: Notion client data handling
   - `_shared/releases.ts`: Release data management
   - `_shared/tasks.ts`: Task synchronization logic
   - `_shared/drive.ts`: Google Drive integration

### Database Schema

1. **Tables**
   - `clients`: Label client information
   - `releases`: Release metadata and relationships
   - `tasks`: Task tracking and status
   - `task_statuses`: Task completion states
   - `sync_executions`: Sync operation tracking

2. **Relationships**
   - Clients -> Releases (one-to-many)
   - Releases -> Tasks (one-to-many)
   - Tasks -> Task Statuses (one-to-one)

## Development

### Prerequisites

- Supabase CLI
- Deno runtime
- Node.js 22.14 or later
- yarn package manager

### Setup

1. Install Supabase CLI:
```bash
brew install supabase/tap/supabase
```

2. Install dependencies:
```bash
deno install
```

3. Set up environment variables:
```bash
cp ../.env.example ../.env
```

4. Set Supabase secrets:
```bash
./set-supabase-secrets.sh
```

### Local Development

1. Start Supabase locally:
```bash
supabase start
```

2. Deploy functions:
```bash
supabase functions deploy
```

3. Watch for changes:
```bash
supabase functions serve
```

### Deployment

1. Deploy all functions:
```bash
supabase functions deploy
```

2. Deploy specific function:
```bash
supabase functions deploy <function-name>
```

## Environment Variables

Required environment variables:
- `NOTION_API_KEY`: For Notion API access
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: For database operations
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`: For Drive integration
- `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`: For Drive authentication
- `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY_ID`: For JWT signing

## Project Structure

```text
supabase/
├── functions/
│   ├── _shared/
│   │   ├── clients.ts
│   │   ├── drive.ts
│   │   ├── releases.ts
│   │   ├── tasks.ts
│   │   └── utils.ts
│   ├── sync-clients/
│   ├── sync-releases/
│   ├── sync-tasks/
│   ├── sync-task-statuses/
│   └── monitor-sync-health/
├── migrations/
├── types/
└── deno.json
```

## Security

- Service role key for database operations
- JWT-based authentication for functions
- Environment variable management
- Secure API endpoints with proper validation

## Monitoring

- Sync execution tracking in database
- Health monitoring through `monitor-sync-health`
- Error logging and reporting
- Cloudflare Worker integration for scheduling 