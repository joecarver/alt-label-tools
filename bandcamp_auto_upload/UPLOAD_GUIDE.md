# 🎵 Bandcamp Upload Automation Guide

This guide covers the enhanced Bandcamp automation script that can upload music releases directly from your Supabase database.

## 🚀 Quick Start

### 1. **Database Setup** (Complete ✅)
Your database schema is already set up with the required tables:
- `releases` - Album/release metadata
- `tracks` - Individual track information  
- `upload_sessions` - Progress tracking
- `user_credentials` - Login credentials

### 2. **Create Test Data**
```bash
python test_upload_data.py
```
This creates a sample release with 3 tracks for testing.

### 3. **Run Upload Automation**
```bash
# Standard login test (existing functionality)
python bandcamp_automation.py

# Upload mode - uploads releases from database
python bandcamp_automation.py --upload --user-id 1
```

## 📋 Database Schema Overview

### **`releases` Table**
Contains album/release metadata that maps to Bandcamp's upload form:

| Field | Type | Description | Required |
|-------|------|-------------|----------|
| `id` | BIGSERIAL | Primary key | ✅ |
| `user_id` | BIGINT | User identifier | ✅ |
| `title` | VARCHAR(300) | Album title | ✅ |
| `artist` | VARCHAR(100) | Artist name | ❌ |
| `about` | TEXT | Album description | ❌ |
| `credits` | TEXT | Album credits | ❌ |
| `tags` | TEXT | Comma-separated tags | ❌ |
| `price` | DECIMAL(10,2) | Album price | ❌ |
| `name_your_price` | BOOLEAN | Allow fans to pay more | ❌ |
| `release_date` | TIMESTAMP | Release date | ❌ |
| `upload_status` | VARCHAR(20) | Status: draft/uploading/published/failed | ✅ |
| `artwork_path` | TEXT | Path to album artwork | ❌ |
| `upc` | VARCHAR(13) | UPC/EAN code | ❌ |
| `cat_number` | VARCHAR(50) | Catalog number | ❌ |

### **`tracks` Table**
Contains individual track information:

| Field | Type | Description | Required |
|-------|------|-------------|----------|
| `id` | BIGSERIAL | Primary key | ✅ |
| `release_id` | BIGINT | Links to releases table | ✅ |
| `title` | VARCHAR(300) | Track title | ✅ |
| `artist` | VARCHAR(100) | Track artist (if different) | ❌ |
| `track_number` | INTEGER | Track position | ✅ |
| `file_path` | TEXT | Full path to audio file | ✅ |
| `file_name` | VARCHAR(200) | Audio filename | ❌ |
| `duration` | INTEGER | Track duration in seconds | ❌ |
| `about` | TEXT | Track description | ❌ |
| `credits` | TEXT | Track credits | ❌ |
| `lyrics` | TEXT | Track lyrics | ❌ |
| `price` | DECIMAL(10,2) | Individual track price | ❌ |
| `upload_status` | VARCHAR(20) | Status: pending/uploading/uploaded/failed | ✅ |

## 🎯 Upload Process Flow

1. **Login** - Authenticates using Supabase credentials
2. **Fetch Release** - Gets next draft release for user
3. **Navigate** - Goes to Bandcamp's upload page
4. **Album Details** - Fills in release metadata
5. **Upload Tracks** - Uploads each audio file
6. **Track Details** - Fills track-specific information
7. **Artwork** - Uploads album art (if provided)
8. **Save** - Saves the complete release
9. **Update Status** - Updates database with results

## 📁 File Requirements

### **Audio Files**
- **Formats**: `.wav`, `.flac`, `.aiff` (preferred) or `.mp3`
- **Size**: Maximum 2GB per track
- **Quality**: Lossless formats recommended
- **Paths**: Use absolute file paths in database

### **Artwork**
- **Formats**: `.jpg`, `.png`, `.gif`
- **Size**: 1400x1400 pixels minimum (bigger is better)
- **Max file size**: 10MB
- **Path**: Store in `artwork_path` field

## 🛠️ Usage Examples

### **Create Sample Data**
```bash
# Create test release and tracks
python test_upload_data.py
```

### **Login Only (Test Authentication)**
```bash
python bandcamp_automation.py
```

### **Upload Mode**
```bash
# Upload for user_id 1
python bandcamp_automation.py --upload --user-id 1

# Upload for specific user
python bandcamp_automation.py -u --uid 5
```

### **Check Upload Status**
```bash
python check_credentials.py
```

## 📊 Monitoring Progress

The automation provides detailed logging and database status updates:

### **Upload Statuses**
- **Releases**: `draft` → `uploading` → `published` (or `failed`)
- **Tracks**: `pending` → `uploading` → `uploaded` (or `failed`)
- **Sessions**: `active` → `completed` (or `failed`)

