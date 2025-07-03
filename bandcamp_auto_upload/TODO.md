# TODO

### Supabase integration
- currently using a test demo project 
- some of the new tables we can copy into the main project and use, some are not needed / already exist
    - `user_credentials` - NOT NEEDED
        - we use the altlabeltools@gmail.com bandcamp account to manage clients BC accounts 
        - we already store label information in the `clients` table, so we can just add `band_name` and `band_id`
    - `releases` - already got the table, add some new fields
        - `about` -> `press_release`
        - `credits`
        - `tags`
        - `price` (more than 0)
        - `name_your_price`
        - `require_email`
        - `download_description`
        - `release_message`
        - `bandcamp_album_id` -  updated in supabase by the script
        - `bandcamp_url` -  updated in supabase by the script
    - `tracks` - new table needed
        - add all or most fields from demo table
        - dont add tracks to release form, figure it out from the premaster uploads
        - set price automatically (release price / number tracks)
    - `upload_sessions` - new table needed
- update the scripts to use values from tables in main database

### Google Drive integration
- currently the script generates fake test audio, saves it to a wav file, and uploads the wav file on the upload form
- we want to use the real audio (wav files in Google Drive)
- this requires downloading the audio from Google Drive onto the machine running the script, and using that in upload
- the location of the audio files can be found by looking in Supabase
- script needs to take masters_folder_id from releases table and download all .wav files to the local hard drive
