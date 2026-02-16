from __future__ import annotations

import logging
import time
from twocaptcha import TwoCaptcha

from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.remote.webdriver import WebDriver

from pathlib import Path

import traceback

from main import (
    random_delay,
    wait_for_element_clickable,
    find_recaptcha_sitekey,
    safe_click,
    solve_captcha,
    inject_recaptcha_token,
)
from supabase_utils import BandcampCreds
from album import TrackModel, AlbumModel


BANDCAMP_LOGIN_URL = "https://bandcamp.com/login"
SELENIUM_DEFAULT_TIMEOUT = 45  # seconds


def bandcamp_login_strict(driver, creds: BandcampCreds, solver: TwoCaptcha) -> bool:
    """Improved login flow with proper JavaScript framework handling and timing."""

    # 1) Open Bandcamp login page
    logging.info("[LOGIN] Opening Bandcamp login page...")
    driver.get(BANDCAMP_LOGIN_URL)

    # Brief delay after page load
    random_delay(0.3, 0.8)

    # Wait for cookies popup to appear
    logging.info("[LOGIN] Waiting for cookies popup...")

    time.sleep(2)  # wait for 2 seconds to ensure popup is fully loaded

    action_chains = ActionChains(driver)
    action_chains.send_keys(Keys.TAB * 26 + Keys.ENTER)
    action_chains.perform()

    # NOTE: it is easier to avoid the account chooser by using your USERNAME to log in and
    # not your EMAIL. If you must use email, use the following block to handle it.
    account_chooser_needed = False
    if account_chooser_needed:
        # wait for class "chooser-message" to appear
        logging.info("[LOGIN] Waiting for account chooser message...")
        try:
            chooser = WebDriverWait(driver, 10).until(
                EC.visibility_of_element_located((By.CLASS_NAME, "chooser"))
            )
        except TimeoutException:
            raise SystemExit("[LOGIN] Account chooser message did not appear")

        # get the select element that is a child of chooser
        select_elem = chooser.find_element(By.TAG_NAME, "select")

    # 2) Wait for login form to appear
    logging.info("[LOGIN] Waiting for login form...")
    WebDriverWait(driver, 10).until(
        EC.visibility_of_element_located((By.ID, "loginform"))
    )

    try:
        user_el = WebDriverWait(driver, SELENIUM_DEFAULT_TIMEOUT).until(
            EC.element_to_be_clickable((By.ID, "username-field"))
        )
        pass_el = WebDriverWait(driver, SELENIUM_DEFAULT_TIMEOUT).until(
            EC.element_to_be_clickable((By.ID, "password-field"))
        )
    except Exception:
        raise SystemExit("[LOGIN] Login input fields not found or not interactive")

    # 5) Fill credentials with retry logic
    logging.info("[LOGIN] Filling in credentials...")

    # Brief pause before starting to type
    random_delay(0.1, 0.3)

    # send keys for username + Keys.TAB + password + Keys.ENTER
    user_el.send_keys(creds.username + Keys.TAB + creds.password + Keys.ENTER)

    # 7) Wait for page response and handle different scenarios
    # Human-like wait for page to process (varies based on connection speed)
    random_delay(2.0, 4.0)

    # Check if we're still on login page (indicating possible failure or additional steps)
    current_url = driver.current_url
    if "login" in current_url:
        # Check for post-submission CAPTCHA
        sitekey = find_recaptcha_sitekey(driver)
        if sitekey:
            logging.info(
                "[CAPTCHA] CAPTCHA appeared after login submission, solving..."
            )
            token = solve_captcha(solver, sitekey, driver.current_url)
            inject_recaptcha_token(driver, token)
            # Re-find and click submit button after CAPTCHA
            try:
                submit_el = wait_for_element_clickable(
                    driver, (By.CSS_SELECTOR, "button[type='submit']"), SELENIUM_DEFAULT_TIMEOUT
                )
                if not safe_click(driver, submit_el):
                    logging.warning("[LOGIN] Failed to click submit after CAPTCHA")
            except Exception:
                logging.warning("[LOGIN] Submit button not found after CAPTCHA")
            random_delay(2.0, 4.0)  # Human-like delay after CAPTCHA submission

        # Check for account selection page
        if _handle_account_selection(driver, creds, SELENIUM_DEFAULT_TIMEOUT):
            random_delay(2.0, 4.0)  # Human-like delay after account selection

        # Check for 2FA
        if _handle_two_factor(driver, SELENIUM_DEFAULT_TIMEOUT):
            logging.warning("[LOGIN] 2FA detected but not implemented in this script")

    # 8) Verify login success
    try:
        WebDriverWait(driver, SELENIUM_DEFAULT_TIMEOUT).until(
            lambda d: "login" not in d.current_url.lower()
        )
        logging.info("[LOGIN] Login successful - URL changed from login page")
        return True
    except TimeoutException:
        # Check for error messages
        try:
            error_selectors = [
                ".alert",
                ".error",
                ".message-error",
                ".form-error",
                "[data-bind*='error']",
                ".validation-error",
            ]
            for selector in error_selectors:
                try:
                    err = driver.find_element(By.CSS_SELECTOR, selector)
                    if err.is_displayed() and err.text.strip():
                        logging.error(f"[LOGIN] Bandcamp error: {err.text.strip()}")
                        break
                except Exception:
                    continue
        except Exception:
            pass

        logging.error(
            f"[LOGIN] Login did not complete. Current URL: {driver.current_url}"
        )
        raise SystemExit("Login did not complete within timeout")


