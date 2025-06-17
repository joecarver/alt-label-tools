package main

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"os"

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
	f, err := os.Open("service-account.json")
	if err != nil {
		return nil, fmt.Errorf("failed to open service-account.json: %w", err)
	}
	defer f.Close()

	creds, err := io.ReadAll(f)
	if err != nil {
		return nil, fmt.Errorf("failed to read service-account.json: %w", err)
	}

	conf, err := google.JWTConfigFromJSON(creds, drive.DriveScope)
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

// CreateDriveFolder creates a new folder in Google Drive
func CreateDriveFolder(parentID, folderName string) (string, error) {
	drv, err := getDriveService()
	if err != nil {
		return "", err
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
