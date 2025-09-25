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

### 2.4 Error Codes
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

## 3. Authentication APIs

### 3.1 POST /auth/login
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

### 3.2 POST /auth/refresh
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

### 3.3 POST /auth/logout
**Description**: Logout user and invalidate refresh token

**Request Body**:
\`\`\`typescript
interface LogoutRequest {
  refreshToken: string
}
\`\`\`

## 4. Maintenance Requests APIs

### 4.1 GET /requests
**Description**: Get paginated list of maintenance requests

**Query Parameters**:
\`\`\`typescript
interface RequestsQuery {
  page?: number // default: 1
  limit?: number // default: 20, max: 100
  status?: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled'
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  assignedTo?: string // technician ID
  search?: string // search in title, description, location
  sortBy?: 'createdAt' | 'updatedAt' | 'dueDate' | 'priority'
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
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled'
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
