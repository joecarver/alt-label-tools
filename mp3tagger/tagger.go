package main

import (
	"bytes"
	"fmt"
	"io"
	"path/filepath"
	"strings"

	"github.com/bogem/id3v2"
)

// MP3Metadata represents the metadata to be written to an MP3 file
type MP3Metadata struct {
	Title       string
	Artist      string
	Album       string
	Year        string
	TrackNumber string
	Artwork     []byte
}

// TagMP3 takes an MP3 file as bytes and adds the specified metadata
func TagMP3(mp3Data []byte, metadata MP3Metadata) ([]byte, error) {
	// Create a new tag
	tag := id3v2.NewEmptyTag()
	tag.SetVersion(4) // Use ID3v2.4

	// Set basic text frames
	tag.SetTitle(metadata.Title)
	tag.SetArtist(metadata.Artist)
	tag.SetAlbum(metadata.Album)
	tag.SetYear(metadata.Year)

	// Set track number
	if metadata.TrackNumber != "" {
		tag.AddTextFrame(tag.CommonID("Track number/Position in set"), tag.DefaultEncoding(), metadata.TrackNumber)
	}

	// Add artwork if provided
	if len(metadata.Artwork) > 0 {
		pic := id3v2.PictureFrame{
			Encoding:    id3v2.EncodingUTF8,
			MimeType:    "image/jpeg",
			PictureType: id3v2.PTFrontCover,
			Description: "Cover",
			Picture:     metadata.Artwork,
		}
		tag.AddAttachedPicture(pic)
	}

	// Create a buffer to hold the tagged MP3
	var buf bytes.Buffer
	writer := io.Writer(&buf)

	// Write the tag to the buffer
	if _, err := tag.WriteTo(writer); err != nil {
		return nil, fmt.Errorf("failed to write tag: %w", err)
	}

	// Write the original MP3 data after the tag
	if _, err := buf.Write(mp3Data); err != nil {
		return nil, fmt.Errorf("failed to write MP3 data: %w", err)
	}

	return buf.Bytes(), nil
}

// ExtractMetadataFromFileName extracts metadata from a filename in the format "01 - Artist - Title [Master].wav"
func ExtractMetadataFromFileName(fileName string) (MP3Metadata, error) {
	// Remove the extension and [Master] suffix
	baseName := strings.TrimSuffix(fileName, filepath.Ext(fileName))
	baseName = strings.TrimSuffix(baseName, " [Master]")
	baseName = strings.TrimSuffix(baseName, " [Premaster]")

	// Split the remaining string by " - "
	parts := strings.Split(baseName, " - ")
	if len(parts) != 3 {
		return MP3Metadata{}, fmt.Errorf("invalid filename format: %s", fileName)
	}

	return MP3Metadata{
		TrackNumber: parts[0],
		Artist:      parts[1],
		Title:       parts[2],
	}, nil
}
