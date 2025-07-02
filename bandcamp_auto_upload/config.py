# Configuration file for Bandcamp Automation

# Browser settings
HEADLESS_MODE = False  # Set to True to run browser in background
BROWSER_TIMEOUT = 20  # Seconds to wait for elements (increased for slower loading)
SCREENSHOT_ON_ERROR = True

# Bandcamp URLs
BANDCAMP_LOGIN_URL = "https://bandcamp.com/login"
BANDCAMP_BASE_URL = "https://bandcamp.com"

# File paths
LOG_FILE = "automation.log"
SCREENSHOT_DIR = "screenshots"

# Login credentials (you should set these or use environment variables)
BANDCAMP_USERNAME = ""  # Set your Bandcamp username
BANDCAMP_PASSWORD = ""  # Set your Bandcamp password

# Supabase configuration
SUPABASE_URL = "https://lvckevqdsjvisvryfmbb.supabase.co"  # Your Supabase project URL
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2Y2tldnFkc2p2aXN2cnlmbWJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAwODg1MDMsImV4cCI6MjA2NTY2NDUwM30.JHCBZPHuzFUe5pYjPcpSNX7sGuufRMNddE-te3olshA"  # Your Supabase anonymous key
SUPABASE_SERVICE_ROLE_KEY = ""  # Your Supabase service role key (for server-side operations)

# Supabase table settings
CREDENTIALS_TABLE = "bandcamp_credentials"  # Table name for storing credentials
USER_ID_FIELD = "user_id"  # Field name for user identification
USERNAME_FIELD = "username"  # Field name for Bandcamp username
PASSWORD_FIELD = "password"  # Field name for Bandcamp password
ENCRYPTED_FIELD = "encrypted"  # Field name to indicate if password is encrypted

# Credential retrieval settings
USE_SUPABASE = True  # Set to True to enable Supabase credential retrieval
DEFAULT_USER_ID = "1"  # Default user ID to fetch credentials for
FALLBACK_TO_CONFIG = True  # Whether to fallback to config/env vars if Supabase fails

# Automation settings
WAIT_BETWEEN_ACTIONS = 1  # Seconds to wait between actions
MAX_RETRIES = 3  # Maximum number of retries for failed actions

# Upload settings
SUPPORTED_AUDIO_FORMATS = ['.mp3', '.flac', '.wav', '.aiff', '.ogg']
MAX_FILE_SIZE_MB = 200  # Maximum file size in MB for uploads

# Logging configuration to handle Unicode on Windows
import logging
import sys

def setup_unicode_logging():
    """Setup logging to handle Unicode characters on Windows."""
    # Configure root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)
    
    # Clear existing handlers
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)
    
    # File handler with UTF-8 encoding
    file_handler = logging.FileHandler(LOG_FILE, encoding='utf-8')
    file_formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
    file_handler.setFormatter(file_formatter)
    root_logger.addHandler(file_handler)
    
    # Console handler - safe for Windows
    console_handler = logging.StreamHandler(sys.stdout)
    console_formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
    console_handler.setFormatter(console_formatter)
    
    # Set encoding for console handler
    if hasattr(console_handler.stream, 'reconfigure'):
        try:
            console_handler.stream.reconfigure(encoding='utf-8')
        except:
            pass  # Fallback to default
    
    root_logger.addHandler(console_handler)
    
    return root_logger 