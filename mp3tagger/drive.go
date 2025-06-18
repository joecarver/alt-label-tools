package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"strings"

	"golang.org/x/oauth2/google"
	"google.golang.org/api/drive/v3"
	"google.golang.org/api/option"
)

// DriveFile represents a file in Google Drive
type DriveFile struct {
	ID       string
	Name     string
	MimeType string
}

// DriveFolder represents a folder in Google Drive
type DriveFolder struct {
	ID   string
	Name string
}

// getDriveService authenticates and returns a Drive service client
func getDriveService() (*drive.Service, error) {
	ctx := context.Background()

	// Read service account credentials from environment variables
	email := os.Getenv("GOOGLE_SERVICE_ACCOUNT_EMAIL")
	privateKey := os.Getenv("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY")
	// Fix for .env files with escaped newlines
	privateKey = strings.ReplaceAll(privateKey, "\\n", "\n")
	privateKeyID := os.Getenv("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY_ID")
	if email == "" || privateKey == "" || privateKeyID == "" {
		return nil, fmt.Errorf("missing Google service account env vars")
	}

	// Construct the service account JSON
	creds := map[string]string{
		"type":                        "service_account",
		"client_email":                email,
		"private_key":                 privateKey,
		"private_key_id":              privateKeyID,
		"token_uri":                   "https://oauth2.googleapis.com/token",
		"auth_uri":                    "https://accounts.google.com/o/oauth2/auth",
		"auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
	}
	credsJSON, err := json.Marshal(creds)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal service account JSON: %w", err)
	}

	conf, err := google.JWTConfigFromJSON(credsJSON, drive.DriveScope)
	if err != nil {
		return nil, fmt.Errorf("failed to parse service account JSON: %w", err)
	}

	ts := conf.TokenSource(ctx)
	drv, err := drive.NewService(ctx, option.WithTokenSource(ts))
	if err != nil {
		return nil, fmt.Errorf("failed to create drive service: %w", err)
	}
	return drv, nil
}

// ListDriveFiles lists files in a given folder
func ListDriveFiles(folderID string) ([]DriveFile, error) {
	drv, err := getDriveService()
	if err != nil {
		return nil, err
	}
	q := fmt.Sprintf("'%s' in parents and trashed = false", folderID)
	files := []DriveFile{}
	pageToken := ""
	for {
		call := drv.Files.List().Q(q).Fields("nextPageToken, files(id, name, mimeType)")
		if pageToken != "" {
			call = call.PageToken(pageToken)
		}
		resp, err := call.Do()
		if err != nil {
			return nil, fmt.Errorf("failed to list files: %w", err)
		}
		for _, f := range resp.Files {
			files = append(files, DriveFile{ID: f.Id, Name: f.Name, MimeType: f.MimeType})
		}
		if resp.NextPageToken == "" {
			break
		}
		pageToken = resp.NextPageToken
	}
	return files, nil
}

// DownloadDriveFile downloads a file by its ID
func DownloadDriveFile(fileID string) ([]byte, error) {
	drv, err := getDriveService()
	if err != nil {
		return nil, err
	}
	resp, err := drv.Files.Get(fileID).Download()
	if err != nil {
		return nil, fmt.Errorf("failed to download file: %w", err)
	}
	defer resp.Body.Close()
	return io.ReadAll(resp.Body)
}

// UploadDriveFile uploads a file to a folder
func UploadDriveFile(folderID, fileName string, data []byte, mimeType string) (string, error) {
	drv, err := getDriveService()
	if err != nil {
		return "", err
	}
	file := &drive.File{
		Name:     fileName,
		Parents:  []string{folderID},
		MimeType: mimeType,
	}
	reader := bytes.NewReader(data)
	created, err := drv.Files.Create(file).Media(reader).Do()
	if err != nil {
		return "", fmt.Errorf("failed to upload file: %w", err)
	}
	return created.Id, nil
}

// Check if a folder with the given name exists in the specified parent folder
func CheckFolderExists(parentID, folderName string) (string, error) {
	drv, err := getDriveService()
	if err != nil {
		return "", err
	}
	q := fmt.Sprintf("'%s' in parents and name = '%s' and mimeType = 'application/vnd.google-apps.folder' and trashed = false", parentID, folderName)
	call := drv.Files.List().Q(q).Fields("files(id, name)")
	resp, err := call.Do()
	if err != nil {
		return "", fmt.Errorf("failed to search for existing folder: %w", err)
	}
	if len(resp.Files) > 0 {
		return resp.Files[0].Id, nil
	}
	return "", nil
}

// CreateDriveFolder creates a new folder in Google Drive, or returns the existing folder's ID if it already exists
func CreateDriveFolder(parentID, folderName string) (string, error) {
	drv, err := getDriveService()
	if err != nil {
		return "", err
	}

	// Check if folder exists
	existingID, err := CheckFolderExists(parentID, folderName)
	if err != nil {
		return "", err
	}
	if existingID != "" {
		return existingID, nil
	}

	file := &drive.File{
		Name:     folderName,
		MimeType: "application/vnd.google-apps.folder",
	}
	if parentID != "" {
		file.Parents = []string{parentID}
	}
	created, err := drv.Files.Create(file).Do()
	if err != nil {
		return "", fmt.Errorf("failed to create folder: %w", err)
	}
	return created.Id, nil
}
