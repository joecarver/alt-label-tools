"""
Bandcamp Login (Strict Order: Browser → Supabase creds → Solve CAPTCHA → Submit)
-------------------------------------------------------------------------------
This script follows the exact order requested:
  1) Opens a (headless by default) Chrome browser
  2) Fetches Bandcamp username/password from Supabase (by --user-id)
  3) Waits for a CAPTCHA to appear and solves it via 2Captcha
  4) After successful CAPTCHA solve, fills credentials, submits login, and exits when logged in

Usage:
  python bandcamp_login_supabase_2captcha.py --user-id YOUR_USER_ID [--headless true|false]

Required environment variables (see .env.example):
  SUPABASE_URL, SUPABASE_ANON_KEY, TWOCAPTCHA_API_KEY

Dependencies (see requirements.txt):
  selenium, supabase, twocaptcha-python, python-dotenv (optional)

Note: You need Google Chrome/Chromium and a matching chromedriver on PATH.
"""
from __future__ import annotations

import argparse
import logging
import os
import random
import sys
import time
from dataclasses import dataclass
from typing import Optional
from urllib.parse import urlparse, parse_qs

from twocaptcha import TwoCaptcha

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException
from selenium.webdriver.common.action_chains import ActionChains

from supabase_utils import SupabaseUtils, BandcampCreds, load_bandcamp_creds
from captcha_utils import init_2captcha
from login import bandcamp_login_strict, upload_album
# -----------------------------
# Configuration helpers 
# -----------------------------

def getenv_bool(name: str, default: bool) -> bool:
    v = os.getenv(name)
    if v is None:
        return default
    return v.strip().lower() in {"1", "true", "yes", "y"}


def getenv_int(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, str(default)))
    except ValueError:
        return default


@dataclass
class Settings:
    supabase_url: str
    supabase_key: str
    twocaptcha_key: str
    bandcamp_login_url: str
    credentials_table: str
    user_id_field: str
    username_field: str
    password_field: str
    account_name_field: str
    selenium_timeout: int
    captcha_appear_timeout: int
    headless_default: bool


def load_settings() -> Settings:
    # Load environment from config.env or .env
    try:
        from dotenv import load_dotenv  # type: ignore
        
        # Try config.env first (our preferred file)
        if os.path.exists('config.env'):
            result = load_dotenv('config.env')
            logging.info(f"[CONFIG] Loaded config.env: {result}")
        elif os.path.exists('.env'):
            result = load_dotenv()
            logging.info(f"[CONFIG] Loaded .env: {result}")
        else:
            logging.warning("[CONFIG] No .env or config.env file found, using system environment variables only")
            
    except ImportError:
        logging.warning("[CONFIG] python-dotenv not available, using system environment variables only")
    except Exception as e:
        logging.error(f"[CONFIG] Error loading environment file: {e}")

    supabase_url = os.getenv("SUPABASE_URL", "").strip()
    supabase_key = os.getenv("SUPABASE_ANON_KEY", "").strip()
    twocaptcha_key = os.getenv("TWOCAPTCHA_API_KEY", "").strip()
    
    # Debug: Check what table name we're getting
    table_name = os.getenv("CREDENTIALS_TABLE", "credentials")
    user_id_field = os.getenv("USER_ID_FIELD", "user_id")
    logging.info(f"[CONFIG] Table name from env: '{table_name}'")
    logging.info(f"[CONFIG] User ID field from env: '{user_id_field}'")

    missing = [k for k, v in {
        "SUPABASE_URL": supabase_url,
        "SUPABASE_ANON_KEY": supabase_key,
        "TWOCAPTCHA_API_KEY": twocaptcha_key,
    }.items() if not v]
    if missing:
        raise SystemExit("Missing required environment variables: " + ", ".join(missing))

    # Read all configuration values after environment is loaded
    settings = Settings(
        supabase_url=supabase_url,
        supabase_key=supabase_key,
        twocaptcha_key=twocaptcha_key,
        bandcamp_login_url=os.getenv("BANDCAMP_LOGIN_URL", "https://bandcamp.com/login"),
        credentials_table=os.getenv("CREDENTIALS_TABLE", "CREDENTIALS_TABLE"),
        user_id_field=os.getenv("USER_ID_FIELD", "user_id"),
        username_field=os.getenv("USERNAME_FIELD", "username"),
        password_field=os.getenv("PASSWORD_FIELD", "password"),
        account_name_field=os.getenv("ACCOUNT_NAME_FIELD", "account_name"),
        selenium_timeout=getenv_int("SELENIUM_TIMEOUT", 45),
        captcha_appear_timeout=getenv_int("CAPTCHA_APPEAR_TIMEOUT", 60),
        headless_default=getenv_bool("HEADLESS", False),
    )
    
    # Debug: Check what the Settings object actually contains
    logging.info(f"[CONFIG] Final settings - Table: '{settings.credentials_table}', User ID field: '{settings.user_id_field}'")
    
    return settings


