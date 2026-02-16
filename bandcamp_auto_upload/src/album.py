from pydantic import BaseModel, Field, model_validator
from typing import List, Literal, Optional
from pathlib import Path


class TrackModel(BaseModel):
    # required fields
    track_name: str
    track_price: float

    # optional fields
    track_file_path: Path = None
    enable_streaming: bool = True
    enable_individual_purchase: bool = True
    enable_fans_to_pay_more: bool = True
    description: Optional[str] = "Uploaded using automated label tools!"
    about_this_track: Optional[str] = None
    lyrics: Optional[str] = None
    track_credits: Optional[str] = None
    video_path: Optional[Path] = None
    license: Literal[
        "ALL_RIGHTS_RESERVED",
        "BY_NC_ND",
        "BY_NC_SA",
        "BY_NC",
        "BY_ND",
        "BY",
        "BY_SA"
    ] = "ALL_RIGHTS_RESERVED"
    collection_society_being_used: bool = False
    songwriters_list: List[str] = Field(default_factory=list)
    publishers_list: List[str] = Field(default_factory=list)
    iswc: Optional[str] = None
    isrc: Optional[str] = None
    is_bonus_track: bool = False

    track_artist_name: Optional[str] = None
    track_art_path: Optional[Path] = None
    track_tags: List[str] = Field(default_factory=list)
    track_release_date: Optional[str] = None
    album_art: Optional[Path] = None
    
    # @model_validator(mode="after")

    # @field_validator("track_file_path")
    # def check_track_file_exists(cls, v: Path):
    #     if not v.exists():
    #         raise ValueError(f"track_file_path does not exist: {v}")
    #     # optionally: check suffix (.mp3, .wav etc.)
    #     return v

    # @field_validator('track_release_date', pre=True, always=True)
    # def coerce_date(cls, v):
    #     # Accept string 'YYYY-MM-DD' or a `date` object
    #     if v is None:
    #         return v
    #     if isinstance(v, date):
    #         return v
    #     try:
    #         return date.fromisoformat(v)
    #     except Exception:
    #         raise ValueError("track_release_date must be a date or 'YYYY-MM-DD' string")


class AlbumModel(BaseModel):
    album_name: str
    album_price: float
    release_date: Optional[str] = None
    enable_fans_to_pay_more: bool = True
    description: str = "Uploaded using automated label tools!"
    album_art: Path = None
    artist_name: Optional[str] = None
    about_this_album: Optional[str] = None
    album_credits: Optional[str] = None
    tags: Optional[list[str]] = []
    upc_ean_code: Optional[str] = None
    catalog_number: Optional[str] = None
    songwriters_list: Optional[list[str]] = []
    publishers_list: Optional[list[str]] = []
    visibility: Literal["public", "private"] = "public"
    track_files: List[TrackModel] = Field(default_factory=list)

    @model_validator(mode="after")
    def inherit_album_fields(self):
        for track in self.track_files:
            if track.track_name is None:
                track.track_name = self.album_name

            if track.track_artist_name is None:
                track.track_artist_name = self.artist_name

            if track.track_art_path is None:
                track.track_art_path = self.album_art

        return self

    # TODO: add change paypal email, publishing rights,
    #   digital pre order, schedule listening party

