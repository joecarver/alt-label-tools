"""FastAPI server for triggering Bandcamp album uploads."""
from __future__ import annotations

import logging
import os
import sys
import tempfile
import threading
from pathlib import Path

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)

app = FastAPI(title="Bandcamp Auto Uploader")


class UploadRequest(BaseModel):
    release_id: str
    task_id: str | None = None
    headless: bool = True


class UploadResponse(BaseModel):
    success: bool
    message: str


def _run_upload(release_id: str, task_id: str | None, headless: bool):
    """Run the upload process in a background thread."""
    try:
        # Import here to avoid circular imports and keep startup fast
        from main import make_driver, load_settings
        from captcha_utils import init_2captcha
        from login import bandcamp_login_strict, upload_album
        from supabase_utils import SupabaseUtils, load_bandcamp_creds
        from drive_utils import (
            download_folder_contents,
            filter_audio_files,
            filter_image_files,
        )
        from data_mapper import build_album_model

        logging.info(f"[SERVER] Starting upload for release_id={release_id}")

        # Load settings and credentials from env
        settings = load_settings()
        creds = load_bandcamp_creds()

        # Fetch release data from Supabase
        sb = SupabaseUtils(
            os.getenv("SUPABASE_URL"),
            os.getenv("SUPABASE_ANON_KEY"),
        )
        release_data = sb.fetch_release_data(release_id)
        if not release_data:
            logging.error(f"[SERVER] No release found for release_id={release_id}")
            _update_task_status(task_id, "failed", "Release not found")
            return

        logging.info(f"[SERVER] Release: {release_data['name']}")

        # Get the bandcamp_url from the artist record
        artists = release_data.get("artists") or []
        bandcamp_url = None
        for artist in artists:
            url = artist.get("bandcamp_url")
            if url:
                # Extract subdomain from full URL (e.g. "https://artist.bandcamp.com/" -> "artist.bandcamp.com")
                bandcamp_url = url.replace("https://", "").replace("http://", "").rstrip("/")
                break

        if not bandcamp_url:
            logging.error("[SERVER] No bandcamp_url found on any artist for this release")
            _update_task_status(task_id, "failed", "No Bandcamp URL found for artist")
            return

        logging.info(f"[SERVER] Bandcamp URL: {bandcamp_url}")

        # Download files to temp directory
        with tempfile.TemporaryDirectory() as tmpdir:
            tmpdir_path = Path(tmpdir)

            # Download masters (audio files)
            masters_folder_id = release_data.get("masters_folder_id")
            track_file_paths = []
            if masters_folder_id:
                masters_dir = tmpdir_path / "masters"
                masters_dir.mkdir()
                downloaded = download_folder_contents(masters_folder_id, masters_dir)
                track_file_paths = filter_audio_files(downloaded)
                logging.info(f"[SERVER] Downloaded {len(track_file_paths)} audio files")
            else:
                logging.warning("[SERVER] No masters_folder_id on release")

            # Download artwork
            artwork_folder_id = release_data.get("artwork_folder_id")
            artwork_path = None
            if artwork_folder_id:
                artwork_dir = tmpdir_path / "artwork"
                artwork_dir.mkdir()
                artwork_files = download_folder_contents(artwork_folder_id, artwork_dir)
                image_files = filter_image_files(artwork_files)
                if image_files:
                    artwork_path = image_files[0]  # Use first image found
                    logging.info(f"[SERVER] Using artwork: {artwork_path.name}")

            if not track_file_paths:
                logging.error("[SERVER] No audio files found for upload")
                _update_task_status(task_id, "failed", "No audio files found")
                return

            # Build album model from release data
            album = build_album_model(release_data, track_file_paths, artwork_path)
            logging.info(f"[SERVER] Built album model: {album.album_name} with {len(album.track_files)} tracks")

            # Start browser and login
            driver = make_driver(headless=headless, timeout=settings.selenium_timeout)
            try:
                solver = init_2captcha()
                ok = bandcamp_login_strict(driver, creds, solver)
                if not ok:
                    logging.error("[SERVER] Login failed")
                    _update_task_status(task_id, "failed", "Bandcamp login failed")
                    return

                logging.info("[SERVER] Login successful, uploading album...")
                import time
                time.sleep(1)

                success = upload_album(driver, bandcamp_url, album)
                if success:
                    logging.info("[SERVER] Album uploaded successfully")
                    _update_task_status(task_id, "success", None)
                else:
                    logging.error("[SERVER] Album upload failed")
                    _update_task_status(task_id, "failed", "Album upload failed")
            finally:
                driver.quit()

    except Exception as e:
        logging.error(f"[SERVER] Upload failed with error: {e}")
        _update_task_status(task_id, "failed", str(e))


def _update_task_status(task_id: str | None, status: str, error_message: str | None):
    """Update the task completion status in Supabase."""
    if not task_id:
        return

    try:
        from supabase import create_client
        from datetime import datetime

        supabase_url = os.getenv("SUPABASE_URL", "").strip()
        supabase_key = os.getenv("SUPABASE_ANON_KEY", "").strip()
        if not supabase_url or not supabase_key:
            logging.warning("[SERVER] Cannot update task status: missing Supabase credentials")
            return

        client = create_client(supabase_url, supabase_key)

        if status == "success":
            client.table("tasks").update({
                "completed_at": datetime.utcnow().isoformat(),
                "completion_status": "done_detected",
            }).eq("id", task_id).execute()
            logging.info(f"[SERVER] Task {task_id} marked as completed")
        elif status == "failed":
            logging.info(f"[SERVER] Task {task_id} upload failed: {error_message}")

    except Exception as e:
        logging.error(f"[SERVER] Failed to update task status: {e}")


@app.post("/upload-to-bandcamp", response_model=UploadResponse)
async def trigger_upload(req: UploadRequest):
    """Trigger a Bandcamp album upload. Runs in background thread and returns immediately."""
    logging.info(f"[SERVER] Received upload request: release_id={req.release_id}")

    # Run the upload in a background thread (fire-and-forget)
    thread = threading.Thread(
        target=_run_upload,
        args=(req.release_id, req.task_id, req.headless),
        daemon=True,
    )
    thread.start()

    return UploadResponse(
        success=True,
        message=f"Upload triggered for release {req.release_id}. Running in background.",
    )


@app.get("/health")
async def health():
    return {"status": "ok"}
