# Deprecated Storage Service Files

This directory contains all deprecated storage service files from the previous implementation. These files are kept for reference only and should **NOT** be used in new code.

## Directory Structure

```text
deprecated/storage/
├── services/
│   ├── hetznerStorage.service.ts    # Old storage service using AWS SDK v2
│   └── file.service.ts              # Old file service with all features
├── controllers/
│   └── file.controller.ts           # Old file controller
└── routes/
    └── file.routes.ts               # Old file routes (all commented out)
```

## What Was Deprecated

### Services

#### `hetznerStorage.service.ts`

- **Status:** Fully commented out
- **Reason:** Uses AWS SDK v2 (`aws-sdk`) which has been removed
- **Replacement:** `src/services/storage/storage.service.ts` (AWS SDK v3)
- **Features:** All S3 operations, file management, signed URLs, etc.

#### `file.service.ts`

- **Status:** Partially commented out (HetznerStorageService import disabled)
- **Reason:** Depends on deprecated HetznerStorageService
- **Replacement:** `src/services/fileUpload.service.ts` (simplified)
- **Features:**
  - Multiple file upload
  - File validation
  - Entity-based file organization
  - Thumbnail generation
  - Metadata extraction
  - Virus scanning
  - Database integration

### Controllers

#### `file.controller.ts`

- **Status:** Still functional but not used
- **Reason:** Routes disabled, service dependencies removed
- **Replacement:** `src/controllers/fileUpload.controller.ts` (simplified)
- **Features:** All file management endpoints

### Routes

#### `file.routes.ts`

- **Status:** All routes commented out
- **Reason:** Replaced by new storage routes
- **Replacement:** `src/routes/storage.routes.ts`
- **Old Endpoints:**
  - `POST /api/v1/files/upload` → `POST /api/v1/storage/upload`
  - `GET /api/v1/files/:id`
  - `GET /api/v1/files/:id/download`
  - `GET /api/v1/files/:id/download-url`
  - `GET /api/v1/files/:id/thumbnail-url`
  - `GET /api/v1/files/my-files`
  - `GET /api/v1/entities/:entityType/:entityId/files`
  - `PATCH /api/v1/files/:id`
  - `DELETE /api/v1/files/:id`

## Why These Files Are Kept

These files are preserved for reference to:

1. **Understand previous implementation** - See how features were implemented
2. **Re-implement features** - Use as reference when adding features back
3. **Migration reference** - Understand what changed and why
4. **Code patterns** - Learn from previous architecture decisions

## Key Features from Previous Implementation

See `STORAGE_SERVICE.md` in the root directory for a complete list of features that were implemented in these deprecated files.

## Important Notes

⚠️ **DO NOT:**

- Import these files in new code
- Uncomment code without understanding dependencies
- Use AWS SDK v2 patterns (use v3 instead)

✅ **DO:**

- Reference these files when implementing new features
- Use them as examples for complex functionality
- Learn from the architecture patterns

## Migration Path

If you need to re-implement features:

1. **Check the deprecated file** for the feature you need
2. **Understand the implementation** and dependencies
3. **Adapt to new architecture:**
   - Use AWS SDK v3 instead of v2
   - Use new storage service (`src/services/storage/storage.service.ts`)
   - Follow new patterns in `src/services/fileUpload.service.ts`
4. **Update accordingly** - Don't copy-paste, adapt to current structure

## Related Files

- **New Implementation:**
  - `src/services/storage/storage.service.ts` - Current storage service
  - `src/services/fileUpload.service.ts` - Current file upload service
  - `src/controllers/fileUpload.controller.ts` - Current controller
  - `src/routes/storage.routes.ts` - Current routes

- **Documentation:**
  - `STORAGE_SERVICE.md` - Complete storage service documentation
  - `docs/03-future-specs/file-management-system-technical-specification.md` - Original spec

---

**Last Updated:** January 2025
**Status:** All files deprecated, kept for reference only
