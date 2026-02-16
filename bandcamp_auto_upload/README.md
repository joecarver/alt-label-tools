# automated-label-tools

Bandcamp Login (Strict Order: Browser → Supabase creds → Solve CAPTCHA → Submit)
-------------------------   ------------------------------------------------------
This script follows the exact order requested:
  1) Opens a (headless by default) Chrome browser
  2) Fetches Bandcamp username/password from Supabase (by --user-id)
  3) Waits for a CAPTCHA to appear and solves it via 2Captcha
  4) After successful CAPTCHA solve, fills credentials, submits login, and exits when logged in

## Quick Start

### 1. Install UV

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

### 2. Install all packages and creatwe virtual environment
```

uv python install
uv sync --all-extras
```

### 3. Set Up Environment Variables
Copy the provided `dev.env` file and update it with your credentials:
```
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_key
TWOCAPTCHA_API_KEY=your_2captcha_api_key
```

### 4. Download ChromeDriver
Download [ChromeDriver](https://googlechromelabs.github.io/chrome-for-testing/#stable) matching your Chrome version and device and place it in the root directory (same folder as this file)

### 5. Run the Script
```bash
python -m src.main --user-id YOUR_USER_ID --headless false
```

## Usage

```bash
python -m src.main --user-id YOUR_USER_ID [--headless true|false]
```

**Arguments:**
- `--user-id`: Supabase user ID to fetch credentials (required)
- `--headless`: Run browser in headless mode (default: true)

## Requirements

- Python 3.10+ 
- Google Chrome/Chromium browser
- ChromeDriver matching your Chrome version
- Valid Supabase and 2Captcha credentials
