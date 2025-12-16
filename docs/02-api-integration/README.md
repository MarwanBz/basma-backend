# Customer Confirmation API Documentation

## Overview

This directory contains comprehensive documentation for the Customer Completion Confirmation feature of the Basma Maintenance System.

## Documentation Structure

### 📄 Core API Documentation

- **[customer-confirmation-api-guide.md](./customer-confirmation-api-guide.md)**
  - Frontend integration guide
  - Implementation examples
  - UI/UX best practices
  - Testing scenarios

### 🔐 Security & Authentication

- **[authentication-security-guide.md](./authentication-security-guide.md)**
  - JWT token authentication
  - Role-based access control
  - Security best practices
  - Rate limiting details

### 📊 API Specifications

- **[customer-confirmation-api.yml](../src/docs/schemas/customer-confirmation-api.yml)**
  - Complete OpenAPI 3.0 specification
  - All endpoint definitions
  - Request/response schemas
  - Error codes and examples

### 🧪 Testing Tools

- **[customer-confirmation-postman-collection.json](./customer-confirmation-postman-collection.json)**
  - Ready-to-use Postman collection
  - Pre-configured test cases
  - Environment variables
  - Automated test scripts

## Quick Start

### 1. Setup Postman

1. Import the Postman collection:
   - Open Postman
   - Click Import
   - Select the JSON file from this directory

2. Configure environment variables:
   - `base_url`: Your API endpoint (e.g., `http://localhost:3001/api`)
   - `customer_token`: JWT token for a customer user
   - `admin_token`: JWT token for an admin user
   - `request_id`: ID of a request in COMPLETED status

### 2. Test the API Flow

```bash
# 1. Check confirmation status
GET /api/requests/{requestId}/confirmation-status

# 2. Confirm completion
POST /api/requests/{requestId}/confirm-completion
{
  "comment": "Work looks great!"
}

# 3. Or reject completion
POST /api/requests/{requestId}/reject-completion
{
  "reason": "Issues not resolved",
  "comment": "The problem persists"
}
```

### 3. View Swagger Documentation

Navigate to your API's documentation endpoint:
- Development: `http://localhost:3001/api-docs`
- Production: `https://your-domain.com/api-docs`

## API Endpoints Summary

| Endpoint | Method | Role | Description |
|----------|--------|------|-------------|
| `/requests/{id}/confirm-completion` | POST | Customer | Confirm completed work |
| `/requests/{id}/reject-completion` | POST | Customer | Reject completed work |
| `/requests/{id}/confirmation-status` | GET | Customer/Technician/Admin | Check confirmation status |
| `/requests/{id}/close-without-confirmation` | POST | Admin | Admin override to close |

## Key Features

### 🔄 Confirmation Workflow
1. Technician marks request as **COMPLETED**
2. Customer receives notification
3. Customer can **CONFIRM** or **REJECT**
4. Auto-confirm after 3 days if no action
5. Admin can override if needed

### 🔒 Security Features
- JWT-based authentication
- Role-based authorization
- Request ownership verification
- Audit logging for all actions
- Rate limiting protection

### 📱 User Experience
- Real-time notifications
- Clear status indicators
- Feedback collection
- Mobile-responsive UI support

## Integration Checklist

### Frontend Integration

- [ ] Implement authentication token management
- [ ] Add confirmation UI for completed requests
- [ ] Handle success/error states
- [ ] Implement real-time updates (WebSocket)
- [ ] Add loading states during API calls
- [ ] Display auto-confirm countdown

### Backend Integration

- [ ] Set up authentication middleware
- [ ] Implement authorization checks
- [ ] Add rate limiting
- [ ] Configure error handling
- [ ] Set up audit logging
- [ ] Test all edge cases

### Testing

- [ ] Unit tests for all endpoints
- [ ] Integration tests with database
- [ ] Security testing (OWASP)
- [ ] Load testing for high traffic
- [ ] Cross-browser compatibility
- [ ] Mobile responsive testing

## Common Scenarios

### ✅ Successful Confirmation
```javascript
// Customer confirms completion
const response = await fetch('/api/requests/123/confirm-completion', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    comment: 'Great work! Thank you!'
  })
});

const result = await response.json();
// Request status changes to CLOSED
```

### ❌ Rejection with Feedback
```javascript
// Customer rejects with reason
const response = await fetch('/api/requests/123/reject-completion', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    reason: 'Work not completed properly',
    comment: 'The door still doesn't close correctly'
  })
});

const result = await response.json();
// Request status changes to CUSTOMER_REJECTED
```

### 📊 Status Checking
```javascript
// Check confirmation status
const response = await fetch('/api/requests/123/confirmation-status', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const { data } = await response.json();
console.log(data.status); // 'pending', 'confirmed', 'rejected'
console.log(data.canConfirm); // true/false
console.log(data.autoConfirmDate); // ISO date string
```

## Error Handling

### Common Error Codes

| Code | Description | Solution |
|------|-------------|----------|
| `UNAUTHORIZED` | Invalid/missing token | Refresh or re-authenticate |
| `FORBIDDEN` | No permission | Check user role |
| `INVALID_STATUS` | Wrong request status | Ensure request is COMPLETED |
| `ALREADY_CONFIRMED` | Duplicate action | Check status first |

### Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "INVALID_STATUS",
    "message": "Request must be in COMPLETED status",
    "details": {
      "currentStatus": "in_progress",
      "requiredStatus": "completed"
    }
  }
}
```

## Support & Resources

### Documentation
- [Main API Docs](../03-future-specs/04-api-specifications.md)
- [Database Schema](../../prisma/schema.prisma)
- [Feature Specifications](../03-future-specs/)

### Tools & Libraries
- [Swagger UI](https://swagger.io/tools/swagger-ui/)
- [Postman](https://www.postman.com/)
- [JWT Debugger](https://jwt.io/)

### Testing Tools
- [Jest](https://jestjs.io/) - Unit testing
- [Supertest](https://github.com/visionmedia/supertest) - API testing
- [OWASP ZAP](https://www.zaproxy.org/) - Security testing

## Best Practices

### Security
1. Always use HTTPS in production
2. Store tokens securely (httpOnly cookies)
3. Implement proper logout
4. Validate all inputs
5. Use rate limiting

### Performance
1. Cache confirmation status
2. Use pagination for request lists
3. Optimize database queries
4. Implement CDNs for static assets

### User Experience
1. Provide clear feedback
2. Show loading states
3. Handle network errors gracefully
4. Implement offline support where possible

## Changelog

### v1.0.0 (2025-01-15)
- Initial release
- Core confirmation/rejection endpoints
- Admin override functionality
- OpenAPI specification
- Postman collection
- Security documentation

---

For questions or support:
- Email: dev@basma-maintenance.com
- Create an issue in the project repository
- Check the main documentation for additional details