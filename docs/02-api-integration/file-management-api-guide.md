# File Management API Integration Guide

This guide provides comprehensive documentation for integrating the BASMA File Management API into your applications.

## Overview

The File Management API provides secure file upload, storage, and management capabilities for the BASMA Maintenance Platform. Features include:

- **Secure file upload** with validation and virus scanning
- **Polymorphic attachments** to any entity (requests, users, buildings, etc.)
- **Role-based access control** and permissions
- **Automatic thumbnail generation** for images
- **Signed URLs** for secure file access
- **Complete audit trail** and analytics

## Base URL

```
Development: http://localhost:4300/api/files
Production: https://your-basma-domain.com/api/files
```

## Authentication

All API endpoints require JWT authentication:

```javascript
headers: {
  'Authorization': `Bearer ${your_jwt_token}`,
  'Content-Type': 'application/json' // or 'multipart/form-data' for file uploads
}
```

## Endpoints Summary

### Core File Operations
- `POST /files/upload` - Upload files to an entity
- `GET /files/:id` - Get file metadata
- `GET /files/:id/download` - Download file directly
- `GET /files/:id/download-url` - Get signed download URL
- `GET /files/:id/thumbnail-url` - Get thumbnail URL
- `DELETE /files/:id` - Delete file
- `PATCH /files/:id` - Update file metadata

### Entity File Management
- `GET /files/entities/:entityType/:entityId/files` - Get files for specific entity
- `GET /files/my-files` - Get current user's files

### Integrated Request Operations
- `POST /requests/with-files` - Create maintenance request with files

---

## Core API Endpoints

### 1. Upload Files

**Endpoint:** `POST /api/files/upload`
**Content-Type:** `multipart/form-data`

#### Request Body
```
files: File[]           // Array of files (max 10 files)
entityType: string      // Entity type (MAINTENANCE_REQUEST, USER_PROFILE, etc.)
entityId: string        // Entity UUID
isPublic: boolean       // Optional, default: false
expiresAt: string       // Optional, ISO datetime for file expiration
```

#### Example Request

```javascript
const formData = new FormData();
formData.append('files', photoFile);
formData.append('files', documentFile);
formData.append('entityType', 'MAINTENANCE_REQUEST');
formData.append('entityId', 'request-uuid-here');
formData.append('isPublic', 'false');

const response = await fetch('/api/files/upload', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});
```

#### Response
```json
{
  "success": true,
  "message": "Successfully uploaded 2 files",
  "data": {
    "uploaded": [
      {
        "id": "file-uuid-1",
        "originalName": "kitchen-leak.jpg",
        "fileName": "2025-01-22_abc123_kitchen-leak.jpg",
        "fileSize": 2048576,
        "mimeType": "image/jpeg",
        "url": "https://signed-url-here",
        "thumbnailUrl": "https://thumbnail-url-here",
        "processingStatus": "COMPLETED",
        "uploadedBy": {
          "id": "user-uuid",
          "name": "John Doe",
          "email": "john@example.com",
          "role": "CUSTOMER"
        }
      }
    ],
    "errors": []
  }
}
```

### 2. Get File Metadata

**Endpoint:** `GET /api/files/:id`

