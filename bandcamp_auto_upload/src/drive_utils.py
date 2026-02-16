"""Google Drive utilities for downloading files using service account credentials."""
from __future__ import annotations

import logging
import os
import tempfile
from pathlib import Path

from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload
import io


SCOPES = [
    "https://www.googleapis.com/auth/drive.readonly",
    "https://www.googleapis.com/auth/drive.file",
]


def _get_drive_service():
    """Create an authenticated Google Drive service using service account credentials."""
    email = os.getenv("GOOGLE_SERVICE_ACCOUNT_EMAIL", "").strip()
    private_key = os.getenv("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY", "").strip()
    private_key_id = os.getenv("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY_ID", "").strip()

    if not email or not private_key:
        raise SystemExit("Missing GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY")

    # Handle escaped newlines in private key
    private_key = private_key.replace("\\n", "\n")

    credentials = service_account.Credentials.from_service_account_info(
        {
            "type": "service_account",
            "client_email": email,
            "private_key": private_key,
            "private_key_id": private_key_id,
            "token_uri": "https://oauth2.googleapis.com/token",
        },
        scopes=SCOPES,
    )

    return build("drive", "v3", credentials=credentials)


def list_files_in_folder(folder_id: str) -> list[dict]:
    """List all files in a Google Drive folder (non-trashed)."""
    service = _get_drive_service()
    results = []
    page_token = None

    while True:
        response = (
            service.files()
            .list(
                q=f"'{folder_id}' in parents and trashed=false",
                fields="nextPageToken, files(id, name, mimeType)",
                pageToken=page_token,
            )
            .execute()
        )
        results.extend(response.get("files", []))
        page_token = response.get("nextPageToken")
        if not page_token:
            break

    return results


def download_file(file_id: str, dest_path: Path) -> Path:
    """Download a file from Google Drive to a local path."""
    service = _get_drive_service()

    request = service.files().get_media(fileId=file_id)
    fh = io.BytesIO()
    downloader = MediaIoBaseDownload(fh, request)

    done = False
    while not done:
        status, done = downloader.next_chunk()
        if status:
            logging.info(f"[DRIVE] Download progress: {int(status.progress() * 100)}%")

    dest_path.parent.mkdir(parents=True, exist_ok=True)
    with open(dest_path, "wb") as f:
        f.write(fh.getvalue())

    logging.info(f"[DRIVE] Downloaded file to {dest_path}")
    return dest_path


def download_folder_contents(folder_id: str, dest_dir: Path) -> list[Path]:
    """Download all files from a Google Drive folder to a local directory."""
    files = list_files_in_folder(folder_id)
    downloaded = []

    for file_info in files:
        # Skip Google Docs/Sheets/etc (can't download as binary)
        if file_info["mimeType"].startswith("application/vnd.google-apps"):
            logging.info(f"[DRIVE] Skipping Google Workspace file: {file_info['name']}")
            continue

        dest_path = dest_dir / file_info["name"]
        download_file(file_info["id"], dest_path)
        downloaded.append(dest_path)

    logging.info(f"[DRIVE] Downloaded {len(downloaded)} files from folder {folder_id}")
    return downloaded


AUDIO_EXTENSIONS = {".wav", ".flac", ".aiff", ".aif", ".mp3", ".ogg", ".m4a"}
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".tiff", ".tif", ".bmp", ".gif"}


def filter_audio_files(paths: list[Path]) -> list[Path]:
    """Filter a list of paths to only include audio files."""
    return [p for p in paths if p.suffix.lower() in AUDIO_EXTENSIONS]


def filter_image_files(paths: list[Path]) -> list[Path]:
    """Filter a list of paths to only include image files."""
    return [p for p in paths if p.suffix.lower() in IMAGE_EXTENSIONS]
