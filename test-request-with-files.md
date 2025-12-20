# Test Request with Files

## Endpoint
POST /api/v1/requests/with-files

## Headers
- Authorization: Bearer <JWT_TOKEN>
- Content-Type: multipart/form-data

## Form Data
```
title: Test Request with Image
description: This is a test request with an image attachment
categoryId: 1
location: Building A
building: Building A
specificLocation: Room 101
priority: MEDIUM
files: [image1.jpg, image2.png]
```

## Expected Response
```json
{
  "success": true,
  "message": "Request created successfully with 2 file(s) attached",
  "data": {
    "request": {
      "id": "uuid",
      "title": "Test Request with Image",
      "status": "SUBMITTED",
      // ... other request fields
    },
    "files": [
      {
        "id": "uuid",
        "originalName": "image1.jpg",
        "mimeType": "image/jpeg",
        "fileSize": 1234567,
        // ... other file fields
      }
    ]
  }
}
```

## Usage Example (cURL)
```bash
curl -X POST http://localhost:3000/api/v1/requests/with-files \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "title=Test Request with Image" \
  -F "description=This is a test request" \
  -F "categoryId=1" \
  -F "location=Building A" \
  -F "building=Building A" \
  -F "specificLocation=Room 101" \
  -F "priority=MEDIUM" \
  -F "files=@image1.jpg" \
  -F "files=@image2.png"
```