# -----------------------------
# 2Captcha
# -----------------------------

# -----------------------------
# Selenium + reCAPTCHA utilities
# -----------------------------

def get_random_user_agent() -> str:
    """Get a random realistic Chrome user agent."""
    user_agents = [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ]
    return random.choice(user_agents)


def get_random_viewport() -> tuple[int, int]:
    """Get a random realistic viewport size."""
    viewports = [
        (1920, 1080), (1366, 768), (1536, 864), (1440, 900),
        (1280, 720), (1600, 900), (1024, 768), (1280, 1024)
    ]
    return random.choice(viewports)


def make_driver(headless: bool, timeout: int) -> webdriver.Chrome:
    opts = Options()
    
    # Get random values for enhanced stealth
    user_agent = get_random_user_agent()
    width, height = get_random_viewport()
    
    # Enhanced anti-detection measures
    opts.add_argument(f"--user-agent={user_agent}")
    opts.add_argument("--disable-blink-features=AutomationControlled")
    opts.add_experimental_option("excludeSwitches", ["enable-automation"])
    opts.add_experimental_option('useAutomationExtension', False)
    
    # Additional stealth flags
    opts.add_argument("--disable-web-security")
    opts.add_argument("--disable-features=VizDisplayCompositor")
    opts.add_argument("--disable-ipc-flooding-protection")
    opts.add_experimental_option("excludeSwitches", ["enable-logging"])
    opts.add_experimental_option('useAutomationExtension', False)
    opts.add_argument("--disable-automation")
    opts.add_argument("--disable-plugins-discovery")
    opts.add_argument("--disable-component-extensions-with-background-pages")
    
    if headless:
        opts.add_argument("--headless=new")
        # Additional headless stealth options
        opts.add_argument("--disable-background-timer-throttling")
        opts.add_argument("--disable-renderer-backgrounding")
        opts.add_argument("--disable-backgrounding-occluded-windows")
        opts.add_argument("--disable-client-side-phishing-detection")
        opts.add_argument("--disable-crash-reporter")
        opts.add_argument("--disable-oopr-debug-crash-dump")
        opts.add_argument("--no-crash-upload")
        opts.add_argument("--disable-low-res-tiling")
    
    # Performance and stealth options
    opts.add_argument(f"--window-size={width},{height}")
    opts.add_argument(f"--force-device-scale-factor={random.uniform(0.8, 1.2):.1f}")
    opts.add_argument("--disable-gpu")
    opts.add_argument("--no-sandbox")
    opts.add_argument("--disable-dev-shm-usage")
    opts.add_argument("--disable-extensions")
    opts.add_argument("--disable-plugins")
    opts.add_argument("--disable-images")  # Faster loading, less detection surface
    opts.add_argument("--disable-javascript-harmony-shipping")
    opts.add_argument("--disable-sync")
    opts.add_argument("--disable-background-networking")
    opts.add_argument("--disable-default-apps")
    opts.add_argument("--disable-translate")
    
    # Memory and performance optimizations
    opts.add_argument("--memory-pressure-off")
    opts.add_argument("--max_old_space_size=4096")

    try:
        driver = webdriver.Chrome(options=opts)
    except Exception as e:
        raise SystemExit(
            "Failed to start Chrome WebDriver. Ensure Chrome and chromedriver are installed and on PATH. "
            f"Error: {e}"
        )
    
    # Enhanced JavaScript-based anti-detection
    stealth_script = """
    // Remove webdriver traces
    Object.defineProperty(navigator, 'webdriver', {get: () => undefined});
    
    // Override the plugin array (headless browsers have no plugins)
    Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5]
    });
    
    // Override the languages property (headless browsers often have no languages)
    Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en']
    });
    
    // Override the permissions property
    const originalQuery = window.navigator.permissions.query;
    window.navigator.permissions.query = (parameters) => (
        parameters.name === 'notifications' ?
            Promise.resolve({ state: Notification.permission }) :
            originalQuery(parameters)
    );
    
    // Override the connection property (headless browsers often have no connection info)
    Object.defineProperty(navigator, 'connection', {
        get: () => ({
            effectiveType: '4g',
            rtt: 50,
            downlink: 1.5
        })
    });
    
    // Hide automation indicators
    delete window.cdc_adoQpoasnfa76pfcZLmcfl_Array;
    delete window.cdc_adoQpoasnfa76pfcZLmcfl_Promise;
    delete window.cdc_adoQpoasnfa76pfcZLmcfl_Symbol;
    """
    
    driver.execute_script(stealth_script)
    
    # Override user agent via CDP (more reliable than argument)
    driver.execute_cdp_cmd('Network.setUserAgentOverride', {
        "userAgent": user_agent,
        "acceptLanguage": "en-US,en;q=0.9",
        "platform": "Win32"
    })
    
    # Set realistic screen properties
    driver.execute_cdp_cmd('Emulation.setDeviceMetricsOverride', {
        'width': width,
        'height': height,
        'deviceScaleFactor': random.uniform(1.0, 2.0),
        'mobile': False
    })
    
    driver.set_page_load_timeout(timeout)
    driver.implicitly_wait(0)
    logging.info(f"[STEALTH] Browser initialized with UA: {user_agent[:50]}... Size: {width}x{height}")
    return driver


