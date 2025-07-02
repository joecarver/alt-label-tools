# Bandcamp Auto Upload

A Python automation script for Bandcamp login and management using Selenium WebDriver. This script can automatically log into your Bandcamp account, handle two-factor authentication, and provides a foundation for additional automation tasks.

## Features

- **Automated Bandcamp Login**: Complete login automation including 2FA support
- **Chrome WebDriver Management**: Automatic ChromeDriver installation and setup
- **Comprehensive Logging**: Detailed logging of all actions and errors
- **Error Handling & Screenshots**: Automatic screenshots on errors for debugging
- **Configurable Settings**: Flexible configuration via config file or environment variables
- **Two-Factor Authentication**: Built-in support for 2FA codes

## Prerequisites

- Python 3.7 or higher
- Chrome browser installed
- Internet connection

## Installation

1. Clone or download this repository
2. Install required packages:
   ```bash
   pip install -r requirements.txt
   ```

## Configuration

### Method 1: Supabase Database (Recommended for Production)
Store credentials securely in your Supabase database:

1. **Setup Supabase Project:**
   - Create a project at [supabase.com](https://supabase.com)
   - Get your project URL and API keys

2. **Configure Supabase in config.py:**
   ```python
   USE_SUPABASE = True
   SUPABASE_URL = "https://your-project.supabase.co"
   SUPABASE_ANON_KEY = "your-anon-key"
   SUPABASE_SERVICE_ROLE_KEY = "your-service-role-key"  # For setup only
   ```

3. **Create the credentials table:**
   ```bash
   python setup_supabase_table.py
   ```

4. **Store your credentials:**
   ```python
   automation = BandcampAutomation()
   automation.store_credentials_in_supabase("username", "password", "user_id")
   ```

### Method 2: Edit config.py
Edit `config.py` to set your Bandcamp credentials:
```python
BANDCAMP_USERNAME = "your_username_or_email"
BANDCAMP_PASSWORD = "your_password"
```

### Method 3: Environment Variables
Set environment variables for better security:
```bash
# Windows
set BANDCAMP_USERNAME=your_username_or_email
set BANDCAMP_PASSWORD=your_password

# Linux/Mac
export BANDCAMP_USERNAME=your_username_or_email
export BANDCAMP_PASSWORD=your_password
```

### Additional Settings
You can also configure:
- `HEADLESS_MODE`: Run browser in background (True/False)
- `BROWSER_TIMEOUT`: Seconds to wait for elements
- `SCREENSHOT_ON_ERROR`: Take screenshots on errors
- `WAIT_BETWEEN_ACTIONS`: Delay between actions
- `USE_SUPABASE`: Enable/disable Supabase credential retrieval
- `DEFAULT_USER_ID`: Default user ID for Supabase queries
- `CREDENTIALS_TABLE`: Name of the Supabase table for credentials

## Usage

### Basic Login
```bash
python bandcamp_automation.py
```

### With Supabase Credentials
If you've configured Supabase, the script will automatically retrieve credentials:

```python
from bandcamp_automation import BandcampAutomation

automation = BandcampAutomation()
automation.start(user_id="your_user_id")  # Fetches credentials from Supabase
```

### With Two-Factor Authentication
If your account has 2FA enabled, the script will detect it and prompt for the code. You can also provide it programmatically:

```python
from bandcamp_automation import BandcampAutomation

automation = BandcampAutomation()
automation.start(
    username="your_username",
    password="your_password", 
    two_factor_code="123456"  # Your 2FA code
)
```

### Headless Mode
```python
automation = BandcampAutomation(headless=True)
automation.start()
```

## How It Works

The script follows this process:

1. **Initialize Chrome WebDriver** with optimized settings
2. **Navigate to [Bandcamp Login](https://bandcamp.com/login)**
3. **Fill in credentials** from config or environment variables
4. **Handle 2FA** if required (detects 2FA field automatically)
5. **Verify login success** by checking URL changes and error messages
6. **Keep session active** for additional automation tasks

## Login Form Elements

The script interacts with these Bandcamp login form elements:
- Username/email field (`name="username"`)
- Password field (`name="password"`)
- Two-factor code field (`name="code"`) - if 2FA is enabled
- Remember computer checkbox (`name="remember"`)
- Submit button (`button[type='submit']`)

## Files Structure

- **`bandcamp_automation.py`** - Main automation script with complete login functionality
- **`config.py`** - Configuration settings and credentials
- **`setup_supabase_table.py`** - Helper script to setup Supabase database table
- **`requirements.txt`** - Python dependencies (selenium, webdriver-manager, supabase)
- **`automation.log`** - Detailed log file (created when script runs)
- **`screenshots/`** - Directory for error screenshots (created automatically)

## Logging & Debugging

The script provides comprehensive logging:
- All browser actions and form interactions
- Navigation events with timestamps
- Error messages with screenshots
- Two-factor authentication handling
- Login success/failure status

Check `automation.log` for detailed execution logs.

## Error Handling

The script includes robust error handling:
- **Screenshot capture** on errors (if `SCREENSHOT_ON_ERROR=True`)
- **Retry mechanisms** for transient failures
- **Graceful cleanup** of browser resources
- **Detailed error logging** for troubleshooting

## Extending the Script

After successful login, you can extend the automation for additional tasks:

```python
def upload_track(self, track_path, title, description):
    """Add track upload functionality"""
    # Navigate to upload page
    # Fill in track details
    # Upload audio file
    pass

def manage_releases(self):
    """Add release management functionality"""
    # Navigate to artist dashboard
    # Manage existing releases
    pass
```

## Security Best Practices

1. **Use environment variables** for credentials instead of hardcoding
2. **Keep config.py private** - don't commit credentials to version control
3. **Enable 2FA** on your Bandcamp account for additional security
4. **Review logs** regularly for any suspicious activity

## Troubleshooting

| Issue | Solution |
|-------|----------|
| WebDriver not found | Script auto-downloads ChromeDriver |
| Login fails | Check credentials in config.py or environment variables |
| 2FA required | Provide two_factor_code parameter |
| Browser won't start | Ensure Chrome is installed |
| Permission errors | Run with appropriate permissions |

## Legal Notice

This automation script is for personal use only. Please:
- Respect Bandcamp's Terms of Service
- Use responsibly and don't abuse the platform
- Consider API alternatives when available
- Be mindful of rate limiting and server load

## Support

For issues or questions:
1. Check the `automation.log` file for detailed error information
2. Enable `SCREENSHOT_ON_ERROR` to see what's happening visually
3. Verify your Bandcamp credentials are correct
4. Ensure your account doesn't have any restrictions 