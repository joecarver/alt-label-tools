#!/usr/bin/env python3
"""
Supabase Table Setup Script for Bandcamp Automation

This script helps you set up the required table in your Supabase database
for storing Bandcamp login credentials.

Usage:
1. Set your Supabase credentials in config.py or environment variables
2. Run: python setup_supabase_table.py
"""

import sys
import os
from config import *

try:
    from supabase import create_client, Client
except ImportError:
    print("❌ Supabase library not installed. Install with: pip install supabase")
    sys.exit(1)

def create_credentials_table():
    """Create the bandcamp_credentials table in Supabase."""
    
    # Get Supabase credentials
    url = SUPABASE_URL or os.getenv('SUPABASE_URL')
    # Use service role key for admin operations
    key = SUPABASE_SERVICE_ROLE_KEY or os.getenv('SUPABASE_SERVICE_ROLE_KEY') or SUPABASE_ANON_KEY or os.getenv('SUPABASE_ANON_KEY')
    
    if not url or not key:
        print("❌ Supabase URL and key required")
        print("💡 Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in config.py or environment variables")
        return False
        
    try:
        # Create Supabase client
        supabase = create_client(url, key)
        print("✅ Connected to Supabase")
        
        # Instead of using exec_sql RPC, we'll create the table using the SQL editor approach
        # First, let's try to check if the table already exists
        try:
            result = supabase.table(CREDENTIALS_TABLE).select("id").limit(1).execute()
            print(f"✅ Table '{CREDENTIALS_TABLE}' already exists")
            return True
        except Exception as check_error:
            print(f"🔍 Table '{CREDENTIALS_TABLE}' doesn't exist, creating it...")
            
        # Since we can't execute raw SQL easily with the client, let's provide instructions
        print("\n📋 Manual Setup Required:")
        print("Since we can't execute raw SQL directly with the current client setup,")
        print("please create the table manually in your Supabase SQL editor:")
        print("\n" + "="*60)
        
        sql_script = f"""
-- Create the bandcamp_credentials table
CREATE TABLE IF NOT EXISTS {CREDENTIALS_TABLE} (
    id SERIAL PRIMARY KEY,
    {USER_ID_FIELD} VARCHAR(255) UNIQUE NOT NULL,
    {USERNAME_FIELD} VARCHAR(255) NOT NULL,
    {PASSWORD_FIELD} TEXT NOT NULL,
    {ENCRYPTED_FIELD} BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_{CREDENTIALS_TABLE}_{USER_ID_FIELD} 
ON {CREDENTIALS_TABLE}({USER_ID_FIELD});

-- Create RLS (Row Level Security) policy
ALTER TABLE {CREDENTIALS_TABLE} ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read their own credentials
CREATE POLICY IF NOT EXISTS "Users can read own credentials" ON {CREDENTIALS_TABLE}
FOR SELECT USING (auth.uid()::text = {USER_ID_FIELD} OR {USER_ID_FIELD} = 'default');

-- Allow authenticated users to insert/update their own credentials  
CREATE POLICY IF NOT EXISTS "Users can insert own credentials" ON {CREDENTIALS_TABLE}
FOR INSERT WITH CHECK (auth.uid()::text = {USER_ID_FIELD} OR {USER_ID_FIELD} = 'default');

CREATE POLICY IF NOT EXISTS "Users can update own credentials" ON {CREDENTIALS_TABLE}
FOR UPDATE USING (auth.uid()::text = {USER_ID_FIELD} OR {USER_ID_FIELD} = 'default');
"""
        
        print(sql_script)
        print("="*60)
        print("\n📖 Instructions:")
        print("1. Go to your Supabase dashboard")
        print("2. Navigate to the SQL Editor")
        print("3. Copy and paste the SQL above")
        print("4. Click 'Run' to execute the script")
        print("5. Come back here and press Enter to continue...")
        
        input()
        
        # Try to verify the table was created
        try:
            result = supabase.table(CREDENTIALS_TABLE).select("id").limit(1).execute()
            print(f"✅ Table '{CREDENTIALS_TABLE}' verified successfully")
            return True
        except Exception as verify_error:
            print(f"❌ Could not verify table creation: {str(verify_error)}")
            print("💡 Please make sure you executed the SQL script in Supabase")
            return False
        
    except Exception as e:
        print(f"❌ Error setting up table: {str(e)}")
        return False

def insert_sample_credentials():
    """Insert sample credentials for testing."""
    from bandcamp_automation import BandcampAutomation
    
    print("\n📝 Would you like to add sample credentials? (y/n): ", end="")
    response = input().strip().lower()
    
    if response != 'y':
        return
        
    print("Enter sample credentials:")
    username = input("Bandcamp Username/Email: ").strip()
    password = input("Bandcamp Password: ").strip()
    user_id = input(f"User ID (default: {DEFAULT_USER_ID}): ").strip() or DEFAULT_USER_ID
    
    if not username or not password:
        print("❌ Username and password required")
        return
        
    # Create automation instance and store credentials
    automation = BandcampAutomation(headless=True)
    
    if automation.store_credentials_in_supabase(username, password, user_id):
        print("✅ Sample credentials stored successfully")
        print(f"🔍 You can now test with user_id: '{user_id}'")
    else:
        print("❌ Failed to store sample credentials")

def main():
    """Main setup function."""
    print("🚀 Bandcamp Automation - Supabase Setup")
    print("=" * 50)
    
    if not USE_SUPABASE:
        print("⚠️ Supabase integration is disabled in config.py")
        print("💡 Set USE_SUPABASE = True to enable")
        return
        
    print(f"📊 Creating table: {CREDENTIALS_TABLE}")
    print(f"🔗 Supabase URL: {SUPABASE_URL or os.getenv('SUPABASE_URL', 'Not set')}")
    
    if create_credentials_table():
        print("\n🎉 Supabase setup completed successfully!")
        insert_sample_credentials()
        
        print("\n📋 Next steps:")
        print("1. Set USE_SUPABASE = True in config.py")
        print("2. Run your automation: python bandcamp_automation.py")
        print("3. Or specify user_id: automation.start(user_id='your_user_id')")
        
    else:
        print("\n❌ Setup failed. Please check your configuration.")

if __name__ == "__main__":
    main() 