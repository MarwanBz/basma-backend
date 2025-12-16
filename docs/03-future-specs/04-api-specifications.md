# API Specifications

## 1. Overview
This document provides comprehensive API specifications for the Basma Maintenance Management System backend. All APIs follow RESTful principles and return JSON responses.

## 2. Base Configuration

### 2.1 Base URL
\`\`\`
Development: http://localhost:3001/api
Production: https://api.basma-maintenance.com/api
\`\`\`

### 2.2 Authentication
All protected endpoints require JWT token in Authorization header:
\`\`\`
Authorization: Bearer <jwt_token>
\`\`\`

### 2.3 Standard Response Format
\`\`\`typescript
interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: any
  }
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}
\`\`\`

### 2.4 Pagination Standards
All paginated endpoints MUST follow these standards:

#### 2.4.1 Query Parameters
\`\`\`typescript
interface PaginationQuery {
  page?: number    // default: 1, min: 1
  limit?: number   // default: 20, min: 1, max: 100
  sortBy?: string  // default field based on resource
  sortOrder?: 'asc' | 'desc'  // default: 'desc'
}
\`\`\`

#### 2.4.2 Validation Rules
- **page**: Must be integer ≥ 1, default = 1
- **limit**: Must be integer between 1-100, default = 20
- **Parameter type**: String transformed to number with proper validation
- **Regex validation**: `^\d+$` for both page and limit

#### 2.4.3 Response Format (Standardized)
\`\`\`typescript
interface PaginatedResponse<T> {
  success: boolean
  data: {
    [resourceName]: T[]  // e.g., requests, users, technicians
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
    }
  }
}
\`\`\`

#### 2.4.4 Implementation Examples
\`\`\`typescript
// ✅ CORRECT Implementation
GET /api/requests?page=1&limit=20

// Response:
{
  "success": true,
  "data": {
    "requests": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "totalPages": 5
    }
  }
}

// ❌ INCORRECT Implementations to Fix:
// - Missing data wrapper
// - Using "pages" instead of "totalPages"
// - Different default limits
// - No validation schemas
\`\`\`

### 2.5 Error Codes
\`\`\`typescript
enum ErrorCodes {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED'
}
\`\`\`

## 4. Authentication APIs

### 4.1 POST /auth/login
**Description**: Authenticate user and return JWT tokens

**Request Body**:
\`\`\`typescript
interface LoginRequest {
  email: string
  password: string
}
\`\`\`

**Response**:
\`\`\`typescript
interface LoginResponse {
  success: boolean
  data: {
    user: {
      id: string
      email: string
      name: string
      role: 'maintenance_manager' | 'basma_admin'
      permissions: string[]
    }
    tokens: {
      accessToken: string
      refreshToken: string
    }
  }
}
\`\`\`

**Status Codes**:
- `200`: Success
- `400`: Invalid credentials
- `429`: Too many login attempts

### 4.2 POST /auth/refresh
**Description**: Refresh access token using refresh token

**Request Body**:
\`\`\`typescript
interface RefreshRequest {
  refreshToken: string
}
\`\`\`

**Response**:
\`\`\`typescript
interface RefreshResponse {
  success: boolean
  data: {
    accessToken: string
  }
}
\`\`\`

### 4.3 POST /auth/logout
**Description**: Logout user and invalidate refresh token

**Request Body**:
\`\`\`typescript
interface LogoutRequest {
  refreshToken: string
}
\`\`\`

## 5. Maintenance Requests APIs

### 5.1 GET /requests
**Description**: Get paginated list of maintenance requests

**Query Parameters**:
\`\`\`typescript
interface RequestsQuery {
  page?: number // default: 1, min: 1
  limit?: number // default: 20, min: 1, max: 100
  status?: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled' | 'closed' | 'customer_rejected'
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  assignedTo?: string // technician ID
  customerConfirmationStatus?: 'pending' | 'confirmed' | 'rejected' | 'overridden'
  awaitingConfirmation?: boolean // Filter for requests awaiting customer confirmation
  search?: string // search in title, description, location, customIdentifier
  sortBy?: 'createdAt' | 'updatedAt' | 'dueDate' | 'priority' | 'customerConfirmedAt'
  sortOrder?: 'asc' | 'desc'
  dateFrom?: string // ISO date
  dateTo?: string // ISO date
}
\`\`\`

**Response**:
\`\`\`typescript
interface RequestsResponse {
  success: boolean
  data: {
    requests: MaintenanceRequest[]
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
    }
  }
}

interface MaintenanceRequest {
  id: string
  title: string
  description: string
  location: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled' | 'closed' | 'customer_rejected'
  category?: string
  estimatedCost?: number
  actualCost?: number
  estimatedDuration?: number // hours
  actualDuration?: number // hours
  createdBy: {
    id: string
    name: string
    email: string
  }
  assignedTo?: {
    id: string
    name: string
    email: string
  }
  approvedBy?: {
    id: string
    name: string
    email: string
  }
  completedAt?: string
  dueDate?: string
  createdAt: string
  updatedAt: string
  parts?: RequestPart[]
  history?: RequestHistory[]
  // Customer confirmation fields
  customerConfirmationStatus?: 'pending' | 'confirmed' | 'rejected' | 'overridden'
  customerConfirmedAt?: string
  customerRejectedAt?: string
  customerConfirmationComment?: string
  customerRejectionReason?: string
  closedWithoutConfirmation?: boolean
  adminOverrideReason?: string
}
\`\`\`

### 4.2 POST /requests
**Description**: Create new maintenance request

**Request Body**:
\`\`\`typescript
interface CreateRequestBody {
  title: string
  description: string
  location: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  category?: string
  estimatedCost?: number
  estimatedDuration?: number
  dueDate?: string // ISO date
  parts?: {
    partId: string
    quantity: number
    notes?: string
  }[]
}
\`\`\`

**Response**:
\`\`\`typescript
interface CreateRequestResponse {
  success: boolean
  data: {
    request: MaintenanceRequest
  }
}
\`\`\`

### 4.3 GET /requests/:id
**Description**: Get specific maintenance request by ID

**Response**:
\`\`\`typescript
interface RequestDetailResponse {
  success: boolean
  data: {
    request: MaintenanceRequest & {
      parts: RequestPart[]
      history: RequestHistory[]
      assignments: TechnicianAssignment[]
    }
  }
}
\`\`\`

### 4.4 PUT /requests/:id
**Description**: Update maintenance request

**Request Body**:
\`\`\`typescript
interface UpdateRequestBody {
  title?: string
  description?: string
  location?: string
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  status?: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled'
  category?: string
  estimatedCost?: number
  actualCost?: number
  estimatedDuration?: number
  actualDuration?: number
  dueDate?: string
}
\`\`\`

### 4.5 DELETE /requests/:id
**Description**: Delete maintenance request (soft delete)

**Response**:
\`\`\`typescript
interface DeleteResponse {
  success: boolean
  data: {
    message: string
  }
}
\`\`\`

### 4.6 POST /requests/:id/assign
**Description**: Assign technician to request

**Request Body**:
\`\`\`typescript
interface AssignTechnicianBody {
  technicianId: string
  notes?: string
  estimatedStartDate?: string
}
\`\`\`

### 4.7 POST /requests/:id/approve
**Description**: Approve maintenance request (Basma Admin only)

**Request Body**:
\`\`\`typescript
interface ApproveRequestBody {
  notes?: string
  approvedCost?: number
}
\`\`\`

### 4.8 POST /requests/:id/confirm-completion
**Description**: Customer confirms that maintenance work is completed to their satisfaction

**Authentication**: Customer only (must own the request)

**Request Body**:
\`\`\`typescript
interface ConfirmCompletionBody {
  comment?: string  // Optional feedback about the completed work
}
\`\`\`

**Response**:
\`\`\`typescript
interface ConfirmCompletionResponse {
  success: boolean
  data: {
    request: {
      id: string
      status: 'closed'  // Status changes to CLOSED
      customerConfirmationStatus: 'confirmed'
      customerConfirmedAt: string
      customerConfirmationComment?: string
    }
  }
}
\`\`\`

**Status Codes**:
- `200`: Success - request confirmed and closed
- `400`: Bad request - request not in COMPLETED status
- `403`: Forbidden - not the request owner
- `404`: Request not found
- `409`: Conflict - already confirmed

### 4.9 POST /requests/:id/reject-completion
**Description**: Customer rejects completion and reports issues with the work

**Authentication**: Customer only (must own the request)

**Request Body**:
\`\`\`typescript
interface RejectCompletionBody {
  reason: string     // Required reason for rejection
  comment?: string   // Additional comments about issues
}
\`\`\`

**Response**:
\`\`\`typescript
interface RejectCompletionResponse {
  success: boolean
  data: {
    request: {
      id: string
      status: 'customer_rejected'  // Status changes to CUSTOMER_REJECTED
      customerConfirmationStatus: 'rejected'
      customerRejectedAt: string
      customerRejectionReason: string
      customerConfirmationComment?: string
    }
  }
}
\`\`\`

**Status Codes**:
- `200`: Success - rejection recorded
- `400`: Bad request - request not in COMPLETED status
- `403`: Forbidden - not the request owner
- `404`: Request not found
- `409`: Conflict - already confirmed/rejected

### 4.10 GET /requests/:id/confirmation-status
**Description**: Get current customer confirmation status for a request

**Authentication**: Customer (own requests), Technician (assigned), Admin, Super Admin

**Response**:
\`\`\`typescript
interface ConfirmationStatusResponse {
  success: boolean
  data: {
    requestId: string
    status: 'pending' | 'confirmed' | 'rejected'
    completedDate?: string
    daysSinceCompletion?: number
    canConfirm: boolean
    canReject: boolean
    confirmedAt?: string
    rejectedAt?: string
    customerComment?: string
    rejectionReason?: string
    autoConfirmDate?: string  // When request will auto-confirm (3 days after completion)
  }
}
\`\`\`

### 4.11 POST /requests/:id/close-without-confirmation
**Description**: Admin closes request without customer confirmation (override)

**Authentication**: Admin or Super Admin only

**Request Body**:
\`\`\`typescript
interface CloseWithoutConfirmationBody {
  reason: string  // Required reason for override
}
\`\`\`

**Response**:
\`\`\`typescript
interface CloseOverrideResponse {
  success: boolean
  data: {
    request: {
      id: string
      status: 'closed'
      customerConfirmationStatus: 'overridden'
      closedWithoutConfirmation: true
      adminOverrideReason: string
    }
  }
}
\`\`\`

## 5. Technicians APIs

### 5.1 GET /technicians
**Description**: Get paginated list of technicians

**Query Parameters**:
\`\`\`typescript
interface TechniciansQuery {
  page?: number
  limit?: number
  specialization?: string
  status?: 'available' | 'busy' | 'on_leave' | 'inactive'
  skillLevel?: 'junior' | 'intermediate' | 'senior' | 'expert'
  search?: string
  sortBy?: 'name' | 'rating' | 'totalJobs' | 'createdAt'
  sortOrder?: 'asc' | 'desc'
}
\`\`\`

**Response**:
\`\`\`typescript
interface TechniciansResponse {
  success: boolean
  data: {
    technicians: Technician[]
    pagination: PaginationInfo
  }
}

interface Technician {
  id: string
  name: string
  email: string
  phone: string
  specialization: string
  skillLevel: 'junior' | 'intermediate' | 'senior' | 'expert'
  hourlyRate?: number
  status: 'available' | 'busy' | 'on_leave' | 'inactive'
  rating: number
  totalJobs: number
  avatarUrl?: string
  hireDate?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}
\`\`\`

### 5.2 POST /technicians
**Description**: Create new technician

**Request Body**:
\`\`\`typescript
interface CreateTechnicianBody {
  name: string
  email: string
  phone: string
  specialization: string
  skillLevel: 'junior' | 'intermediate' | 'senior' | 'expert'
  hourlyRate?: number
  hireDate?: string
  avatarUrl?: string
}
\`\`\`

### 5.3 GET /technicians/:id
**Description**: Get technician details with assignments

**Response**:
\`\`\`typescript
interface TechnicianDetailResponse {
  success: boolean
  data: {
    technician: Technician & {
      currentAssignments: TechnicianAssignment[]
      recentJobs: TechnicianAssignment[]
      performance: {
        averageRating: number
        completionRate: number
        averageCompletionTime: number
      }
    }
  }
}
\`\`\`

### 5.4 PUT /technicians/:id
**Description**: Update technician information

### 5.5 DELETE /technicians/:id
**Description**: Deactivate technician

### 5.6 GET /technicians/:id/availability
**Description**: Get technician availability for scheduling

**Query Parameters**:
\`\`\`typescript
interface AvailabilityQuery {
  startDate: string // ISO date
  endDate: string // ISO date
}
\`\`\`

**Response**:
\`\`\`typescript
interface AvailabilityResponse {
  success: boolean
  data: {
    availability: {
      date: string
      isAvailable: boolean
      assignments: {
        id: string
        requestTitle: string
        startTime: string
        endTime: string
      }[]
    }[]
  }
}
\`\`\`

## 6. Parts APIs

### 6.1 GET /parts
**Description**: Get paginated list of parts

**Query Parameters**:
\`\`\`typescript
interface PartsQuery {
  page?: number
  limit?: number
  type?: 'internal' | 'external'
  category?: string
  status?: 'active' | 'discontinued' | 'out_of_stock'
  lowStock?: boolean // parts below minimum stock level
  search?: string
  sortBy?: 'name' | 'quantityInStock' | 'unitPrice' | 'createdAt'
  sortOrder?: 'asc' | 'desc'
}
\`\`\`

**Response**:
\`\`\`typescript
interface PartsResponse {
  success: boolean
  data: {
    parts: Part[]
    pagination: PaginationInfo
  }
}

interface Part {
  id: string
  name: string
  description?: string
  partNumber?: string
  category?: string
  type: 'internal' | 'external'
  unitPrice?: number
  quantityInStock: number
  minimumStockLevel: number
  supplierName?: string
  supplierContact?: string
  status: 'active' | 'discontinued' | 'out_of_stock'
  location?: string
  createdAt: string
  updatedAt: string
}
\`\`\`

### 6.2 POST /parts
**Description**: Create new part

**Request Body**:
\`\`\`typescript
interface CreatePartBody {
  name: string
  description?: string
  partNumber?: string
  category?: string
  type: 'internal' | 'external'
  unitPrice?: number
  quantityInStock: number
  minimumStockLevel: number
  supplierName?: string
  supplierContact?: string
  location?: string
}
\`\`\`

### 6.3 PUT /parts/:id/stock
**Description**: Update part stock quantity

**Request Body**:
\`\`\`typescript
interface UpdateStockBody {
  quantity: number
  operation: 'add' | 'subtract' | 'set'
  notes?: string
}
\`\`\`

### 6.4 GET /parts/low-stock
**Description**: Get parts with low stock levels

**Response**:
\`\`\`typescript
interface LowStockResponse {
  success: boolean
  data: {
    parts: (Part & {
      stockPercentage: number
      suggestedOrderQuantity: number
    })[]
  }
}
\`\`\`

## 7. Notifications APIs

### 7.1 GET /notifications
**Description**: Get user notifications

**Query Parameters**:
\`\`\`typescript
interface NotificationsQuery {
  page?: number
  limit?: number
  isRead?: boolean
  type?: 'info' | 'success' | 'warning' | 'error'
  category?: string
}
\`\`\`

**Response**:
\`\`\`typescript
interface NotificationsResponse {
  success: boolean
  data: {
    notifications: Notification[]
    unreadCount: number
    pagination: PaginationInfo
  }
}

interface Notification {
  id: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  category?: string
  referenceId?: string
  referenceType?: string
  isRead: boolean
  readAt?: string
  createdAt: string
}
\`\`\`

### 7.2 PUT /notifications/:id/read
**Description**: Mark notification as read

### 7.3 PUT /notifications/read-all
**Description**: Mark all notifications as read

### 7.4 DELETE /notifications/:id
**Description**: Delete notification

## 8. Reports APIs

### 8.1 GET /reports/dashboard
**Description**: Get dashboard KPIs and statistics

**Query Parameters**:
\`\`\`typescript
interface DashboardQuery {
  period?: 'today' | 'week' | 'month' | 'quarter' | 'year'
  startDate?: string
  endDate?: string
}
\`\`\`

**Response**:
\`\`\`typescript
interface DashboardResponse {
  success: boolean
  data: {
    kpis: {
      totalRequests: number
      pendingRequests: number
      completedRequests: number
      urgentRequests: number
      averageCompletionTime: number
      totalCost: number
      activeTechnicians: number
      lowStockParts: number
    }
    charts: {
      requestsByStatus: { status: string; count: number }[]
      requestsByPriority: { priority: string; count: number }[]
      completionTrend: { date: string; completed: number }[]
      costTrend: { date: string; cost: number }[]
      technicianPerformance: {
        technicianId: string
        name: string
        completedJobs: number
        averageRating: number
      }[]
    }
  }
}
\`\`\`

### 8.2 GET /reports/requests
**Description**: Generate detailed requests report

### 8.3 GET /reports/technicians
**Description**: Generate technician performance report

### 8.4 GET /reports/parts
**Description**: Generate parts usage and inventory report

### 8.5 GET /reports/costs
**Description**: Generate cost analysis report

## 9. WebSocket Events

### 9.1 Connection
\`\`\`typescript
// Client connects with JWT token
const socket = io('ws://localhost:3001', {
  auth: {
    token: 'jwt_token_here'
  }
})
\`\`\`

### 9.2 Events

#### Request Updates
\`\`\`typescript
// Server emits when request status changes
socket.emit('request:updated', {
  requestId: string
  status: string
  assignedTo?: string
  updatedBy: string
})

// Client listens for request updates
socket.on('request:updated', (data) => {
  // Update UI
})
\`\`\`

#### New Notifications
\`\`\`typescript
// Server emits new notification
socket.emit('notification:new', {
  id: string
  title: string
  message: string
  type: string
  userId: string
})
\`\`\`

#### Technician Status
\`\`\`typescript
// Server emits technician status change
socket.emit('technician:status', {
  technicianId: string
  status: string
  updatedBy: string
})
\`\`\`

## 10. Rate Limiting

### 10.1 Rate Limits
- Authentication endpoints: 5 requests per 15 minutes per IP
- General API endpoints: 100 requests per minute per user
- File upload endpoints: 10 requests per minute per user
- Report generation: 5 requests per minute per user

### 10.2 Rate Limit Headers
\`\`\`
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
\`\`\`

## 11. File Upload APIs

### 11.1 POST /upload/avatar
**Description**: Upload user/technician avatar

**Request**: Multipart form data with file field

**Response**:
\`\`\`typescript
interface UploadResponse {
  success: boolean
  data: {
    url: string
    filename: string
    size: number
  }
}
\`\`\`

### 11.2 POST /upload/attachments
**Description**: Upload request attachments

**Limits**:
- Max file size: 10MB
- Allowed types: jpg, jpeg, png, pdf, doc, docx
- Max files per request: 5
\`\`\`

I've created comprehensive PRD documentation for the backend system that covers all aspects needed for junior backend developers to understand and implement the Basma Maintenance Management System. The documentation includes system overview, authentication, database schema, API specifications, and technical requirements with detailed examples and TypeScript interfaces for type safety.
