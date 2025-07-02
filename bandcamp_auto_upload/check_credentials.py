#!/usr/bin/env python3
"""Check what credentials are stored in Supabase"""

from config import *
from supabase import create_client

def check_all_credentials():
    print("🔍 Checking all credentials in Supabase database...")
    
    try:
        # Create Supabase client
        supabase = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
        print("✅ Connected to Supabase")
        
        # Get all records from credentials table
        response = supabase.table(CREDENTIALS_TABLE).select("*").execute()
        
        if not response.data:
            print("❌ No credentials found in database")
            return
            
        print(f"\n📋 Found {len(response.data)} credential record(s):")
        print("-" * 50)
        
        for i, record in enumerate(response.data, 1):
            print(f"Record {i}:")
            print(f"  🆔 ID: {record.get('id', 'N/A')}")
            print(f"  👤 User ID: {record.get(USER_ID_FIELD, 'N/A')}")
            print(f"  📧 Username: {record.get(USERNAME_FIELD, 'N/A')}")
            print(f"  🔒 Password: {'***' if record.get(PASSWORD_FIELD) else 'None'}")
            print(f"  🛡️ Encrypted: {record.get(ENCRYPTED_FIELD, 'N/A')}")
            print(f"  📅 Created: {record.get('created_at', 'N/A')}")
            print()
            
        print("💡 To use these credentials, run:")
        for record in response.data:
            user_id = record.get(USER_ID_FIELD)
            if user_id:
                print(f"   python -c \"from bandcamp_automation import BandcampAutomation; BandcampAutomation().start(user_id='{user_id}')\"")
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")

if __name__ == "__main__":
    check_all_credentials() 