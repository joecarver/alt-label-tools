#!/bin/bash

# Source the production environment variables
if [ ! -f "production.env" ]; then
    echo "Error: production.env file not found"
    exit 1
fi

source production.env

# Set Supabase secrets using environment variables
supabase secrets set \
  NOTION_API_KEY="$NOTION_API_KEY" \
  GOOGLE_SERVICE_ACCOUNT_EMAIL="$GOOGLE_SERVICE_ACCOUNT_EMAIL" \
  GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="$GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY" \
  GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY_ID="$GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY_ID"