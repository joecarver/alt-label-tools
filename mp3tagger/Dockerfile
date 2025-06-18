# Use an official Go image as the build stage
FROM golang:1.23 AS builder

# Set up working directory
WORKDIR /app

# Copy Go files
COPY . .

# Build the Go binary
RUN go build -tags netgo -ldflags="-s -w" -o mp3tagger

# Use a minimal base image with ffmpeg
FROM debian:bookworm-slim

# Install ffmpeg and add app
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

# Copy the built Go binary from the builder stage
COPY --from=builder /app/mp3tagger /app/mp3tagger

# Set working dir and entrypoint
WORKDIR /app
CMD ["./mp3tagger"]