def W(driver, seconds: int) -> WebDriverWait:
    return WebDriverWait(driver, seconds)


def wait_for_knockout_js(driver, timeout: int = 10) -> bool:
    """Wait for Knockout.js to load and bind to the page."""
    try:
        WebDriverWait(driver, timeout).until(
            lambda d: d.execute_script(
                "return typeof ko !== 'undefined' && ko.dataFor && ko.dataFor(document.body)"
            )
        )
        logging.info("[KNOCKOUT] Knockout.js is loaded and bound")
        return True
    except TimeoutException:
        logging.warning("[KNOCKOUT] Knockout.js did not load within timeout, continuing anyway")
        return False
    except Exception as e:
        logging.warning(f"[KNOCKOUT] Error checking Knockout.js (browser may have closed): {e}")
        return False


def wait_for_element_clickable(driver, locator, timeout: int = 30):
    """Wait for element to be both present and clickable."""
    try:
        element = WebDriverWait(driver, timeout).until(
            EC.element_to_be_clickable(locator)
        )
        return element
    except TimeoutException:
        raise SystemExit(f"Element {locator} was not clickable within {timeout} seconds")


def wait_for_login_form_ready(driver, timeout: int = 30) -> bool:
    """Wait for the login form to be fully interactive."""
    try:
        # Wait for form to be visible
        WebDriverWait(driver, timeout).until(
            EC.visibility_of_element_located((By.ID, "loginform"))
        )
        
        # Wait for submit button to be enabled
        WebDriverWait(driver, timeout).until(
            lambda d: d.execute_script(
                "var btn = document.querySelector('button[type=submit]'); "
                "return btn && !btn.disabled && btn.offsetParent !== null;"
            )
        )
        
        logging.info("[FORM] Login form is ready for interaction")
        return True
    except TimeoutException:
        logging.warning("[FORM] Login form may not be fully ready, continuing anyway")
        return False


