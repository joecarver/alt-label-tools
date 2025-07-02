#!/usr/bin/env python3
"""
Test Audio File Generator
Creates simple sine wave audio files for testing Bandcamp upload automation
"""

import os
import sys
import math
import wave
import struct

def generate_sine_wave(frequency, duration, sample_rate=44100, amplitude=0.3):
    """Generate a simple sine wave."""
    frames = []
    for i in range(int(duration * sample_rate)):
        # Generate sine wave
        value = amplitude * math.sin(2 * math.pi * frequency * i / sample_rate)
        # Convert to 16-bit integer
        frames.append(int(value * 32767))
    return frames

def create_wav_file(filename, frames, sample_rate=44100):
    """Create a WAV file from audio frames."""
    try:
        with wave.open(filename, 'w') as wav_file:
            # Set WAV file parameters
            wav_file.setnchannels(1)  # Mono
            wav_file.setsampwidth(2)  # 2 bytes per sample (16-bit)
            wav_file.setframerate(sample_rate)
            
            # Write frames
            for frame in frames:
                wav_file.writeframes(struct.pack('<h', frame))
        
        return True
    except Exception as e:
        print(f"❌ Error creating WAV file {filename}: {e}")
        return False

def create_test_tracks():
    """Create test audio tracks with different frequencies."""
    
    base_dir = "C:/temp/bandcamp_test_music"
    
    # Ensure directory exists
    os.makedirs(base_dir, exist_ok=True)
    
    # Track configurations: (filename, frequency, duration)
    tracks = [
        ("track1_opening.wav", 440, 30),      # A4 note, 30 seconds
        ("track2_middle.wav", 523, 25),       # C5 note, 25 seconds  
        ("track3_finale.wav", 659, 35)        # E5 note, 35 seconds
    ]
    
    print("🎵 Creating test audio files...")
    
    created_files = []
    
    for filename, frequency, duration in tracks:
        filepath = os.path.join(base_dir, filename)
        
        print(f"   🎼 Generating {filename} ({frequency}Hz, {duration}s)...")
        
        # Generate sine wave
        frames = generate_sine_wave(frequency, duration)
        
        # Create WAV file
        if create_wav_file(filepath, frames):
            file_size = os.path.getsize(filepath)
            print(f"   ✅ Created {filename} ({file_size:,} bytes)")
            created_files.append(filepath)
        else:
            print(f"   ❌ Failed to create {filename}")
    
    return created_files

def create_test_artwork():
    """Create a simple test album artwork image."""
    try:
        from PIL import Image, ImageDraw, ImageFont
        
        # Create a 1400x1400 image (Bandcamp recommended size)
        img = Image.new('RGB', (1400, 1400), color='#2E3440')
        draw = ImageDraw.Draw(img)
        
        # Draw a simple design
        # Background gradient effect
        for y in range(1400):
            color_value = int(46 + (y / 1400) * 100)  # Gradient from dark to lighter
            draw.line([(0, y), (1400, y)], fill=(color_value, color_value//2, color_value//3))
        
        # Draw title text
        try:
            # Try to use a system font
            font_large = ImageFont.truetype("arial.ttf", 80)
            font_small = ImageFont.truetype("arial.ttf", 50)
        except:
            # Fallback to default font
            font_large = ImageFont.load_default()
            font_small = ImageFont.load_default()
        
        # Album title
        draw.text((700, 600), "DEMO ALBUM", font=font_large, anchor="mm", fill='white')
        draw.text((700, 700), "Bandcamp Upload Test", font=font_small, anchor="mm", fill='#88C0D0')
        draw.text((700, 800), "Test Artist", font=font_small, anchor="mm", fill='#D8DEE9')
        
        # Save artwork
        artwork_path = "C:/temp/bandcamp_test_music/album_artwork.jpg"
        img.save(artwork_path, "JPEG", quality=95)
        
        file_size = os.path.getsize(artwork_path)
        print(f"🎨 Created album artwork: album_artwork.jpg ({file_size:,} bytes)")
        
        return artwork_path
        
    except ImportError:
        print("⚠️ PIL/Pillow not installed - skipping artwork creation")
        print("   Install with: pip install Pillow")
        return None
    except Exception as e:
        print(f"❌ Error creating artwork: {e}")
        return None

def main():
    """Main function to create all test files."""
    
    print("🧪 Bandcamp Test File Generator")
    print("=" * 50)
    
    # Create audio tracks
    audio_files = create_test_tracks()
    
    # Create artwork
    artwork_file = create_test_artwork()
    
    print("\n" + "=" * 50)
    print("📋 Test Files Created:")
    
    if audio_files:
        print(f"🎵 Audio files: {len(audio_files)}")
        for file in audio_files:
            print(f"   📁 {file}")
    
    if artwork_file:
        print(f"🎨 Artwork: {artwork_file}")
    
    print(f"\n📂 All files location: C:/temp/bandcamp_test_music/")
    
    # Calculate total size
    total_size = 0
    all_files = audio_files + ([artwork_file] if artwork_file else [])
    
    for file in all_files:
        if os.path.exists(file):
            total_size += os.path.getsize(file)
    
    print(f"📊 Total size: {total_size:,} bytes ({total_size/1024/1024:.1f} MB)")
    
    print("\n🚀 Next steps:")
    print("1. Update database with these file paths")
    print("2. Run the upload automation")
    print("3. Test the complete workflow")
    
    return audio_files, artwork_file

if __name__ == "__main__":
    main() 