### **Log Files**
- **File**: `automation.log`
- **Screenshots**: `screenshots/` directory (on errors)
- **Real-time**: Console output with emoji indicators

## 🚧 Troubleshooting

### **Common Issues**

**1. File Not Found Error**
```
❌ Track file not found: /path/to/track.wav
```
**Solution**: Update `file_path` in tracks table with correct absolute paths

**2. CAPTCHA Required**
```
🤖 CAPTCHA detected! Please complete manually...
```
**Solution**: Complete CAPTCHA in browser window, automation will continue

**3. Upload Timeout**
```
❌ Track upload timeout
```
**Solution**: Check file size (<2GB) and internet connection

**4. No Pending Releases**
```
ℹ️ No pending releases to upload
```
**Solution**: Ensure release has `upload_status = 'draft'` in database

### **Debugging Steps**

1. **Check Database Connection**
   ```bash
   python -c "from config import *; print(f'URL: {SUPABASE_URL}')"
   ```

2. **Verify Credentials**
   ```bash
   python check_credentials.py
   ```

3. **Test File Paths**
   ```bash
   python -c "import os; print(os.path.exists('/your/file/path.wav'))"
   ```

4. **Review Logs**
   ```bash
   tail -f automation.log
   ```

## 🔧 Configuration

### **Audio File Settings**
Update `config.py`:
```python
SUPPORTED_AUDIO_FORMATS = ['.mp3', '.flac', '.wav', '.aiff', '.ogg']
MAX_FILE_SIZE_MB = 200
```

### **Browser Settings**
```python
HEADLESS_MODE = False  # Set True for background operation
BROWSER_TIMEOUT = 30   # Increase for slow connections
```

### **Upload Settings**
```python
WAIT_BETWEEN_ACTIONS = 2  # Seconds between actions
MAX_RETRIES = 3          # Retry attempts for failures
```

## 📈 Advanced Usage

### **Batch Processing**
Process multiple releases by setting multiple records to `draft` status:

```sql
UPDATE releases 
SET upload_status = 'draft' 
WHERE user_id = 1 AND upload_status = 'ready';
```

### **Resume Failed Uploads**
Reset failed uploads to retry:

```sql
UPDATE releases 
SET upload_status = 'draft' 
WHERE upload_status = 'failed';

UPDATE tracks 
SET upload_status = 'pending' 
WHERE upload_status = 'failed';
```

### **Progress Monitoring**
Check upload progress:

```sql
SELECT 
    r.title,
    r.upload_status as release_status,
    COUNT(t.id) as total_tracks,
    COUNT(CASE WHEN t.upload_status = 'uploaded' THEN 1 END) as uploaded_tracks
FROM releases r
LEFT JOIN tracks t ON r.id = t.release_id
WHERE r.user_id = 1
GROUP BY r.id, r.title, r.upload_status;
```

## 🎨 Workflow Example

### **Complete Upload Workflow**

1. **Prepare Files**
   ```bash
   # Organize audio files
   mkdir -p /music/releases/test-album/
   cp *.wav /music/releases/test-album/
   ```

2. **Create Database Records**
   ```bash
   python test_upload_data.py
   ```

3. **Update File Paths**
   ```sql
   UPDATE tracks SET file_path = '/music/releases/test-album/track1.wav' WHERE track_number = 1;
   UPDATE tracks SET file_path = '/music/releases/test-album/track2.wav' WHERE track_number = 2;
   ```

4. **Add Artwork (Optional)**
   ```sql
   UPDATE releases SET artwork_path = '/music/releases/test-album/cover.jpg' WHERE id = 1;
   ```

5. **Run Upload**
   ```bash
   python bandcamp_automation.py --upload --user-id 1
   ```

6. **Monitor Progress**
   ```bash
   tail -f automation.log
   ```

## ✅ Success Indicators

The upload is successful when you see:
- ✅ Login successful
- ✅ Album details filled successfully  
- ✅ Track uploaded successfully (for each track)
- ✅ Release saved successfully
- 🎉 Upload complete!

Database status will be updated to:
- Release: `upload_status = 'published'`
- Tracks: `upload_status = 'uploaded'`
- Session: `session_status = 'completed'`

---

## 🆘 Support

If you encounter issues:

1. Check the `automation.log` file for detailed error messages
2. Look for screenshots in the `screenshots/` directory
3. Verify your database schema matches the requirements
4. Ensure all file paths are correct and accessible
5. Test with smaller files first

The automation handles CAPTCHAs and provides extensive logging to help troubleshoot any issues.

**Happy uploading! 🎵** 