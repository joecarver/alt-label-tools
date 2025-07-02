#!/usr/bin/env python3
"""
Supabase Music Upload Tables Setup Script
Creates the database schema for Bandcamp automation with music upload functionality.
"""

import os
import sys
from supabase import create_client, Client
from config import SUPABASE_URL, SUPABASE_ANON_KEY

def create_music_upload_tables():
    """Create all tables required for music upload automation."""
    
    # Connect to Supabase
    try:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
        print("✅ Connected to Supabase successfully")
    except Exception as e:
        print(f"❌ Failed to connect to Supabase: {e}")
        return False

    # SQL statements for creating tables
    sql_statements = [
        # 1. Enhanced user_credentials table (extends existing if needed)
        """
        CREATE TABLE IF NOT EXISTS user_credentials (
            id BIGSERIAL PRIMARY KEY,
            user_id BIGINT UNIQUE,
            
            -- Bandcamp Credentials
            username VARCHAR(255) NOT NULL,
            password_encrypted TEXT NOT NULL,
            
            -- Band/Artist Information
            band_name VARCHAR(255),
            band_id BIGINT,
            
            -- Authentication State
            is_verified BOOLEAN DEFAULT false,
            last_login_attempt TIMESTAMP,
            login_failures INTEGER DEFAULT 0,
            
            -- Metadata
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        );
        """,
        
        # 2. Releases table (Albums)
        """
        CREATE TABLE IF NOT EXISTS releases (
            -- Primary Keys
            id BIGSERIAL PRIMARY KEY,
            user_id BIGINT,
            
            -- Core Album Fields
            title VARCHAR(300) NOT NULL,
            artist VARCHAR(100),
            about TEXT,
            credits TEXT,
            tags TEXT,
            
            -- Pricing & Availability
            price DECIMAL(10,2),
            name_your_price BOOLEAN DEFAULT false,
            require_email BOOLEAN DEFAULT false,
            download_desc TEXT,
            
            -- Catalog Information
            upc VARCHAR(13),
            cat_number VARCHAR(50),
            label_id BIGINT,
            
            -- Release Settings
            public_radio BOOLEAN DEFAULT true,
            private_radio BOOLEAN DEFAULT false,
            subscriber_only BOOLEAN DEFAULT false,
            release_message TEXT,
            
            -- Artwork
            art_id BIGINT,
            artwork_path TEXT,
            
            -- Dates & Status
            release_date TIMESTAMP,
            publish_date TIMESTAMP,
            upload_status VARCHAR(20) DEFAULT 'draft',
            
            -- Metadata
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
            
            -- Bandcamp Integration
            bandcamp_album_id BIGINT,
            bandcamp_url TEXT,
            
            -- Constraints
            CONSTRAINT valid_upload_status CHECK (upload_status IN ('draft', 'uploading', 'published', 'failed'))
        );
        """,
        
        # 3. Tracks table
        """
        CREATE TABLE IF NOT EXISTS tracks (
            -- Primary Keys
            id BIGSERIAL PRIMARY KEY,
            release_id BIGINT REFERENCES releases(id) ON DELETE CASCADE,
            
            -- Core Track Fields
            title VARCHAR(300) NOT NULL,
            artist VARCHAR(100),
            track_number INTEGER,
            
            -- File Information
            file_path TEXT NOT NULL,
            file_name VARCHAR(200),
            file_size BIGINT,
            duration INTEGER,
            
            -- Track Content
            about TEXT,
            credits TEXT,
            lyrics TEXT,
            
            -- Pricing
            price DECIMAL(10,2),
            set_price DECIMAL(10,2),
            minimum_price DECIMAL(10,2),
            
            -- Industry Codes
            isrc VARCHAR(12),
            iswc VARCHAR(50),
            
            -- Metadata
            license_type INTEGER,
            release_date TIMESTAMP,
            upload_status VARCHAR(20) DEFAULT 'pending',
            
            -- Timestamps
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
            
            -- Bandcamp Integration
            bandcamp_track_id BIGINT,
            upload_progress INTEGER DEFAULT 0,
            
            -- Constraints
            CONSTRAINT valid_track_upload_status CHECK (upload_status IN ('pending', 'uploading', 'uploaded', 'failed')),
            CONSTRAINT valid_track_number CHECK (track_number >= 0 AND track_number <= 65535),
            CONSTRAINT valid_upload_progress CHECK (upload_progress >= 0 AND upload_progress <= 100)
        );
        """,
        
        # 4. Upload sessions table
        """
        CREATE TABLE IF NOT EXISTS upload_sessions (
            id BIGSERIAL PRIMARY KEY,
            user_id BIGINT,
            release_id BIGINT REFERENCES releases(id),
            
            -- Session Management
            session_status VARCHAR(20) DEFAULT 'active',
            started_at TIMESTAMP DEFAULT NOW(),
            completed_at TIMESTAMP,
            
            -- Progress Tracking
            total_tracks INTEGER DEFAULT 0,
            uploaded_tracks INTEGER DEFAULT 0,
            failed_tracks INTEGER DEFAULT 0,
            
            -- Error Handling
            error_log JSONB,
            retry_count INTEGER DEFAULT 0,
            
            -- Bandcamp Integration
            bandcamp_session_data JSONB,
            
            -- Constraints
            CONSTRAINT valid_session_status CHECK (session_status IN ('active', 'completed', 'failed', 'cancelled'))
        );
        """
    ]

    print("🗃️ Creating database tables...")
    print("⚠️ Note: Some statements may need to be executed manually in Supabase SQL Editor")
    print("\n" + "="*60)
    
    # Print SQL statements for manual execution
    for i, sql in enumerate(sql_statements, 1):
        print(f"\n📝 SQL Statement {i}/{len(sql_statements)}:")
        print("-" * 40)
        print(sql.strip())
        print("-" * 40)
    
    print("\n" + "="*60)
    print("📋 MANUAL SETUP INSTRUCTIONS:")
    print("1. Copy each SQL statement above")
    print("2. Go to your Supabase project dashboard")
    print("3. Navigate to 'SQL Editor'")
    print("4. Paste and execute each statement")
    print("5. Run this script again to verify table creation")
    
    return True

