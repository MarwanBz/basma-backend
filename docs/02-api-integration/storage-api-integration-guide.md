# Storage API Integration Guide

## Overview

This guide explains how to integrate the Basma File Storage API into your applications. The storage service provides secure file upload, download, and management capabilities using Hetzner Object Storage.

## Table of Contents
1. [Quick Start](#quick-start)
2. [Authentication](#authentication)
3. [File Upload](#file-upload)
4. [File Access](#file-access)
5. [File Management](#file-management)
6. [Error Handling](#error-handling)
7. [Best Practices](#best-practices)
8. [Security Considerations](#security-considerations)
9. [Examples](#examples)

## Quick Start

### 1. Setup Authentication

```javascript
// Set up authentication headers
const headers = {
  'Authorization': `Bearer ${jwt_token}`,
  'Content-Type': 'application/json'
};

// For file uploads, use multipart/form-data:
const uploadHeaders = {
  'Authorization': `Bearer ${jwt_token}`
};
```

### 2. Upload a File

```javascript
// Create FormData for file upload
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('entityType', 'MAINTENANCE_REQUEST');
formData.append('entityId', 'request-123');

// Upload the file
const response = await fetch('/api/v1/storage/upload', {
  method: 'POST',
  headers: uploadHeaders,
  body: formData
});

const result = await response.json();
const fileUrl = result.data.signedUrl; // Use immediately
const fileKey = result.data.key;      // Store for later access
```

### 3. Access a File

```javascript
// Get a download URL
const response = await fetch(`/api/v1/storage/${fileKey}/download?expiresIn=3600`, {
  headers: {
    'Authorization': `Bearer ${jwt_token}`
  }
});

const { signedUrl } = await response.json();

// Use the signed URL to download or display
window.open(signedUrl, '_blank');
```

## Authentication

All storage API endpoints require JWT authentication. Include the token in the Authorization header:

```javascript
const headers = {
  'Authorization': `Bearer ${your_jwt_token}`
};
```

### Getting a JWT Token

```javascript
// Login to get JWT token
const loginResponse = await fetch('/api/v1/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123'
  })
});

const { data } = await loginResponse.json();
const jwt_token = data.tokens.accessToken;
```

## File Upload

### Single File Upload

```javascript
async function uploadFile(file, options = {}) {
  const formData = new FormData();
  formData.append('file', file);

  // Optional parameters
  if (options.entityType) {
    formData.append('entityType', options.entityType);
  }
  if (options.entityId) {
    formData.append('entityId', options.entityId);
  }
  if (options.isPublic !== undefined) {
    formData.append('isPublic', options.isPublic);
  }
  if (options.expiresAt) {
    formData.append('expiresAt', options.expiresAt.toISOString());
  }

  try {
    const response = await fetch('/api/v1/storage/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${jwt_token}`
      },
      body: formData
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Upload failed');
    }

    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
}

// Usage example
const fileInput = document.getElementById('file-input');
const file = fileInput.files[0];

if (file) {
  const uploadResult = await uploadFile(file, {
    entityType: 'MAINTENANCE_REQUEST',
    entityId: 'req-123456',
    isPublic: false
  });

  console.log('File uploaded:', uploadResult.key);
  console.log('Download URL:', uploadResult.signedUrl);
}
```

### Multiple File Upload

```javascript
async function uploadMultipleFiles(files, options = {}) {
  const formData = new FormData();

  // Add all files
  files.forEach(file => {
    formData.append('files', file);
  });

  // Add optional parameters
  if (options.entityType) {
    formData.append('entityType', options.entityType);
  }
  if (options.entityId) {
    formData.append('entityId', options.entityId);
  }

  try {
    const response = await fetch('/api/v1/storage/upload/multiple', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${jwt_token}`
      },
      body: formData
    });

    const result = await response.json();

    // Handle partial failures
    if (result.data.failed > 0) {
      console.warn(`${result.data.failed} files failed to upload`);
      result.data.errors.forEach(error => {
        console.error(`${error.fileName}: ${error.error}`);
      });
    }

    return result.data;
  } catch (error) {
    console.error('Batch upload error:', error);
    throw error;
  }
}

// Usage example
const fileInput = document.getElementById('multi-file-input');
const files = Array.from(fileInput.files);

if (files.length > 0) {
  const uploadResult = await uploadMultipleFiles(files, {
    entityType: 'MAINTENANCE_REQUEST',
    entityId: 'req-123456'
  });

  console.log(`Uploaded: ${uploadResult.uploaded}/${uploadResult.total} files`);
}
```

### Upload with Progress

```javascript
async function uploadFileWithProgress(file, onProgress, options = {}) {
  const formData = new FormData();
  formData.append('file', file);

  // Add optional parameters
  Object.keys(options).forEach(key => {
    if (options[key] !== undefined) {
      formData.append(key, options[key]);
    }
  });

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // Upload progress
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const percentComplete = (e.loaded / e.total) * 100;
        onProgress(Math.round(percentComplete));
      }
    });

    // Load complete
    xhr.addEventListener('load', () => {
      if (xhr.status === 201) {
        const result = JSON.parse(xhr.responseText);
        resolve(result.data);
      } else {
        const error = JSON.parse(xhr.responseText);
        reject(new Error(error.error?.message || 'Upload failed'));
      }
    });

    // Error handling
    xhr.addEventListener('error', () => {
      reject(new Error('Network error during upload'));
    });

    xhr.addEventListener('timeout', () => {
      reject(new Error('Upload timeout'));
    });

    // Configure and send
    xhr.timeout = 300000; // 5 minutes timeout
    xhr.open('POST', '/api/v1/storage/upload');
    xhr.setRequestHeader('Authorization', `Bearer ${jwt_token}`);
    xhr.send(formData);
  });
}

// Usage example
const file = fileInput.files[0];
const progressBar = document.getElementById('progress-bar');

uploadFileWithProgress(file, (percent) => {
  progressBar.style.width = `${percent}%`;
  progressBar.textContent = `${percent}%`;
})
  .then(result => {
    console.log('Upload complete:', result);
  })
  .catch(error => {
    console.error('Upload failed:', error);
  });
```

## File Access

### Get Download URL

```javascript
async function getDownloadUrl(fileKey, expiresIn = 3600) {
  try {
    const response = await fetch(
      `/api/v1/storage/${fileKey}/download?expiresIn=${expiresIn}`,
      {
        headers: {
          'Authorization': `Bearer ${jwt_token}`
        }
      }
    );

    if (!response.ok) {
      throw new Error('Failed to get download URL');
    }

    const result = await response.json();
    return result.data.signedUrl;
  } catch (error) {
    console.error('Error getting download URL:', error);
    throw error;
  }
}

// Usage
const downloadUrl = await getDownloadUrl(fileKey, 7200); // 2 hours
window.open(downloadUrl, '_blank');
```

### Display Images

```javascript
async function displayImage(fileKey, imageElement) {
  try {
    const downloadUrl = await getDownloadUrl(fileKey);
    imageElement.src = downloadUrl;
  } catch (error) {
    console.error('Failed to display image:', error);
    imageElement.alt = 'Failed to load image';
  }
}

// Usage
const img = document.getElementById('my-image');
await displayImage(fileKey, img);
```

### Download Files

```javascript
async function downloadFile(fileKey, fileName) {
  try {
    const downloadUrl = await getDownloadUrl(fileKey);

    // Create temporary link and trigger download
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = fileName || 'download';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Download failed:', error);
  }
}

// Usage
await downloadFile(fileKey, 'document.pdf');
```

### URL Expiration Handling

```javascript
class FileUrlManager {
  constructor() {
    this.urlCache = new Map();
    this.expiryBuffer = 300000; // 5 minutes buffer
  }

  async getValidUrl(fileKey, expiresIn = 3600) {
    const cached = this.urlCache.get(fileKey);

    // Check if cached URL is still valid
    if (cached && cached.expiresAt > Date.now() + this.expiryBuffer) {
      return cached.url;
    }

    // Get new URL
    const url = await getDownloadUrl(fileKey, expiresIn);

    // Cache with expiration
    this.urlCache.set(fileKey, {
      url,
      expiresAt: Date.now() + (expiresIn * 1000)
    });

    return url;
  }

  clearCache() {
    this.urlCache.clear();
  }
}

// Usage
const urlManager = new FileUrlManager();
const validUrl = await urlManager.getValidUrl(fileKey);
```

## File Management

### Get File Information

```javascript
async function getFileInfo(fileKey) {
  try {
    const response = await fetch(`/api/v1/storage/${fileKey}`, {
      headers: {
        'Authorization': `Bearer ${jwt_token}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to get file info');
    }

    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error('Error getting file info:', error);
    throw error;
  }
}

// Usage
const fileInfo = await getFileInfo(fileKey);
console.log('File:', fileInfo.fileName);
console.log('Size:', formatFileSize(fileInfo.fileSize));
console.log('Uploaded:', new Date(fileInfo.uploadedAt).toLocaleString());
```

### Delete a File

```javascript
async function deleteFile(fileKey, options = {}) {
  try {
    const response = await fetch(`/api/v1/storage/${fileKey}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${jwt_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(options)
    });

    if (!response.ok) {
      throw new Error('Failed to delete file');
    }

    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error('Error deleting file:', error);
    throw error;
  }
}

// Usage example
await deleteFile(fileKey, {
  softDelete: true,
  reason: 'User requested deletion'
});
```

### List User Files

```javascript
async function listUserFiles(filters = {}) {
  const queryParams = new URLSearchParams();

  // Add filters
  Object.keys(filters).forEach(key => {
    if (filters[key] !== undefined) {
      queryParams.append(key, filters[key]);
    }
  });

  try {
    const response = await fetch(
      `/api/v1/storage/files?${queryParams}`,
      {
        headers: {
          'Authorization': `Bearer ${jwt_token}`
        }
      }
    );

    if (!response.ok) {
      throw new Error('Failed to list files');
    }

    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error('Error listing files:', error);
    throw error;
  }
}

// Usage examples
// Get all files with pagination
const allFiles = await listUserFiles({ page: 1, limit: 20 });

// Filter by file type
const images = await listUserFiles({
  fileType: 'image',
  limit: 10
});

// Search by filename
const searchResults = await listUserFiles({
  search: 'report',
  sortBy: 'fileName',
  sortOrder: 'asc'
});

// Date range filter
const recentFiles = await listUserFiles({
  dateFrom: '2025-01-01',
  dateTo: '2025-01-31',
  sortBy: 'uploadedAt',
  sortOrder: 'desc'
});
```

### Get Storage Statistics

```javascript
async function getStorageStats(period = 'month') {
  try {
    const response = await fetch(
      `/api/v1/storage/stats?period=${period}`,
      {
        headers: {
          'Authorization': `Bearer ${jwt_token}`
        }
      }
    );

    if (!response.ok) {
      throw new Error('Failed to get storage stats');
    }

    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error('Error getting storage stats:', error);
    throw error;
  }
}

// Usage
const stats = await getStorageStats('month');
console.log(`Total files: ${stats.totalFiles}`);
console.log(`Storage used: ${formatFileSize(stats.totalSize)}`);
console.log(`Images: ${stats.fileStats.images.count}`);
console.log(`Documents: ${stats.fileStats.documents.count}`);
```

## Error Handling

### Error Response Format

```javascript
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      // Additional error context
    }
  }
}
```

### Common Error Codes

| Code | Description | Solution |
|------|-------------|----------|
| `UNAUTHORIZED` | Invalid or missing token | Refresh authentication |
| `FORBIDDEN` | No permission to access file | Check file ownership |
| `NOT_FOUND` | File doesn't exist | Verify file key |
| `FILE_TOO_LARGE` | File exceeds size limit | Compress or split file |
| `INVALID_FILE_TYPE` | File type not supported | Use allowed formats |
| `RATE_LIMIT_EXCEEDED` | Too many requests | Wait and retry |
| `STORAGE_QUOTA_EXCEEDED` | Storage limit reached | Delete old files |
| `VALIDATION_ERROR` | Invalid input parameters | Check request data |

### Handling Errors

```javascript
class StorageError extends Error {
  constructor(response, data) {
    super(data.error?.message || 'Storage operation failed');
    this.name = 'StorageError';
    this.code = data.error?.code;
    this.details = data.error?.details;
    this.status = response.status;
  }
}

async function handleStorageRequest(requestFn) {
  try {
    return await requestFn();
  } catch (error) {
    if (error.response) {
      const errorData = await error.response.json();
      throw new StorageError(error.response, errorData);
    }
    throw error;
  }
}

// Usage
try {
  const result = await handleStorageRequest(async () => {
    const response = await fetch('/api/v1/storage/upload', {
      method: 'POST',
      headers: uploadHeaders,
      body: formData
    });

    if (!response.ok) {
      throw { response };
    }

    return response.json();
  });

  console.log('Success:', result);
} catch (error) {
  if (error instanceof StorageError) {
    switch (error.code) {
      case 'FILE_TOO_LARGE':
        alert('File is too large. Maximum size is 50MB.');
        break;
      case 'RATE_LIMIT_EXCEEDED':
        const retryAfter = error.details?.retryAfter || 60;
        alert(`Too many requests. Please wait ${retryAfter} seconds.`);
        break;
      default:
        alert(error.message);
    }
  }
}
```

## Best Practices

### 1. File Size Management

```javascript
// Check file size before upload
function validateFileSize(file, maxSize = 50 * 1024 * 1024) {
  if (file.size > maxSize) {
    throw new Error(`File size (${formatFileSize(file.size)}) exceeds maximum (${formatFileSize(maxSize)})`);
  }
}

// Compress images before upload
async function compressImage(file, maxWidth = 1920, quality = 0.8) {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
      canvas.width = img.width * ratio;
      canvas.height = img.height * ratio;

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(resolve, 'image/jpeg', quality);
    };

    img.src = URL.createObjectURL(file);
  });
}

// Usage
const file = fileInput.files[0];
validateFileSize(file);

if (file.type.startsWith('image/')) {
  const compressedFile = await compressImage(file);
  // Upload compressedFile
}
```

### 2. Progress Feedback

```javascript
function showUploadProgress(percent) {
  const progressBar = document.getElementById('upload-progress');
  const progressText = document.getElementById('progress-text');

  progressBar.style.width = `${percent}%`;
  progressText.textContent = `${percent}%`;

  if (percent === 100) {
    progressText.textContent = 'Processing...';
  }
}

function showUploadError(error) {
  const errorContainer = document.getElementById('upload-error');
  errorContainer.textContent = error.message;
  errorContainer.style.display = 'block';
}

function clearUploadState() {
  const progressBar = document.getElementById('upload-progress');
  const progressText = document.getElementById('progress-text');
  const errorContainer = document.getElementById('upload-error');

  progressBar.style.width = '0%';
  progressText.textContent = '0%';
  errorContainer.style.display = 'none';
}
```

### 3. File Type Validation

```javascript
const ALLOWED_TYPES = {
  image: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'],
  document: ['pdf', 'doc', 'docx', 'txt', 'rtf'],
  office: ['xls', 'xlsx', 'ppt', 'pptx'],
  media: ['mp4', 'avi', 'mov', 'mp3', 'wav', 'ogg'],
  archive: ['zip', 'rar', '7z', 'tar', 'gz']
};

function getFileType(file) {
  const extension = file.name.split('.').pop().toLowerCase();

  for (const [type, extensions] of Object.entries(ALLOWED_TYPES)) {
    if (extensions.includes(extension)) {
      return type;
    }
  }

  return 'other';
}

function validateFileType(file) {
  const type = getFileType(file);
  const allowedExtensions = [...Object.values(ALLOWED_TYPES)].flat();
  const extension = file.name.split('.').pop().toLowerCase();

  if (!allowedExtensions.includes(extension)) {
    throw new Error(`File type .${extension} is not allowed`);
  }

  return type;
}
```

### 4. Batch Operations

```javascript
class BatchUploader {
  constructor(options = {}) {
    this.maxConcurrent = options.maxConcurrent || 3;
    this.retryAttempts = options.retryAttempts || 3;
    this.retryDelay = options.retryDelay || 1000;
  }

  async uploadBatch(files, options = {}) {
    const results = {
      successful: [],
      failed: [],
      total: files.length
    };

    // Process files in batches
    for (let i = 0; i < files.length; i += this.maxConcurrent) {
      const batch = files.slice(i, i + this.maxConcurrent);

      const batchPromises = batch.map(file =>
        this.uploadWithRetry(file, options)
          .then(result => {
            results.successful.push({ file: file.name, result });
            return result;
          })
          .catch(error => {
            results.failed.push({ file: file.name, error });
            return null;
          })
      );

      await Promise.all(batchPromises);

      // Emit progress
      const progress = Math.round(((i + batch.length) / files.length) * 100);
      options.onProgress?.(progress, results);
    }

    return results;
  }

  async uploadWithRetry(file, options, attempt = 1) {
    try {
      return await uploadFile(file, options);
    } catch (error) {
      if (attempt < this.retryAttempts) {
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        return this.uploadWithRetry(file, options, attempt + 1);
      }
      throw error;
    }
  }
}

// Usage
const batchUploader = new BatchUploader({
  maxConcurrent: 3,
  retryAttempts: 2
});

const files = Array.from(fileInput.files);
const results = await batchUploader.uploadBatch(files, {
  entityType: 'MAINTENANCE_REQUEST',
  entityId: 'req-123456',
  onProgress: (percent, results) => {
    console.log(`Progress: ${percent}%`);
    console.log(`Success: ${results.successful.length}, Failed: ${results.failed.length}`);
  }
});
```

## Security Considerations

### 1. Token Security

```javascript
// Store tokens securely
class TokenManager {
  constructor() {
    this.token = null;
    this.expiresAt = null;
  }

  setToken(token, expiresIn) {
    // Store in memory for security (not localStorage)
    this.token = token;
    this.expiresAt = Date.now() + (expiresIn * 1000);

    // Set up auto-refresh
    this.setupAutoRefresh();
  }

  getToken() {
    if (!this.token || Date.now() >= this.expiresAt) {
      return null;
    }
    return this.token;
  }

  async refreshToken() {
    try {
      const response = await fetch('/api/v1/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          refreshToken: this.refreshToken
        })
      });

      const result = await response.json();
      this.setToken(result.data.accessToken, 3600);
    } catch (error) {
      console.error('Token refresh failed:', error);
      this.clearToken();
      // Redirect to login
      window.location.href = '/login';
    }
  }

  clearToken() {
    this.token = null;
    this.expiresAt = null;
  }

  setupAutoRefresh() {
    const refreshTime = (this.expiresAt - Date.now()) - 300000; // 5 min before expiry

    if (refreshTime > 0) {
      setTimeout(() => this.refreshToken(), refreshTime);
    }
  }
}
```

### 2. File Validation

```javascript
// Validate file content (not just extension)
function validateFileContent(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const arr = new Uint8Array(e.target.result);

      // Check file signatures
      const signatures = {
        'image/jpeg': [0xFF, 0xD8, 0xFF],
        'image/png': [0x89, 0x50, 0x4E, 0x47],
        'application/pdf': [0x25, 0x50, 0x44, 0x46]
      };

      const fileSignature = Array.from(arr.slice(0, 4));
      const isValidSignature = Object.values(signatures).some(sig =>
        sig.every((byte, i) => byte === fileSignature[i])
      );

      if (!isValidSignature && !file.type.startsWith('text/')) {
        reject(new Error('Invalid file content'));
      } else {
        resolve(true);
      }
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file.slice(0, 4));
  });
}
```

### 3. Secure File Display

```javascript
// Display files in sandboxed iframes
function displayFileSecurely(signedUrl, containerElement, fileType) {
  if (fileType === 'pdf') {
    const iframe = document.createElement('iframe');
    iframe.src = signedUrl;
    iframe.style.width = '100%';
    iframe.style.height = '600px';
    iframe.sandbox = 'allow-scripts allow-same-origin';
    containerElement.appendChild(iframe);
  } else if (fileType.startsWith('image/')) {
    const img = document.createElement('img');
    img.src = signedUrl;
    img.style.maxWidth = '100%';
    img.onload = () => URL.revokeObjectURL(signedUrl);
    containerElement.appendChild(img);
  }
}
```

## Examples

### Complete File Upload Component

```html
<!DOCTYPE html>
<html>
<head>
  <title>File Upload Example</title>
  <style>
    .upload-container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .drop-zone {
      border: 2px dashed #ccc;
      border-radius: 10px;
      padding: 40px;
      text-align: center;
      cursor: pointer;
      transition: all 0.3s;
    }
    .drop-zone.active {
      border-color: #4CAF50;
      background-color: #f0f8f0;
    }
    .progress-bar {
      width: 100%;
      height: 20px;
      background-color: #f0f0f0;
      border-radius: 10px;
      overflow: hidden;
      margin: 10px 0;
    }
    .progress-fill {
      height: 100%;
      background-color: #4CAF50;
      transition: width 0.3s;
      text-align: center;
      line-height: 20px;
      color: white;
      font-size: 12px;
    }
    .file-list {
      margin-top: 20px;
    }
    .file-item {
      display: flex;
      align-items: center;
      padding: 10px;
      border-bottom: 1px solid #eee;
    }
    .file-icon {
      font-size: 24px;
      margin-right: 10px;
    }
    .error-message {
      color: #f44336;
      margin-top: 10px;
    }
  </style>
</head>
<body>
  <div class="upload-container">
    <h2>File Upload</h2>

    <div class="drop-zone" id="dropZone">
      <p>Drag and drop files here or click to select</p>
      <input type="file" id="fileInput" multiple style="display: none;">
    </div>

    <div class="progress-bar" id="progressBar" style="display: none;">
      <div class="progress-fill" id="progressFill">0%</div>
    </div>

    <div id="errorMessage" class="error-message"></div>

    <div class="file-list" id="fileList"></div>
  </div>

  <script src="storage-api-integration.js"></script>
</body>
</html>
```

```javascript
// storage-api-integration.js
class FileUploader {
  constructor() {
    this.dropZone = document.getElementById('dropZone');
    this.fileInput = document.getElementById('fileInput');
    this.progressBar = document.getElementById('progressBar');
    this.progressFill = document.getElementById('progressFill');
    this.errorMessage = document.getElementById('errorMessage');
    this.fileList = document.getElementById('fileList');

    this.jwtToken = null;
    this.init();
  }

  init() {
    // Set up event listeners
    this.dropZone.addEventListener('click', () => this.fileInput.click());
    this.fileInput.addEventListener('change', (e) => this.handleFiles(e.target.files));

    // Drag and drop events
    this.dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.dropZone.classList.add('active');
    });

    this.dropZone.addEventListener('dragleave', () => {
      this.dropZone.classList.remove('active');
    });

    this.dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      this.dropZone.classList.remove('active');
      this.handleFiles(e.dataTransfer.files);
    });

    // Get authentication token
    this.authenticate();
  }

  async authenticate() {
    // In a real app, get this from login or localStorage
    this.jwtToken = 'your-jwt-token-here';
  }

  async handleFiles(files) {
    const fileArray = Array.from(files);

    try {
      // Validate files
      for (const file of fileArray) {
        validateFileSize(file);
        validateFileType(file);
      }

      // Show progress
      this.showProgress();

      // Upload files
      const batchUploader = new BatchUploader({
        maxConcurrent: 2
      });

      const results = await batchUploader.uploadBatch(fileArray, {
        entityType: 'DOCUMENT',
        onProgress: (percent, results) => {
          this.updateProgress(percent);
          this.updateFileList(results);
        }
      });

      // Show results
      this.hideProgress();
      this.displayResults(results);

    } catch (error) {
      this.showError(error.message);
    }
  }

  showProgress() {
    this.progressBar.style.display = 'block';
    this.progressFill.style.width = '0%';
    this.progressFill.textContent = '0%';
    this.errorMessage.textContent = '';
  }

  updateProgress(percent) {
    this.progressFill.style.width = `${percent}%`;
    this.progressFill.textContent = `${percent}%`;
  }

  hideProgress() {
    this.progressBar.style.display = 'none';
  }

  updateFileList(results) {
    this.fileList.innerHTML = '';

    [...results.successful, ...results.failed].forEach(item => {
      const div = document.createElement('div');
      div.className = 'file-item';

      const icon = document.createElement('div');
      icon.className = 'file-icon';
      icon.textContent = this.getFileIcon(item.file);

      const info = document.createElement('div');
      info.style.flex = '1';
      info.innerHTML = `
        <div>${item.file}</div>
        <div style="font-size: 12px; color: #666;">
          ${item.result ? 'Uploaded successfully' : item.error.message}
        </div>
      `;

      div.appendChild(icon);
      div.appendChild(info);
      this.fileList.appendChild(div);
    });
  }

  getFileIcon(filename) {
    const extension = filename.split('.').pop().toLowerCase();
    const icons = {
      pdf: '📄',
      doc: '📝',
      docx: '📝',
      jpg: '🖼️',
      jpeg: '🖼️',
      png: '🖼️',
      gif: '🖼️',
      mp4: '🎥',
      avi: '🎥',
      mp3: '🎵',
      zip: '📦',
      rar: '📦'
    };

    return icons[extension] || '📎';
  }

  showError(message) {
    this.errorMessage.textContent = message;
    this.hideProgress();
  }

  displayResults(results) {
    const successCount = results.successful.length;
    const totalCount = results.total;

    if (successCount === totalCount) {
      this.showMessage(`All ${totalCount} files uploaded successfully!`, 'success');
    } else {
      this.showMessage(
        `${successCount} of ${totalCount} files uploaded. ${results.failed.length} failed.`,
        'warning'
      );
    }
  }

  showMessage(message, type) {
    const alert = document.createElement('div');
    alert.style.padding = '10px';
    alert.style.marginTop = '10px';
    alert.style.borderRadius = '5px';

    if (type === 'success') {
      alert.style.backgroundColor = '#d4edda';
      alert.style.color = '#155724';
    } else {
      alert.style.backgroundColor = '#fff3cd';
      alert.style.color = '#856404';
    }

    alert.textContent = message;
    this.errorMessage.appendChild(alert);
  }
}

// Initialize the uploader
const uploader = new FileUploader();

// Helper functions from previous examples
function validateFileSize(file, maxSize = 50 * 1024 * 1024) {
  if (file.size > maxSize) {
    throw new Error(`File ${file.name} is too large. Maximum size is 50MB.`);
  }
}

function validateFileType(file) {
  const allowedTypes = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'video/mp4', 'video/avi', 'video/quicktime',
    'audio/mpeg', 'audio/wav',
    'application/zip', 'application/x-rar-compressed'
  ];

  if (!allowedTypes.includes(file.type)) {
    throw new Error(`File type ${file.type} is not supported for ${file.name}`);
  }
}

class BatchUploader {
  constructor(options = {}) {
    this.maxConcurrent = options.maxConcurrent || 3;
  }

  async uploadBatch(files, options = {}) {
    const results = {
      successful: [],
      failed: [],
      total: files.length
    };

    for (let i = 0; i < files.length; i += this.maxConcurrent) {
      const batch = files.slice(i, i + this.maxConcurrent);

      const batchPromises = batch.map(file =>
        this.uploadFile(file, options)
          .then(result => {
            results.successful.push({ file: file.name, result });
          })
          .catch(error => {
            results.failed.push({ file: file.name, error });
          })
      );

      await Promise.all(batchPromises);

      const progress = Math.round(((i + batch.length) / files.length) * 100);
      options.onProgress?.(progress, results);
    }

    return results;
  }

  async uploadFile(file, options) {
    const formData = new FormData();
    formData.append('file', file);

    if (options.entityType) {
      formData.append('entityType', options.entityType);
    }

    const response = await fetch('/api/v1/storage/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${uploader.jwtToken}`
      },
      body: formData
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Upload failed');
    }

    return response.json();
  }
}
```

## Support

For issues or questions about the Storage API:
- Check the error messages for specific issues
- Review the OpenAPI specification for endpoint details
- Use the Postman collection for testing
- Contact support at dev@basma-maintenance.com