#!/bin/bash

# Supabase Database Restore Script
# Downloads and restores PostgreSQL dumps from Cloudflare R2 using Wrangler

set -e

# Configuration - set these environment variables or edit below
CLOUDFLARE_API_TOKEN=${CLOUDFLARE_API_TOKEN:-"your-api-token"}
CLOUDFLARE_ACCOUNT_ID=${CLOUDFLARE_ACCOUNT_ID:-"your-account-id"}
R2_BUCKET_NAME=${R2_BUCKET_NAME:-"supabase-backups"}

# Database configuration
DB_HOST=${SUPABASE_DB_HOST:-"db.your-project-ref.supabase.co"}
DB_PORT=${SUPABASE_DB_PORT:-"5432"}
DB_NAME=${SUPABASE_DB_NAME:-"postgres"}
DB_USER=${SUPABASE_DB_USER:-"postgres"}
DB_PASSWORD=${SUPABASE_DB_PASSWORD:-"your-password"}

# Functions
show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --list                    List available backups"
    echo "  --latest                  Restore the latest backup"
    echo "  --file FILENAME           Restore specific backup file"
    echo "  --help                    Show this help message"
    echo ""
    echo "Environment variables:"
    echo "  CLOUDFLARE_API_TOKEN      Cloudflare API token"
    echo "  CLOUDFLARE_ACCOUNT_ID     Cloudflare account ID"
    echo "  R2_BUCKET_NAME            R2 bucket name"
    echo "  SUPABASE_DB_HOST          Database host"
    echo "  SUPABASE_DB_PORT          Database port"
    echo "  SUPABASE_DB_NAME          Database name"
    echo "  SUPABASE_DB_USER          Database user"
    echo "  SUPABASE_DB_PASSWORD      Database password"
}

list_backups() {
    echo "Available backups in R2:"
    echo "========================"
    
    wrangler r2 object list $R2_BUCKET_NAME --prefix supabase-backup- | sort -r
}

get_latest_backup() {
    wrangler r2 object list $R2_BUCKET_NAME --prefix supabase-backup- | head -1
}

download_backup() {
    local filename=$1
    local temp_file="temp-restore-$(date +%s).dump"
    
    echo "Downloading $filename from R2..."
    wrangler r2 object get $R2_BUCKET_NAME/$filename --file $temp_file
    
    echo "Downloaded to $temp_file"
    echo "$temp_file"
}

restore_backup() {
    local filename=$1
    local force=$2
    
    if [ "$force" != "true" ]; then
        echo "⚠️  WARNING: This will overwrite the target database!"
        echo "Use --force flag to confirm restore"
        return 1
    fi
    
    echo "Starting restore of $filename..."
    
    # Download backup
    local temp_file=$(download_backup "$filename")
    
    # Set environment variables for pg_restore
    export PGPASSWORD="$DB_PASSWORD"
    export PGHOST="$DB_HOST"
    export PGPORT="$DB_PORT"
    export PGDATABASE="$DB_NAME"
    export PGUSER="$DB_USER"
    
    # Restore database
    echo "Restoring to database..."
    pg_restore --clean --if-exists --no-owner --no-privileges -d "$DB_NAME" "$temp_file"
    
    # Clean up
    rm -f "$temp_file"
    echo "Restore completed successfully!"
}

# Check if Wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler CLI not found. Please install it first:"
    echo "npm install -g wrangler"
    exit 1
fi

# Main script
if [ $# -eq 0 ]; then
    show_usage
    exit 1
fi

case "$1" in
    --list)
        list_backups
        ;;
    --latest)
        if [ "$2" = "--force" ]; then
            latest_backup=$(get_latest_backup)
            if [ -z "$latest_backup" ]; then
                echo "No backups found"
                exit 1
            fi
            echo "Latest backup: $latest_backup"
            restore_backup "$latest_backup" true
        else
            latest_backup=$(get_latest_backup)
            if [ -z "$latest_backup" ]; then
                echo "No backups found"
                exit 1
            fi
            echo "Latest backup: $latest_backup"
            echo "Use --force flag to confirm restore"
        fi
        ;;
    --file)
        if [ -z "$2" ]; then
            echo "Error: No filename specified"
            exit 1
        fi
        if [ "$3" = "--force" ]; then
            restore_backup "$2" true
        else
            echo "File to restore: $2"
            echo "Use --force flag to confirm restore"
        fi
        ;;
    --help)
        show_usage
        ;;
    *)
        echo "Unknown option: $1"
        show_usage
        exit 1
        ;;
esac 