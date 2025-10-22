# File Management System Setup Guide

This guide provides step-by-step instructions for setting up the Extensible File Management System for the BASMA Maintenance Platform.

## Overview

The File Management System provides:
- Secure file upload and storage with Hetzner Object Storage
- Polymorphic file attachments to any entity (requests, users, buildings, etc.)
- Comprehensive file validation and security scanning
- Role-based access control and permissions
- Thumbnail generation and image optimization
- Signed URLs for secure file access
- Complete audit trail and analytics

## Prerequisites

### System Requirements
- Node.js 18+
- MySQL 8.0+
- Redis 6.0+ (for caching and background jobs)
- Hetzner Object Storage account

### Required Environment Variables
See `.env.example` for all required variables. Key variables for file management:

```bash
# Hetzner Object Storage
HETZNER_ENDPOINT_URL=https://nbg1.your-objectstorage.com
HETZNER_ACCESS_KEY_ID=your-access-key
HETZNER_SECRET_ACCESS_KEY=your-secret-key
HETZNER_BUCKET_NAME=basma-maintenance-files
HETZNER_REGION=nbg1

# File Processing
MAX_FILE_SIZE=52428800  # 50MB
MAX_FILES_PER_UPLOAD=10
ENABLE_VIRUS_SCANNING=false

# Redis (for caching)
REDIS_HOST=localhost
REDIS_PORT=6379

# Feature Flags
FEATURE_FILE_MANAGEMENT=true
FEATURE_THUMBNAIL_GENERATION=true
```

## Installation Steps

### 1. Update Dependencies

Install the new packages required for file management:

```bash
npm install aws-sdk file-type multer sharp mime-types
```

Or update your `package.json` with the dependencies listed in the implementation.

### 2. Database Migration

The `file_attachment` model has been added to your Prisma schema. Run the migration:

```bash
# Generate Prisma client
npx prisma generate

# Create and apply migration
npx prisma migrate dev --name add-file-attachments

# Or for production
npx prisma migrate deploy
```

### 3. Environment Configuration

Copy the file management environment variables to your `.env` file:

```bash
# Copy from .env.example
cp .env.example .env

# Edit the file with your actual values
nano .env
```

### 4. Hetzner Object Storage Setup

#### 4.1 Create Hetzner Account
1. Sign up for a Hetzner Cloud account at https://console.hetzner.cloud/
2. Navigate to Object Storage in the sidebar
3. Create a new Object Storage bucket

#### 4.2 Generate Access Keys
1. In Object Storage, go to "Security" → "Access Keys"
2. Create a new access key
3. Copy the Access Key ID and Secret Key

#### 4.3 Configure Bucket
1. Create a bucket with a descriptive name (e.g., `basma-maintenance-files`)
2. Note the bucket name and region (e.g., `nbg1` for Nuremberg)
3. Update your environment variables with these values

### 5. Redis Setup (Optional but Recommended)

For caching and background job processing:

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install redis-server

# macOS with Homebrew
brew install redis

# Start Redis
sudo systemctl start redis
sudo systemctl enable redis

# Test connection
redis-cli ping
```

### 6. Build and Start the Application

```bash
# Build the application
npm run build

# Start in development
npm run dev

# Or start in production
npm start
```

### 7. Verify Installation

Test the file management endpoints:

```bash
# Check if file routes are loaded
curl http://localhost:4300/api/files/my-files

# Check Swagger documentation
open http://localhost:4300/api-docs
```

## Configuration Options

### File Size Limits
- Default: 50MB per file
- Configurable via `MAX_FILE_SIZE` environment variable
- Maximum 10 files per upload (configurable via `MAX_FILES_PER_UPLOAD`)

### Supported File Types
Images: jpg, jpeg, png, gif, webp, svg
Documents: pdf, doc, docx, xls, xlsx, ppt, pptx, txt, csv
Videos: mp4, mov, avi (limited)
Audio: mp3, wav, ogg (limited)
Archives: zip, rar

### Security Features
- File type validation using magic bytes
- Content scanning for malicious patterns
- Role-based access control
- Signed URLs with expiration
- Complete audit logging

### Performance Features
- Redis caching for metadata
- CDN support (configurable)
- Image optimization and thumbnails
- Background job processing

## API Endpoints

### File Operations
- `POST /api/files/upload` - Upload files
- `GET /api/files/:id` - Get file metadata
- `GET /api/files/:id/download` - Download file
- `GET /api/files/:id/download-url` - Get signed download URL
- `GET /api/files/:id/thumbnail-url` - Get thumbnail URL
- `DELETE /api/files/:id` - Delete file
- `PATCH /api/files/:id` - Update file metadata

### Entity Files
- `GET /api/files/entities/:entityType/:entityId/files` - Get files for specific entity
- `GET /api/files/my-files` - Get current user's files

## Usage Examples

### Upload Files to a Maintenance Request

```bash
curl -X POST http://localhost:4300/api/files/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "files=@photo1.jpg" \
  -F "files=@document.pdf" \
  -F "entityType=MAINTENANCE_REQUEST" \
  -F "entityId=your-request-uuid" \
  -F "isPublic=false"
```

### Get Files for a Request

```bash
curl -X GET "http://localhost:4300/api/files/entities/MAINTENANCE_REQUEST/your-request-uuid/files?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Download a File

```bash
curl -X GET http://localhost:4300/api/files/your-file-uuid/download \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  --output downloaded-file.jpg
```

## Troubleshooting

### Common Issues

#### 1. Hetzner Connection Failed
- Verify endpoint URL is correct
- Check access keys are valid
- Ensure bucket exists in the specified region

#### 2. File Upload Fails
- Check file size limits
- Verify file type is supported
- Check Redis connection (if enabled)

#### 3. Permission Denied
- Verify user is authenticated
- Check role permissions
- Ensure user has access to the target entity

#### 4. Large File Uploads Timeout
- Increase `express.json()` limit in app.ts
- Adjust Nginx/Proxy timeout settings
- Consider using resumable uploads for very large files

### Debug Mode

Enable debug logging:

```bash
DEBUG=file:* npm run dev
```

### Health Checks

Monitor system health:
- Application health: `GET /health`
- API documentation: `GET /api-docs`
- File service status: Check logs for storage connection errors

## Security Considerations

1. **Access Keys**: Never commit Hetzner access keys to version control
2. **File Validation**: System validates file types using magic bytes (not just extensions)
3. **Rate Limiting**: Upload and download endpoints are rate-limited
4. **Access Control**: All file operations require authentication and proper permissions
5. **Audit Trail**: All file operations are logged with user context

## Performance Optimization

1. **Caching**: Enable Redis for metadata caching
2. **CDN**: Configure CDN for static file serving
3. **Background Processing**: Enable for thumbnail generation and virus scanning
4. **Storage Lifecycle**: Configure Hetzner bucket lifecycle rules for old files

## Monitoring

Monitor the following metrics:
- Upload success/failure rates
- Storage usage growth
- Request response times
- Error rates by endpoint
- Cache hit rates

## Next Steps

1. Configure your Hetzner Object Storage bucket
2. Set up Redis for caching
3. Test file upload/download functionality
4. Configure monitoring and alerts
5. Set up backup and disaster recovery procedures

## Support

For issues related to:
- **File Management System**: Check this documentation and logs
- **Hetzner Storage**: Contact Hetzner Support
- **Database Issues**: Check MySQL configuration
- **Application Errors**: Check application logs and health endpoints