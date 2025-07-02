#!/usr/bin/env python3
"""
Database Cleanup Utility for Bandcamp Automation
Removes test data, failed uploads, and old sessions from Supabase
"""

import sys
from datetime import datetime, timedelta
from config import *

# Supabase imports
try:
    from supabase import create_client, Client
except ImportError:
    print("❌ Supabase library not installed. Run: pip install supabase")
    sys.exit(1)

class DatabaseCleaner:
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
    
    def show_database_stats(self):
        """Show current database statistics."""
        print("\n📊 DATABASE STATISTICS")
        print("-" * 40)
        
        tables = [
            ("bandcamp_credentials", "Stored login credentials"),
            ("releases", "Album/release records"),
            ("tracks", "Individual track records"),
            ("upload_sessions", "Upload session logs")
        ]
        
        for table_name, description in tables:
            try:
                response = self.supabase.table(table_name).select("id", count="exact").execute()
                count = response.count if hasattr(response, 'count') else len(response.data)
                print(f"📁 {table_name:<20} {count:>5} records - {description}")
            except Exception as e:
                print(f"❌ {table_name:<20} Error: {str(e)}")
    
    def cleanup_failed_uploads(self):
        """Remove failed upload records."""
        print("\n🧹 CLEANING UP FAILED UPLOADS")
        print("-" * 40)
        
        try:
            # Get failed releases
            failed_releases = self.supabase.table("releases").select("*").eq("upload_status", "failed").execute()
            
            if not failed_releases.data:
                print("✅ No failed releases to clean up")
            else:
                print(f"🗑️ Found {len(failed_releases.data)} failed releases")
                
                confirm = input("Delete failed releases and their tracks? (y/n): ").lower().strip()
                if confirm == 'y':
                    for release in failed_releases.data:
                        release_id = release['id']
                        title = release.get('title', 'Unknown')
                        
                        # Delete associated tracks first (due to foreign key)
                        self.supabase.table("tracks").delete().eq("release_id", release_id).execute()
                        
                        # Delete the release
                        self.supabase.table("releases").delete().eq("id", release_id).execute()
                        
                        print(f"   🗑️ Deleted failed release: {title}")
                    
                    print(f"✅ Cleaned up {len(failed_releases.data)} failed releases")
                else:
                    print("❌ Cleanup cancelled")
            
            # Get failed tracks
            failed_tracks = self.supabase.table("tracks").select("*").eq("upload_status", "failed").execute()
            
            if not failed_tracks.data:
                print("✅ No failed tracks to clean up")
            else:
                print(f"🗑️ Found {len(failed_tracks.data)} failed tracks")
                
                confirm = input("Delete failed tracks? (y/n): ").lower().strip()
                if confirm == 'y':
                    for track in failed_tracks.data:
                        track_id = track['id']
                        title = track.get('title', 'Unknown')
                        
                        self.supabase.table("tracks").delete().eq("id", track_id).execute()
                        print(f"   🗑️ Deleted failed track: {title}")
                    
                    print(f"✅ Cleaned up {len(failed_tracks.data)} failed tracks")
                else:
                    print("❌ Cleanup cancelled")
                    
        except Exception as e:
            print(f"❌ Error cleaning up failed uploads: {e}")
    
    def cleanup_old_sessions(self, days_old=7):
        """Remove old upload sessions."""
        print(f"\n🧹 CLEANING UP OLD SESSIONS (>{days_old} days)")
        print("-" * 40)
        
        try:
            # Calculate cutoff date
            cutoff_date = datetime.now() - timedelta(days=days_old)
            cutoff_iso = cutoff_date.isoformat()
            
            # Get old sessions
            old_sessions = self.supabase.table("upload_sessions").select("*").lt("started_at", cutoff_iso).execute()
            
            if not old_sessions.data:
                print(f"✅ No sessions older than {days_old} days found")
                return
            
            print(f"🗑️ Found {len(old_sessions.data)} old sessions")
            
            # Show session details
            for session in old_sessions.data[:5]:  # Show first 5
                started = session.get('started_at', 'Unknown')
                status = session.get('session_status', 'Unknown')
                print(f"   📅 {started} - Status: {status}")
            
            if len(old_sessions.data) > 5:
                print(f"   ... and {len(old_sessions.data) - 5} more")
            
            confirm = input(f"Delete {len(old_sessions.data)} old sessions? (y/n): ").lower().strip()
            if confirm == 'y':
                for session in old_sessions.data:
                    session_id = session['id']
                    self.supabase.table("upload_sessions").delete().eq("id", session_id).execute()
                
                print(f"✅ Cleaned up {len(old_sessions.data)} old sessions")
            else:
                print("❌ Cleanup cancelled")
                
        except Exception as e:
            print(f"❌ Error cleaning up old sessions: {e}")
    
    def cleanup_test_data(self):
        """Remove test data (releases with 'test' or 'demo' in title)."""
        print("\n🧹 CLEANING UP TEST DATA")
        print("-" * 40)
        
        try:
            # Find test releases
            test_keywords = ['test', 'demo', 'sample', 'automation test']
            test_releases = []
            
            for keyword in test_keywords:
                response = self.supabase.table("releases").select("*").ilike("title", f"%{keyword}%").execute()
                test_releases.extend(response.data)
            
            # Remove duplicates
            unique_releases = {r['id']: r for r in test_releases}.values()
            test_releases = list(unique_releases)
            
            if not test_releases:
                print("✅ No test data found")
                return
            
            print(f"🗑️ Found {len(test_releases)} test releases:")
            for release in test_releases:
                title = release.get('title', 'Unknown')
                status = release.get('upload_status', 'Unknown')
                print(f"   📀 {title} (Status: {status})")
            
            confirm = input(f"Delete {len(test_releases)} test releases and their tracks? (y/n): ").lower().strip()
            if confirm == 'y':
                for release in test_releases:
                    release_id = release['id']
                    title = release.get('title', 'Unknown')
                    
                    # Delete associated tracks first
                    tracks_response = self.supabase.table("tracks").delete().eq("release_id", release_id).execute()
                    
                    # Delete the release
                    self.supabase.table("releases").delete().eq("id", release_id).execute()
                    
                    print(f"   🗑️ Deleted test release: {title}")
                
                print(f"✅ Cleaned up {len(test_releases)} test releases")
            else:
                print("❌ Cleanup cancelled")
                
        except Exception as e:
            print(f"❌ Error cleaning up test data: {e}")
    
    def reset_draft_status(self):
        """Reset 'uploading' status back to 'draft' (for stuck uploads)."""
        print("\n🔄 RESETTING STUCK UPLOADS")
        print("-" * 40)
        
        try:
            # Find stuck releases
            stuck_releases = self.supabase.table("releases").select("*").eq("upload_status", "uploading").execute()
            
            if not stuck_releases.data:
                print("✅ No stuck releases found")
            else:
                print(f"🔄 Found {len(stuck_releases.data)} stuck releases:")
                for release in stuck_releases.data:
                    title = release.get('title', 'Unknown')
                    print(f"   📀 {title}")
                
                confirm = input("Reset these releases to 'draft' status? (y/n): ").lower().strip()
                if confirm == 'y':
                    for release in stuck_releases.data:
                        release_id = release['id']
                        self.supabase.table("releases").update({"upload_status": "draft"}).eq("id", release_id).execute()
                    
                    print(f"✅ Reset {len(stuck_releases.data)} releases to draft status")
                else:
                    print("❌ Reset cancelled")
            
            # Find stuck tracks
            stuck_tracks = self.supabase.table("tracks").select("*").eq("upload_status", "uploading").execute()
            
            if not stuck_tracks.data:
                print("✅ No stuck tracks found")
            else:
                print(f"🔄 Found {len(stuck_tracks.data)} stuck tracks")
                
                confirm = input("Reset these tracks to 'pending' status? (y/n): ").lower().strip()
                if confirm == 'y':
                    for track in stuck_tracks.data:
                        track_id = track['id']
                        self.supabase.table("tracks").update({"upload_status": "pending"}).eq("id", track_id).execute()
                    
                    print(f"✅ Reset {len(stuck_tracks.data)} tracks to pending status")
                else:
                    print("❌ Reset cancelled")
                    
        except Exception as e:
            print(f"❌ Error resetting stuck uploads: {e}")
    
    def show_menu(self):
        """Show the cleanup menu."""
        print("\n" + "="*50)
        print("🧹 DATABASE CLEANUP UTILITY")
        print("="*50)
        print("1. 📊 Show database statistics")
        print("2. 🗑️ Clean up failed uploads")
        print("3. 📅 Clean up old sessions (7+ days)")
        print("4. 🧪 Clean up test data")
        print("5. 🔄 Reset stuck uploads to draft")
        print("6. 🗑️ Full cleanup (all of the above)")
        print("7. ❌ Exit")
        print("-"*50)
    
    def full_cleanup(self):
        """Perform all cleanup operations."""
        print("\n🧹 FULL DATABASE CLEANUP")
        print("-" * 40)
        
        confirm = input("This will clean up ALL test data, failed uploads, and old sessions. Continue? (y/n): ").lower().strip()
        if confirm != 'y':
            print("❌ Full cleanup cancelled")
            return
        
        print("\n1. Cleaning up failed uploads...")
        self.cleanup_failed_uploads()
        
        print("\n2. Cleaning up old sessions...")
        self.cleanup_old_sessions()
        
        print("\n3. Cleaning up test data...")
        self.cleanup_test_data()
        
        print("\n4. Resetting stuck uploads...")
        self.reset_draft_status()
        
        print("\n✅ Full cleanup completed!")
        self.show_database_stats()
    
    def run(self):
        """Main interactive loop."""
        while True:
            self.show_menu()
            
            choice = input("Select option (1-7): ").strip()
            
            if choice == '1':
                self.show_database_stats()
            elif choice == '2':
                self.cleanup_failed_uploads()
            elif choice == '3':
                self.cleanup_old_sessions()
            elif choice == '4':
                self.cleanup_test_data()
            elif choice == '5':
                self.reset_draft_status()
            elif choice == '6':
                self.full_cleanup()
            elif choice == '7':
                print("👋 Cleanup utility closed!")
                break
            else:
                print("❌ Invalid choice. Please select 1-7.")
            
            input("\nPress Enter to continue...")

def main():
    """Main function."""
    if not USE_SUPABASE:
        print("❌ Supabase integration is disabled in config.py")
        print("💡 Set USE_SUPABASE = True to enable")
        return
    
    cleaner = DatabaseCleaner()
    
    if len(sys.argv) > 1:
        # Command line mode
        command = sys.argv[1].lower()
        
        if command == 'stats':
            cleaner.show_database_stats()
        elif command == 'failed':
            cleaner.cleanup_failed_uploads()
        elif command == 'old':
            cleaner.cleanup_old_sessions()
        elif command == 'test':
            cleaner.cleanup_test_data()
        elif command == 'reset':
            cleaner.reset_draft_status()
        elif command == 'full':
            cleaner.full_cleanup()
        else:
            print("Usage: python cleanup_database.py [stats|failed|old|test|reset|full]")
    else:
        # Interactive mode
        cleaner.run()

if __name__ == "__main__":
    main()