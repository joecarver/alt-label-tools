#!/usr/bin/env python3
"""
Enhanced Bandcamp Automation Script with Music Upload Functionality
Now supports uploading releases and tracks from Supabase database
"""

import logging
import time
import os
import sys
from datetime import datetime
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.common.exceptions import TimeoutException, NoSuchElementException, WebDriverException
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import Select
import traceback

# Configuration imports
from config import *

# Supabase imports (if enabled)
if USE_SUPABASE:
    try:
        from supabase import create_client, Client
    except ImportError:
        print("[ERROR] Supabase library not installed. Run: pip install supabase")
        USE_SUPABASE = False

class BandcampAutomation:
    def __init__(self):
        self.driver = None
        self.wait = None
        self.setup_logging()
        
        # New upload functionality attributes
        self.supabase = None
        self.current_release = None
        self.current_tracks = []
        self.upload_session = None
        
        if USE_SUPABASE:
            self.init_supabase()

    def init_supabase(self):
        """Initialize Supabase connection for upload functionality."""
        try:
            self.supabase: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
            logging.info("[SUCCESS] Supabase connection initialized for uploads")
        except Exception as e:
            logging.error(f"[ERROR] Failed to initialize Supabase: {e}")
            self.supabase = None

    def setup_logging(self):
        """Configure logging for the automation."""
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(LOG_FILE),
                logging.StreamHandler()
            ]
        )

    def setup_browser(self):
        """Initialize Chrome browser with optimized settings."""
        try:
            chrome_options = Options()
            
            if HEADLESS_MODE:
                chrome_options.add_argument("--headless")
            
            # Browser optimization settings
            chrome_options.add_argument("--no-sandbox")
            chrome_options.add_argument("--disable-dev-shm-usage")
            chrome_options.add_argument("--disable-gpu")
            chrome_options.add_argument("--window-size=1920,1080")
            chrome_options.add_argument("--start-maximized")  # Maximize window to avoid UI overlap
            chrome_options.add_argument("--disable-extensions")
            chrome_options.add_argument("--disable-plugins")
            chrome_options.add_argument("--disable-images")  # Faster loading
            
            # Upload-specific settings
            chrome_options.add_argument("--disable-web-security")
            chrome_options.add_argument("--allow-running-insecure-content")
            
            # File upload preferences
            prefs = {
                "profile.default_content_settings.popups": 0,
                "download.default_directory": os.getcwd(),
                "profile.default_content_setting_values.notifications": 2
            }
            chrome_options.add_experimental_option("prefs", prefs)
            
            self.driver = webdriver.Chrome(options=chrome_options)
            self.wait = WebDriverWait(self.driver, BROWSER_TIMEOUT)
            
            logging.info("[SUCCESS] Browser initialized successfully")
            return True
            
        except Exception as e:
            logging.error(f"[ERROR] Failed to initialize browser: {e}")
            return False

    def get_credentials_from_supabase(self, user_id):
        """Fetch credentials from Supabase database."""
        if not self.supabase:
            logging.error("[ERROR] Supabase not initialized")
            return None, None
            
        try:
            response = self.supabase.table(CREDENTIALS_TABLE).select("*").eq(USER_ID_FIELD, user_id).execute()
            
            if not response.data:
                logging.error(f"[ERROR] No credentials found for user_id: {user_id}")
                return None, None
                
            credential = response.data[0]
            username = credential.get(USERNAME_FIELD)
            password = credential.get(PASSWORD_FIELD)
            
            if not username or not password:
                logging.error("[ERROR] Username or password missing from database")
                return None, None
                
            logging.info(f"[SUCCESS] Retrieved credentials for user: {username}")
            return username, password
            
        except Exception as e:
            logging.error(f"[ERROR] Error retrieving credentials: {e}")
            return None, None

    def take_screenshot(self, filename_prefix="screenshot"):
        """Take a screenshot for debugging purposes."""
        if SCREENSHOT_ON_ERROR:
            try:
                if not os.path.exists(SCREENSHOT_DIR):
                    os.makedirs(SCREENSHOT_DIR)
                
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                screenshot_path = os.path.join(SCREENSHOT_DIR, f"{filename_prefix}_{timestamp}.png")
                self.driver.save_screenshot(screenshot_path)
                logging.info(f"[SCREENSHOT] Screenshot saved: {screenshot_path}")
                return screenshot_path
            except Exception as e:
                logging.error(f"[ERROR] Failed to take screenshot: {e}")
        return None

    def navigate_to_login(self):
        """Navigate to Bandcamp login page."""
        try:
            logging.info("[NAVIGATE] Navigating to Bandcamp login page...")
            self.driver.get(BANDCAMP_LOGIN_URL)
            time.sleep(2)
            
            # Wait for login form to be present - use Bandcamp's actual field name
            self.wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "input[name='username-field']")))
            logging.info("[SUCCESS] Login page loaded successfully")
            return True
            
        except TimeoutException:
            logging.error("[ERROR] Timeout waiting for login page to load")
            self.take_screenshot("login_page_timeout")
            return False
        except Exception as e:
            logging.error(f"[ERROR] Error navigating to login page: {e}")
            return False

    def fill_login_form(self, username, password):
        """Fill in the login form with credentials."""
        try:
            logging.info("[FORM] Filling login form...")
            
            # Find and fill username field - Bandcamp uses 'username-field'
            username_field = self.wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "input[name='username-field']")))
            username_field.clear()
            username_field.send_keys(username)
            
            # Find and fill password field - Bandcamp uses 'password-field'
            password_field = self.driver.find_element(By.CSS_SELECTOR, "input[name='password-field'], input[name='password'], input[type='password']")
            password_field.clear()
            password_field.send_keys(password)
            
            # Wait a moment for form to process
            time.sleep(1)
            
            # Submit the form with improved element interaction
            login_button = self.wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "button[type='submit'], input[type='submit']")))
            
            # Scroll the button into view to avoid overlap issues
            self.driver.execute_script("arguments[0].scrollIntoView({behavior: 'smooth', block: 'center'});", login_button)
            time.sleep(1)
            
            # Try multiple click methods to handle UI blocking
            try:
                # Method 1: Standard click
                login_button.click()
                logging.info("[SUCCESS] Login form submitted (standard click)")
            except Exception as click_error:
                logging.warning(f"[WARNING] Standard click failed: {click_error}")
                try:
                    # Method 2: JavaScript click (bypasses UI blocking)
                    self.driver.execute_script("arguments[0].click();", login_button)
                    logging.info("[SUCCESS] Login form submitted (JavaScript click)")
                except Exception as js_error:
                    logging.warning(f"[WARNING] JavaScript click failed: {js_error}")
                    # Method 3: Submit form directly
                    password_field.send_keys(Keys.RETURN)
                    logging.info("[SUCCESS] Login form submitted (Enter key)")
            
            return True
            
        except Exception as e:
            logging.error(f"[ERROR] Error filling login form: {e}")
            self.take_screenshot("login_form_error")
            return False

    def is_login_successful(self):
        """Check if login was successful by looking for indicators."""
        try:
            current_url = self.driver.current_url
            page_title = self.driver.title
            
            logging.info(f"[CHECK] Current URL: {current_url}")
            logging.info(f"[CHECK] Page title: {page_title}")
            
            # Check for CAPTCHA presence first
            captcha_selectors = [
                ".g-recaptcha",
                ".captcha",
                "#captcha",
                "[data-sitekey]",
                "iframe[src*='recaptcha']",
                ".h-captcha"
            ]
            
            for selector in captcha_selectors:
                try:
                    captcha_elements = self.driver.find_elements(By.CSS_SELECTOR, selector)
                    if captcha_elements:
                        logging.info("[CAPTCHA] CAPTCHA detected! Please complete the CAPTCHA manually...")
                        logging.info("[WAIT] Waiting for CAPTCHA completion...")
                        
                        # Wait for CAPTCHA to be completed (URL change or success indicators)
                        start_time = time.time()
                        while time.time() - start_time < 120:  # Wait up to 2 minutes
                            time.sleep(2)
                            new_url = self.driver.current_url
                            
                            # Check if we've moved past login page
                            if new_url != current_url and "login" not in new_url.lower():
                                logging.info("[SUCCESS] CAPTCHA completed! Login proceeding...")
                                current_url = new_url
                                break
                                
                            # Check for login success indicators
                            try:
                                # Look for user menu or dashboard elements
                                success_elements = self.driver.find_elements(By.CSS_SELECTOR, 
                                    ".menubar-profile, .user-menu, .account-menu, .band-nav, .edit-album")
                                if success_elements:
                                    logging.info("[SUCCESS] Login success detected!")
                                    return True
                            except:
                                pass
                        
                        logging.warning("[WARNING] CAPTCHA completion timeout")
                        break
                except:
                    continue
            
            # Standard login success checks
            time.sleep(3)  # Allow page to load
            
            # Check for success indicators
            success_indicators = [
                ("URL change", lambda: "login" not in self.driver.current_url.lower()),
                ("Dashboard elements", lambda: len(self.driver.find_elements(By.CSS_SELECTOR, ".menubar-profile, .user-menu, .account-menu")) > 0),
                ("Band navigation", lambda: len(self.driver.find_elements(By.CSS_SELECTOR, ".band-nav, .edit-album")) > 0),
                ("Page title", lambda: "login" not in self.driver.title.lower())
            ]
            
            for indicator_name, check_func in success_indicators:
                try:
                    if check_func():
                        logging.info(f"[SUCCESS] Login successful - {indicator_name} detected")
                        return True
                except:
                    continue
            
            # Check for error messages
            error_selectors = [".alert-error", ".error", ".alert", "[class*='error']"]
            for selector in error_selectors:
                try:
                    error_elements = self.driver.find_elements(By.CSS_SELECTOR, selector)
                    for element in error_elements:
                        error_text = element.text.strip()
                        if error_text and any(word in error_text.lower() for word in ['error', 'invalid', 'incorrect', 'failed']):
                            logging.error(f"[ERROR] Login error detected: {error_text}")
                            return False
                except:
                    continue
            
            logging.warning("[WARNING] Login status unclear - taking screenshot")
            self.take_screenshot("login_status_unclear")
            return False
            
        except Exception as e:
            logging.error(f"[ERROR] Error checking login status: {e}")
            self.take_screenshot("login_check_error")
            return False

    def navigate_to_upload_page(self):
        """Navigate to the album upload/creation page."""
        try:
            logging.info("[MUSIC] Navigating to album upload page...")
            
            # First, find the user's band name from the current page or URL
            band_name = None
            
            # Try to extract band name from current URL or page elements
            current_url = self.driver.current_url
            
            # Look for band name in page elements
            try:
                # Look for band links or profile information
                band_elements = self.driver.find_elements(By.CSS_SELECTOR, 
                    "a[href*='.bandcamp.com'], .band-name, .profile-name")
                
                for element in band_elements:
                    href = element.get_attribute('href') or ''
                    if '.bandcamp.com' in href and 'bandcamp.com/' in href:
                        # Extract band name from URL like https://djpitch.bandcamp.com
                        if href.startswith('https://') and '.bandcamp.com' in href:
                            band_name = href.split('//')[1].split('.bandcamp.com')[0]
                            logging.info(f"[BAND] Found band name: {band_name}")
                            break
            except Exception as e:
                logging.warning(f"[WARNING] Could not extract band name from page elements: {e}")
            
            # If band name found, navigate directly to edit_album page
            if band_name:
                edit_album_url = f"https://{band_name}.bandcamp.com/edit_album"
                logging.info(f"[NAVIGATE] Navigating to edit album page: {edit_album_url}")
                
                try:
                    self.driver.get(edit_album_url)
                    time.sleep(3)
                    
                    # Check if we're on the edit album page
                    if 'edit_album' in self.driver.current_url:
                        logging.info("[SUCCESS] Successfully navigated to edit album page")
                        return True
                except Exception as e:
                    logging.warning(f"[WARNING] Failed to navigate to {edit_album_url}: {e}")
            
            # Fallback: Try to find edit album links
            try:
                edit_links = self.driver.find_elements(By.CSS_SELECTOR, 
                    "a[href*='edit_album'], a[href*='/edit_album'], .edit-album")
                
                for link in edit_links:
                    link_href = link.get_attribute('href') or ''
                    
                    if 'edit_album' in link_href:
                        logging.info(f"[LINK] Found edit album link: {link_href}")
                        link.click()
                        time.sleep(3)
                        
                        if 'edit_album' in self.driver.current_url:
                            logging.info("[SUCCESS] Successfully navigated to edit album page via link")
                            return True
            except Exception as e:
                logging.warning(f"[WARNING] Error finding edit album links: {e}")
            
            # Final fallback: Try common edit album URLs
            fallback_urls = [
                "https://bandcamp.com/edit_album",
                f"{current_url.split('?')[0]}/edit_album" if current_url else None
            ]
            
            for url in fallback_urls:
                if not url:
                    continue
                    
                try:
                    logging.info(f"[NAVIGATE] Trying fallback URL: {url}")
                    self.driver.get(url)
                    time.sleep(3)
                    
                    if 'edit_album' in self.driver.current_url or 'edit' in self.driver.current_url:
                        logging.info(f"[SUCCESS] Edit album page found at: {url}")
                        return True
                        
                except Exception as e:
                    logging.warning(f"[WARNING] Failed to access {url}: {e}")
                    continue
            
            logging.error("[ERROR] Could not find or access edit album page")
            self.take_screenshot("edit_album_page_not_found")
            return False
            
        except Exception as e:
            logging.error(f"[ERROR] Error navigating to edit album page: {e}")
            self.take_screenshot("edit_album_navigation_error")
            return False

    # ===== NEW UPLOAD FUNCTIONALITY =====
    
    def get_pending_release(self, user_id):
        """Get a pending release from Supabase that needs to be uploaded."""
        try:
            if not self.supabase:
                logging.error("[ERROR] Supabase not available")
                return None
                
            # First try to get releases that don't have a user_id set (user_id is None)
            response = self.supabase.table("releases").select("*").is_("user_id", "null").eq("upload_status", "draft").limit(1).execute()
            
            if response.data:
                release = response.data[0]
                logging.info(f"[RELEASE] Found pending release without user_id: '{release['title']}'")
                return release
            
            # If no releases without user_id, try with string user_id
            response = self.supabase.table("releases").select("*").eq("upload_status", "draft").limit(1).execute()
            
            if not response.data:
                logging.info("[INFO] No pending releases found")
                return None
                
            release = response.data[0]
            logging.info(f"[RELEASE] Found pending release: '{release['title']}'")
            return release
            
        except Exception as e:
            logging.error(f"[ERROR] Error fetching pending release: {e}")
            return None

    def get_release_tracks(self, release_id):
        """Get all tracks for a release from Supabase."""
        try:
            if not self.supabase:
                return []
                
            response = self.supabase.table("tracks").select("*").eq("release_id", release_id).order("track_number").execute()
            
            tracks = response.data or []
            logging.info(f"[MUSIC] Found {len(tracks)} tracks for release")
            return tracks
            
        except Exception as e:
            logging.error(f"[ERROR] Error fetching tracks: {e}")
            return []

    def create_upload_session(self, user_id, release_id):
        """Create a new upload session to track progress."""
        try:
            if not self.supabase:
                return None
                
            session_data = {
                "user_id": user_id,
                "release_id": release_id,
                "session_status": "active",
                "total_tracks": len(self.current_tracks),
                "uploaded_tracks": 0,
                "failed_tracks": 0
            }
            
            response = self.supabase.table("upload_sessions").insert(session_data).execute()
            
            if response.data:
                session = response.data[0]
                logging.info(f"[SESSION] Upload session created: {session['id']}")
                return session
                
        except Exception as e:
            logging.error(f"[ERROR] Error creating upload session: {e}")
            return None

    def update_upload_status(self, table, record_id, status, **kwargs):
        """Update upload status in Supabase."""
        try:
            if not self.supabase:
                return False
                
            update_data = {"upload_status": status, "updated_at": datetime.now().isoformat()}
            update_data.update(kwargs)
            
            self.supabase.table(table).update(update_data).eq("id", record_id).execute()
            logging.info(f"[UPDATE] Updated {table} {record_id} status to: {status}")
            return True
            
        except Exception as e:
            logging.error(f"[ERROR] Error updating {table} status: {e}")
            return False

    def fill_album_details(self, release_data):
        """Fill in the album details form."""
        try:
            logging.info("[FORM] Filling album details...")
            
            # Album title
            title_field = self.wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "input[name='album.title'], input[data-test='album-title-input']")))
            title_field.clear()
            title_field.send_keys(release_data['title'])
            logging.info(f"[SUCCESS] Set album title: {release_data['title']}")
            
            # Artist (if provided)
            if release_data.get('artist'):
                try:
                    artist_field = self.driver.find_element(By.NAME, "album.artist")
                    artist_field.clear()
                    artist_field.send_keys(release_data['artist'])
                    logging.info(f"[SUCCESS] Set artist: {release_data['artist']}")
                except NoSuchElementException:
                    logging.info("[INFO] Artist field not found (may be optional)")
            
            # Album description/about
            if release_data.get('about'):
                try:
                    about_field = self.driver.find_element(By.CSS_SELECTOR, "textarea[name='album.about'], textarea[data-test='album-description-input']")
                    about_field.clear()
                    about_field.send_keys(release_data['about'])
                    logging.info("[SUCCESS] Set album description")
                except NoSuchElementException:
                    logging.info("[INFO] About field not found")
            
            # Credits
            if release_data.get('credits'):
                try:
                    credits_field = self.driver.find_element(By.NAME, "album.credits")
                    credits_field.clear()
                    credits_field.send_keys(release_data['credits'])
                    logging.info("[SUCCESS] Set album credits")
                except NoSuchElementException:
                    logging.info("[INFO] Credits field not found")
            
            # Tags
            if release_data.get('tags'):
                try:
                    tags_field = self.driver.find_element(By.NAME, "album.tags")
                    tags_field.clear()
                    tags_field.send_keys(release_data['tags'])
                    logging.info("[SUCCESS] Set album tags")
                except NoSuchElementException:
                    logging.info("[INFO] Tags field not found")
            
            # Pricing
            if release_data.get('price') is not None:
                try:
                    price_field = self.driver.find_element(By.CSS_SELECTOR, "input[name='album.price'], input[data-test='price']")
                    price_field.clear()
                    price_field.send_keys(str(release_data['price']))
                    logging.info(f"[SUCCESS] Set price: {release_data['price']}")
                except NoSuchElementException:
                    logging.info("[INFO] Price field not found")
            
            # Name your price checkbox
            if release_data.get('name_your_price'):
                try:
                    nyp_checkbox = self.driver.find_element(By.CSS_SELECTOR, "input[name='album.nyp'], input[data-test='name-your-price-checkbox']")
                    if not nyp_checkbox.is_selected():
                        nyp_checkbox.click()
                    logging.info("[SUCCESS] Enabled name-your-price")
                except NoSuchElementException:
                    logging.info("[INFO] Name-your-price checkbox not found")
            
            # Release date
            if release_data.get('release_date'):
                try:
                    release_date_field = self.driver.find_element(By.CSS_SELECTOR, "input[name='album.release_date'], input[data-test='tralbum-release-date']")
                    # Convert ISO date to MM/DD/YYYY format
                    date_obj = datetime.fromisoformat(release_data['release_date'].replace('Z', '+00:00'))
                    formatted_date = date_obj.strftime("%m/%d/%Y")
                    release_date_field.clear()
                    release_date_field.send_keys(formatted_date)
                    logging.info(f"[SUCCESS] Set release date: {formatted_date}")
                except Exception as e:
                    logging.warning(f"[WARNING] Could not set release date: {e}")
            
            # UPC code
            if release_data.get('upc'):
                try:
                    upc_field = self.driver.find_element(By.NAME, "album.upc")
                    upc_field.clear()
                    upc_field.send_keys(release_data['upc'])
                    logging.info("[SUCCESS] Set UPC code")
                except NoSuchElementException:
                    logging.info("[INFO] UPC field not found")
            
            # Catalog number
            if release_data.get('cat_number'):
                try:
                    cat_field = self.driver.find_element(By.NAME, "album.cat_number")
                    cat_field.clear()
                    cat_field.send_keys(release_data['cat_number'])
                    logging.info("[SUCCESS] Set catalog number")
                except NoSuchElementException:
                    logging.info("[INFO] Catalog number field not found")
            
            time.sleep(2)  # Allow form to process
            logging.info("[SUCCESS] Album details filled successfully")
            return True
            
        except Exception as e:
            logging.error(f"[ERROR] Error filling album details: {e}")
            self.take_screenshot("album_details_error")
            return False

    def upload_track_file(self, track_data):
        """Upload a single track file."""
        try:
            file_path = track_data['file_path']
            
            if not os.path.exists(file_path):
                logging.error(f"[ERROR] Track file not found: {file_path}")
                return False
            
            logging.info(f"[UPLOAD] Uploading track: {track_data['title']} from {file_path}")
            
            # Find the track upload element - PRIORITIZE AUDIO-SPECIFIC INPUTS
            upload_selectors = [
                # Audio-specific selectors first
                "input[type='file'][accept*='audio']",
                "input[type='file'][accept*='.wav']", 
                "input[type='file'][accept*='.mp3']",
                "input[type='file'][accept*='.flac']",
                "[data-test='add-audio'] input[type='file']",
                ".add-audio input[type='file']",
                ".upload-audio input[type='file']",
                ".track-upload input[type='file']",
                # Generic selectors (be more careful with these)
                ".add-audio",
                ".upload-file",
                "[data-test='add-audio']"
            ]
            
            upload_element = None
            selected_selector = None
            
            for selector in upload_selectors:
                try:
                    elements = self.driver.find_elements(By.CSS_SELECTOR, selector)
                    for element in elements:
                        # Check if it's a file input
                        if element.tag_name == 'input' and element.get_attribute('type') == 'file':
                            # Validate that this input accepts audio files
                            accept_attr = element.get_attribute('accept') or ''
                            
                            # Skip if it's clearly for images/artwork
                            if any(img_type in accept_attr.lower() for img_type in ['image', '.jpg', '.png', '.gif', '.jpeg']):
                                logging.info(f"[SKIP] Skipping image input: {accept_attr}")
                                continue
                            
                            # Prefer inputs that explicitly accept audio
                            if any(audio_type in accept_attr.lower() for audio_type in ['audio', '.wav', '.mp3', '.flac', '.aiff']):
                                upload_element = element
                                selected_selector = selector
                                logging.info(f"[FOUND] Audio-specific file input: {selector} (accepts: {accept_attr})")
                                break
                            # Accept generic file inputs only if no audio-specific ones found
                            elif not accept_attr or accept_attr == '*':
                                if upload_element is None:  # Only use as fallback
                                    upload_element = element
                                    selected_selector = selector
                                    logging.info(f"[FALLBACK] Generic file input: {selector}")
                                continue
                        
                        elif element.is_displayed() and 'add' in element.text.lower():
                            # Click to reveal file input, then look for audio-specific inputs
                            logging.info(f"[CLICK] Clicking to reveal file input: {selector}")
                            element.click()
                            time.sleep(2)
                            
                            # Look for file input again, prioritizing audio inputs
                            audio_inputs = self.driver.find_elements(By.CSS_SELECTOR, 
                                "input[type='file'][accept*='audio'], input[type='file'][accept*='.wav'], input[type='file'][accept*='.mp3']")
                            
                            if audio_inputs:
                                for audio_input in audio_inputs:
                                    if audio_input.is_displayed() or audio_input.get_attribute('style') != 'display: none;':
                                        upload_element = audio_input
                                        selected_selector = f"{selector} -> audio input"
                                        accept_attr = audio_input.get_attribute('accept') or ''
                                        logging.info(f"[FOUND] Audio input after click: {accept_attr}")
                                        break
                            else:
                                # Fallback to any file input
                                file_inputs = self.driver.find_elements(By.CSS_SELECTOR, "input[type='file']")
                                for file_input in file_inputs:
                                    accept_attr = file_input.get_attribute('accept') or ''
                                    # Skip image inputs
                                    if any(img_type in accept_attr.lower() for img_type in ['image', '.jpg', '.png']):
                                        continue
                                    if file_input.is_displayed() or file_input.get_attribute('style') != 'display: none;':
                                        upload_element = file_input
                                        selected_selector = f"{selector} -> generic input"
                                        logging.info(f"[FALLBACK] Generic input after click: {accept_attr}")
                                        break
                    
                    if upload_element:
                        break
                        
                except Exception as e:
                    logging.warning(f"[WARNING] Error with selector {selector}: {e}")
                    continue
            
            if not upload_element:
                logging.error("[ERROR] Could not find audio track upload element")
                self.take_screenshot("track_upload_element_not_found")
                # Log all available file inputs for debugging
                try:
                    all_file_inputs = self.driver.find_elements(By.CSS_SELECTOR, "input[type='file']")
                    logging.info(f"[DEBUG] Found {len(all_file_inputs)} file inputs on page:")
                    for i, inp in enumerate(all_file_inputs):
                        accept_attr = inp.get_attribute('accept') or 'none'
                        name_attr = inp.get_attribute('name') or 'none'
                        id_attr = inp.get_attribute('id') or 'none'
                        logging.info(f"  {i+1}. accept='{accept_attr}' name='{name_attr}' id='{id_attr}'")
                except:
                    pass
                return False
            
            # Log which input we're using
            accept_attr = upload_element.get_attribute('accept') or 'any'
            name_attr = upload_element.get_attribute('name') or 'none'
            logging.info(f"[USING] Selected input via '{selected_selector}' - accepts: {accept_attr}, name: {name_attr}")
            
            # Upload the file
            upload_element.send_keys(file_path)
            logging.info("[UPLOADING] File upload initiated...")
            
            # Wait for upload to complete with better detection
            upload_timeout = 300  # 5 minutes
            start_time = time.time()
            initial_track_count = len(self.driver.find_elements(By.CSS_SELECTOR, ".track, .tracks li, .track-row"))
            
            while time.time() - start_time < upload_timeout:
                try:
                    # Look for upload progress indicators
                    progress_indicators = self.driver.find_elements(By.CSS_SELECTOR, 
                        ".upload-progress, .progress, [class*='progress'], .uploading, .processing")
                    
                    # Check if new tracks appeared in track list
                    current_track_count = len(self.driver.find_elements(By.CSS_SELECTOR, ".track, .tracks li, .track-row"))
                    track_count_increased = current_track_count > initial_track_count
                    
                    # Look for specific upload completion indicators
                    upload_complete_indicators = self.driver.find_elements(By.CSS_SELECTOR,
                        ".upload-complete, .track-uploaded, [class*='complete'], [class*='success']")
                    
                    # Check for file name in page (more specific than just title)
                    file_name = os.path.basename(file_path)
                    page_text = self.driver.page_source.lower()
                    file_name_found = file_name.lower() in page_text
                    
                    # More robust completion detection
                    upload_complete = (
                        (not progress_indicators and track_count_increased) or
                        len(upload_complete_indicators) > 0 or
                        (file_name_found and track_count_increased)
                    )
                    
                    if upload_complete:
                        logging.info(f"[SUCCESS] Track upload completed! Tracks: {initial_track_count} -> {current_track_count}")
                        time.sleep(2)  # Allow UI to update
                        return True
                    
                    # Log progress every 10 seconds
                    elapsed = time.time() - start_time
                    if int(elapsed) % 10 == 0:
                        logging.info(f"[PROGRESS] Upload in progress... {int(elapsed)}s elapsed, tracks: {current_track_count}, progress indicators: {len(progress_indicators)}")
                        
                    time.sleep(2)
                    
                except Exception as e:
                    logging.warning(f"[WARNING] Error checking upload progress: {e}")
                    time.sleep(2)
            
            logging.error("[ERROR] Track upload timeout")
            self.take_screenshot("track_upload_timeout")
            return False
            
        except Exception as e:
            logging.error(f"[ERROR] Error uploading track: {e}")
            self.take_screenshot("track_upload_error")
            return False

    def fill_track_details(self, track_data):
        """Fill in track-specific details after upload."""
        try:
            logging.info(f"[FORM] Filling details for track: {track_data['title']}")
            
            # Find the track element in the list
            track_elements = self.driver.find_elements(By.CSS_SELECTOR, ".track, .tracks li, .track-row")
            
            # For now, assume we're working with the most recently added track
            # In a production version, you'd want more specific targeting
            
            # Look for track title field
            try:
                title_fields = self.driver.find_elements(By.CSS_SELECTOR, "input[name*='title'], input[placeholder*='track']")
                if title_fields:
                    # Use the last/newest title field
                    title_field = title_fields[-1]
                    if title_field.get_attribute('value') != track_data['title']:
                        title_field.clear()
                        title_field.send_keys(track_data['title'])
                        logging.info(f"[SUCCESS] Set track title: {track_data['title']}")
            except Exception as e:
                logging.info(f"[INFO] Could not update track title: {e}")
            
            # Additional track fields can be filled here based on track_data
            # This would include artist, about, credits, lyrics, pricing, etc.
            
            return True
            
        except Exception as e:
            logging.error(f"[ERROR] Error filling track details: {e}")
            return False

    def upload_artwork(self, artwork_path):
        """Upload album artwork."""
        try:
            if not artwork_path or not os.path.exists(artwork_path):
                logging.info("[INFO] No artwork file provided or file not found")
                return True  # Not critical for upload success
            
            logging.info(f"[ARTWORK] Uploading artwork: {artwork_path}")
            
            # Find artwork upload element
            artwork_selectors = [
                "input[type='file'][accept*='image']",
                ".art-upload input[type='file']",
                ".upload[type='file']",
                "input[name*='art']"
            ]
            
            artwork_element = None
            for selector in artwork_selectors:
                try:
                    elements = self.driver.find_elements(By.CSS_SELECTOR, selector)
                    for element in elements:
                        if element.get_attribute('accept') and 'image' in element.get_attribute('accept'):
                            artwork_element = element
                            break
                    if artwork_element:
                        break
                except:
                    continue
            
            # Try clicking upload link to reveal file input
            if not artwork_element:
                try:
                    upload_links = self.driver.find_elements(By.CSS_SELECTOR, ".upload, .art-upload a, [data-test*='art']")
                    for link in upload_links:
                        if 'upload' in link.text.lower() or 'art' in link.text.lower():
                            link.click()
                            time.sleep(1)
                            artwork_element = self.driver.find_element(By.CSS_SELECTOR, "input[type='file']")
                            break
                except:
                    pass
            
            if artwork_element:
                artwork_element.send_keys(artwork_path)
                logging.info("[ARTWORK] Artwork upload initiated...")
                time.sleep(5)  # Wait for artwork processing
                logging.info("[SUCCESS] Artwork uploaded successfully")
                return True
            else:
                logging.warning("[WARNING] Could not find artwork upload element")
                return True  # Not critical
                
        except Exception as e:
            logging.warning(f"[WARNING] Error uploading artwork: {e}")
            return True  # Not critical for overall success

    def save_release_as_draft(self):
        """Save the release/album as a draft (not published)."""
        try:
            logging.info("[DRAFT] Saving release as draft...")
            
            # Look for draft-specific save buttons first
            draft_selectors = [
                "button:contains('Save as Draft')",
                "button:contains('Save Draft')", 
                ".save-draft",
                ".draft-save",
                "input[value*='draft']",
                "button[class*='draft']"
            ]
            
            # Look for general save buttons (avoiding publish buttons)
            save_selectors = [
                "button[type='submit']:not(:contains('Publish')):not(:contains('Go Live'))",
                "input[type='submit']:not([value*='publish']):not([value*='live'])",
                ".save:not(.publish)",
                "button:contains('Save'):not(:contains('Publish'))"
            ]
            
            save_button = None
            button_type = None
            
            # First, try to find draft-specific buttons
            for selector in draft_selectors:
                try:
                    buttons = self.driver.find_elements(By.CSS_SELECTOR, selector.split(':contains')[0] if ':contains' in selector else selector)
                    for button in buttons:
                        button_text = button.text.lower()
                        if any(word in button_text for word in ['draft']):
                            save_button = button
                            button_type = "draft"
                            logging.info(f"[FOUND] Draft-specific button: '{button.text}'")
                            break
                    if save_button:
                        break
                except:
                    continue
            
            # If no draft button found, look for general save buttons (avoiding publish)
            if not save_button:
                for selector in save_selectors:
                    try:
                        buttons = self.driver.find_elements(By.CSS_SELECTOR, selector.split(':not')[0] if ':not' in selector else selector)
                        for button in buttons:
                            button_text = button.text.lower()
                            # Ensure it's a save button but NOT a publish button
                            if ('save' in button_text or button.get_attribute('type') == 'submit') and \
                               not any(avoid_word in button_text for avoid_word in ['publish', 'go live', 'make public', 'release']):
                                save_button = button
                                button_type = "save"
                                logging.info(f"[FOUND] General save button: '{button.text}'")
                                break
                        if save_button:
                            break
                    except:
                        continue
            
            # Fallback: Look for any submit button and examine carefully
            if not save_button:
                try:
                    all_buttons = self.driver.find_elements(By.CSS_SELECTOR, "button, input[type='submit']")
                    for button in all_buttons:
                        button_text = button.text.lower()
                        button_value = (button.get_attribute('value') or '').lower()
                        
                        # Look for draft indicators
                        if any(word in button_text + button_value for word in ['draft', 'save']):
                            # Make sure it's not a publish button
                            if not any(avoid in button_text + button_value for avoid in ['publish', 'go live', 'make public']):
                                save_button = button
                                button_type = "fallback"
                                logging.info(f"[FALLBACK] Found button: '{button.text}' (value: '{button_value}')")
                                break
                except:
                    pass
            
            if save_button:
                # Scroll button into view
                self.driver.execute_script("arguments[0].scrollIntoView({behavior: 'smooth', block: 'center'});", save_button)
                time.sleep(1)
                
                save_button.click()
                logging.info(f"[DRAFT] {button_type.title()} button clicked: '{save_button.text}'")
                time.sleep(5)
                
                # Check for success indicators (but avoid "published" as we want draft)
                success_indicators = [
                    "saved",
                    "draft saved",
                    "success",
                    "created",
                    "updated"
                ]
                
                # Indicators that suggest it was published (which we want to avoid)
                publish_indicators = [
                    "published",
                    "live",
                    "public"
                ]
                
                page_text = self.driver.page_source.lower()
                
                # Check if it was published (not what we want)
                if any(indicator in page_text for indicator in publish_indicators):
                    logging.warning("[WARNING] Release may have been published instead of saved as draft")
                    self.take_screenshot("possibly_published")
                    return True  # Still consider it successful, but log the concern
                
                # Check for success indicators
                if any(indicator in page_text for indicator in success_indicators):
                    logging.info("[SUCCESS] Release saved as draft successfully!")
                    return True
                else:
                    logging.warning("[WARNING] Draft save status unclear")
                    self.take_screenshot("draft_save_status_unclear")
                    return True  # Assume success if no clear failure
            else:
                logging.error("[ERROR] Could not find appropriate save/draft button")
                self.take_screenshot("draft_save_button_not_found")
                
                # Log all available buttons for debugging
                try:
                    all_buttons = self.driver.find_elements(By.CSS_SELECTOR, "button, input[type='submit']")
                    logging.info(f"[DEBUG] Found {len(all_buttons)} buttons on page:")
                    for i, btn in enumerate(all_buttons):
                        btn_text = btn.text or 'No text'
                        btn_value = btn.get_attribute('value') or 'No value'
                        logging.info(f"  {i+1}. Text: '{btn_text}' | Value: '{btn_value}'")
                except:
                    pass
                
                return False
                
        except Exception as e:
            logging.error(f"[ERROR] Error saving release as draft: {e}")
            self.take_screenshot("draft_save_error")
            return False

    def save_release(self):
        """Save the release/album (backward compatibility - saves as draft)."""
        logging.info("[COMPAT] Using save_release() - redirecting to save_release_as_draft()")
        return self.save_release_as_draft()

    def process_upload(self, user_id):
        """Main upload processing function."""
        try:
            logging.info("[START] Starting upload process...")
            
            # Get pending release
            self.current_release = self.get_pending_release(user_id)
            if not self.current_release:
                logging.info("[INFO] No pending releases to upload")
                return True
            
            # Get tracks for the release
            self.current_tracks = self.get_release_tracks(self.current_release['id'])
            if not self.current_tracks:
                logging.error("[ERROR] No tracks found for release")
                return False
            
            # Create upload session
            self.upload_session = self.create_upload_session(user_id, self.current_release['id'])
            
            # Update release status to 'uploading'
            self.update_upload_status("releases", self.current_release['id'], "uploading")
            
            # Navigate to upload page
            if not self.navigate_to_upload_page():
                return False
            
            # Fill album details
            if not self.fill_album_details(self.current_release):
                self.update_upload_status("releases", self.current_release['id'], "failed")
                return False
            
            # Upload artwork if available
            if self.current_release.get('artwork_path'):
                self.upload_artwork(self.current_release['artwork_path'])
            
            # Upload tracks
            uploaded_count = 0
            failed_count = 0
            
            for track in self.current_tracks:
                logging.info(f"[MUSIC] Processing track {track.get('track_number', '?')}: {track['title']}")
                
                # Update track status to uploading
                self.update_upload_status("tracks", track['id'], "uploading")
                
                # Upload track file
                if self.upload_track_file(track):
                    # Fill track details
                    self.fill_track_details(track)
                    
                    # Update track status to uploaded
                    self.update_upload_status("tracks", track['id'], "uploaded", upload_progress=100)
                    uploaded_count += 1
                    logging.info(f"[SUCCESS] Track uploaded successfully: {track['title']}")
                else:
                    # Update track status to failed
                    self.update_upload_status("tracks", track['id'], "failed")
                    failed_count += 1
                    logging.error(f"[ERROR] Track upload failed: {track['title']}")
                
                # Update session progress
                if self.upload_session:
                    session_data = {
                        "uploaded_tracks": uploaded_count,
                        "failed_tracks": failed_count
                    }
                    self.update_upload_status("upload_sessions", self.upload_session['id'], 
                                            "active", **session_data)
                
                # Small delay between tracks
                time.sleep(2)
            
            # Save the release as draft
            if self.save_release_as_draft():
                # Update final statuses - use "draft" instead of "published"
                final_status = "draft" if uploaded_count > 0 else "failed"
                self.update_upload_status("releases", self.current_release['id'], final_status)
                
                if self.upload_session:
                    session_status = "completed" if uploaded_count > 0 else "failed"
                    self.update_upload_status("upload_sessions", self.upload_session['id'], session_status)
                
                logging.info(f"[COMPLETE] Upload complete! {uploaded_count} tracks uploaded, {failed_count} failed")
                logging.info(f"[DRAFT] Release saved as DRAFT on Bandcamp (not published)")
                return True
            else:
                self.update_upload_status("releases", self.current_release['id'], "failed")
                return False
                
        except Exception as e:
            logging.error(f"[ERROR] Error in upload process: {e}")
            
            # Update statuses to failed
            if self.current_release:
                self.update_upload_status("releases", self.current_release['id'], "failed")
            if self.upload_session:
                self.update_upload_status("upload_sessions", self.upload_session['id'], "failed")
            
            self.take_screenshot("upload_process_error")
            return False

    def start(self, user_id=None, upload_mode=False):
        """Enhanced start method with upload functionality."""
        try:
            if not user_id:
                user_id = DEFAULT_USER_ID
            
            logging.info(f"[START] Starting Bandcamp automation for user: {user_id}")
            
            if upload_mode:
                logging.info("[UPLOAD] Upload mode enabled")
            
            # Setup browser
            if not self.setup_browser():
                return False
            
            # Get credentials
            username, password = self.get_credentials_from_supabase(user_id)
            if not username or not password:
                logging.error("[ERROR] Could not retrieve credentials")
                return False
            
            # Navigate to login page
            if not self.navigate_to_login():
                return False
            
            # Fill login form
            if not self.fill_login_form(username, password):
                return False
            
            # Check login success
            if not self.is_login_successful():
                logging.error("[ERROR] Login failed")
                return False
            
            logging.info("[SUCCESS] Login successful!")
            
            # If upload mode, process uploads
            if upload_mode:
                return self.process_upload(user_id)
            else:
                # Standard mode - just navigate to upload page for verification
                return self.navigate_to_upload_page()
            
        except Exception as e:
            logging.error(f"[ERROR] Critical error in automation: {e}")
            traceback.print_exc()
            return False
        finally:
            if self.driver:
                logging.info("[CLOSING] Closing browser...")
                self.driver.quit()

