# Supabase Database Backup Setup

This guide will help you set up automated daily backups of your Supabase PostgreSQL database to Cloudflare R2 using GitHub Actions.

## Overview

The backup solution consists of:
- **GitHub Actions workflow** (`.github/workflows/supabase-backup.yml`) - Runs daily at 2:00 AM UTC
- **Restore script** (`restore-from-r2.sh`) - Downloads and restores backups locally
- **Cloudflare R2 storage** - Cost-effective, reliable backup storage

## Prerequisites

1. **GitHub repository** with your project
2. **Cloudflare account** with R2 storage enabled
3. **Supabase project** with database access
4. **PostgreSQL client tools** (for local restore operations)

## Setup Steps

### 1. Create R2 Bucket

1. Go to your [Cloudflare R2 dashboard](https://dash.cloudflare.com/r2/overview)
2. Click "Create bucket"
3. Name it `supabase-backups` (or your preferred name)
4. Choose your preferred region

### 2. Create Cloudflare API Token

1. Go to [Cloudflare API Tokens](https://dash.cloudflare.com/profile/api-tokens)
2. Click "Create Token"
3. Use "Custom token" template
4. Set permissions:
   - **Zone Resources**: Include → All zones
   - **Account Resources**: Include → All accounts
   - **R2 Object Read**: Include → All accounts
   - **R2 Object Write**: Include → All accounts
5. Save the token securely

### 3. Get Your Cloudflare Account ID

1. Go to your [Cloudflare dashboard](https://dash.cloudflare.com/)
2. Look at the URL or check the right sidebar
3. Your Account ID is a 32-character hexadecimal string

### 4. Get Supabase Database Details

1. Go to your [Supabase project dashboard](https://supabase.com/dashboard)
2. Navigate to Settings → Database
3. Note down:
   - **Host**: `db.[project-ref].supabase.co`
   - **Database name**: `postgres`
   - **Port**: `5432`
   - **User**: `postgres`
   - **Password**: Your database password

### 5. Set GitHub Secrets

In your GitHub repository, go to Settings → Secrets and variables → Actions, then add these secrets:

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `CLOUDFLARE_API_TOKEN` | Your Cloudflare API token | `v1.0-...` |
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account ID | `1234567890abcdef1234567890abcdef` |
| `R2_BUCKET_NAME` | Your R2 bucket name | `supabase-backups` |
| `SUPABASE_DB_HOST` | Database host | `db.abcdefgh.supabase.co` |
| `SUPABASE_DB_PORT` | Database port | `5432` |
| `SUPABASE_DB_NAME` | Database name | `postgres` |
| `SUPABASE_DB_USER` | Database user | `postgres` |
| `SUPABASE_DB_PASSWORD` | Database password | `your-password` |

### 6. Test the Workflow

1. Go to your repository's Actions tab
2. Find the "Supabase Database Backup" workflow
3. Click "Run workflow" → "Run workflow"
4. Monitor the execution to ensure it completes successfully

## Usage

### Automatic Backups

Once set up, backups will run automatically:
- **Schedule**: Daily at 2:00 AM UTC
- **Retention**: 14 days (configurable in the workflow)
- **Format**: PostgreSQL custom format (compressed)

### Manual Backups

You can trigger manual backups:
1. Go to Actions → Supabase Database Backup
2. Click "Run workflow"
3. Click "Run workflow" again

### Restoring Backups

#### List Available Backups

```bash
./restore-from-r2.sh --list
```

#### Restore Latest Backup

```bash
# Preview (shows filename without restoring)
./restore-from-r2.sh --latest

# Actually restore
./restore-from-r2.sh --latest --force
```

#### Restore Specific Backup

```bash
# Preview
./restore-from-r2.sh --file supabase-backup-2024-01-15T02-00-00Z.dump

# Actually restore
./restore-from-r2.sh --file supabase-backup-2024-01-15T02-00-00Z.dump --force
```

## Configuration

### Backup Schedule

Edit `.github/workflows/supabase-backup.yml`:

```yaml
on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2:00 AM UTC
```

### Retention Period

The workflow keeps backups for 14 days by default. To change this, edit the cleanup step:

```yaml
# Keep backups for 30 days
cutoff_date=$(date -u -d "30 days ago" +"%Y-%m-%d")
```

### Backup Format

The workflow uses PostgreSQL's custom format (`-Fc`) which provides:
- **Compression**: ~60-80% smaller than plain SQL
- **Selective restore**: Can restore specific tables/schemas
- **Parallel restore**: Faster restoration for large databases
- **Metadata preservation**: Indexes, constraints, etc.

## Monitoring

### Check Workflow Status

1. Go to Actions → Supabase Database Backup
2. View recent runs and their status

### Monitor R2 Storage

1. Go to your [Cloudflare R2 dashboard](https://dash.cloudflare.com/r2/overview)
2. Check storage usage and costs
3. View object list to see backup files

### View Backup Logs

In the GitHub Actions workflow run, you can see:
- Backup creation progress
- File sizes
- Upload status
- Cleanup operations

## Troubleshooting

### Common Issues

**Workflow fails with "permission denied"**
- Check that your Cloudflare API token has the correct permissions
- Verify your account ID is correct

**Database connection fails**
- Verify all Supabase database secrets are set correctly
- Check that your database is accessible from external connections

**R2 upload fails**
- Ensure your R2 bucket exists and is accessible
- Check that your API token has R2 permissions

**Restore script fails**
- Install Wrangler CLI: `npm install -g wrangler`
- Set environment variables or edit the script defaults
- Ensure PostgreSQL client tools are installed

### Testing Connections

Test your database connection:
```bash
PGPASSWORD=your-password psql -h db.your-project.supabase.co -p 5432 -U postgres -d postgres -c "SELECT version();"
```

Test R2 access:
```bash
wrangler r2 object list your-bucket-name
```

## Security Considerations

- **API tokens**: Store securely and rotate regularly
- **Database passwords**: Use strong passwords and rotate periodically
- **Access control**: Limit who can access backup files
- **Encryption**: Consider encrypting sensitive backup data

## Cost Optimization

- **R2 storage**: ~$0.015/GB/month
- **GitHub Actions**: Free tier includes 2,000 minutes/month
- **Retention**: Adjust retention period based on your needs
- **Monitoring**: Regularly check storage usage

## Support

For issues:
1. Check the troubleshooting section above
2. Review GitHub Actions logs
3. Verify all secrets are configured correctly
4. Test connections manually 