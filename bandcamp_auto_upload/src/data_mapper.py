"""Maps release data from Supabase to AlbumModel/TrackModel for Bandcamp upload."""
from __future__ import annotations

import logging
from datetime import datetime
from pathlib import Path

from album import AlbumModel, TrackModel


# Phase 1 defaults for fields not yet stored in Supabase
DEFAULT_ALBUM_PRICE = 7.99
DEFAULT_TRACK_PRICE = 0.99
DEFAULT_VISIBILITY = "public"


def _format_date_for_bandcamp(iso_date: str | None) -> str | None:
    """Convert ISO date (YYYY-MM-DD) to Bandcamp format (MM/DD/YYYY)."""
    if not iso_date:
        return None
    try:
        dt = datetime.fromisoformat(iso_date)
        return dt.strftime("%m/%d/%Y")
    except (ValueError, TypeError):
        logging.warning(f"[MAPPER] Could not parse date: {iso_date}")
        return None


def build_album_model(
    release_data: dict,
    track_file_paths: list[Path],
    artwork_path: Path | None,
) -> AlbumModel:
    """Build an AlbumModel from Supabase release data and local file paths.

    Args:
        release_data: Release record from Supabase with nested 'artists' list.
        track_file_paths: Paths to downloaded audio files (masters).
        artwork_path: Path to downloaded album artwork, or None.
    """
    artists = release_data.get("artists") or []
    artist_name = artists[0].get("artist_name") if artists else None

    tracks = []
    for file_path in sorted(track_file_paths):
        track_name = file_path.stem  # filename without extension
        tracks.append(
            TrackModel(
                track_name=track_name,
                track_price=DEFAULT_TRACK_PRICE,
                track_file_path=file_path,
            )
        )

    release_date = _format_date_for_bandcamp(release_data.get("release_date"))

    return AlbumModel(
        album_name=release_data["name"],
        album_price=DEFAULT_ALBUM_PRICE,
        release_date=release_date,
        artist_name=artist_name,
        catalog_number=release_data.get("catalog_number"),
        album_art=artwork_path,
        visibility=DEFAULT_VISIBILITY,
        track_files=tracks,
    )
