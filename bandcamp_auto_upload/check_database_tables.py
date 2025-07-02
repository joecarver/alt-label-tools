#!/usr/bin/env python3
"""
Check Database Tables Status
Verifies which tables exist and shows their current data
"""

from config import *
from supabase import create_client

def check_table_exists(client, table_name):
    """Check if a table exists and return basic info."""
    try:
        response = client.table(table_name).select("*").limit(1).execute()
        return True, len(response.data) if response.data else 0
    except Exception as e:
        return False, str(e)

def check_all_tables():
    """Check all required tables for upload functionality."""
    print("=== DATABASE STATUS CHECK ===")
    
    try:
        # Create Supabase client
        supabase = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
        print("✅ Connected to Supabase")
        
        # Tables to check
        required_tables = {
            "bandcamp_credentials": "Login credentials storage",
            "releases": "Album/release metadata", 
            "tracks": "Individual track information",
            "upload_sessions": "Upload progress tracking"
        }
        
        print("\n📋 Checking required tables:")
        print("-" * 60)
        
        existing_tables = []
        missing_tables = []
        
        for table_name, description in required_tables.items():
            exists, info = check_table_exists(supabase, table_name)
            
            if exists:
                if isinstance(info, int):
                    print(f"✅ {table_name:<20} - {description} ({info} records)")
                    existing_tables.append(table_name)
                else:
                    print(f"⚠️  {table_name:<20} - Exists but empty")
                    existing_tables.append(table_name)
            else:
                print(f"❌ {table_name:<20} - MISSING: {description}")
                missing_tables.append(table_name)
        
        print("-" * 60)
        print(f"✅ Existing tables: {len(existing_tables)}")
        print(f"❌ Missing tables: {len(missing_tables)}")
        
        if missing_tables:
            print(f"\n🔧 Missing tables: {', '.join(missing_tables)}")
            print("💡 Run 'python setup_music_upload_tables.py' to create them")
            return False
        else:
            print("\n🎉 All tables exist! Ready for upload testing.")
            
            # Show sample data from each table
            print("\n📊 Sample data from tables:")
            for table in existing_tables:
                try:
                    response = supabase.table(table).select("*").limit(3).execute()
                    print(f"\n{table} (showing up to 3 records):")
                    if response.data:
                        for i, record in enumerate(response.data, 1):
                            if table == "bandcamp_credentials":
                                # Hide password for security
                                safe_record = {k: v if k != "password" else "***" for k, v in record.items()}
                                print(f"  {i}. {safe_record}")
                            else:
                                print(f"  {i}. {record}")
                    else:
                        print("  (no records)")
                except Exception as e:
                    print(f"  Error reading {table}: {e}")
            
            return True
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False

if __name__ == "__main__":
    success = check_all_tables()
    
    if not success:
        print("\n🚨 Database setup incomplete!")
        print("Next steps:")
        print("1. Run: python setup_music_upload_tables.py")
        print("2. Set up the missing tables manually in Supabase SQL Editor")
        print("3. Run this check again")
    else:
        print("\n✅ Database ready for upload automation!") 