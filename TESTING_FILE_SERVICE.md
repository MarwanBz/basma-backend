# File Service Testing Guide

This guide provides instructions for testing the new comprehensive file management service.

## Prerequisites

1. **Server Running**: Ensure the server is running on `http://localhost:3000`
2. **Authentication**: Obtain a valid JWT token by logging in
3. **Database**: MySQL database should be running and migrations applied
4. **S3 Storage**: Hetzner Object Storage (or AWS S3) credentials configured

## Environment Variables

Ensure these are set in your `.env` file:

```bash
HETZNER_ENDPOINT_URL=https://nbg1.your-objectstorage.com
HETZNER_ACCESS_KEY_ID=your-access-key
HETZNER_SECRET_ACCESS_KEY=your-secret-key
HETZNER_BUCKET_NAME=basma-files
HETZNER_REGION=nbg1
```

## Test Scenarios

### 1. Upload Single File

**Endpoint**: `POST /api/v1/files/upload`

**Request**:

```bash
curl -X POST http://localhost:3000/api/v1/files/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@/path/to/test-image.jpg" \
  -F "entityType=MAINTENANCE_REQUEST" \
  -F "entityId=test-request-123" \
  -F "isPublic=false"
```

**Expected Response** (201):

```json
{
  "success": true,
  "message": "File uploaded successfully",
  "data": {
    "id": "uuid",
    "originalName": "test-image.jpg",
    "fileName": "MAINTENANCE_REQUEST/test-request-123/...",
    "fileSize": 123456,
    "mimeType": "image/jpeg",
    "entityType": "MAINTENANCE_REQUEST",
    "entityId": "test-request-123",
    "url": "https://...",
    "downloadUrl": "https://...?signature=..."
  }
}
```

**Test Cases**:

- ✅ Valid image file upload
- ✅ Valid PDF document upload
- ✅ Invalid file type (should fail with 400)
- ✅ File too large (>50MB, should fail with 413)
- ✅ No file provided (should fail with 400)
- ✅ Invalid entity type (should fail with 400)
- ✅ Missing authentication (should fail with 401)

### 2. Upload Multiple Files

**Endpoint**: `POST /api/v1/files/upload-multiple`

**Request**:

```bash
curl -X POST http://localhost:3000/api/v1/files/upload-multiple \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "files=@/path/to/image1.jpg" \
  -F "files=@/path/to/image2.png" \
  -F "files=@/path/to/document.pdf" \
  -F "entityType=MAINTENANCE_REQUEST" \
  -F "entityId=test-request-123"
```

**Expected Response** (201):

```json
{
  "success": true,
  "message": "Uploaded 3 of 3 files",
  "data": {
    "uploaded": [...],
    "errors": []
  }
}
```

**Test Cases**:

- ✅ Multiple valid files upload
- ✅ Mix of valid and invalid files (partial success)
- ✅ More than 10 files (should fail with 400)

### 3. Download File

**Endpoint**: `GET /api/v1/files/:id/download`

**Request**:

```bash
curl -X GET http://localhost:3000/api/v1/files/{FILE_ID}/download \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected Response** (200):

```json
{
  "success": true,
  "message": "Download URL generated",
  "data": {
    "signedUrl": "https://...?signature=...",
    "file": {...},
    "expiresIn": 3600
  }
}
```

**Test Cases**:

- ✅ Owner can download their file
- ✅ Public file can be downloaded by anyone
- ✅ Private file cannot be downloaded by non-owner (should fail with 403)
- ✅ Non-existent file (should fail with 404)
- ✅ Expired file (should fail with 410)
- ✅ Download count increments after each download

### 4. Delete File

**Endpoint**: `DELETE /api/v1/files/:id`

**Request**:

```bash
curl -X DELETE http://localhost:3000/api/v1/files/{FILE_ID} \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected Response** (200):

```json
{
  "success": true,
  "message": "File deleted successfully"
}
```

**Test Cases**:

- ✅ Owner can delete their file
- ✅ Non-owner cannot delete file (should fail with 403)
- ✅ Deleted file is soft-deleted (expiresAt set to now)
- ✅ File no longer accessible after deletion

### 5. Get File Details

**Endpoint**: `GET /api/v1/files/:id`

**Request**:

