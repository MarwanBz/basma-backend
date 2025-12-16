# Customer Confirmation API Guide

## Overview

This guide explains how to integrate the customer completion confirmation feature into your frontend application. This feature allows customers to confirm or reject maintenance work completion after a technician marks a request as completed.

## Base URLs

- Development: `http://localhost:3001/api/v1`
- Production: `https://api.basma-maintenance.com/api/v1`

## Authentication

All API requests require a valid JWT token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

## API Endpoints

### 1. Confirm Request Completion

Confirm that maintenance work has been completed to your satisfaction.

**Endpoint**: `POST /requests/:id/confirm-completion`

**Headers**:
- `Authorization: Bearer <token>` (Customer token)
- `Content-Type: application/json`

**Request Body**:
```json
{
  "comment": "Work looks great! Thank you." // Optional feedback
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "request": {
      "id": "req_123456789",
      "status": "closed",
      "customerConfirmationStatus": "confirmed",
      "customerConfirmedAt": "2025-01-15T14:20:00Z",
      "customerConfirmationComment": "Work looks great! Thank you."
    }
  }
}
```

**Error Responses**:
- `400 Bad Request`: Request is not in COMPLETED status
- `403 Forbidden`: You don't own this request
- `404 Not Found`: Request doesn't exist
- `409 Conflict`: Request already confirmed

### 2. Reject Request Completion

Reject the completion and report issues with the work.

**Endpoint**: `POST /requests/:id/reject-completion`

**Headers**:
- `Authorization: Bearer <token>` (Customer token)
- `Content-Type: application/json`

**Request Body**:
```json
{
  "reason": "Work not completed properly", // Required
  "comment": "The door still doesn't close correctly. Please fix again." // Optional
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "request": {
      "id": "req_123456789",
      "status": "customer_rejected",
      "customerConfirmationStatus": "rejected",
      "customerRejectedAt": "2025-01-15T14:25:00Z",
      "customerRejectionReason": "Work not completed properly",
      "customerConfirmationComment": "The door still doesn't close correctly. Please fix again."
    }
  }
}
```

### 3. Get Confirmation Status

Check the current confirmation status of a request.

**Endpoint**: `GET /requests/:id/confirmation-status`

**Headers**:
- `Authorization: Bearer <token>`

**Response**:
```json
{
  "success": true,
  "data": {
    "requestId": "req_123456789",
    "status": "pending",
    "completedDate": "2025-01-15T10:30:00Z",
    "daysSinceCompletion": 2,
    "canConfirm": true,
    "canReject": true,
    "autoConfirmDate": "2025-01-18T10:30:00Z"
  }
}
```

**Status Values**:
- `pending`: Awaiting customer confirmation
- `confirmed`: Customer confirmed completion
- `rejected`: Customer rejected completion
- `overridden`: Admin closed without confirmation

## Implementation Guide

### 1. Check for Pending Confirmations

When displaying requests to customers, check which ones are awaiting confirmation:

```typescript
// Fetch requests with confirmation status filter
const response = await fetch('/api/v1/requests?awaitingConfirmation=true', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const { data } = await response.json();
// Display confirmation UI for these requests
```

### 2. Display Confirmation UI

When a request is in `COMPLETED` status, show confirmation options:

```typescript
if (request.status === 'completed' && request.customerConfirmationStatus === 'pending') {
  // Show confirmation/reject buttons
  return (
    <div className="confirmation-actions">
      <h3>Work Completed - Please Confirm</h3>
      <p>Has the maintenance work been completed to your satisfaction?</p>

      <button onClick={() => confirmCompletion(request.id)}>
        ✓ Yes, Work is Complete
      </button>

      <button onClick={() => rejectCompletion(request.id)}>
        ✗ No, There Are Issues
      </button>

      <p className="auto-notice">
        This request will auto-close in {request.daysSinceCompletion} days
      </p>
    </div>
  );
}
```

### 3. Handle Confirmation

```typescript
async function confirmCompletion(requestId: string, comment?: string) {
  try {
    const response = await fetch(`/api/v1/requests/${requestId}/confirm-completion`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ comment })
    });

    if (response.ok) {
      // Update UI to show closed status
      showToast('Thank you! Request has been closed.');
      refreshRequestDetails();
    } else {
      const error = await response.json();
      showToast(error.message || 'Failed to confirm completion');
    }
  } catch (error) {
    showToast('Network error. Please try again.');
  }
}
```

### 4. Handle Rejection

```typescript
async function rejectCompletion(requestId: string, reason: string, comment?: string) {
  try {
    const response = await fetch(`/api/v1/requests/${requestId}/reject-completion`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ reason, comment })
    });

    if (response.ok) {
      showToast('Your feedback has been submitted. We will address the issues.');
      refreshRequestDetails();
    }
  } catch (error) {
    showToast('Network error. Please try again.');
  }
}
```

### 5. Rejection Modal Example

```typescript
function RejectionModal({ request, onSubmit, onCancel }) {
  const [reason, setReason] = useState('');
  const [comment, setComment] = useState('');

  const rejectionReasons = [
    'Work not completed properly',
    'Issues not fully resolved',
    'Quality of work is poor',
    'Additional work needed',
    'Other'
  ];

  return (
    <div className="modal">
      <h2>Report Issues with Completion</h2>

      <div className="form-group">
        <label>Reason for rejection *</label>
        <select value={reason} onChange={(e) => setReason(e.target.value)}>
          <option value="">Select a reason</option>
          {rejectionReasons.map(r => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label>Additional details</label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Please describe the issues..."
        />
      </div>

      <div className="modal-actions">
        <button
          onClick={() => onSubmit(reason, comment)}
          disabled={!reason}
        >
          Submit Rejection
        </button>
        <button onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}
```

### 6. Real-time Updates

If using WebSocket, listen for completion status changes:

```typescript
socket.on('request:updated', (data) => {
  if (data.requestId === currentRequest.id) {
    if (data.status === 'completed' && !data.customerConfirmationStatus) {
      // Show confirmation notification
      showNotification(
        'Request Completed',
        'Please confirm if the work is done to your satisfaction',
        { type: 'info', actions: ['confirm', 'reject'] }
      );
    }
  }
});
```

## UI/UX Best Practices

1. **Clear Visual Indicators**: Use badges or colors to show confirmation status
2. **Easy Access**: Place confirmation buttons prominently for completed requests
3. **Feedback Collection**: Make it easy for customers to provide specific feedback
4. **Auto-confirm Notice**: Inform customers about auto-confirmation after 3 days
5. **Confirmation Dialog**: Add a confirmation dialog before final submission
6. **Success/Error States**: Provide clear feedback for each action

## Testing Scenarios

Test these scenarios in your application:

1. Customer confirms completion successfully
2. Customer rejects completion with valid reason
3. Try to confirm twice (should show error)
4. Try to confirm non-COMPLETED request (should show error)
5. Check confirmation status for various request states
6. Verify auto-confirm date calculation

## Support

For any issues or questions about the confirmation API:
- Check the API specifications document
- Review error messages for troubleshooting
- Contact the development team for support