def random_delay(min_seconds: float = 0.5, max_seconds: float = 2.0) -> None:
    """Add a random delay to simulate human behavior."""
    delay = random.uniform(min_seconds, max_seconds)
    time.sleep(delay)


def simulate_human_mouse_movement(driver, element) -> None:
    """Simulate realistic mouse movement to an element."""
    try:
        # Move to a random point near the element first
        actions = ActionChains(driver)
        
        # Get element location and size
        location = element.location
        size = element.size
        
        # Calculate random points around the element
        center_x = location['x'] + size['width'] // 2
        center_y = location['y'] + size['height'] // 2
        
        # Move to a nearby random point first (simulating human mouse movement)
        nearby_x = center_x + random.randint(-50, 50)
        nearby_y = center_y + random.randint(-50, 50)
        
        actions.move_by_offset(nearby_x - center_x, nearby_y - center_y)
        actions.pause(random.uniform(0.1, 0.3))
        
        # Then move to the actual element
        actions.move_to_element(element)
        actions.pause(random.uniform(0.1, 0.2))
        
        actions.perform()
        
    except Exception as e:
        logging.debug(f"[MOUSE] Could not simulate mouse movement: {e}")


def safe_click(driver, element, max_retries: int = 3) -> bool:
    """Safely click an element with retries, human-like behavior, and different methods."""
    for attempt in range(max_retries):
        try:
            # Add brief delay before clicking
            random_delay(0.05, 0.2)
            
            # Method 1: Human-like ActionChains click with mouse movement
            if attempt == 0:
                simulate_human_mouse_movement(driver, element)
                random_delay(0.1, 0.3)
                ActionChains(driver).click(element).perform()
            # Method 2: Standard click
            elif attempt == 1:
                element.click()
            # Method 3: JavaScript click (fallback)
            else:
                driver.execute_script("arguments[0].click();", element)
            
            logging.info(f"[CLICK] Successfully clicked element (method {attempt + 1})")
            return True
            
        except Exception as e:
            logging.warning(f"[CLICK] Attempt {attempt + 1} failed: {e}")
            if attempt < max_retries - 1:
                random_delay(1.0, 2.0)  # Longer delay between retries
            
    logging.error("[CLICK] All click attempts failed")
    return False


def human_type_text(driver, element, text: str) -> None:
    """Type text with human-like timing and pauses."""
    try:
        # Clear field first with minimal delay
        element.click()
        random_delay(0.02, 0.08)
        element.clear()
        random_delay(0.05, 0.15)
        
        # Type each character with minimal delays
        for i, char in enumerate(text):
            element.send_keys(char)
            # Fast typing speed with minimal delays
            if char in ' @.-':  # Brief pause at word boundaries and special chars
                random_delay(0.02, 0.05)
            else:
                random_delay(0.01, 0.03)
            
            # Occasional brief pause (simulating natural typing)
            if i > 0 and i % random.randint(8, 15) == 0:
                random_delay(0.05, 0.15)
                
    except Exception as e:
        logging.debug(f"[TYPING] Human typing simulation failed, falling back to normal: {e}")
        element.clear()
        element.send_keys(text)