```bash
curl -X GET http://localhost:3000/api/v1/files/{FILE_ID} \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected Response** (200):

```json
{
  "success": true,
  "message": "File retrieved successfully",
  "data": {
    "id": "uuid",
    "originalName": "test-image.jpg",
    "fileSize": 123456,
    "mimeType": "image/jpeg",
    "entityType": "MAINTENANCE_REQUEST",
    "entityId": "test-request-123",
    "uploadedBy": {
      "id": "user-id",
      "name": "John Doe",
      "email": "john@example.com"
    },
    "createdAt": "2025-01-10T12:00:00Z"
  }
}
```

**Test Cases**:

- ✅ Get own file details
- ✅ Get public file details
- ✅ Cannot get private file details (should fail with 403)

### 6. List My Files

**Endpoint**: `GET /api/v1/files/my-files`

**Request**:

```bash
curl -X GET "http://localhost:3000/api/v1/files/my-files?page=1&limit=10&entityType=MAINTENANCE_REQUEST" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected Response** (200):

```json
{
  "success": true,
  "message": "Files retrieved successfully",
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3
  }
}
```

**Test Cases**:

- ✅ List all user files
- ✅ Filter by entity type
- ✅ Filter by date range
- ✅ Filter by MIME type
- ✅ Filter by file size range
- ✅ Pagination works correctly

### 7. List Entity Files

**Endpoint**: `GET /api/v1/files/entity/:entityType/:entityId`

**Request**:

```bash
curl -X GET "http://localhost:3000/api/v1/files/entity/MAINTENANCE_REQUEST/test-request-123" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected Response** (200):

```json
{
  "success": true,
  "message": "Entity files retrieved successfully",
  "data": [...],
  "pagination": {...}
}
```

**Test Cases**:

- ✅ List files for a specific entity
- ✅ Only shows public files and user's own files
- ✅ Invalid entity type fails with 400

### 8. Search Files

**Endpoint**: `GET /api/v1/files/search`

**Request**:

```bash
curl -X GET "http://localhost:3000/api/v1/files/search?q=invoice&category=document&sortBy=createdAt&sortOrder=desc" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected Response** (200):

```json
{
  "success": true,
  "message": "Search completed successfully",
  "data": [...],
  "pagination": {...}
}
```

**Test Cases**:

- ✅ Search by filename
- ✅ Filter by category
- ✅ Filter by entity type and ID
- ✅ Sort by different fields (createdAt, fileSize, downloadCount)
- ✅ Combine multiple filters

### 9. Update File Metadata

**Endpoint**: `PATCH /api/v1/files/:id`

**Request**:

```bash
curl -X PATCH http://localhost:3000/api/v1/files/{FILE_ID} \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "isPublic": true,
    "expiresAt": "2025-12-31T23:59:59Z"
  }'
```

**Expected Response** (200):

```json
{
  "success": true,
  "message": "File metadata updated successfully",
  "data": {...}
}
```

**Test Cases**:

- ✅ Owner can update metadata
- ✅ Non-owner cannot update (should fail with 403)
- ✅ Update isPublic flag
- ✅ Set expiration date
- ✅ Remove expiration date (set to null)

## Access Control Tests

### Test Matrix

| Scenario              | Owner | Non-Owner | Expected Result |
| --------------------- | ----- | --------- | --------------- |
| Upload file           | ✅    | ✅        | Success         |
| View own file         | ✅    | -         | Success         |
| View public file      | ✅    | ✅        | Success         |
| View private file     | ✅    | ❌        | Fail 403        |
| Download own file     | ✅    | -         | Success         |
| Download public file  | ✅    | ✅        | Success         |
| Download private file | ✅    | ❌        | Fail 403        |
| Delete own file       | ✅    | -         | Success         |
| Delete others' file   | ❌    | ❌        | Fail 403        |
| Update own file       | ✅    | -         | Success         |
| Update others' file   | ❌    | ❌        | Fail 403        |

## Database Verification

After each test, verify database records:

```sql
-- Check file was created
SELECT * FROM file_attachments WHERE id = 'FILE_ID';

-- Check download count
SELECT downloadCount, lastAccessedAt FROM file_attachments WHERE id = 'FILE_ID';

-- Check soft delete (expiration)
SELECT expiresAt FROM file_attachments WHERE id = 'FILE_ID';

-- Check entity relationships
SELECT * FROM file_attachments WHERE entityType = 'MAINTENANCE_REQUEST' AND entityId = 'test-request-123';
```

## Storage Verification

Verify files in S3/Hetzner Object Storage:

```bash
# Using AWS CLI (compatible with Hetzner)
aws s3 ls s3://basma-files/MAINTENANCE_REQUEST/test-request-123/ \
  --endpoint-url https://nbg1.your-objectstorage.com
```

## Performance Tests

### Upload Performance

- Single file (1MB): < 500ms
- Single file (10MB): < 2s
- Single file (50MB): < 10s
- 10 files (1MB each): < 5s

### Download Performance

- Generate signed URL: < 100ms
- Actual download speed depends on S3 and network

