# Maintenance Requests Module - Backend Requirements

## 1. Overview
The Requests Module is the core of the maintenance management system, handling the complete lifecycle of maintenance requests from creation to completion.

## 2. Business Logic

### 2.1 Request Lifecycle
\`\`\`
Draft → Submitted → Assigned → In Progress → Completed → Closed
                 ↓
              Rejected
\`\`\`

### 2.2 Status Definitions
- **Draft**: Request created but not submitted
- **Submitted**: Request submitted and awaiting assignment
- **Assigned**: Request assigned to technician
- **In Progress**: Technician working on request
- **Completed**: Work finished, awaiting approval
- **Closed**: Request approved and closed
- **Rejected**: Request rejected with reason

## 3. Data Models

### 3.1 Request Entity
\`\`\`typescript
interface MaintenanceRequest {
  id: string
  title: string
  description: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: RequestStatus
  category: string
  location: string
  requestedBy: string
  assignedTo?: string
  estimatedCost?: number
  actualCost?: number
  estimatedDuration?: number
  actualDuration?: number
  scheduledDate?: Date
  completedDate?: Date
  createdAt: Date
  updatedAt: Date
  attachments: RequestAttachment[]
  comments: RequestComment[]
  parts: RequestPart[]
}
\`\`\`

### 3.2 Request Attachments
\`\`\`typescript
interface RequestAttachment {
  id: string
  requestId: string
  fileName: string
  fileUrl: string
  fileType: string
  fileSize: number
  uploadedBy: string
  uploadedAt: Date
}
\`\`\`

### 3.3 Request Comments
\`\`\`typescript
interface RequestComment {
  id: string
  requestId: string
  userId: string
  comment: string
  isInternal: boolean
  createdAt: Date
}
\`\`\`

## 4. API Endpoints

### 4.1 Request CRUD Operations

#### GET /api/requests
\`\`\`typescript
interface GetRequestsQuery {
  page?: number
  limit?: number
  status?: RequestStatus[]
  priority?: Priority[]
  assignedTo?: string
  category?: string
  dateFrom?: string
  dateTo?: string
  search?: string
}

interface GetRequestsResponse {
  success: boolean
  data: {
    requests: MaintenanceRequest[]
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
    }
    filters: {
      statuses: { value: string, count: number }[]
      priorities: { value: string, count: number }[]
      categories: { value: string, count: number }[]
    }
  }
}
\`\`\`

#### POST /api/requests
\`\`\`typescript
interface CreateRequestBody {
  title: string
  description: string
  priority: Priority
  category: string
  location: string
  estimatedCost?: number
  scheduledDate?: string
  attachments?: File[]
}
\`\`\`

#### PUT /api/requests/:id
\`\`\`typescript
interface UpdateRequestBody {
  title?: string
  description?: string
  priority?: Priority
  category?: string
  location?: string
  estimatedCost?: number
  actualCost?: number
  scheduledDate?: string
  status?: RequestStatus
}
\`\`\`

### 4.2 Request Assignment

#### POST /api/requests/:id/assign
\`\`\`typescript
interface AssignRequestBody {
  technicianId: string
  scheduledDate?: string
  notes?: string
}
\`\`\`

#### POST /api/requests/:id/unassign
\`\`\`typescript
interface UnassignRequestBody {
  reason: string
}
\`\`\`

### 4.3 Request Status Management

#### POST /api/requests/:id/status
\`\`\`typescript
interface UpdateStatusBody {
  status: RequestStatus
  notes?: string
  completionDetails?: {
    actualCost?: number
    actualDuration?: number
    partsUsed?: { partId: string, quantity: number }[]
  }
}
\`\`\`

## 5. Business Rules

### 5.1 Status Transitions
- Only assigned technician can update status to "In Progress"
- Only maintenance manager or basma admin can approve completion
- Rejected requests can be resubmitted with modifications
- Urgent requests must be assigned within 2 hours

### 5.2 Assignment Rules
- Technician must be available during scheduled time
- Consider technician skills and workload
- Urgent requests get priority in assignment queue
- Maximum 5 active requests per technician

### 5.3 Cost Management
- Estimated cost required for requests > $500
- Actual cost variance > 20% requires approval
- Parts cost automatically calculated from inventory

## 6. Notifications

### 6.1 Request Created
- Notify maintenance manager
- Auto-assign if criteria met

### 6.2 Request Assigned
- Notify assigned technician
- Notify request creator

### 6.3 Status Changes
- Notify all stakeholders
- Send escalation for overdue requests

### 6.4 Request Completed
- Notify maintenance manager for approval
- Notify request creator

## 7. Performance Requirements
- Request list loading: < 500ms
- Request creation: < 200ms
- Status updates: < 100ms
- File uploads: Support up to 10MB per file
- Concurrent request handling: 100+ simultaneous users

## 8. Validation Rules
- Title: 5-200 characters
- Description: 10-2000 characters
- Priority: Required enum value
- Category: Must exist in categories table
- Location: Required, 5-100 characters
- Estimated cost: Positive number if provided
- Scheduled date: Cannot be in the past
