# 🔄 Request Flow Diagram

## Overview

This diagram shows how a typical HTTP request flows through the Basma Backend system, from the client to the database and back.

## Complete Request Flow

```mermaid
sequenceDiagram
    participant Client as 🌐 Client
    participant LB as ⚖️ Load Balancer
    participant MW as 🛡️ Middleware
    participant Router as 🛣️ Router
    participant Controller as 🎮 Controller
    participant Service as ⚙️ Service
    participant Prisma as 🔗 Prisma ORM
    participant DB as 🗄️ Database
    participant Cache as ⚡ Cache
    participant Monitor as 📊 Monitor

    Note over Client,Monitor: 1. Request Initiation
    Client->>LB: HTTP Request (POST /api/auth/login)
    Note over LB: Distributes traffic & rate limiting

    Note over Client,Monitor: 2. Security & Middleware Processing
    LB->>MW: Forward request
    MW->>MW: Security headers (Helmet)
    MW->>MW: CORS validation
    MW->>MW: Request ID generation
    MW->>MW: Logging middleware
    MW->>MW: Performance monitoring
    MW->>MW: Compression

    Note over Client,Monitor: 3. Routing & Authentication
    MW->>Router: Processed request
    Router->>Router: Route matching (/api/auth/*)
    Router->>Router: Authentication check
    Router->>Router: Rate limiting validation

    Note over Client,Monitor: 4. Controller Processing
    Router->>Controller: Authorized request
    Controller->>Controller: Input validation (Zod)
    Controller->>Controller: Business logic preparation

    Note over Client,Monitor: 5. Service Layer Execution
    Controller->>Service: Call service method
    Service->>Service: Business logic processing
    Service->>Service: Data transformation

    Note over Client,Monitor: 6. Database Operations
    Service->>Prisma: Database query
    Prisma->>DB: SQL query execution
    DB-->>Prisma: Query results
    Prisma-->>Service: Formatted data

    Note over Client,Monitor: 7. Caching (if applicable)
    Service->>Cache: Check cache
    Cache-->>Service: Cache result (hit/miss)

    Note over Client,Monitor: 8. Response Generation
    Service-->>Controller: Processed data
    Controller->>Controller: Response formatting
    Controller->>Controller: Error handling

    Note over Client,Monitor: 9. Monitoring & Logging
    Controller->>Monitor: Log request completion
    Monitor->>Monitor: Update metrics
    Monitor->>Monitor: Performance tracking

    Note over Client,Monitor: 10. Response Delivery
    Controller-->>Router: HTTP response
    Router-->>MW: Response with headers
    MW-->>LB: Final response
    LB-->>Client: JSON response

    Note over Client,Monitor: Request completed successfully
```

## Detailed Flow Breakdown

### 1. 🌐 Request Initiation

- **Client** sends HTTP request (e.g., POST /api/auth/login)
- **Load Balancer** receives and distributes the request
- **Rate Limiting** checks if request is within limits

### 2. 🛡️ Security & Middleware Processing

- **Security Headers**: Helmet.js adds security headers
- **CORS**: Validates cross-origin requests
- **Request ID**: Generates unique request identifier
- **Logging**: Records request details
- **Performance**: Tracks request timing
- **Compression**: Compresses response if needed

### 3. 🛣️ Routing & Authentication

- **Route Matching**: Finds the correct route handler
- **Authentication**: Validates JWT token (if required)
- **Rate Limiting**: Checks endpoint-specific limits
- **Validation**: Validates request parameters

### 4. 🎮 Controller Processing

- **Input Validation**: Zod schema validation
- **Business Logic**: Prepares data for service layer
- **Error Handling**: Catches and formats errors

### 5. ⚙️ Service Layer Execution

- **Business Logic**: Core application logic
- **Data Processing**: Transforms and validates data
- **External Services**: Calls email, WebSocket services

### 6. 🗄️ Database Operations

- **Prisma ORM**: Type-safe database queries
- **MySQL**: Executes SQL queries
- **Connection Pooling**: Manages database connections
- **Transaction Management**: Ensures data consistency

### 7. ⚡ Caching (Optional)

- **Cache Check**: Looks for cached data
- **Cache Update**: Updates cache with new data
- **Performance**: Reduces database load

### 8. 📊 Monitoring & Logging

- **Metrics**: Updates Prometheus metrics
- **Logging**: Records request completion
- **Performance**: Tracks response times
- **Error Tracking**: Monitors for errors

### 9. 🔄 Response Generation

- **Data Formatting**: Structures response data
- **Error Handling**: Formats error responses
- **Status Codes**: Sets appropriate HTTP status

### 10. 📤 Response Delivery

- **Headers**: Adds response headers
- **Compression**: Compresses response if needed
- **Client**: Delivers final response to client

## Request Types & Examples

### 🔐 Authentication Request

```
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "password123"
}
```

### 👤 User Management Request

```
GET /api/users
Authorization: Bearer <jwt-token>
```

### 👑 Admin Request

```
POST /api/super-admin/users
Authorization: Bearer <jwt-token>
{
  "name": "New User",
  "email": "newuser@example.com",
  "role": "TECHNICIAN"
}
```

### 📊 Monitoring Request

```
GET /api/monitoring/health
```

## Error Handling Flow

```mermaid
graph TD
    A[Request Received] --> B{Validation Pass?}
    B -->|No| C[400 Bad Request]
    B -->|Yes| D{Authentication Pass?}
    D -->|No| E[401 Unauthorized]
    D -->|Yes| F{Authorization Pass?}
    F -->|No| G[403 Forbidden]
    F -->|Yes| H{Service Success?}
    H -->|No| I[500 Internal Error]
    H -->|Yes| J[200 Success]

    C --> K[Error Response]
    E --> K
    G --> K
    I --> K
    J --> L[Success Response]

    style A fill:#e3f2fd,stroke:#1976d2,stroke-width:2px,color:#000
    style C fill:#ffebee,stroke:#c62828,stroke-width:2px,color:#000
    style E fill:#fff3e0,stroke:#f57c00,stroke-width:2px,color:#000
    style G fill:#fce4ec,stroke:#c2185b,stroke-width:2px,color:#000
    style I fill:#ffebee,stroke:#c62828,stroke-width:2px,color:#000
    style J fill:#e8f5e8,stroke:#388e3c,stroke-width:2px,color:#000
    style K fill:#ffebee,stroke:#c62828,stroke-width:2px,color:#000
    style L fill:#e8f5e8,stroke:#388e3c,stroke-width:2px,color:#000
```

## Performance Optimizations

### ⚡ Caching Strategy

- **User Data**: Cached for 5 minutes
- **System Stats**: Cached for 1 minute
- **Health Checks**: No caching (real-time)

### 🔄 Connection Pooling

- **Database**: Prisma connection pooling
- **Redis**: Connection reuse
- **HTTP**: Keep-alive connections

### 📊 Monitoring Points

- **Request Duration**: Track response times
- **Error Rates**: Monitor failure rates
- **Memory Usage**: Track memory consumption
- **Database Queries**: Monitor query performance

## Security Checkpoints

1. **Rate Limiting**: Prevents abuse
2. **CORS**: Validates origins
3. **Authentication**: JWT token validation
4. **Authorization**: Role-based access control
5. **Input Validation**: Zod schema validation
6. **SQL Injection**: Prisma ORM protection
7. **XSS Protection**: Input sanitization
8. **CSRF Protection**: Token validation