### Search Performance

- Simple search (< 100 results): < 200ms
- Complex search with filters: < 500ms
- Paginated results: < 200ms per page

## Error Handling Tests

Test these error scenarios:

1. **Network Errors**:

   - S3 unavailable (should return 500)
   - Database unavailable (should return 500)

2. **Validation Errors**:

   - Invalid file type (should return 400)
   - File too large (should return 413)
   - Missing required fields (should return 400)

3. **Authentication Errors**:

   - No token (should return 401)
   - Invalid token (should return 401)
   - Expired token (should return 401)

4. **Authorization Errors**:

   - Access denied (should return 403)

5. **Not Found Errors**:
   - File not found (should return 404)
   - Entity not found (should return 404)

## Automated Testing Script

Create a test script `test-file-service.sh`:

```bash
#!/bin/bash

# Configuration
BASE_URL="http://localhost:3000/api/v1"
TOKEN="YOUR_JWT_TOKEN"
ENTITY_ID="test-$(date +%s)"

echo "Testing File Service..."

# Test 1: Upload file
echo "1. Testing file upload..."
FILE_ID=$(curl -s -X POST "$BASE_URL/files/upload" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test-image.jpg" \
  -F "entityType=MAINTENANCE_REQUEST" \
  -F "entityId=$ENTITY_ID" \
  | jq -r '.data.id')

echo "   Uploaded file ID: $FILE_ID"

# Test 2: Get file
echo "2. Testing get file..."
curl -s -X GET "$BASE_URL/files/$FILE_ID" \
  -H "Authorization: Bearer $TOKEN" \
  | jq '.success'

# Test 3: Download file
echo "3. Testing file download..."
curl -s -X GET "$BASE_URL/files/$FILE_ID/download" \
  -H "Authorization: Bearer $TOKEN" \
  | jq '.success'

# Test 4: List my files
echo "4. Testing list files..."
curl -s -X GET "$BASE_URL/files/my-files?page=1&limit=5" \
  -H "Authorization: Bearer $TOKEN" \
  | jq '.pagination.total'

# Test 5: Search files
echo "5. Testing search..."
curl -s -X GET "$BASE_URL/files/search?q=test" \
  -H "Authorization: Bearer $TOKEN" \
  | jq '.data | length'

# Test 6: Update metadata
echo "6. Testing update metadata..."
curl -s -X PATCH "$BASE_URL/files/$FILE_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"isPublic": true}' \
  | jq '.success'

# Test 7: Delete file
echo "7. Testing file deletion..."
curl -s -X DELETE "$BASE_URL/files/$FILE_ID" \
  -H "Authorization: Bearer $TOKEN" \
  | jq '.success'

echo "All tests completed!"
```

## Integration with Frontend

Example frontend integration using fetch API:

```javascript
// Upload file
async function uploadFile(file, entityType, entityId) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("entityType", entityType);
  formData.append("entityId", entityId);

  const response = await fetch("/api/v1/files/upload", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  return await response.json();
}

// Download file
async function downloadFile(fileId) {
  const response = await fetch(`/api/v1/files/${fileId}/download`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();
  // Open signed URL in new tab
  window.open(data.data.signedUrl, "_blank");
}

// Search files
async function searchFiles(query) {
  const response = await fetch(
    `/api/v1/files/search?q=${query}&page=1&limit=10`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return await response.json();
}
```

## Troubleshooting

### Common Issues

1. **"Access denied to storage service"**

   - Check S3 credentials in `.env`
   - Verify bucket exists and permissions are correct

2. **"File validation failed"**

   - Check file type is in allowed list
   - Verify file size is under 50MB
   - Ensure file is not corrupted

3. **"Database connection failed"**

   - Check MySQL is running
   - Verify database credentials
   - Run migrations: `npx prisma migrate deploy`

4. **"File not found"**
   - Verify file ID is correct
   - Check file hasn't expired
   - Ensure file wasn't soft-deleted

## Success Criteria

All tests pass when:

- ✅ Files upload successfully to S3
- ✅ Database records created correctly
- ✅ Access control enforced properly
- ✅ Download URLs generated and work
- ✅ Search and filtering work correctly
- ✅ Pagination works as expected
- ✅ Error handling provides meaningful messages
- ✅ Performance meets requirements
- ✅ No linter errors
- ✅ Swagger documentation accessible

## Next Steps

After successful testing:

1. Deploy to staging environment
2. Perform load testing
3. Set up monitoring and alerts
4. Document any edge cases found
5. Update API documentation
6. Train team on new endpoints

---

**Last Updated**: January 2025
**Version**: 1.0
