# Storage API Documentation

## Overview

This directory contains comprehensive documentation for the Basma File Storage API, which provides secure file upload, download, and management capabilities using Hetzner Object Storage.

## Documentation Structure

### 📄 Core Documentation

- **[storage-api-integration-guide.md](./storage-api-integration-guide.md)**
  - Complete integration guide with code examples
  - Authentication setup
  - File upload implementation (single & multiple)
  - Download URL generation
  - Error handling patterns
  - Security best practices
  - Complete HTML/JavaScript example component

- **[authentication-security-guide.md](./authentication-security-guide.md)**
  - JWT authentication details
  - Rate limiting information
  - Security headers and best practices
  - Error handling patterns

### 📊 API Specifications

- **[storage-api.yml](../src/docs/schemas/storage-api.yml)**
  - Complete OpenAPI 3.0.3 specification
  - All 7 endpoints documented
  - Request/response schemas
  - Authentication requirements
  - Error codes and examples

### 🧪 Testing Tools

- **[storage-api-postman-collection.json](./storage-api-postman-collection.json)**
  - Ready-to-import Postman collection
  - All endpoints with test scripts
  - Environment variables configured
  - Error scenario tests included

## Quick Start

### 1. Import Postman Collection

```bash
# Import the collection into Postman
# File: docs/02-api-integration/storage-api-postman-collection.json
```

2. **Set Environment Variables:**
   - `base_url`: Your API endpoint
   - `auth_token`: JWT token from authentication
   - `file_key`: Will be set automatically after upload

### 2. Test File Upload

```javascript
// Using fetch API
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('entityType', 'MAINTENANCE_REQUEST');

const response = await fetch('/api/v1/storage/upload', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${jwt_token}`
  },
  body: formData
});

const result = await response.json();
console.log('File uploaded:', result.data);
```

### 3. Access File

```javascript
// Get download URL
const response = await fetch(`/api/v1/storage/${fileKey}/download`, {
  headers: {
    'Authorization': `Bearer ${jwt_token}`
  }
});

const { signedUrl } = await response.json();
window.open(signedUrl, '_blank');
```

## API Endpoints Summary

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/storage/upload` | POST | Upload single file | ✅ |
| `/storage/upload/multiple` | POST | Upload multiple files | ✅ |
| `/storage/{fileKey}/download` | GET | Get signed download URL | ✅ |
| `/storage/{fileKey}` | GET | Get file information | ✅ |
| `/storage/{fileKey}` | DELETE | Delete file | ✅ |
| `/storage/files` | GET | List user files | ✅ |
| `/storage/stats` | GET | Get storage statistics | ✅ |

## File Upload Features

### ✅ Supported File Types
- **Images**: jpg, jpeg, png, gif, webp, svg
- **Documents**: pdf, doc, docx, txt, rtf
- **Office**: xls, xlsx, ppt, pptx
- **Media**: mp4, avi, mov, mp3, wav, ogg
- **Archives**: zip, rar, 7z, tar, gz

### ✅ Upload Limits
- **Single file**: 50MB max
- **Multiple files**: 10 files max, 100MB total
- **Rate limiting**: 100 uploads per 15 minutes per IP

### ✅ File Organization
```
Storage Path Format:
uploads/{userId}/{timestamp}-{random}-{sanitizedFilename}

Example:
uploads/550e8400-e29b-41d4-a716-446655440000/2025-01-15T14-30-00-abc123-document.pdf
```

## Security Features

### 🔐 Authentication
- JWT token required for all operations
- Token-based user identification
- Automatic token refresh support

### 🔒 Access Control
- Users can only access their own files
- Admins can access all files
- Role-based permissions enforced

### 🛡️ Security Headers
- All responses include security headers
- CORS properly configured
- Content type validation

### 📊 Rate Limiting
- Upload endpoints: 100 requests/15min
- Download endpoints: 1000 requests/hour
- Management endpoints: 200 requests/hour

## Integration Examples

### React Component Example

```jsx
import React, { useState } from 'react';

function FileUpload({ entityType, entityId, onUploadComplete }) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFileUpload = async (file) => {
    setUploading(true);
    setProgress(0);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('entityType', entityType);
    formData.append('entityId', entityId);

    try {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          setProgress(percent);
        }
      });

      xhr.addEventListener('load', () => {
        const result = JSON.parse(xhr.responseText);
        setUploading(false);
        onUploadComplete(result.data);
      });

      xhr.open('POST', '/api/v1/storage/upload');
      xhr.setRequestHeader('Authorization', `Bearer ${getAuthToken()}`);
      xhr.send(formData);
    } catch (error) {
      console.error('Upload failed:', error);
      setUploading(false);
    }
  };

  return (
    <div>
      <input
        type="file"
        onChange={(e) => handleFileUpload(e.target.files[0])}
        disabled={uploading}
      />
      {uploading && (
        <div>
          <div>Uploading... {progress}%</div>
          <div style={{ width: '100%', backgroundColor: '#f0f0f0' }}>
            <div
              style={{
                width: `${progress}%`,
                backgroundColor: '#4CAF50',
                height: '20px'
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
```

