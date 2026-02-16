import os
from dataclasses import dataclass

from supabase import create_client, Client


@dataclass
class BandcampCreds:
    username: str
    password: str
    account_name: str


def load_bandcamp_creds() -> BandcampCreds:
    """Load Bandcamp credentials from environment variables."""
    username = os.getenv("BANDCAMP_USERNAME", "").strip()
    password = os.getenv("BANDCAMP_PASSWORD", "").strip()
    account_name = os.getenv("BANDCAMP_ACCOUNT_NAME", "").strip()

    if not username or not password:
        raise SystemExit("Missing BANDCAMP_USERNAME or BANDCAMP_PASSWORD environment variables")

    return BandcampCreds(username=username, password=password, account_name=account_name)


class SupabaseUtils:
    def __init__(self, supabase_url: str, supabase_key: str):
        self.client: Client = create_client(supabase_url, supabase_key)

    def fetch_release_data(self, release_id: str) -> dict | None:
        """Fetch release data with associated artists for building an AlbumModel."""
        try:
            # Fetch the release record
            release_resp = (
                self.client.table("releases")
                .select("*")
                .eq("id", release_id)
                .limit(1)
                .execute()
            )
            data = getattr(release_resp, 'data', None) or []
            if not data:
                return None
            release = data[0]

            # Fetch associated artists via release_artists junction table
            artists_resp = (
                self.client.table("release_artists")
                .select("artists(*)")
                .eq("release_id", release_id)
                .execute()
            )
            artists_data = getattr(artists_resp, 'data', None) or []
            artists = [row["artists"] for row in artists_data if row.get("artists")]

            release["artists"] = artists
            return release

        except Exception as e:
            raise SystemExit(f"Failed to fetch release data: {e}")