def safe_send_keys(driver, element, text: str, clear_first: bool = True, max_retries: int = 3) -> bool:
    """Safely send keys to an element with retries and human-like typing."""
    for attempt in range(max_retries):
        try:
            # Add brief delay before typing
            random_delay(0.05, 0.15)
            
            # Method 1: Human-like typing
            if attempt == 0:
                human_type_text(driver, element, text)
            # Method 2: Standard approach with clear/send_keys
            else:
                if clear_first:
                    element.clear()
                    random_delay(0.1, 0.3)
                element.send_keys(text)
            
            # Verify text was entered
            random_delay(0.05, 0.15)  # Brief wait for UI to update
            actual_value = element.get_attribute('value')
            if actual_value == text:
                logging.info(f"[INPUT] Successfully entered text (attempt {attempt + 1})")
                return True
            else:
                raise Exception(f"Text verification failed: expected '{text}', got '{actual_value}'")
                
        except Exception as e:
            logging.warning(f"[INPUT] Attempt {attempt + 1} failed: {e}")
            if attempt < max_retries - 1:
                random_delay(1.0, 2.0)
                try:
                    element.clear()
                except Exception:
                    pass
    
    logging.error("[INPUT] All input attempts failed")
    return False


def find_recaptcha_sitekey(driver) -> Optional[str]:
    """Find reCAPTCHA sitekey with multiple detection methods."""
    methods = [
        # Method 1: data-sitekey containers
        lambda: _find_sitekey_by_attribute(driver),
        # Method 2: iframe source parsing
        lambda: _find_sitekey_by_iframe(driver),
        # Method 3: JavaScript global variables
        lambda: _find_sitekey_by_js(driver),
    ]
    
    for i, method in enumerate(methods, 1):
        try:
            sitekey = method()
            if sitekey:
                logging.info(f"[CAPTCHA] Found sitekey using method {i}: {sitekey[:12]}...")
                return sitekey
        except Exception as e:
            logging.debug(f"[CAPTCHA] Method {i} failed: {e}")
    
    return None


def _find_sitekey_by_attribute(driver) -> Optional[str]:
    """Find sitekey by data-sitekey attribute."""
    containers = driver.find_elements(By.CSS_SELECTOR, "div.g-recaptcha, div[data-sitekey], [data-sitekey]")
    for el in containers:
        sitekey = el.get_attribute("data-sitekey")
        if sitekey and len(sitekey) > 10:
            return sitekey
    return None


def _find_sitekey_by_iframe(driver) -> Optional[str]:
    """Find sitekey by parsing iframe src."""
    iframes = driver.find_elements(By.CSS_SELECTOR, "iframe[src*='google.com/recaptcha'], iframe[src*='recaptcha']")
    for ifr in iframes:
        src = ifr.get_attribute("src")
        if not src:
            continue
        q = parse_qs(urlparse(src).query)
        k = q.get("k") or q.get("sitekey")
        if k and len(k[0]) > 10:
            return k[0]
    return None


def _find_sitekey_by_js(driver) -> Optional[str]:
    """Find sitekey by checking JavaScript variables."""
    try:
        sitekey = driver.execute_script(
            "return window.___grecaptcha_cfg && "
            "window.___grecaptcha_cfg.clients && "
            "Object.values(window.___grecaptcha_cfg.clients)[0] && "
            "Object.values(window.___grecaptcha_cfg.clients)[0].sitekey;"
        )
        if sitekey and len(sitekey) > 10:
            return sitekey
    except Exception:
        pass
    return None


def wait_for_captcha(driver, timeout_seconds: int) -> str:
    """Poll until a reCAPTCHA sitekey is discoverable or timeout occurs."""
    end = time.time() + timeout_seconds
    last_seen = None
    scroll_positions = [0, 0.25, 0.5, 0.75, 1.0]  # Different scroll positions to try
    scroll_index = 0
    
    while time.time() < end:
        sitekey = find_recaptcha_sitekey(driver)
        if sitekey:
            if sitekey != last_seen:
                logging.info(f"[CAPTCHA] Detected sitekey: {sitekey[:12]}...")
            return sitekey
        
        # Try scrolling to different positions to trigger lazy-loaded content
        try:
            scroll_pos = scroll_positions[scroll_index % len(scroll_positions)]
            driver.execute_script(f"window.scrollTo(0, document.body.scrollHeight * {scroll_pos})")
            scroll_index += 1
        except Exception:
            pass
        
        time.sleep(1.0)
    
    raise SystemExit("Timed out waiting for CAPTCHA to appear on the login page")