def upload_album(driver: WebDriver, bandcamp_url: str, album: AlbumModel) -> bool:
    """Upload an album to Bandcamp using the provided album data."""

    action_chains = ActionChains(driver)
    action_chains.send_keys(Keys.TAB * 2 + Keys.ENTER)
    action_chains.perform()

    driver.get(f"https://{bandcamp_url}/edit_album")

    try:
        enter_album_details(driver, album)
        enter_track_details(driver, album)
        return True
    except Exception as e:
        logging.error(f"[UPLOAD] Album upload failed: {e}")
        traceback.print_exc()
        return False


def enter_album_details(driver, album: AlbumModel):
    logging.info("About to enter album name")
    time.sleep(1)
    album_name_el = WebDriverWait(driver, 10).until(
        EC.visibility_of_element_located((By.CSS_SELECTOR, ".album-title input"))
    )
    album_name_el.send_keys(album.album_name)

    if album.release_date:
        logging.info("About to enter album release date")
        time.sleep(1)
        album_release_date_el = WebDriverWait(driver, 10).until(
            EC.visibility_of_element_located((By.NAME, "album.release_date"))
        )
        album_release_date_el.send_keys(album.release_date)

    logging.info("About to enter album price")
    time.sleep(1)
    album_price_el = WebDriverWait(driver, 10).until(
        EC.visibility_of_element_located((By.NAME, "album.price"))
    )
    album_price_el.clear()
    album_price_el.send_keys(str(album.album_price))

    if album.enable_fans_to_pay_more:
        logging.info("About to select enable fans to pay more checkbox")
        time.sleep(1)
        album_nyp_el = WebDriverWait(driver, 10).until(
            EC.visibility_of_element_located((By.NAME, "album.nyp"))
        )
        album_nyp_el.click()

    time.sleep(1)
    if album.description:
        description_el = WebDriverWait(driver, 10).until(
            EC.visibility_of_element_located((By.LINK_TEXT, "description"))
        )
        description_el.click()

        description_input_el = WebDriverWait(driver, 10).until(
            EC.visibility_of_element_located((By.NAME, "album.download_desc"))
        )
        description_input_el.send_keys(album.description)
    time.sleep(1)

    if album.album_art:
        album_art_upload_el = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, ".album-panel input[type='file']"))
        )
        album_art_upload_el.send_keys(str(Path(album.album_art).expanduser().resolve()))
    time.sleep(1)
    if album.artist_name:
        album_artist_name_el = WebDriverWait(driver, 10).until(
            EC.visibility_of_element_located((By.NAME, "album.artist"))
        )
        album_artist_name_el.send_keys(album.artist_name)
    time.sleep(1)
    if album.about_this_album:
        about_this_album_el = WebDriverWait(driver, 10).until(
            EC.visibility_of_element_located((By.NAME, "album.about"))
        )
        about_this_album_el.send_keys(album.about_this_album)
    time.sleep(1)
    if album.album_credits:
        album_credits_el = WebDriverWait(driver, 10).until(
            EC.visibility_of_element_located((By.NAME, "album.credits"))
        )
        album_credits_el.send_keys(album.album_credits)
    time.sleep(1)
    if album.tags:
        tags_el = WebDriverWait(driver, 10).until(
            EC.visibility_of_element_located((By.NAME, "album.tags"))
        )
        tags_el.send_keys(", ".join(album.tags))
    time.sleep(1)
    if album.upc_ean_code:
        upc_ean_code_el = WebDriverWait(driver, 10).until(
            EC.visibility_of_element_located((By.NAME, "album.upc"))
        )
        upc_ean_code_el.send_keys(album.upc_ean_code)
    time.sleep(1)
    if album.catalog_number:
        catalog_number_el = WebDriverWait(driver, 10).until(
            EC.visibility_of_element_located((By.NAME, "album.cat_number"))
        )
        catalog_number_el.send_keys(album.catalog_number)
    if album.songwriters_list:
        songwriters_list_el = WebDriverWait(driver, 10).until(
            EC.visibility_of_element_located((By.ID, "composer-input"))
        )
        # TODO: do songwriter and publisher input
    if album.publishers_list:
        publisher_list_el = WebDriverWait(driver, 10).until(
            EC.visibility_of_element_located((By.ID, "publisher-input"))
        )
        # TODO: do songwriter and publisher input
    time.sleep(1)
    if album.visibility == "public":
        public_radio_el = WebDriverWait(driver, 10).until(
            EC.visibility_of_element_located((By.ID, "public-radio"))
        )
        public_radio_el.click()
    elif album.visibility == "private":
        private_radio_el = WebDriverWait(driver, 10).until(
            EC.visibility_of_element_located((By.ID, "private-radio"))
        )
        private_radio_el.click()

    time.sleep(3)
    return True


