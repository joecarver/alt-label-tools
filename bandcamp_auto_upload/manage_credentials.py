#!/usr/bin/env python3
"""
Bandcamp Credentials Manager
A utility for managing stored Bandcamp login credentials in Supabase
"""

import sys
import getpass
from datetime import datetime
from config import *

# Supabase imports
try:
    from supabase import create_client, Client
except ImportError:
    print("❌ Supabase library not installed. Run: pip install supabase")
    sys.exit(1)

class CredentialsManager:
    def __init__(self):
        self.supabase = None
        self.init_supabase()
    
    def init_supabase(self):
        """Initialize Supabase connection."""
        try:
            self.supabase: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
            print("✅ Connected to Supabase")
        except Exception as e:
            print(f"❌ Failed to connect to Supabase: {e}")
            sys.exit(1)
    
    def list_credentials(self):
        """List all stored credentials."""
        try:
            response = self.supabase.table(CREDENTIALS_TABLE).select("*").execute()
            
            if not response.data:
                print("📋 No credentials found in database")
                return
            
            print(f"\n📋 Found {len(response.data)} credential record(s):")
            print("-" * 70)
            
            for i, record in enumerate(response.data, 1):
                print(f"Record {i}:")
                print(f"  🆔 ID: {record.get('id', 'N/A')}")
                print(f"  👤 User ID: {record.get(USER_ID_FIELD, 'N/A')}")
                print(f"  📧 Username: {record.get(USERNAME_FIELD, 'N/A')}")
                print(f"  🔒 Password: {'***' + record.get(PASSWORD_FIELD, '')[-3:] if record.get(PASSWORD_FIELD) else 'None'}")
                print(f"  🛡️ Encrypted: {record.get(ENCRYPTED_FIELD, 'N/A')}")
                print(f"  📅 Created: {record.get('created_at', 'N/A')}")
                print(f"  📅 Updated: {record.get('updated_at', 'N/A')}")
                print()
        
        except Exception as e:
            print(f"❌ Error listing credentials: {e}")
    
    def add_credentials(self):
        """Add new credentials interactively."""
        print("\n➕ ADD NEW CREDENTIALS")
        print("-" * 30)
        
        user_id = input("Enter User ID: ").strip()
        if not user_id:
            print("❌ User ID is required")
            return False
        
        username = input("Enter Bandcamp Username/Email: ").strip()
        if not username:
            print("❌ Username is required")
            return False
        
        password = getpass.getpass("Enter Bandcamp Password: ")
        if not password:
            print("❌ Password is required")
            return False
        
        # Confirm password
        password_confirm = getpass.getpass("Confirm Password: ")
        if password != password_confirm:
            print("❌ Passwords don't match")
            return False
        
        try:
            # Check if user_id already exists
            existing = self.supabase.table(CREDENTIALS_TABLE).select("*").eq(USER_ID_FIELD, user_id).execute()
            
            if existing.data:
                print(f"⚠️ Credentials for user_id '{user_id}' already exist")
                overwrite = input("Overwrite existing credentials? (y/n): ").lower().strip()
                if overwrite != 'y':
                    print("❌ Operation cancelled")
                    return False
                
                # Update existing
                update_data = {
                    USERNAME_FIELD: username,
                    PASSWORD_FIELD: password,
                    ENCRYPTED_FIELD: False,  # Store as plain text for now
                    "updated_at": datetime.now().isoformat()
                }
                
                self.supabase.table(CREDENTIALS_TABLE).update(update_data).eq(USER_ID_FIELD, user_id).execute()
                print(f"✅ Updated credentials for user_id: {user_id}")
            else:
                # Insert new
                insert_data = {
                    USER_ID_FIELD: user_id,
                    USERNAME_FIELD: username,
                    PASSWORD_FIELD: password,
                    ENCRYPTED_FIELD: False,
                    "created_at": datetime.now().isoformat(),
                    "updated_at": datetime.now().isoformat()
                }
                
                self.supabase.table(CREDENTIALS_TABLE).insert(insert_data).execute()
                print(f"✅ Added new credentials for user_id: {user_id}")
            
            return True
            
        except Exception as e:
            print(f"❌ Error adding credentials: {e}")
            return False
    
    def delete_credentials(self):
        """Delete credentials by user_id."""
        print("\n🗑️ DELETE CREDENTIALS")
        print("-" * 30)
        
        user_id = input("Enter User ID to delete: ").strip()
        if not user_id:
            print("❌ User ID is required")
            return False
        
        try:
            # Check if exists
            existing = self.supabase.table(CREDENTIALS_TABLE).select("*").eq(USER_ID_FIELD, user_id).execute()
            
            if not existing.data:
                print(f"❌ No credentials found for user_id: {user_id}")
                return False
            
            record = existing.data[0]
            print(f"Found credentials for: {record.get(USERNAME_FIELD, 'Unknown')}")
            
            confirm = input(f"Are you sure you want to delete credentials for user_id '{user_id}'? (y/n): ").lower().strip()
            if confirm != 'y':
                print("❌ Operation cancelled")
                return False
            
            self.supabase.table(CREDENTIALS_TABLE).delete().eq(USER_ID_FIELD, user_id).execute()
            print(f"✅ Deleted credentials for user_id: {user_id}")
            return True
            
        except Exception as e:
            print(f"❌ Error deleting credentials: {e}")
            return False
    
    def test_credentials(self):
        """Test stored credentials with the automation script."""
        print("\n🧪 TEST CREDENTIALS")
        print("-" * 30)
        
        user_id = input("Enter User ID to test (or press Enter for default): ").strip()
        if not user_id:
            user_id = DEFAULT_USER_ID
        
        try:
            # Check if credentials exist
            response = self.supabase.table(CREDENTIALS_TABLE).select("*").eq(USER_ID_FIELD, user_id).execute()
            
            if not response.data:
                print(f"❌ No credentials found for user_id: {user_id}")
                return False
            
            record = response.data[0]
            print(f"Testing credentials for: {record.get(USERNAME_FIELD, 'Unknown')}")
            
            # Import and test with automation
            from bandcamp_automation import BandcampAutomation
            
            print("🚀 Starting login test...")
            automation = BandcampAutomation()
            success = automation.start(user_id=user_id, upload_mode=False)
            
            if success:
                print("✅ Credentials test PASSED!")
            else:
                print("❌ Credentials test FAILED!")
                print("💡 Check automation.log for details")
            
            return success
            
        except Exception as e:
            print(f"❌ Error testing credentials: {e}")
            return False
    
    def show_menu(self):
        """Show the main menu."""
        print("\n" + "="*50)
        print("🔐 BANDCAMP CREDENTIALS MANAGER")
        print("="*50)
        print("1. 📋 List all credentials")
        print("2. ➕ Add new credentials")
        print("3. 🗑️ Delete credentials")
        print("4. 🧪 Test credentials")
        print("5. ❌ Exit")
        print("-"*50)
    
    def run(self):
        """Main interactive loop."""
        while True:
            self.show_menu()
            
            choice = input("Select option (1-5): ").strip()
            
            if choice == '1':
                self.list_credentials()
            elif choice == '2':
                self.add_credentials()
            elif choice == '3':
                self.delete_credentials()
            elif choice == '4':
                self.test_credentials()
            elif choice == '5':
                print("👋 Goodbye!")
                break
            else:
                print("❌ Invalid choice. Please select 1-5.")
            
            input("\nPress Enter to continue...")

def main():
    """Main function."""
    if not USE_SUPABASE:
        print("❌ Supabase integration is disabled in config.py")
        print("💡 Set USE_SUPABASE = True to enable")
        return
    
    manager = CredentialsManager()
    
    if len(sys.argv) > 1:
        # Command line mode
        command = sys.argv[1].lower()
        
        if command == 'list':
            manager.list_credentials()
        elif command == 'add':
            manager.add_credentials()
        elif command == 'test':
            user_id = sys.argv[2] if len(sys.argv) > 2 else DEFAULT_USER_ID
            manager.test_credentials()
        else:
            print("Usage: python manage_credentials.py [list|add|test] [user_id]")
    else:
        # Interactive mode
        manager.run()

if __name__ == "__main__":
    main() 