#### Example Request
```javascript
const response = await fetch('/api/files/file-uuid-here', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

#### Response
```json
{
  "success": true,
  "data": {
    "id": "file-uuid",
    "originalName": "photo.jpg",
    "fileName": "generated-filename.jpg",
    "fileSize": 1024000,
    "mimeType": "image/jpeg",
    "fileExtension": "jpg",
    "checksum": "sha256-hash-here",
    "width": 1920,
    "height": 1080,
    "processingStatus": "COMPLETED",
    "thumbnailPath": "path/to/thumbnail",
    "isPublic": false,
    "isScanned": true,
    "scanResult": "CLEAN",
    "isValidated": true,
    "entityType": "MAINTENANCE_REQUEST",
    "entityId": "request-uuid",
    "uploadedById": "user-uuid",
    "uploadIp": "192.168.1.1",
    "expiresAt": null,
    "downloadCount": 5,
    "lastAccessedAt": "2025-01-22T10:30:00Z",
    "createdAt": "2025-01-22T09:00:00Z",
    "updatedAt": "2025-01-22T09:05:00Z",
    "uploadedBy": {
      "id": "user-uuid",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "CUSTOMER"
    },
    "url": "https://signed-download-url",
    "downloadUrl": "https://signed-download-url",
    "thumbnailUrl": "https://signed-thumbnail-url"
  }
}
```

### 3. Download File

**Endpoint:** `GET /api/files/:id/download`

#### Example Request
```javascript
const response = await fetch('/api/files/file-uuid/download', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

// Handle file download
if (response.ok) {
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'original-filename.jpg';
  a.click();
  window.URL.revokeObjectURL(url);
}
```

### 4. Get Signed Download URL

**Endpoint:** `GET /api/files/:id/download-url`

#### Query Parameters
- `expiresIn` (optional): URL expiration time in seconds (60-86400, default: 3600)

#### Example Request
```javascript
const response = await fetch('/api/files/file-uuid/download-url?expiresIn=7200', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const result = await response.json();
console.log(result.data.downloadUrl); // Use this URL for direct file access
```

#### Response
```json
{
  "success": true,
  "data": {
    "downloadUrl": "https://storage-provider.com/signed-url",
    "expiresIn": 7200,
    "expiresAt": "2025-01-22T12:30:00Z"
  }
}
```

### 5. Get Files for Entity

**Endpoint:** `GET /api/files/entities/:entityType/:entityId/files`

#### Query Parameters
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (1-100, default: 10)
- `sortBy` (optional): Sort field (createdAt, updatedAt, fileSize, originalName)
- `sortOrder` (optional): Sort order (asc, desc, default: desc)
- `processingStatus` (optional): Filter by processing status
- `isPublic` (optional): Filter by public status
- `search` (optional): Search in filenames
- `dateFrom` (optional): Filter by date from (ISO datetime)
- `dateTo` (optional): Filter by date to (ISO datetime)

#### Example Request
```javascript
const response = await fetch(
  '/api/files/entities/MAINTENANCE_REQUEST/request-uuid/files?page=1&limit=20&sortBy=createdAt&sortOrder=desc',
  {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }
);
```

#### Response
```json
{
  "success": true,
  "data": [
    {
      "id": "file-uuid-1",
      "originalName": "photo1.jpg",
      "fileName": "generated-name-1.jpg",
      "fileSize": 1024000,
      "mimeType": "image/jpeg",
      "url": "https://signed-url-1",
      "thumbnailUrl": "https://thumbnail-url-1",
      "createdAt": "2025-01-22T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

---

## Integration Examples

### React Component Example

```jsx
import React, { useState, useEffect } from 'react';

function RequestFiles({ requestId }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Fetch files for request
  useEffect(() => {
    const fetchFiles = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/files/entities/MAINTENANCE_REQUEST/${requestId}/files`,
          {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          }
        );
        const result = await response.json();
        setFiles(result.data || []);
      } catch (error) {
        console.error('Failed to fetch files:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFiles();
  }, [requestId]);

  // Upload new files
  const handleFileUpload = async (fileList) => {
    if (fileList.length === 0) return;

    setUploading(true);
    const formData = new FormData();

    Array.from(fileList).forEach(file => {
      formData.append('files', file);
    });

    formData.append('entityType', 'MAINTENANCE_REQUEST');
    formData.append('entityId', requestId);

    try {
      const response = await fetch('/api/files/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      const result = await response.json();

      if (result.success) {
        // Refresh files list
        const fetchFiles = async () => {
          const response = await fetch(
            `/api/files/entities/MAINTENANCE_REQUEST/${requestId}/files`,
            {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
              }
            }
          );
          const result = await response.json();
          setFiles(result.data || []);
        };
        fetchFiles();
      }
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
    }
  };

  // Download file
  const handleDownload = async (fileId, filename) => {
    try {
      const response = await fetch(`/api/files/${fileId}/download`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  return (
    <div className="request-files">
      <h3>Attached Files</h3>

      {/* Upload */}
      <div className="file-upload">
        <input
          type="file"
          multiple
          accept="image/*,.pdf,.doc,.docx"
          onChange={(e) => handleFileUpload(e.target.files)}
          disabled={uploading}
        />
        {uploading && <span>Uploading...</span>}
      </div>

      {/* Files List */}
      {loading ? (
        <div>Loading files...</div>
      ) : (
        <div className="files-list">
          {files.map((file) => (
            <div key={file.id} className="file-item">
              <div className="file-info">
                <strong>{file.originalName}</strong>
                <span>({Math.round(file.fileSize / 1024)} KB)</span>
                <span>{new Date(file.createdAt).toLocaleDateString()}</span>
              </div>

              {file.thumbnailUrl && (
                <img
                  src={file.thumbnailUrl}
                  alt={file.originalName}
                  className="file-thumbnail"
                />
              )}

              <div className="file-actions">
                <button onClick={() => handleDownload(file.id, file.originalName)}>
                  Download
                </button>
              </div>
            </div>
          ))}

          {files.length === 0 && (
            <div>No files attached to this request</div>
          )}
        </div>
      )}
    </div>
  );
}

export default RequestFiles;
```

### Vue.js Component Example

```vue
<template>
  <div class="file-manager">
    <!-- File Upload -->
    <div class="upload-section">
      <input
        type="file"
        multiple
        ref="fileInput"
        @change="handleFileSelect"
        accept="image/*,.pdf,.doc,.docx"
      />
      <button @click="$refs.fileInput.click()" :disabled="uploading">
        {{ uploading ? 'Uploading...' : 'Add Files' }}
      </button>
    </div>

    <!-- Files Grid -->
    <div class="files-grid" v-if="!loading">
      <div
        v-for="file in files"
        :key="file.id"
        class="file-card"
        @click="downloadFile(file)"
      >
        <div class="file-preview">
          <img
            v-if="file.thumbnailUrl"
            :src="file.thumbnailUrl"
            :alt="file.originalName"
          />
          <div v-else class="file-icon">
            {{ getFileIcon(file.mimeType) }}
          </div>
        </div>

        <div class="file-details">
          <h4>{{ file.originalName }}</h4>
          <p>{{ formatFileSize(file.fileSize) }}</p>
          <p>{{ formatDate(file.createdAt) }}</p>
          <p :class="['status', file.processingStatus.toLowerCase()]">
            {{ file.processingStatus }}
          </p>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-else class="loading">
      Loading files...
    </div>

    <!-- Empty State -->
    <div v-if="!loading && files.length === 0" class="empty-state">
      No files found
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';

export default {
  name: 'FileManager',
  props: {
    entityId: {
      type: String,
      required: true
    },
    entityType: {
      type: String,
      default: 'MAINTENANCE_REQUEST'
    }
  },
  setup(props) {
    const files = ref([]);
    const loading = ref(false);
    const uploading = ref(false);
    const fileInput = ref(null);

    const fetchFiles = async () => {
      try {
        loading.value = true;
        const response = await fetch(
          `/api/files/entities/${props.entityType}/${props.entityId}/files`,
          {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          }
        );
        const result = await response.json();
        files.value = result.data || [];
      } catch (error) {
        console.error('Failed to fetch files:', error);
      } finally {
        loading.value = false;
      }
    };

    const handleFileSelect = async (event) => {
      const selectedFiles = event.target.files;
      if (selectedFiles.length === 0) return;

      uploading.value = true;
      const formData = new FormData();

      Array.from(selectedFiles).forEach(file => {
        formData.append('files', file);
      });

      formData.append('entityType', props.entityType);
      formData.append('entityId', props.entityId);

      try {
        const response = await fetch('/api/files/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: formData
        });

        const result = await response.json();

        if (result.success) {
          await fetchFiles(); // Refresh file list
        }
      } catch (error) {
        console.error('Upload failed:', error);
      } finally {
        uploading.value = false;
        event.target.value = ''; // Reset input
      }
    };

    const downloadFile = async (file) => {
      try {
        const response = await fetch(`/api/files/${file.id}/download`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (response.ok) {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = file.originalName;
          a.click();
          window.URL.revokeObjectURL(url);
        }
      } catch (error) {
        console.error('Download failed:', error);
      }
    };

    const getFileIcon = (mimeType) => {
      if (mimeType.startsWith('image/')) return '🖼️';
      if (mimeType === 'application/pdf') return '📄';
      if (mimeType.includes('word')) return '📝';
      if (mimeType.includes('excel')) return '📊';
      return '📎';
    };

    const formatFileSize = (bytes) => {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const formatDate = (dateString) => {
      return new Date(dateString).toLocaleDateString();
    };

    onMounted(fetchFiles);

    return {
      files,
      loading,
      uploading,
      fileInput,
      handleFileSelect,
      downloadFile,
      getFileIcon,
      formatFileSize,
      formatDate
    };
  }
};
</script>
```

### Native Android (Java) Example

```java
import android.content.Context;
import okhttp3.*;
import org.json.JSONObject;
import java.io.File;
import java.io.IOException;
import java.util.concurrent.TimeUnit;

public class FileApiService {
    private static final String BASE_URL = "https://your-basma-domain.com/api";
    private static final MediaType JSON = MediaType.get("application/json; charset=utf-8");

    private OkHttpClient client;
    private String jwtToken;

    public FileApiService(Context context, String jwtToken) {
        this.jwtToken = jwtToken;
        this.client = new OkHttpClient.Builder()
            .connectTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(60, TimeUnit.SECONDS)
            .readTimeout(60, TimeUnit.SECONDS)
            .build();
    }

    // Upload files to maintenance request
    public void uploadFilesToRequest(String requestId, File[] files,
                                   ApiCallback<String> callback) {
        MultipartBody.Builder builder = new MultipartBody.Builder()
            .setType(MultipartBody.FORM)
            .addFormDataPart("entityType", "MAINTENANCE_REQUEST")
            .addFormDataPart("entityId", requestId)
            .addFormDataPart("isPublic", "false");

        // Add files
        for (File file : files) {
            builder.addFormDataPart("files", file.getName(),
                RequestBody.create(file, MediaType.parse("image/*")));
        }

        RequestBody body = builder.build();

        Request request = new Request.Builder()
            .url(BASE_URL + "/files/upload")
            .addHeader("Authorization", "Bearer " + jwtToken)
            .post(body)
            .build();

        client.newCall(request).enqueue(new Callback() {
            @Override
            public void onFailure(Call call, IOException e) {
                callback.onError(e);
            }

            @Override
            public void onResponse(Call call, Response response) throws IOException {
                if (response.isSuccessful()) {
                    String responseBody = response.body().string();
                    callback.onSuccess(responseBody);
                } else {
                    callback.onError(new IOException("Upload failed: " + response.code()));
                }
            }
        });
    }

    // Get files for request
    public void getRequestFiles(String requestId, ApiCallback<String> callback) {
        Request request = new Request.Builder()
            .url(BASE_URL + "/files/entities/MAINTENANCE_REQUEST/" + requestId + "/files")
            .addHeader("Authorization", "Bearer " + jwtToken)
            .get()
            .build();

        client.newCall(request).enqueue(new Callback() {
            @Override
            public void onFailure(Call call, IOException e) {
                callback.onError(e);
            }

            @Override
            public void onResponse(Call call, Response response) throws IOException {
                if (response.isSuccessful()) {
                    String responseBody = response.body().string();
                    callback.onSuccess(responseBody);
                } else {
                    callback.onError(new IOException("Failed to get files: " + response.code()));
                }
            }
        });
    }

    // Download file
    public void downloadFile(String fileId, String filename, ApiCallback<File> callback) {
        Request request = new Request.Builder()
            .url(BASE_URL + "/files/" + fileId + "/download")
            .addHeader("Authorization", "Bearer " + jwtToken)
            .get()
            .build();

        client.newCall(request).enqueue(new Callback() {
            @Override
            public void onFailure(Call call, IOException e) {
                callback.onError(e);
            }

            @Override
            public void onResponse(Call call, Response response) throws IOException {
                if (response.isSuccessful()) {
                    // Save file to device storage
                    File downloadedFile = new File(context.getFilesDir(), filename);
                    try (InputStream inputStream = response.body().byteStream();
                         OutputStream outputStream = new FileOutputStream(downloadedFile)) {

                        byte[] buffer = new byte[4096];
                        int bytesRead;
                        while ((bytesRead = inputStream.read(buffer)) != -1) {
                            outputStream.write(buffer, 0, bytesRead);
                        }
                    }
                    callback.onSuccess(downloadedFile);
                } else {
                    callback.onError(new IOException("Download failed: " + response.code()));
                }
            }
        });
    }

    public interface ApiCallback<T> {
        void onSuccess(T result);
        void onError(Exception error);
    }
}
```

---

## Error Handling

### Common Error Responses

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

### Error Codes

| Code | Description |
|------|-------------|
| `INVALID_INPUT` | Request validation failed |
| `UNAUTHORIZED` | Invalid or missing JWT token |
| `FORBIDDEN` | Insufficient permissions |
| `FILE_NOT_FOUND` | File does not exist |
| `FILE_TOO_LARGE` | File exceeds size limit |
| `INVALID_FILE_TYPE` | File type not allowed |
| `STORAGE_ERROR` | Storage service error |
| `RATE_LIMIT_EXCEEDED` | Too many requests |
| `VIRUS_DETECTED` | File contains malware |
| `PROCESSING_FAILED` | File processing failed |

### Handling Errors in JavaScript

```javascript
async function uploadFiles(files, entityType, entityId) {
  try {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    formData.append('entityType', entityType);
    formData.append('entityId', entityId);

    const response = await fetch('/api/files/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    const result = await response.json();

    if (!response.ok) {
      // Handle HTTP errors
      switch (response.status) {
        case 401:
          throw new Error('Please log in again');
        case 403:
          throw new Error('You do not have permission to upload files');
        case 413:
          throw new Error('File too large');
        case 429:
          throw new Error('Too many upload attempts. Please try again later');
        default:
          throw new Error(result.error || 'Upload failed');
      }
    }

    if (!result.success) {
      // Handle application errors
      switch (result.code) {
        case 'INVALID_FILE_TYPE':
          throw new Error('This file type is not allowed');
        case 'FILE_TOO_LARGE':
          throw new Error('File size exceeds the maximum limit');
        case 'VIRUS_DETECTED':
          throw new Error('File contains malicious content');
        default:
          throw new Error(result.error || 'Upload failed');
      }
    }

    return result.data;

  } catch (error) {
    console.error('Upload error:', error);
    throw error; // Re-throw for UI handling
  }
}
```

---

## Best Practices

### 1. File Upload Guidelines

- **File Size**: Keep files under 50MB for optimal performance
- **File Types**: Use accepted formats (images, PDFs, documents)
- **Progress Indicators**: Show upload progress for better UX
- **Error Handling**: Display clear error messages to users
- **Preview**: Show thumbnails for images before upload

### 2. Security Considerations

- **Never expose JWT tokens** in client-side code
- **Validate file types** on both client and server
- **Use signed URLs** for file access when possible
- **Implement rate limiting** for upload endpoints
- **Scan files** for malware if possible

### 3. Performance Optimization

- **Compress images** before upload
- **Use lazy loading** for file lists
- **Implement caching** for file metadata
- **Use CDN** for file delivery when available
- **Batch operations** for multiple file actions

### 4. User Experience

- **Provide feedback** during upload/download operations
- **Allow drag-and-drop** file uploads
- **Show file previews** when possible
- **Implement retry logic** for failed uploads
- **Support bulk operations** for efficiency

---

## Testing

### Postman Collection Example

```json
{
  "info": {
    "name": "BASMA File Management API",
    "description": "API collection for testing file management features"
  },
  "auth": {
    "type": "bearer",
    "bearer": [
      {
        "key": "token",
        "value": "{{jwt_token}}",
        "type": "string"
      }
    ]
  },
  "item": [
    {
      "name": "Upload Files",
      "request": {
        "method": "POST",
        "header": [],
        "body": {
          "mode": "formdata",
          "formdata": [
            {
              "key": "files",
              "type": "file",
              "src": "/path/to/test-file.jpg"
            },
            {
              "key": "entityType",
              "value": "MAINTENANCE_REQUEST",
              "type": "text"
            },
            {
              "key": "entityId",
              "value": "test-request-uuid",
              "type": "text"
            }
          ]
        },
        "url": {
          "raw": "{{base_url}}/api/files/upload",
          "host": ["{{base_url}}"],
          "path": ["api", "files", "upload"]
        }
      }
    }
  ]
}
```

---

## Support

For technical support and questions:

1. **Check the logs** for detailed error information
2. **Verify JWT token** validity and permissions
3. **Test with small files** first to isolate issues
4. **Check network connectivity** to storage services
5. **Review rate limits** if receiving 429 errors

**API Documentation**: Available at `/api-docs` on your server
**Health Check**: `GET /health` for service status
**File Status**: Check individual file processing status via metadata endpoint