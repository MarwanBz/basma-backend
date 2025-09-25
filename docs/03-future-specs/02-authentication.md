# Authentication and Authorization System

## 1. Overview
The authentication system provides secure access control for the Basma Maintenance Management System with role-based permissions and JWT token management.

## 2. Authentication Flow

### 2.1 Login Process
\`\`\`
1. User submits credentials (email/password)
2. Server validates credentials against database
3. Server generates JWT access token (15 minutes expiry)
4. Server generates refresh token (7 days expiry)
5. Server returns both tokens + user profile
6. Client stores tokens securely
\`\`\`

### 2.2 Token Refresh Flow
\`\`\`
1. Access token expires
2. Client sends refresh token to /auth/refresh
3. Server validates refresh token
4. Server generates new access token
5. Server returns new access token
6. Client updates stored token
\`\`\`

## 3. User Roles and Permissions

### 3.1 Role Definitions

#### Maintenance Manager
\`\`\`typescript
interface MaintenanceManagerPermissions {
  requests: {
    create: true
    read: true
    update: true
    delete: true
    assign: true
  }
  technicians: {
    create: true
    read: true
    update: true
    delete: false
    assign: true
  }
  parts: {
    internal: {
      create: true
      read: true
      update: true
      delete: true
    }
    external: {
      create: false
      read: true
      update: false
      delete: false
    }
  }
  users: {
    create: false
    read: true
    update: false
    delete: false
  }
  reports: {
    maintenance: true
    analytics: true
    export: true
  }
}
\`\`\`

#### Basma Admin
\`\`\`typescript
interface BasmaAdminPermissions {
  requests: {
    create: true
    read: true
    update: true
    delete: true
    approve: true
  }
  technicians: {
    create: true
    read: true
    update: true
    delete: true
    assign: true
  }
  parts: {
    internal: {
      create: true
      read: true
      update: true
      delete: true
    }
    external: {
      create: true
      read: true
      update: true
      delete: true
      approve: true
    }
  }
  users: {
    create: true
    read: true
    update: true
    delete: true
    manageRoles: true
  }
  reports: {
    maintenance: true
    analytics: true
    financial: true
    audit: true
    export: true
  }
  settings: {
    system: true
    security: true
    integrations: true
  }
}
\`\`\`

## 4. API Endpoints

### 4.1 Authentication Endpoints

#### POST /api/auth/login
\`\`\`typescript
interface LoginRequest {
  email: string
  password: string
}

interface LoginResponse {
  success: boolean
  data: {
    user: {
      id: string
      email: string
      name: string
      role: 'maintenance_manager' | 'basma_admin'
      permissions: Permission[]
    }
    tokens: {
      accessToken: string
      refreshToken: string
    }
  }
}
\`\`\`

#### POST /api/auth/refresh
\`\`\`typescript
interface RefreshRequest {
  refreshToken: string
}

interface RefreshResponse {
  success: boolean
  data: {
    accessToken: string
  }
}
\`\`\`

#### POST /api/auth/logout
\`\`\`typescript
interface LogoutRequest {
  refreshToken: string
}

interface LogoutResponse {
  success: boolean
  message: string
}
\`\`\`

### 4.2 Profile Management

#### GET /api/auth/profile
\`\`\`typescript
interface ProfileResponse {
  success: boolean
  data: {
    id: string
    email: string
    name: string
    role: string
    permissions: Permission[]
    lastLogin: string
    createdAt: string
  }
}
\`\`\`

#### PUT /api/auth/profile
\`\`\`typescript
interface UpdateProfileRequest {
  name?: string
  email?: string
  currentPassword?: string
  newPassword?: string
}
\`\`\`

## 5. Middleware Implementation

### 5.1 Authentication Middleware
\`\`\`typescript
export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) {
    return res.status(401).json({ error: 'Access token required' })
  }

  jwt.verify(token, process.env.JWT_SECRET!, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' })
    }
    req.user = user
    next()
  })
}
\`\`\`

### 5.2 Authorization Middleware
\`\`\`typescript
export const requirePermission = (resource: string, action: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user
    const hasPermission = checkUserPermission(user, resource, action)
    
    if (!hasPermission) {
      return res.status(403).json({ error: 'Insufficient permissions' })
    }
    
    next()
  }
}
\`\`\`

## 6. Security Considerations

### 6.1 Password Security
- Minimum 8 characters
- Must include uppercase, lowercase, number
- Bcrypt hashing with salt rounds: 12
- Password history (prevent reuse of last 5 passwords)

### 6.2 Token Security
- JWT secret rotation capability
- Refresh token blacklisting on logout
- Token expiry enforcement
- Secure HTTP-only cookies for refresh tokens

### 6.3 Rate Limiting
- Login attempts: 5 per 15 minutes per IP
- API requests: 100 per minute per user
- Password reset: 3 per hour per email

### 6.4 Session Management
- Concurrent session limit: 3 per user
- Automatic logout after 24 hours of inactivity
- Device tracking and management
