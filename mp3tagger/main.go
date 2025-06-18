package main

import (
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

var (
	supabaseUrl       string
	supabaseKey       string
	googleDriveApiKey string
)

func init() {
	// Load .env file if present
	err := godotenv.Load(".env")
	if err != nil {
		log.Println("No .env file found or error loading .env, relying on system env vars")
	}
	supabaseUrl = os.Getenv("SUPABASE_URL")
	supabaseKey = os.Getenv("SUPABASE_KEY")
}

func main() {
	r := gin.Default()

	r.GET("/process-mp3-tagging", func(c *gin.Context) {
		// 1. Query Supabase for releases where both masters and artwork are present
		log.Println("Querying Supabase for eligible releases...")
		releases, err := fetchEligibleReleases()
		if err != nil {
			log.Printf("Error querying Supabase: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to query Supabase"})
			return
		}
		if len(releases) == 0 {
			log.Println("No eligible releases found.")
			c.JSON(http.StatusOK, gin.H{"status": "no-op", "message": "No eligible releases found"})
			return
		}

		for _, release := range releases {
			log.Printf("Processing release: %s (%s)", release.Name, release.ID)

			// 2. List and download master files
			masters, err := ListDriveFiles(release.MastersFolderID)
			if err != nil {
				log.Printf("Error listing masters: %v", err)
				continue
			}
			log.Printf("Found %d master files", len(masters))

			// 3. List and download artwork files
			artworks, err := ListDriveFiles(release.ArtworkFolderID)
			if err != nil {
				log.Printf("Error listing artworks: %v", err)
				continue
			}
			log.Printf("Found %d artwork files", len(artworks))

			// Find the main artwork file (prefer "Album Artwork Small.jpg")
			var artworkFile DriveFile
			for _, art := range artworks {
				if strings.Contains(strings.ToLower(art.Name), "album artwork small") {
					artworkFile = art
					break
				}
			}
			if artworkFile.ID == "" && len(artworks) > 0 {
				artworkFile = artworks[0]
			}

			// Download artwork
			artworkData, err := DownloadDriveFile(artworkFile.ID)
			if err != nil {
				log.Printf("Error downloading artwork: %v", err)
				continue
			}

			// Process each master file
			for _, master := range masters {
				// Skip non-audio files
				if !strings.HasSuffix(strings.ToLower(master.Name), ".wav") &&
					!strings.HasSuffix(strings.ToLower(master.Name), ".flac") &&
					!strings.HasSuffix(strings.ToLower(master.Name), ".aiff") {
					continue
				}

				// Download master file
				masterData, err := DownloadDriveFile(master.ID)
				if err != nil {
					log.Printf("Error downloading master %s: %v", master.Name, err)
					continue
				}

				// Extract metadata from filename
				metadata, err := ExtractMetadataFromFileName(master.Name)
				if err != nil {
					log.Printf("Error extracting metadata from %s: %v", master.Name, err)
					continue
				}

				// Set additional metadata
				metadata.Album = release.Name
				metadata.Artwork = artworkData

				// Convert to MP3
				mp3Data, err := ConvertToMP3(masterData, strings.TrimPrefix(filepath.Ext(master.Name), "."))
				if err != nil {
					log.Printf("Error converting %s to MP3: %v", master.Name, err)
					continue
				}

				// Tag the MP3
				taggedMP3, err := TagMP3(mp3Data, metadata)
				if err != nil {
					log.Printf("Error tagging MP3 %s: %v", master.Name, err)
					continue
				}

				// Create MP3 filename
				mp3Name := strings.TrimSuffix(master.Name, filepath.Ext(master.Name)) + ".mp3"

				// Upload tagged MP3
				mp3FolderID := release.MP3FolderID
				if mp3FolderID == "" {
					// Create MP3 folder if it doesn't exist
					mp3FolderID, err = CreateDriveFolder(release.MastersFolderID, "MP3s")
					if err != nil {
						log.Printf("Error creating MP3 folder: %v", err)
						continue
					}
					// Update release with MP3 folder ID
					// TODO: Implement Supabase update
				}

				_, err = UploadDriveFile(mp3FolderID, mp3Name, taggedMP3, "audio/mpeg")
				if err != nil {
					log.Printf("Error uploading tagged MP3 %s: %v", mp3Name, err)
					continue
				}

				log.Printf("Successfully processed %s", master.Name)
			}
		}

		c.JSON(http.StatusOK, gin.H{"status": "success"})
	})

	r.POST("/process-single-release", func(c *gin.Context) {
		type Req struct {
			ArtworkFolderID string `json:"artworkFolderId"`
			MasterFolderID  string `json:"masterFolderId"`
			ReleaseName     string `json:"releaseName"`
			ReleaseYear     string `json:"releaseYear"`
		}
		var req Req
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
			return
		}
		if req.ArtworkFolderID == "" || req.MasterFolderID == "" || req.ReleaseName == "" || req.ReleaseYear == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "artworkFolderId, masterFolderId, releaseName, and releaseYear are required"})
			return
		}

		masters, err := ListDriveFiles(req.MasterFolderID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list masters", "details": err.Error()})
			return
		}

		artworks, err := ListDriveFiles(req.ArtworkFolderID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list artworks", "details": err.Error()})
			return
		}

		if len(masters) == 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "No master files found"})
			return
		}

		var artworkFile DriveFile
		for _, art := range artworks {
			if strings.Contains(strings.ToLower(art.Name), "album artwork small") {
				artworkFile = art
				break
			}
		}

		if artworkFile.ID == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "No 'Album Artwork Small' image found in artwork folder"})
			return
		}

		artworkData, err := DownloadDriveFile(artworkFile.ID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to download artwork", "details": err.Error()})
			return
		}

		successCount := 0
		errors := make([]string, 0)
		for _, master := range masters {
			if !strings.HasSuffix(strings.ToLower(master.Name), ".wav") &&
				!strings.HasSuffix(strings.ToLower(master.Name), ".flac") &&
				!strings.HasSuffix(strings.ToLower(master.Name), ".aiff") {
				continue
			}
			masterData, err := DownloadDriveFile(master.ID)
			if err != nil {
				errors = append(errors, "Failed to download "+master.Name+": "+err.Error())
				continue
			}

			metadata, err := ExtractMetadataFromFileName(master.Name)
			if err != nil {
				errors = append(errors, "Metadata error for "+master.Name+": "+err.Error())
				continue
			}

			metadata.Artwork = artworkData
			metadata.Album = req.ReleaseName
			metadata.Year = req.ReleaseYear
			mp3Data, err := ConvertToMP3(masterData, strings.TrimPrefix(filepath.Ext(master.Name), "."))
			if err != nil {
				errors = append(errors, "Conversion error for "+master.Name+": "+err.Error())
				continue
			}

			taggedMP3, err := TagMP3(mp3Data, metadata)
			if err != nil {
				errors = append(errors, "Tagging error for "+master.Name+": "+err.Error())
				continue
			}

			mp3Name := strings.TrimSuffix(master.Name, filepath.Ext(master.Name)) + ".mp3"
			mp3FolderID, err := CreateDriveFolder(req.MasterFolderID, "MP3s")
			if err != nil {
				errors = append(errors, "Failed to create MP3 folder: "+err.Error())
				continue
			}

			_, err = UploadDriveFile(mp3FolderID, mp3Name, taggedMP3, "audio/mpeg")
			if err != nil {
				errors = append(errors, "Upload error for "+mp3Name+": "+err.Error())
				continue
			}
			successCount++
		}
		c.JSON(http.StatusOK, gin.H{
			"success":      successCount,
			"errors":       errors,
			"totalMasters": len(masters),
		})
	})

	r.Run(":8080")
}