### Node.js Example

```javascript
const FormData = require('form-data');
const fetch = require('node-fetch');
const fs = require('fs');

class StorageClient {
  constructor(baseUrl, authToken) {
    this.baseUrl = baseUrl;
    this.authToken = authToken;
  }

  async uploadFile(filePath, options = {}) {
    const form = new FormData();
    form.append('file', fs.createReadStream(filePath));

    if (options.entityType) {
      form.append('entityType', options.entityType);
    }
    if (options.entityId) {
      form.append('entityId', options.entityId);
    }

    const response = await fetch(`${this.baseUrl}/storage/upload`, {
      method: 'POST',
      headers: {
        ...form.getHeaders(),
        'Authorization': `Bearer ${this.authToken}`
      },
      body: form
    });

    return response.json();
  }

  async getDownloadUrl(fileKey, expiresIn = 3600) {
    const response = await fetch(
      `${this.baseUrl}/storage/${fileKey}/download?expiresIn=${expiresIn}`,
      {
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        }
      }
    );

    const result = await response.json();
    return result.data.signedUrl;
  }
}

// Usage
const client = new StorageClient('https://api.example.com/api/v1', 'your-jwt-token');

client.uploadFile('./document.pdf', {
  entityType: 'MAINTENANCE_REQUEST',
  entityId: 'req-123456'
})
  .then(result => {
    console.log('Upload successful:', result);
    return client.getDownloadUrl(result.key);
  })
  .then(url => {
    console.log('Download URL:', url);
  })
  .catch(error => {
    console.error('Error:', error);
  });
```

## Error Handling

### Common Error Responses

```javascript
// File too large
{
  "success": false,
  "error": {
    "code": "FILE_TOO_LARGE",
    "message": "File size exceeds maximum limit of 50MB",
    "details": {
      "maxSize": 52428800,
      "actualSize": 67108864
    }
  }
}

// Rate limit exceeded
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many file uploads",
    "details": {
      "retryAfter": 900,
      "limit": 100
    }
  }
}
```

### Error Handling Best Practices

```javascript
async function safeFileUpload(file) {
  try {
    // Validate file size
    if (file.size > 50 * 1024 * 1024) {
      throw new Error('File is too large');
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      throw new Error('File type not supported');
    }

    // Upload file
    const result = await uploadFile(file);
    return result;

  } catch (error) {
    // Handle specific errors
    if (error.message.includes('too large')) {
      alert('Please select a file smaller than 50MB');
    } else if (error.message.includes('not supported')) {
      alert('Please select a supported file type');
    } else {
      alert('Upload failed: ' + error.message);
    }
    throw error;
  }
}
```

## Testing Checklist

### ✅ Upload Testing
- [ ] Single file upload
- [ ] Multiple file upload
- [ ] File size validation (50MB limit)
- [ ] File type validation
- [ ] Malicious file rejection
- [ ] Rate limiting enforcement

### ✅ Download Testing
- [ ] Signed URL generation
- [ ] URL expiration
- [ ] Access permissions
- [ ] File existence check

### ✅ Management Testing
- [ ] File listing with pagination
- [ ] File deletion
- [ ] Storage statistics
- [ ] Search functionality

### ✅ Security Testing
- [ ] JWT token validation
- [ ] Unauthorized access blocked
- [ ] CORS configuration
- [ ] Rate limiting headers

## Performance Considerations

### 🚀 Upload Optimization
- Use chunked uploads for large files
- Implement client-side compression
- Show real-time progress feedback
- Handle network interruptions

### 💾 Storage Optimization
- Regular cleanup of old files
- Implement file archiving
- Monitor storage quotas
- Optimize image thumbnails

### 📈 Scalability
- Use CDN for file delivery
- Implement caching strategies
- Monitor API performance
- Plan for storage growth

## Production Deployment

### Environment Variables
```bash
# Hetzner Object Storage
STORAGE_ENDPOINT=https://your-hetzner-endpoint.com
STORAGE_REGION=nbg1
STORAGE_BUCKET=your-bucket-name
STORAGE_ACCESS_KEY=your-access-key
STORAGE_SECRET_KEY=your-secret-key

# File Upload Limits
MAX_FILE_SIZE=52428800  # 50MB
MAX_FILES_PER_REQUEST=10
MAX_BATCH_SIZE=104857600  # 100MB

# Rate Limiting
UPLOAD_RATE_LIMIT=100
UPLOAD_RATE_WINDOW=900000  # 15 minutes
```

### Monitoring
- Track upload success/failure rates
- Monitor storage usage
- Alert on rate limit breaches
- Log file access patterns

## Support

For questions or issues:
- **Documentation**: Check this README and integration guide
- **API Reference**: Review the OpenAPI specification
- **Testing**: Use the provided Postman collection
- **Contact**: dev@basma-maintenance.com

## Changelog

### v1.0.0 (2025-01-15)
- Initial release
- Core file upload/download functionality
- OpenAPI specification
- Postman collection
- Complete integration guide
- Security documentation

### v1.1.0 (Planned)
- File versioning support
- Batch operations API
- Advanced search filters
- File sharing capabilities