package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
)

// Release represents a minimal release structure for this process
// Extend as needed for your metadata/tagging
type Release struct {
	ID              string `json:"id"`
	Name            string `json:"name"`
	MastersFolderID string `json:"masters_folder_id"`
	ArtworkFolderID string `json:"artwork_folder_id"`
	MP3FolderID     string `json:"mp3_folder_id"`
	// Add more fields as needed
}

type Task struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type TaskFile struct {
	ID string `json:"id"`
	// Add more fields if needed
}

// fetchEligibleReleases queries Supabase for releases where both masters and artwork are present
func fetchEligibleReleases() ([]Release, error) {
	url := fmt.Sprintf("%s/rest/v1/releases?select=id,name,masters_folder_id,artwork_folder_id", supabaseUrl)

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("apikey", supabaseKey)
	req.Header.Set("Authorization", "Bearer "+supabaseKey)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("Supabase error: %s", string(body))
	}

	var releases []Release
	if err := json.NewDecoder(resp.Body).Decode(&releases); err != nil {
		return nil, err
	}

	var eligible []Release
	for _, r := range releases {
		if r.MastersFolderID == "" || r.ArtworkFolderID == "" {
			continue
		}
		// Fetch tasks for this release
		tasks, err := fetchTasksForRelease(r.ID)
		if err != nil {
			log.Printf("Error fetching tasks for release %s: %v", r.ID, err)
			continue
		}
		var hasMasters, hasArtwork bool
		for _, t := range tasks {
			if t.Name == "Mixing and Mastering" || t.Name == "Artwork Creation" {
				files, err := fetchTaskFiles(t.ID)
				if err != nil {
					log.Printf("Error fetching files for task %s: %v", t.ID, err)
					continue
				}
				if len(files) > 0 {
					if t.Name == "Mixing and Mastering" {
						hasMasters = true
					}
					if t.Name == "Artwork Creation" {
						hasArtwork = true
					}
				}
			}
		}
		if hasMasters && hasArtwork {
			eligible = append(eligible, r)
		}
	}
	return eligible, nil
}

func fetchTasksForRelease(releaseID string) ([]Task, error) {
	url := fmt.Sprintf("%s/rest/v1/tasks?select=id,name&release_id=eq.%s", supabaseUrl, releaseID)
	// Only fetch tasks for this release

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("apikey", supabaseKey)
	req.Header.Set("Authorization", "Bearer "+supabaseKey)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("Supabase error: %s", string(body))
	}

	var tasks []Task
	if err := json.NewDecoder(resp.Body).Decode(&tasks); err != nil {
		return nil, err
	}
	return tasks, nil
}

func fetchTaskFiles(taskID string) ([]TaskFile, error) {
	url := fmt.Sprintf("%s/rest/v1/task_files?select=id&task_id=eq.%s", supabaseUrl, taskID)

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("apikey", supabaseKey)
	req.Header.Set("Authorization", "Bearer "+supabaseKey)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("Supabase error: %s", string(body))
	}

	var files []TaskFile
	if err := json.NewDecoder(resp.Body).Decode(&files); err != nil {
		return nil, err
	}
	return files, nil
}
