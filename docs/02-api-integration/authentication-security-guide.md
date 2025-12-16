# Authentication & Security Guide

## Overview

This guide covers authentication, authorization, and security aspects of the Basma Maintenance System API, with a focus on the Customer Confirmation feature.

## Table of Contents
1. [Authentication](#authentication)
2. [Authorization & Roles](#authorization--roles)
3. [Security Best Practices](#security-best-practices)
4. [Rate Limiting](#rate-limiting)
5. [Error Handling](#error-handling)
6. [Security Headers](#security-headers)

## Authentication

### JWT Token-Based Authentication

All API endpoints require JWT (JSON Web Token) authentication. Tokens are obtained during login and must be included in the Authorization header for all subsequent requests.

#### Header Format
```
Authorization: Bearer <jwt_token>
```

#### Token Structure
The JWT token contains the following claims:
- `sub`: User ID
- `email`: User email
- `role`: User role (CUSTOMER, TECHNICIAN, ADMIN, etc.)
- `permissions`: Array of user permissions
- `iat`: Issued at timestamp
- `exp`: Expiration timestamp

#### Token Lifecycle
- **Expiration**: Access tokens expire after 24 hours
- **Refresh**: Use the refresh token endpoint to obtain new access tokens
- **Revocation**: Tokens are revoked on logout or password change

### Login Endpoint

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "customer@example.com",
  "password": "securePassword123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-uuid-here",
      "email": "customer@example.com",
      "name": "John Doe",
      "role": "CUSTOMER",
      "permissions": ["view_own_requests", "confirm_completion"]
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIs...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
    }
  }
}
```

### Refresh Token

```http
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

## Authorization & Roles

### User Roles

#### 1. CUSTOMER
- **Description**: End users who create maintenance requests
- **Permissions**:
  - View own requests
  - Create new requests
  - Confirm/reject completion
  - Add comments to own requests

#### 2. TECHNICIAN
- **Description**: Service providers who perform maintenance work
- **Permissions**:
  - View assigned requests
  - Update request status
  - Add comments (internal and public)
  - Mark requests as completed

#### 3. MAINTENANCE_ADMIN
- **Description**: Administrators managing maintenance operations
- **Permissions**:
  - All technician permissions
  - Assign technicians to requests
  - View all requests
  - Override customer confirmation

#### 4. BASMA_ADMIN
- **Description**: System administrators
- **Permissions**: All system permissions

#### 5. SUPER_ADMIN
- **Description**: Super administrators with full system access
- **Permissions**: Unlimited system access

### Role-Based Access Control (RBAC)

Each endpoint checks:
1. **Authentication**: Valid JWT token
2. **Authorization**: User role has permission
3. **Ownership**: User owns the resource (for customer data)

### Customer Confirmation Authorization

| Endpoint | Required Role | Ownership Check |
|----------|---------------|-----------------|
| `POST /requests/{id}/confirm-completion` | CUSTOMER | Must own request |
| `POST /requests/{id}/reject-completion` | CUSTOMER | Must own request |
| `GET /requests/{id}/confirmation-status` | CUSTOMER/TECHNICIAN/ADMIN | Customer: own, Technician: assigned, Admin: any |
| `POST /requests/{id}/close-without-confirmation` | ADMIN/SUPER_ADMIN | None (admin override) |

## Security Best Practices

### 1. Token Management

#### Client-side
```javascript
// Store tokens securely (httpOnly cookies preferred)
// Never store tokens in localStorage for production apps

// Example using httpOnly cookies
// Cookies are set by the server with:
Set-Cookie: accessToken=<token>; HttpOnly; Secure; SameSite=Strict
Set-Cookie: refreshToken=<token>; HttpOnly; Secure; SameSite=Strict
```

#### Automatic Token Refresh
```javascript
// Implement automatic token refresh before expiry
const checkTokenExpiry = () => {
  const token = getToken();
  const decoded = jwt.decode(token);
  const now = Date.now() / 1000;

  // Refresh 5 minutes before expiry
  if (decoded.exp - now < 300) {
    refreshToken();
  }
};
```

### 2. HTTPS Only

All API communication must use HTTPS in production:
- Prevents token interception
- Encrypts sensitive data
- Required for secure cookie handling

### 3. Request Validation

#### Input Sanitization
- All inputs are validated against schemas
- SQL injection protection via Prisma ORM
- XSS protection via input sanitization

#### Request Size Limits
```javascript
// Example limits
- JSON body: 10MB max
- File uploads: 50MB per file
- Max 10 files per request
```

### 4. CORS Configuration

```javascript
// Production CORS settings
{
  origin: ['https://app.basma-maintenance.com'],
  credentials: true,
  optionsSuccessStatus: 200
}
```

## Rate Limiting

### Rate Limits by Endpoint

| Endpoint Type | Limit | Window |
|---------------|-------|--------|
| Authentication | 5 requests | 15 minutes |
| General API | 100 requests | 1 minute |
| File Upload | 10 requests | 1 minute |
| Confirmation Actions | 10 requests | 1 minute |

### Rate Limit Headers

All responses include rate limit headers:
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
X-RateLimit-Retry-After: 60
```

### Handling Rate Limits

```javascript
// Client-side retry logic
const retryRequest = async (requestFn, retries = 3) => {
  try {
    return await requestFn();
  } catch (error) {
    if (error.response?.status === 429 && retries > 0) {
      const retryAfter = error.response.headers['x-ratelimit-retry-after'] || 60;
      await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
      return retryRequest(requestFn, retries - 1);
    }
    throw error;
  }
};
```

## Error Handling

### Standard Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "field": "Specific error details",
      "value": "Invalid value"
    }
  }
}
```

### Common Error Codes

#### Authentication Errors
- `UNAUTHORIZED`: Invalid or missing token
- `TOKEN_EXPIRED`: Token has expired
- `TOKEN_REVOKED`: Token has been revoked

#### Authorization Errors
- `FORBIDDEN`: User lacks permission
- `ROLE_REQUIRED`: Specific role required
- `OWNER_ONLY`: Only resource owner can access

#### Validation Errors
- `VALIDATION_ERROR`: Input validation failed
- `INVALID_STATUS`: Invalid status transition
- `MISSING_FIELD`: Required field missing

#### Business Logic Errors
- `ALREADY_CONFIRMED`: Request already confirmed
- `INVALID_STATE`: Request not in required state
- `ASSIGNMENT_EXISTS`: Already assigned to technician

### Client-Side Error Handling

```javascript
// Example error handling
const handleApiError = (error) => {
  if (error.response) {
    const { status, data } = error.response;

    switch (status) {
      case 401:
        // Redirect to login
        redirectToLogin();
        break;
      case 403:
        // Show permission error
        showError('You do not have permission to perform this action');
        break;
      case 429:
        // Show rate limit error
        showError('Too many requests. Please try again later.');
        break;
      default:
        // Show generic error
        showError(data.error?.message || 'An error occurred');
    }
  }
};
```

## Security Headers

The API implements these security headers:

### HTTP Security Headers
```http
# Prevent clickjacking
X-Frame-Options: DENY

# Prevent MIME type sniffing
X-Content-Type-Options: nosniff

# XSS Protection
X-XSS-Protection: 1; mode=block

# Content Security Policy
Content-Security-Policy: default-src 'self'

# Strict Transport Security (HTTPS only)
Strict-Transport-Security: max-age=31536000; includeSubDomains

# Referrer Policy
Referrer-Policy: strict-origin-when-cross-origin
```

### CORS Headers
```http
Access-Control-Allow-Origin: https://app.basma-maintenance.com
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS
Access-Control-Allow-Headers: Authorization, Content-Type
Access-Control-Allow-Credentials: true
Access-Control-Max-Age: 86400
```

## Customer Confirmation Security

### Secure Confirmation Flow

1. **Request Ownership Verification**
   ```javascript
   // Server-side check
   const isOwner = request.customerId === user.id;
   if (!isOwner) {
     throw new ForbiddenError('Only request owner can confirm');
   }
   ```

2. **Status Validation**
   ```javascript
   // Must be in COMPLETED status
   if (request.status !== 'COMPLETED') {
     throw new BadRequestError('Request must be completed to confirm');
   }
   ```

3. **One-Time Confirmation**
   ```javascript
   // Prevent duplicate confirmations
   if (request.customerConfirmationStatus !== 'PENDING') {
     throw new ConflictError('Request already confirmed or rejected');
   }
   ```

### Audit Trail

All confirmation actions are logged:
```javascript
{
  "timestamp": "2025-01-15T14:20:00Z",
  "action": "confirm_completion",
  "userId": "user-uuid",
  "requestId": "request-uuid",
  "ipAddress": "192.168.1.100",
  "userAgent": "Mozilla/5.0...",
  "details": {
    "previousStatus": "COMPLETED",
    "newStatus": "CLOSED",
    "comment": "Work looks great!"
  }
}
```

## Testing Security

### Security Testing Checklist

1. **Authentication Testing**
   - [ ] Invalid token rejected
   - [ ] Expired token rejected
   - [ ] Missing token rejected
   - [ ] Token refresh works correctly

2. **Authorization Testing**
   - [ ] Customer cannot access other's requests
   - [ ] Technician cannot confirm completion
   - [ ] Admin override works with proper permissions

3. **Input Validation Testing**
   - [ ] SQL injection attempts blocked
   - [ ] XSS attempts blocked
   - [ ] Malicious files rejected

4. **Rate Limiting Testing**
   - [ ] Rate limits enforced
   - [ ] Correct headers returned
   - [ ] Retry-after header respected

### Security Testing Tools

- **OWASP ZAP**: Automated security scanning
- **Burp Suite**: Manual security testing
- **Postman**: Security test collections
- **Jest**: Security unit tests

## Production Deployment Security

### Environment Variables
```bash
# JWT Configuration
JWT_SECRET=your-super-secure-secret-key
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# CORS Configuration
CORS_ORIGIN=https://app.basma-maintenance.com

# Database Security
DATABASE_URL=postgresql://user:password@localhost:5432/basma?sslmode=require

# File Upload Security
MAX_FILE_SIZE=52428800
ALLOWED_MIME_TYPES=image/jpeg,image/png,application/pdf
```

### Database Security
- Use SSL connections
- Implement row-level security
- Regular backups with encryption
- Audit all data access

### Infrastructure Security
- Use managed security groups
- Enable DDoS protection
- Implement WAF rules
- Regular security updates

## Support

For security-related issues:
- Email: security@basma-maintenance.com
- Check security headers for contact info
- Review API documentation for latest security practices