def enter_track_details(driver, album: AlbumModel):

    for i, track in enumerate(album.track_files):
        logging.info("About to upload track file")
        time.sleep(1)
        track_upload_el = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, ".add-audio input[type='file']"))
        )
        track_upload_el.send_keys(str(Path(track.track_file_path).expanduser().resolve()))

        logging.info("About to enter track name")
        time.sleep(1)
        track_name_el = WebDriverWait(driver, 10).until(
            EC.visibility_of_element_located((By.NAME, f"track.title_{str(i)}"))
        )
        track_name_el.send_keys(track.track_name)

        if not track.enable_streaming:
            logging.info("About to deselect enable streaming checkbox")
            time.sleep(1)
            track_enable_streaming_el = WebDriverWait(driver, 10).until(
                EC.visibility_of_element_located((By.NAME, f"track.streaming_{str(i)}"))
            )
            track_enable_streaming_el.click()

        if not track.enable_individual_purchase:
            logging.info("About to deselect enable individual purchase checkbox")
            time.sleep(1)
            track_enable_individual_purchase_el = WebDriverWait(driver, 10).until(
                EC.visibility_of_element_located((By.NAME, f"track.enable_download_{str(i)}"))
            )
            track_enable_individual_purchase_el.click()

        logging.info("About to enter track price")
        time.sleep(1)
        track_price_el = WebDriverWait(driver, 10).until(
            EC.visibility_of_element_located((By.NAME, f"track.price_{str(i)}"))
        )
        track_price_el.clear()
        track_price_el.send_keys(str(track.track_price))

        if track.description:
            logging.info("About to enter track description")
            time.sleep(1)
            description_el = WebDriverWait(driver, 10).until(
                EC.visibility_of_element_located((By.LINK_TEXT, "description"))
            )
            description_el.click()

            description_input_el = WebDriverWait(driver, 10).until(
                EC.visibility_of_element_located((By.NAME, f"track.download_desc_{str(i)}"))
            )
            description_input_el.send_keys(track.description)

        if track.about_this_track:
            logging.info("About to enter 'About this track'")
            time.sleep(1)
            about_this_track_el = WebDriverWait(driver, 10).until(
                EC.visibility_of_element_located((By.NAME, f"track.about_{str(i)}"))
            )
            about_this_track_el.send_keys(track.about_this_track)

        if track.lyrics:
            logging.info("About to enter lyrics")
            lyrics_el = WebDriverWait(driver, 10).until(
                EC.visibility_of_element_located((By.NAME, f"track.lyrics_{str(i)}"))
            )
            lyrics_el.send_keys(track.lyrics)

        if track.track_credits:
            logging.info("About to enter credits")
            credits_el = WebDriverWait(driver, 10).until(
                EC.visibility_of_element_located((By.NAME, f"track.credits_{str(i)}"))
            )
            credits_el.send_keys(track.track_credits)

        # TODO: video

        if track.track_artist_name:
            track_artist_name_el = WebDriverWait(driver, 10).until(
                EC.visibility_of_element_located((By.NAME, f"track.artist_{str(i)}"))
            )
            track_artist_name_el.send_keys(track.track_artist_name)

        if track.track_art_path:
            track_art_upload_el = WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, ".art-upload input[type='file']"))
            )
            track_art_upload_el.send_keys(str(Path(track.track_art_path).expanduser().resolve()))

        if track.track_tags:
            tags_el = WebDriverWait(driver, 10).until(
                EC.visibility_of_element_located((By.NAME, f"track.tags_{str(i)}"))
            )
            tags_el.send_keys(", ".join(track.track_tags))

        if track.license:
            select_license_by_value(driver, track.license)

        # TODO: publishing rights
        # TODO: do songwriter and publisher input

        if track.isrc:
            isrc_el = WebDriverWait(driver, 10).until(
                EC.visibility_of_element_located((By.NAME, f"track.isrc_{str(i)}"))
            )
            isrc_el.send_keys(track.isrc)

        if track.iswc:
            iswc_el = WebDriverWait(driver, 10).until(
                EC.visibility_of_element_located((By.NAME, f"track.iswc_{str(i)}"))
            )
            iswc_el.send_keys(track.iswc)

        if track.track_release_date:
            track_release_date_el = WebDriverWait(driver, 10).until(
                EC.visibility_of_element_located((By.NAME, f"track.release_date_{str(i)}"))
            )
            track_release_date_el.send_keys(track.track_release_date)

        if track.is_bonus_track:
            track_bonus_track_el = WebDriverWait(driver, 10).until(
                EC.visibility_of_element_located((By.NAME, f"track.private_{str(i)}"))
            )
            track_bonus_track_el.click()

    logging.info("About to save draft")
    time.sleep(5)
    # save draft
    save_draft_el = WebDriverWait(driver, 10).until(
        EC.element_to_be_clickable((By.CSS_SELECTOR, 'a[data-test="save-draft-button"]'))
    )
    driver.execute_script("arguments[0].scrollIntoView({block:'center'});", save_draft_el)
    save_draft_el.click()

    draft_saved_el = WebDriverWait(driver, 10).until(
        EC.visibility_of_element_located((By.CSS_SELECTOR, 'a[data-test="draft-saved-button"]'))
    )
    logging.info("Draft saved. Exiting in 5 seconds")
    time.sleep(5)