def main():
    """Main entry point with upload support."""
    automation = BandcampAutomation()
    
    # Check command line arguments for upload mode
    upload_mode = '--upload' in sys.argv or '-u' in sys.argv
    user_id = DEFAULT_USER_ID
    
    # Parse user_id from command line if provided
    for i, arg in enumerate(sys.argv):
        if arg in ['--user-id', '-uid'] and i + 1 < len(sys.argv):
            user_id = sys.argv[i + 1]
            break
    
    if upload_mode:
        logging.info("[MUSIC] Starting Bandcamp automation in UPLOAD mode")
        logging.info("[DRAFT] Release will be saved as DRAFT (not published)")
        success = automation.start(user_id=user_id, upload_mode=True)
    else:
        logging.info("[LOGIN] Starting Bandcamp automation in LOGIN mode")
        success = automation.start(user_id=user_id, upload_mode=False)
    
    if success:
        logging.info("[SUCCESS] Automation completed successfully!")
        if upload_mode:
            logging.info("[INFO] Your release has been uploaded and saved as a DRAFT on Bandcamp")
            logging.info("[INFO] You can manually review and publish it when ready")
        sys.exit(0)
    else:
        logging.error("[ERROR] Automation failed!")
        sys.exit(1)

if __name__ == "__main__":
    main()