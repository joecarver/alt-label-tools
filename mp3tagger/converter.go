package main

import (
	"bytes"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
)

// ConvertToMP3 converts an audio file to MP3 format using ffmpeg
func ConvertToMP3(inputData []byte, inputFormat string) ([]byte, error) {
	// Create a temporary file for the input
	inputFile := filepath.Join("/tmp", fmt.Sprintf("input.%s", inputFormat))
	if err := os.WriteFile(inputFile, inputData, 0644); err != nil {
		return nil, fmt.Errorf("failed to write input file: %w", err)
	}
	defer os.Remove(inputFile)

	// Create a temporary file for the output
	outputFile := filepath.Join("/tmp", "output.mp3")
	defer os.Remove(outputFile)

	// Run ffmpeg to convert the file
	cmd := exec.Command("ffmpeg",
		"-i", inputFile,
		"-codec:a", "libmp3lame",
		"-b:a", "320k", // 320kbps CBR
		"-y", // Overwrite output file if it exists
		outputFile,
	)

	var stderr bytes.Buffer
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		return nil, fmt.Errorf("ffmpeg conversion failed: %w\nstderr: %s", err, stderr.String())
	}

	// Read the converted file
	outputData, err := os.ReadFile(outputFile)
	if err != nil {
		return nil, fmt.Errorf("failed to read output file: %w", err)
	}

	return outputData, nil
}