def verify_tables():
    """Verify that all tables were created successfully."""
    try:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
        
        tables_to_check = ["releases", "tracks", "upload_sessions", "user_credentials"]
        
        print("\n🔍 Verifying table creation...")
        
        all_tables_exist = True
        for table in tables_to_check:
            try:
                # Try to query the table (just get count)
                result = supabase.table(table).select("id", count="exact").limit(1).execute()
                print(f"✅ Table '{table}' exists and is accessible")
            except Exception as e:
                print(f"❌ Table '{table}' not found or not accessible: {e}")
                all_tables_exist = False
                
        return all_tables_exist
        
    except Exception as e:
        print(f"❌ Error verifying tables: {e}")
        return False

def insert_sample_data():
    """Insert sample data for testing."""
    try:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
        
        print("📝 Inserting sample release data...")
        
        # Sample release
        sample_release = {
            "user_id": 1,
            "title": "Test Album",
            "artist": "Test Artist",
            "about": "This is a test album for automation",
            "tags": "electronic, experimental, test",
            "price": 10.00,
            "name_your_price": True,
            "upload_status": "draft"
        }
        
        release_result = supabase.table("releases").insert(sample_release).execute()
        release_id = release_result.data[0]["id"]
        
        print(f"✅ Sample release created with ID: {release_id}")
        
        # Sample tracks
        sample_tracks = [
            {
                "release_id": release_id,
                "title": "Track 1",
                "track_number": 1,
                "file_path": "/path/to/track1.wav",
                "duration": 240,
                "upload_status": "pending"
            },
            {
                "release_id": release_id,
                "title": "Track 2", 
                "track_number": 2,
                "file_path": "/path/to/track2.wav",
                "duration": 180,
                "upload_status": "pending"
            }
        ]
        
        tracks_result = supabase.table("tracks").insert(sample_tracks).execute()
        print(f"✅ {len(tracks_result.data)} sample tracks created")
        
        return True
        
    except Exception as e:
        print(f"❌ Error inserting sample data: {e}")
        return False

def main():
    """Main setup function."""
    print("🚀 Setting up Bandcamp Music Upload Database Schema")
    print("=" * 60)
    
    # Check environment
    if not SUPABASE_URL or not SUPABASE_ANON_KEY:
        print("❌ Error: SUPABASE_URL and SUPABASE_ANON_KEY must be set in config.py")
        return False
    
    print(f"🔗 Connecting to Supabase: {SUPABASE_URL}")
    
    # Create tables (print SQL for manual execution)
    create_music_upload_tables()
    
    # Ask user if they want to verify tables (after manual creation)
    while True:
        response = input("\n❓ Have you executed the SQL statements in Supabase? Verify tables now? (y/n): ").lower().strip()
        if response in ['y', 'yes']:
            if verify_tables():
                print("🎉 All tables verified successfully!")
                
                # Ask about sample data
                while True:
                    response = input("\n❓ Would you like to insert sample data for testing? (y/n): ").lower().strip()
                    if response in ['y', 'yes']:
                        insert_sample_data()
                        break
                    elif response in ['n', 'no']:
                        print("⏭️ Skipping sample data insertion")
                        break
                    else:
                        print("Please enter 'y' or 'n'")
            break
        elif response in ['n', 'no']:
            print("⏭️ Please execute the SQL statements manually first, then run this script again")
            break
        else:
            print("Please enter 'y' or 'n'")
    
    print("\n🎉 Database setup complete!")
    print("\n📋 Next steps:")
    print("1. Your database schema is ready for music upload automation")
    print("2. Update your automation script to use these new tables")
    print("3. Test the upload functionality")
    
    return True

if __name__ == "__main__":
    try:
        success = main()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\n⏹️ Setup cancelled by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        sys.exit(1) 