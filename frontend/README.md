# Alt Label Tools Frontend

A modern dashboard built with Astro that displays and manages music release tasks and metadata, integrating with Supabase and Notion.

## System Architecture

### Frontend Components

1. **Astro Application**
   - Built with Astro for optimal performance
   - Server-side rendered pages for fast initial load
   - Client-side interactivity where needed
   - Dark mode support with Radix UI components

2. **API Routes**
   - `/api/update-task-completion`: Handles manual task completion changes
   - `/api/task-summary`: Fetches the latest task summary from Supabase
   - Maintains data consistency between Supabase and Notion

3. **Data Integration**
   - Supabase for real-time data access
   - Notion API for updating task management
   - Links to Google drive resources

## Features

- 📅 Release schedule visualization
- ✅ Task management and completion tracking
- 🔄 Real-time updates from Supabase
- 🎨 Modern UI with Radix UI components
- 🌙 Dark mode support
- ⚡ Fast and responsive

## Prerequisites

- Node.js 22.14 or later
- yarn
- Supabase project setup
- Notion API key and database ID
- Google Drive service account credentials

## Setup

1. Clone the repository:

```bash
git clone <repository-url>
cd frontend
```

2. Install dependencies:

```bash
yarn
```

3. Update `../.env` with the following variables

```env
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
NOTION_API_KEY=your_notion_api_key
GOOGLE_SERVICE_ACCOUNT_EMAIL=your_service_account_email
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=your_private_key
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY_ID=your_private_key_id
```

4. Start the development server:

```bash
yarn dev
```

5. Open your browser and navigate to `http://localhost:4321`

## Development

- `yarn dev` - Start the development server
- `yarn build` - Build the project
- `yarn preview` - Preview the production build
- `yarn astro ...` - Run CLI commands like `astro add`, `astro check`

## Project Structure

```text
frontend/
├── public/
│   └── favicon.svg
├── src/
│   ├── components/
│   │   └── [UI components]
│   ├── layouts/
│   │   └── Layout.astro
│   ├── pages/
│   │   ├── index.astro
│   │   └── api/
│   │       └── [API routes]
│   └── utils/
│       └── [Utility functions]
└── package.json
```

## Security

- Environment variables for sensitive data
- API key management
- Secure API endpoints with proper validation
- CORS configuration for API routes