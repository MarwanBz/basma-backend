# Postman Collection Examples - Quick Reference

## What's New

The Basma API Postman collection now includes **comprehensive example responses** for each endpoint, making it easier for the frontend team to understand the API behavior and implement proper error handling.

## Quick Links

- **Updated Collection**: `basma-api-postman-collection.json`
- **Complete Guide**: `postman-examples-guide.md`
- **Update Summary**: `POSTMAN-COLLECTION-UPDATE.md`

## Examples Added (25+)

### Authentication (15 examples)

- Register (5 examples: success, duplicate email, invalid email, weak password, missing fields)
- Login (7 examples: all 4 roles, invalid credentials, user not found, missing fields)
- Forgot Password (3 examples)
- Reset Password (3 examples)

### Request Management (5 examples)

- Create Request (5 examples: customer request, technician request, validation errors, authorization errors)

### Super Admin (2 examples)

- Get System Stats (2 examples: success, unauthorized)

## How to Use

### 1. Import Collection

```
File → Import → Select basma-api-postman-collection.json
```

### 2. View Examples

- Select any request
- Look for "Examples" in the right panel
- Each example shows request details and expected response

### 3. Test Different Scenarios

- Click on an example to load it
- Send the request
- Compare actual response with the example

## Example Response Format

### Success

```json
{
  "success": true,
  "message": "Operation successful",
  "data": {
    /* result */
  }
}
```

### Error

```json
{
  "success": false,
  "message": "Error message",
  "error": {
    "code": "ERROR_CODE",
    "details": "Details"
  }
}
```

### Validation Error

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [{ "field": "fieldName", "message": "Error" }]
}
```

## Role-Based Login Examples

| Role        | Email Example             | Use Case                                |
| ----------- | ------------------------- | --------------------------------------- |
| Super Admin | superadmin@basma.com      | System management, user CRUD, analytics |
| Basma Admin | admin@buildingA.basma.com | Building-specific management            |
| Technician  | technician@example.com    | Request assignment, status updates      |
| Customer    | customer@example.com      | Submit requests, view own requests      |

## Common Workflows

1. **Register → Login → Get User Profile**
2. **Customer: Login → Create Request → View Requests**
3. **Technician: Login → View All → Self-Assign → Update Status**
4. **Admin: Login → System Stats → Manage Users**
5. **Password Reset: Forgot → Reset → Login**

## For Frontend Developers

### Generate Types

Copy example responses to create TypeScript interfaces:

```typescript
interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  // ... from example
}
```

### Mock Data

Use examples for testing:

- MSW (Mock Service Worker)
- Vitest/Jest mocks
- Storybook stories

### Error Handling

Implement handlers for all documented error scenarios.

## Need More Examples?

The current collection includes examples for core authentication and basic request management. More examples can be added for:

- All Super Admin endpoints
- Request status management
- Comments and attachments
- Bulk operations
- Filtering and search

## Support

- Read `postman-examples-guide.md` for detailed documentation
- Check `POSTMAN-COLLECTION-UPDATE.md` for technical details
- Review actual examples in Postman after importing