def solve_captcha(solver: TwoCaptcha, sitekey: str, page_url: str) -> str:
    try:
        logging.info("[CAPTCHA] Requesting solution from 2Captcha…")
        res = solver.recaptcha(sitekey=sitekey, url=page_url)
        token = res.get("code") if isinstance(res, dict) else None
        if not token:
            raise SystemExit("2Captcha returned no token")
        logging.info("[CAPTCHA] Received token from 2Captcha")
        return token
    except Exception as e:
        raise SystemExit(f"2Captcha error: {e}")


def inject_recaptcha_token(driver, token: str) -> None:
    """Inject reCAPTCHA token with multiple methods and verification."""
    try:
        # Method 1: Standard g-recaptcha-response injection
        driver.execute_script(
            """
            (function(token) {
                // Find or create the response textarea
                var area = document.getElementById('g-recaptcha-response');
                if (!area) {
                    area = document.createElement('textarea');
                    area.id = 'g-recaptcha-response';
                    area.name = 'g-recaptcha-response';
                    area.style.display = 'none';
                    document.body.appendChild(area);
                }
                area.value = token;
                
                // Trigger events
                ['input', 'change'].forEach(function(eventType) {
                    var evt = document.createEvent('HTMLEvents');
                    evt.initEvent(eventType, true, true);
                    area.dispatchEvent(evt);
                });
                
                // Method 2: Try to find and fill any hidden reCAPTCHA fields
                var hiddenInputs = document.querySelectorAll('input[name*="recaptcha"], input[name*="captcha"]');
                hiddenInputs.forEach(function(input) {
                    if (input.type === 'hidden' || input.style.display === 'none') {
                        input.value = token;
                    }
                });
                
                // Method 3: Call reCAPTCHA callback if available
                if (typeof window.grecaptcha !== 'undefined' && window.grecaptcha.getResponse) {
                    try {
                        var widgets = Object.keys(window.___grecaptcha_cfg.clients || {});
                        widgets.forEach(function(widgetId) {
                            if (window.___grecaptcha_cfg.clients[widgetId]) {
                                var callback = window.___grecaptcha_cfg.clients[widgetId].callback;
                                if (callback && typeof callback === 'function') {
                                    callback(token);
                                }
                            }
                        });
                    } catch (e) {
                        console.log('Callback injection failed:', e);
                    }
                }
                
                return area.value === token;
            })(arguments[0]);
            """,
            token,
        )
        
        # Verify injection was successful
        injected = driver.execute_script(
            "return document.getElementById('g-recaptcha-response') ? "
            "document.getElementById('g-recaptcha-response').value : null;"
        )
        
        if injected == token:
            logging.info("[CAPTCHA] Token successfully injected and verified")
        else:
            logging.warning("[CAPTCHA] Token injection verification failed")
        
        time.sleep(2)  # Wait for page to process the token
        
    except Exception as e:
        raise SystemExit(f"Failed to inject CAPTCHA token: {e}")


# -----------------------------
# CLI (kept for standalone testing)
# -----------------------------

def parse_args(settings: Settings) -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Bandcamp login with strict order: browser -> creds -> CAPTCHA -> submit")
    p.add_argument("--headless", default=str(settings.headless_default).lower(), choices=["true", "false"], help="Run browser headless (default from HEADLESS env)")
    return p.parse_args()


if __name__ == "__main__":
    from login import bandcamp_login_strict, upload_album

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
        handlers=[logging.StreamHandler(sys.stdout)],
    )

    settings = load_settings()
    args = parse_args(settings)
    headless = args.headless.lower() == "true"

    driver = make_driver(headless=headless, timeout=settings.selenium_timeout)

    creds = load_bandcamp_creds()

    solver = init_2captcha()
    ok = bandcamp_login_strict(driver, creds, solver)
    if ok:
        logging.info("Successfully logged in. CLI mode - no album data provided.")
        logging.info("Use the FastAPI server for full upload functionality.")
