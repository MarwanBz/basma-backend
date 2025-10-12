# Basma API Postman Collection - Examples Guide

## Overview
This guide explains how to use the comprehensive examples included in the Basma API Postman collection. Each endpoint now includes multiple example responses showing different scenarios, success cases, and error conditions.

## Quick Start

### 1. Import the Collection
1. Open Postman
2. Click "Import" button
3. Select the `basma-api-postman-collection.json` file
4. The collection will be imported with all folders and examples

### 2. Set Up Environment Variables
The collection uses the following environment variables:
- `base_url`: API base URL (default: `http://localhost:4300`)
- `access_token`: Current access token (auto-set after login)
- `admin_token`: Super Admin token (auto-set after admin login)
- `technician_token`: Technician token (auto-set after technician login)
- `customer_token`: Customer token (auto-set after customer login)
- `basma_admin_token`: Basma Admin token (auto-set after building admin login)
- `refresh_token`: Refresh token for token renewal
- `my_user_id`: Current user ID
- `technician_user_id`: Technician ID for assignments
- `created_request_id`: ID of created request for testing

## Understanding Examples

### Example Structure
Each endpoint includes multiple example responses that demonstrate:

1. **Success Cases**: Different successful operations with various roles
   - Example: "Login as Super Admin", "Login as Customer", "Login as Technician"

2. **Validation Errors**: What happens when input validation fails
   - Example: "Invalid Email Format", "Weak Password", "Missing Required Fields"

3. **Authorization Errors**: Access denied scenarios
   - Example: "Unauthorized - No Token", "Unauthorized - Not Super Admin"

4. **Business Logic Errors**: Application-specific error conditions
   - Example: "Email Already Exists", "Invalid Credentials"

### How to View Examples

1. **In the Request Builder**:
   - Select any request from the collection
   - Look at the right panel for "Examples" section
   - Click on any example to see:
     - Request details (method, headers, body)
     - Expected response (status code, headers, body)

2. **After Sending a Request**:
   - Send the request
   - In the response section, click "Examples" dropdown
   - Compare your actual response with the documented examples

## Role-Based Testing

### Testing as Different Roles

#### 1. Super Admin Testing
```
1. Use "Login" request with Super Admin credentials
2. Token automatically saved to `admin_token` and `access_token`
3. Access all endpoints including:
   - System stats
   - User management (CRUD)
   - Bulk operations
   - Security logs
```

Example Login Body:
```json
{
  "email": "superadmin@basma.com",
  "password": "SuperAdmin123!"
}
```

#### 2. Technician Testing
```
1. Use "Login" request with Technician credentials
2. Token automatically saved to `technician_token`
3. Access endpoints like:
   - View all requests
   - Self-assign requests
   - Update request status
   - Add internal comments
```

Example Login Body:
```json
{
  "email": "technician@example.com",
  "password": "Tech123!"
}
```

#### 3. Customer Testing
```
1. Use "Login" request with Customer credentials
2. Token automatically saved to `customer_token`
3. Access endpoints like:
   - Create requests
   - View own requests
   - Add comments
   - Update profile
```

Example Login Body:
```json
{
  "email": "customer@example.com",
  "password": "Customer123!"
}
```

#### 4. Basma Admin (Building Admin) Testing
```
1. Use "Login" request with Basma Admin credentials
2. Token automatically saved to `basma_admin_token`
3. Access building-specific management features
```

Example Login Body:
```json
{
  "email": "admin@buildingA.basma.com",
  "password": "BuildingAdmin123!"
}
```

## Common Testing Workflows

### Workflow 1: Complete Authentication Flow
1. **Register** → Create new user account
2. **Login** → Get access token
3. **Get Current User** → Verify authentication
4. **Refresh Token** → Test token renewal
5. **Logout** → Clear session

### Workflow 2: Request Lifecycle (Customer Perspective)
1. **Login as Customer** → Get customer token
2. **Create Request** → Submit maintenance request
3. **Get My Requests** → View submitted requests
4. **Get Request by ID** → Check request details
5. **Add Comment** → Communicate with technician

### Workflow 3: Request Lifecycle (Technician Perspective)
1. **Login as Technician** → Get technician token
2. **Get All Requests** → View available requests
3. **Self-Assign Request** → Take ownership of request
4. **Update Status to IN_PROGRESS** → Start work
5. **Add Internal Comment** → Document progress
6. **Update Status to COMPLETED** → Finish work