def select_license_by_value(driver, license, timeout=10):
    """
    Selects a license radio button by its value attribute.
    Example values: "1", "2", "3", "4", "5", "6", "8"
    """
    licenses = {
        "ALL_RIGHTS_RESERVED": "1",
        "BY_NC_ND": "2",
        "BY_NC_SA": "3",
        "BY_NC": "4",
        "BY_ND": "5",
        "BY": "6",
        "BY_SA": "8"
    }

    license_value = licenses[license]

    radio = WebDriverWait(driver, timeout).until(
        EC.element_to_be_clickable((
            By.CSS_SELECTOR,
            f'input[type="radio"][name="track.license_type_0"][value="{license_value}"]'
        ))
    )

    driver.execute_script("arguments[0].scrollIntoView({block:'center'});", radio)
    radio.click()

def _handle_account_selection(driver, creds: BandcampCreds, timeout: int) -> bool:
    """Handle account selection page if it appears."""
    try:
        # Wait for account selection dropdown
        WebDriverWait(driver, 5).until(
            EC.visibility_of_element_located((By.CSS_SELECTOR, "select"))
        )

        logging.info("[ACCOUNT] Account selection page detected")

        # Human-like pause when encountering account selection
        random_delay(1.0, 2.5)

        account_dropdown = driver.find_element(By.CSS_SELECTOR, "select")

        # Wait for dropdown options to actually load (not just the dropdown itself)
        WebDriverWait(driver, 10).until(
            lambda d: len(
                d.find_element(By.CSS_SELECTOR, "select").find_elements(
                    By.TAG_NAME, "option"
                )
            )
            > 1
        )
        logging.info("[ACCOUNT] Account options loaded")

        from selenium.webdriver.support.ui import Select

        select = Select(account_dropdown)

        # Get all available options first
        options = select.options
        logging.info(f"[ACCOUNT] Found {len(options)} account options:")
        for i, option in enumerate(options):
            option_text = option.text.strip()
            logging.info(f"[ACCOUNT]   {i}: '{option_text}'")

        # Try to select by account name with multiple methods
        selected = False

        # Method 1: Exact match
        try:
            select.select_by_visible_text(creds.account_name)
            logging.info(f"[ACCOUNT] Selected by exact match: {creds.account_name}")
            selected = True
        except Exception:
            pass

        # Method 2: Partial match (account name appears anywhere in the option text)
        if not selected:
            for i, option in enumerate(options):
                option_text = option.text.strip()
                if creds.account_name.lower() in option_text.lower():
                    select.select_by_index(i)
                    logging.info(
                        f"[ACCOUNT] Selected by partial match (index {i}): '{option_text}'"
                    )
                    selected = True
                    break

        # Method 3: Fallback to first non-placeholder option
        if not selected:
            if len(options) > 1:
                select.select_by_index(1)
                logging.info(
                    f"[ACCOUNT] Selected fallback option (index 1): '{options[1].text.strip()}'"
                )
                selected = True
            else:
                logging.warning("[ACCOUNT] No selectable account options found")

        # Click login button after selection
        try:
            # Human-like pause before clicking login (reviewing selection)
            random_delay(0.8, 1.8)

            login_btn = wait_for_element_clickable(
                driver, (By.XPATH, "//button[contains(text(), 'Log In')]"), 10
            )
            safe_click(driver, login_btn)
            logging.info("[ACCOUNT] Clicked login after account selection")
            return True
        except Exception as e:
            logging.error(f"[ACCOUNT] Failed to click login after selection: {e}")
            return False

    except TimeoutException:
        # No account selection page
        return False
    except Exception as e:
        logging.error(f"[ACCOUNT] Error during account selection: {e}")
        return False


def _handle_two_factor(driver, timeout: int) -> bool:
    """Check if 2FA is required."""
    try:
        WebDriverWait(driver, 3).until(
            EC.visibility_of_element_located((By.ID, "twofactor-field"))
        )
        logging.warning("[2FA] Two-factor authentication required but not supported")
        return True
    except TimeoutException:
        return False
