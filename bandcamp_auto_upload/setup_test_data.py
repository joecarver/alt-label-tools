#!/usr/bin/env python3
"""
Quick Test Data Setup
Updates existing release and adds tracks for upload testing
"""

from supabase import create_client
from config import *

def setup_test_data():
    """Set up test data for upload testing."""
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
        print("✅ Connected to Supabase")
        
        # Update the existing release to have user_id = UUID (from credentials table)
        release_update = {
            'user_id': None,  # Set to None so automation can pick it up
            'title': 'Demo Album - Upload Test 2024',
            'artist': 'Automation Test Artist',
            'about': 'Test album for Bandcamp automation with sine wave tracks',
            'tags': 'electronic, test, automation, demo',
            'price': 15.00,
            'name_your_price': True,
            'upload_status': 'draft'
        }
        
        result = supabase.table('releases').update(release_update).eq('id', 1).execute()
        print('✅ Updated release with proper user_id and data')
        
        # Delete any existing tracks for this release
        supabase.table('tracks').delete().eq('release_id', 1).execute()
        print('🧹 Cleared any existing tracks')
        
        # Add tracks for this release
        tracks_data = [
            {
                'release_id': 1,
                'title': 'Track 1 - Opening Movement',
                'artist': 'Automation Test Artist',
                'track_number': 1,
                'file_path': 'C:/temp/bandcamp_test_music/track1_opening.wav',
                'file_name': 'track1_opening.wav',
                'file_size': 2646044,
                'about': 'Pure 440Hz sine wave - musical note A4',
                'upload_status': 'pending',
                'duration': 30
            },
            {
                'release_id': 1,
                'title': 'Track 2 - Middle Exploration',
                'artist': 'Automation Test Artist',
                'track_number': 2,
                'file_path': 'C:/temp/bandcamp_test_music/track2_middle.wav',
                'file_name': 'track2_middle.wav',
                'file_size': 2205044,
                'about': 'Pure 523Hz sine wave - musical note C5',
                'upload_status': 'pending',
                'duration': 25
            },
            {
                'release_id': 1,
                'title': 'Track 3 - Grand Finale',
                'artist': 'Automation Test Artist',
                'track_number': 3,
                'file_path': 'C:/temp/bandcamp_test_music/track3_finale.wav',
                'file_name': 'track3_finale.wav',
                'file_size': 3087044,
                'about': 'Pure 659Hz sine wave - musical note E5',
                'upload_status': 'pending',
                'duration': 35
            }
        ]
        
        tracks_result = supabase.table('tracks').insert(tracks_data).execute()
        print(f'✅ Created {len(tracks_result.data)} tracks')
        
        print("\n🎉 TEST DATA READY!")
        print("="*50)
        print("📀 Release: Demo Album - Upload Test 2024")
        print("🎤 Artist: Automation Test Artist") 
        print("🎵 Tracks: 3 sine wave tracks")
        print("💰 Price: $15.00 (name your price)")
        print("📊 Status: draft (ready for upload)")
        
        print("\n🚀 Ready to test upload!")
        print("Run: python bandcamp_automation.py --upload --user-id 1")
        
        return True
        
    except Exception as e:
        print(f"❌ Error setting up test data: {e}")
        return False

if __name__ == "__main__":
    setup_test_data() 