### Workflow 4: Admin Management
1. **Login as Super Admin** → Get admin token
2. **Get System Stats** → View system overview
3. **Get All Users** → List all users
4. **Create User** → Add new user
5. **Assign Request** → Assign request to technician

### Workflow 5: Password Reset Flow
1. **Forgot Password** → Request reset email
2. **Reset Password** → Use token from email to set new password
3. **Login** → Verify new password works

## Testing Error Scenarios

### Validation Errors
Test input validation by sending invalid data:

**Invalid Email Format:**
```json
{
  "email": "not-an-email",
  "password": "ValidPassword123!"
}
```

**Weak Password:**
```json
{
  "email": "test@example.com",
  "password": "weak"
}
```

**Missing Required Fields:**
```json
{
  "title": "Fix door"
  // Missing: description, categoryId, location, building
}
```

### Authorization Errors
Test role-based access control:

1. **No Token**: Remove Authorization header
2. **Wrong Role**: Use customer token for admin endpoint
3. **Expired Token**: Use old/invalid token

### Business Logic Errors
Test application-specific validations:

1. **Duplicate Email**: Register with existing email
2. **Invalid Credentials**: Login with wrong password
3. **Expired Reset Token**: Use old password reset token

## Example Response Formats

### Success Response Format
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    // Response data here
  }
}
```

### Error Response Format
```json
{
  "success": false,
  "message": "Human-readable error message",
  "error": {
    "code": "ERROR_CODE",
    "details": "Additional error details"
  }
}
```

### Validation Error Format
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "fieldName",
      "message": "Validation error message"
    }
  ]
}
```

## Tips for Frontend Development

### 1. Use Examples as Type Definitions
- Copy example responses to create TypeScript interfaces
- Use successful response structures for data models
- Use error responses to implement error handling

### 2. Test Edge Cases
- Look at all examples for each endpoint
- Implement error handling for each error scenario
- Test with different roles to understand permissions

### 3. Automated Testing
- Export examples as test cases
- Use Postman's collection runner for regression testing
- Set up continuous integration with Newman (Postman CLI)

### 4. Mock Development
- Use example responses to create mock data
- Develop frontend without backend running
- Use tools like MSW (Mock Service Worker) with example data

## Request Priority Levels
```
LOW     - Non-urgent maintenance
MEDIUM  - Standard maintenance request
HIGH    - Important, needs attention soon
URGENT  - Emergency, requires immediate attention
```

## Request Status Flow
```
SUBMITTED → ASSIGNED → IN_PROGRESS → COMPLETED → CLOSED
                ↓
            CANCELLED (can happen at any stage)
```

## Common HTTP Status Codes

| Code | Meaning | When Used |
|------|---------|-----------|
| 200 | OK | Successful GET, PUT, PATCH requests |
| 201 | Created | Successful POST request creating a resource |
| 204 | No Content | Successful DELETE request |
| 400 | Bad Request | Validation errors, malformed requests |
| 401 | Unauthorized | Missing or invalid authentication token |
| 403 | Forbidden | Valid token but insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate resource (e.g., email already exists) |
| 500 | Internal Server Error | Server-side error |

## Troubleshooting

### Token Issues
- **Problem**: "Authentication required" error
- **Solution**: Check that `access_token` is set in environment
- **Check**: Look at Login request's Tests tab to see token automation

### Permission Issues
- **Problem**: "Access denied" error
- **Solution**: Verify you're using the correct role's token
- **Check**: Compare your role with endpoint requirements

### Validation Issues
- **Problem**: "Validation failed" error
- **Solution**: Compare your request body with successful examples
- **Check**: Look at field-specific error messages in response

## Additional Resources

- **API Documentation**: Available at `/api-docs` endpoint
- **Database Schema**: See `docs/diagrams/01-database-schema.md`
- **Authentication Flow**: See `docs/01-system/how-auth-works.md`
- **User Roles**: See `docs/01-system/user-roles.md`

## Support

For questions or issues:
1. Check the example responses for similar scenarios
2. Review the API documentation at `/api-docs`
3. Check the request/response in Postman Console (View → Show Postman Console)
4. Contact the backend team with specific error details

