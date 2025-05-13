# Schedule & Workflow Dashboard

A modern dashboard built with Astro that displays schedule data from Notion and workflow data from n8n.

## Features

- 📅 Schedule data integration with Notion
- 🔄 Workflow status from n8n
- 🎨 Modern UI with Radix UI components
- 🌙 Dark mode support
- ⚡ Fast and responsive

## Prerequisites

- Node.js 18 or later
- npm or yarn
- Notion API key and database ID
- n8n API key and webhook URL

## Setup

1. Clone the repository:

```bash
git clone <repository-url>
cd <repository-name>
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file in the root directory with the following variables:

```env
NOTION_API_KEY=your_notion_api_key_here
NOTION_DATABASE_ID=your_notion_database_id_here
N8N_API_KEY=your_n8n_api_key_here
N8N_WEBHOOK_URL=your_n8n_webhook_url_here
```

4. Start the development server:

```bash
npm run dev
```

5. Open your browser and navigate to `http://localhost:4321`

## Notion Setup

1. Create a new integration in the [Notion Developers](https://www.notion.so/my-integrations) page
2. Create a new database in Notion with the following properties:
   - Name (title)
   - Date (date)
   - Description (text)
3. Share the database with your integration
4. Copy the database ID from the URL

## n8n Setup

1. Create a new workflow in n8n
2. Set up a webhook node to expose your workflow data
3. Configure authentication using an API key
4. Copy the webhook URL and API key

## Development

- `npm run dev` - Start the development server
- `npm run build` - Build the project
- `npm run preview` - Preview the production build

## License

MIT

```sh
npm create astro@latest -- --template basics
```

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/withastro/astro/tree/latest/examples/basics)
[![Open with CodeSandbox](https://assets.codesandbox.io/github/button-edit-lime.svg)](https://codesandbox.io/p/sandbox/github/withastro/astro/tree/latest/examples/basics)
[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/withastro/astro?devcontainer_path=.devcontainer/basics/devcontainer.json)

> 🧑‍🚀 **Seasoned astronaut?** Delete this file. Have fun!

![just-the-basics](https://github.com/withastro/astro/assets/2244813/a0a5533c-a856-4198-8470-2d67b1d7c554)

## 🚀 Project Structure

Inside of your Astro project, you'll see the following folders and files:

```text
/
├── public/
│   └── favicon.svg
├── src/
│   ├── layouts/
│   │   └── Layout.astro
│   └── pages/
│       └── index.astro
└── package.json
```

To learn more about the folder structure of an Astro project, refer to [our guide on project structure](https://docs.astro.build/en/basics/project-structure/).

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |

## 👀 Want to learn more?

Feel free to check [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).
