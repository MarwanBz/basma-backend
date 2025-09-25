# Database Schema Design

## 1. Overview
The database schema is designed for PostgreSQL with Prisma ORM, supporting the complete maintenance management system with proper relationships, indexes, and constraints.

## 2. Core Tables

### 2.1 Users Table
\`\`\`sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('maintenance_manager', 'basma_admin')),
  phone VARCHAR(20),
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMP,
  password_changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_active ON users(is_active);
\`\`\`

### 2.2 Refresh Tokens Table
\`\`\`sql
CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  is_revoked BOOLEAN DEFAULT false,
  device_info JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
\`\`\`

### 2.3 Maintenance Requests Table
\`\`\`sql
CREATE TABLE maintenance_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  location VARCHAR(255) NOT NULL,
  priority VARCHAR(20) NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status VARCHAR(30) NOT NULL CHECK (status IN ('pending', 'assigned', 'in_progress', 'completed', 'cancelled')),
  category VARCHAR(100),
  estimated_cost DECIMAL(10,2),
  actual_cost DECIMAL(10,2),
  estimated_duration INTEGER, -- in hours
  actual_duration INTEGER, -- in hours
  created_by UUID NOT NULL REFERENCES users(id),
  assigned_to UUID REFERENCES users(id),
  approved_by UUID REFERENCES users(id),
  completed_at TIMESTAMP,
  due_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_requests_status ON maintenance_requests(status);
CREATE INDEX idx_requests_priority ON maintenance_requests(priority);
CREATE INDEX idx_requests_assigned_to ON maintenance_requests(assigned_to);
CREATE INDEX idx_requests_created_by ON maintenance_requests(created_by);
CREATE INDEX idx_requests_due_date ON maintenance_requests(due_date);
\`\`\`

### 2.4 Technicians Table
\`\`\`sql
CREATE TABLE technicians (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20) NOT NULL,
  specialization VARCHAR(100) NOT NULL,
  skill_level VARCHAR(20) CHECK (skill_level IN ('junior', 'intermediate', 'senior', 'expert')),
  hourly_rate DECIMAL(8,2),
  status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'busy', 'on_leave', 'inactive')),
  rating DECIMAL(3,2) DEFAULT 0.00 CHECK (rating >= 0 AND rating <= 5),
  total_jobs INTEGER DEFAULT 0,
  avatar_url TEXT,
  hire_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_technicians_specialization ON technicians(specialization);
CREATE INDEX idx_technicians_status ON technicians(status);
CREATE INDEX idx_technicians_rating ON technicians(rating);
\`\`\`

### 2.5 Parts Table
\`\`\`sql
CREATE TABLE parts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  part_number VARCHAR(100) UNIQUE,
  category VARCHAR(100),
  type VARCHAR(20) NOT NULL CHECK (type IN ('internal', 'external')),
  unit_price DECIMAL(10,2),
  quantity_in_stock INTEGER DEFAULT 0,
  minimum_stock_level INTEGER DEFAULT 0,
  supplier_name VARCHAR(255),
  supplier_contact TEXT,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'discontinued', 'out_of_stock')),
  location VARCHAR(255), -- storage location
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_parts_type ON parts(type);
CREATE INDEX idx_parts_category ON parts(category);
CREATE INDEX idx_parts_status ON parts(status);
CREATE INDEX idx_parts_stock_level ON parts(quantity_in_stock);
\`\`\`

### 2.6 Request Parts Table (Many-to-Many)
\`\`\`sql
CREATE TABLE request_parts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES maintenance_requests(id) ON DELETE CASCADE,
  part_id UUID NOT NULL REFERENCES parts(id),
  quantity_requested INTEGER NOT NULL,
  quantity_used INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'delivered', 'used')),
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_request_parts_request_id ON request_parts(request_id);
CREATE INDEX idx_request_parts_part_id ON request_parts(part_id);
CREATE INDEX idx_request_parts_status ON request_parts(status);
\`\`\`

### 2.7 Notifications Table
\`\`\`sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('info', 'success', 'warning', 'error')),
  category VARCHAR(50), -- 'request', 'part', 'technician', 'system'
  reference_id UUID, -- ID of related entity
  reference_type VARCHAR(50), -- 'request', 'part', 'technician'
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);
\`\`\`

### 2.8 Request History Table
\`\`\`sql
CREATE TABLE request_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES maintenance_requests(id) ON DELETE CASCADE,
  changed_by UUID NOT NULL REFERENCES users(id),
  action VARCHAR(50) NOT NULL, -- 'created', 'updated', 'assigned', 'completed', etc.
  field_name VARCHAR(100), -- which field was changed
  old_value TEXT,
  new_value TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_request_history_request_id ON request_history(request_id);
CREATE INDEX idx_request_history_created_at ON request_history(created_at);
\`\`\`

### 2.9 Technician Assignments Table
\`\`\`sql
CREATE TABLE technician_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES maintenance_requests(id) ON DELETE CASCADE,
  technician_id UUID NOT NULL REFERENCES technicians(id),
  assigned_by UUID NOT NULL REFERENCES users(id),
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  status VARCHAR(20) DEFAULT 'assigned' CHECK (status IN ('assigned', 'started', 'completed', 'cancelled')),
  notes TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  feedback TEXT
);

CREATE INDEX idx_assignments_request_id ON technician_assignments(request_id);
CREATE INDEX idx_assignments_technician_id ON technician_assignments(technician_id);
CREATE INDEX idx_assignments_status ON technician_assignments(status);
\`\`\`

## 3. Prisma Schema

\`\`\`prisma
// This is your Prisma schema file,
// learn more about it in the docs: https://pris.ly/d/prisma-schema

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id                String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  email             String    @unique @db.VarChar(255)
  passwordHash      String    @map("password_hash") @db.VarChar(255)
  name              String    @db.VarChar(255)
  role              UserRole
  phone             String?   @db.VarChar(20)
  avatarUrl         String?   @map("avatar_url")
  isActive          Boolean   @default(true) @map("is_active")
  lastLogin         DateTime? @map("last_login")
  passwordChangedAt DateTime  @default(now()) @map("password_changed_at")
  createdAt         DateTime  @default(now()) @map("created_at")
  updatedAt         DateTime  @updatedAt @map("updated_at")

  // Relations
  refreshTokens         RefreshToken[]
  createdRequests       MaintenanceRequest[] @relation("CreatedBy")
  assignedRequests      MaintenanceRequest[] @relation("AssignedTo")
  approvedRequests      MaintenanceRequest[] @relation("ApprovedBy")
  notifications         Notification[]
  requestHistory        RequestHistory[]
  technicianAssignments TechnicianAssignment[] @relation("AssignedBy")
  approvedParts         RequestPart[]          @relation("ApprovedBy")

  @@map("users")
}

model RefreshToken {
  id         String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId     String    @map("user_id") @db.Uuid
  tokenHash  String    @map("token_hash") @db.VarChar(255)
  expiresAt  DateTime  @map("expires_at")
  isRevoked  Boolean   @default(false) @map("is_revoked")
  deviceInfo Json?     @map("device_info")
  createdAt  DateTime  @default(now()) @map("created_at")

  // Relations
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("refresh_tokens")
}

model MaintenanceRequest {
  id               String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  title            String    @db.VarChar(255)
  description      String
  location         String    @db.VarChar(255)
  priority         Priority
  status           RequestStatus
  category         String?   @db.VarChar(100)
  estimatedCost    Decimal?  @map("estimated_cost") @db.Decimal(10, 2)
  actualCost       Decimal?  @map("actual_cost") @db.Decimal(10, 2)
  estimatedDuration Int?     @map("estimated_duration")
  actualDuration   Int?      @map("actual_duration")
  createdBy        String    @map("created_by") @db.Uuid
  assignedTo       String?   @map("assigned_to") @db.Uuid
  approvedBy       String?   @map("approved_by") @db.Uuid
  completedAt      DateTime? @map("completed_at")
  dueDate          DateTime? @map("due_date")
  createdAt        DateTime  @default(now()) @map("created_at")
  updatedAt        DateTime  @updatedAt @map("updated_at")

  // Relations
  creator              User                   @relation("CreatedBy", fields: [createdBy], references: [id])
  assignee             User?                  @relation("AssignedTo", fields: [assignedTo], references: [id])
  approver             User?                  @relation("ApprovedBy", fields: [approvedBy], references: [id])
  parts                RequestPart[]
  history              RequestHistory[]
  technicianAssignments TechnicianAssignment[]

  @@map("maintenance_requests")
}

model Technician {
  id            String      @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  name          String      @db.VarChar(255)
  email         String      @unique @db.VarChar(255)
  phone         String      @db.VarChar(20)
  specialization String     @db.VarChar(100)
  skillLevel    SkillLevel? @map("skill_level")
  hourlyRate    Decimal?    @map("hourly_rate") @db.Decimal(8, 2)
  status        TechnicianStatus @default(AVAILABLE)
  rating        Decimal     @default(0.00) @db.Decimal(3, 2)
  totalJobs     Int         @default(0) @map("total_jobs")
  avatarUrl     String?     @map("avatar_url")
  hireDate      DateTime?   @map("hire_date") @db.Date
  isActive      Boolean     @default(true) @map("is_active")
  createdAt     DateTime    @default(now()) @map("created_at")
  updatedAt     DateTime    @updatedAt @map("updated_at")

  // Relations
  assignments TechnicianAssignment[]

  @@map("technicians")
}

model Part {
  id                 String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  name               String    @db.VarChar(255)
  description        String?
  partNumber         String?   @unique @map("part_number") @db.VarChar(100)
  category           String?   @db.VarChar(100)
  type               PartType
  unitPrice          Decimal?  @map("unit_price") @db.Decimal(10, 2)
  quantityInStock    Int       @default(0) @map("quantity_in_stock")
  minimumStockLevel  Int       @default(0) @map("minimum_stock_level")
  supplierName       String?   @map("supplier_name") @db.VarChar(255)
  supplierContact    String?   @map("supplier_contact")
  status             PartStatus @default(ACTIVE)
  location           String?   @db.VarChar(255)
  createdAt          DateTime  @default(now()) @map("created_at")
  updatedAt          DateTime  @updatedAt @map("updated_at")

  // Relations
  requestParts RequestPart[]

  @@map("parts")
}

model RequestPart {
  id                String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  requestId         String    @map("request_id") @db.Uuid
  partId            String    @map("part_id") @db.Uuid
  quantityRequested Int       @map("quantity_requested")
  quantityUsed      Int       @default(0) @map("quantity_used")
  status            RequestPartStatus @default(PENDING)
  approvedBy        String?   @map("approved_by") @db.Uuid
  approvedAt        DateTime? @map("approved_at")
  notes             String?
  createdAt         DateTime  @default(now()) @map("created_at")

  // Relations
  request   MaintenanceRequest @relation(fields: [requestId], references: [id], onDelete: Cascade)
  part      Part               @relation(fields: [partId], references: [id])
  approver  User?              @relation("ApprovedBy", fields: [approvedBy], references: [id])

  @@map("request_parts")
}

model Notification {
  id            String           @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId        String           @map("user_id") @db.Uuid
  title         String           @db.VarChar(255)
  message       String
  type          NotificationType
  category      String?          @db.VarChar(50)
  referenceId   String?          @map("reference_id") @db.Uuid
  referenceType String?          @map("reference_type") @db.VarChar(50)
  isRead        Boolean          @default(false) @map("is_read")
  readAt        DateTime?        @map("read_at")
  createdAt     DateTime         @default(now()) @map("created_at")

  // Relations
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("notifications")
}

model RequestHistory {
  id        String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  requestId String   @map("request_id") @db.Uuid
  changedBy String   @map("changed_by") @db.Uuid
  action    String   @db.VarChar(50)
  fieldName String?  @map("field_name") @db.VarChar(100)
  oldValue  String?  @map("old_value")
  newValue  String?  @map("new_value")
  notes     String?
  createdAt DateTime @default(now()) @map("created_at")

  // Relations
  request   MaintenanceRequest @relation(fields: [requestId], references: [id], onDelete: Cascade)
  changedBy User               @relation(fields: [changedBy], references: [id])

  @@map("request_history")
}

model TechnicianAssignment {
  id           String                @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  requestId    String                @map("request_id") @db.Uuid
  technicianId String                @map("technician_id") @db.Uuid
  assignedBy   String                @map("assigned_by") @db.Uuid
  assignedAt   DateTime              @default(now()) @map("assigned_at")
  startedAt    DateTime?             @map("started_at")
  completedAt  DateTime?             @map("completed_at")
  status       AssignmentStatus      @default(ASSIGNED)
  notes        String?
  rating       Int?
  feedback     String?

  // Relations
  request    MaintenanceRequest @relation(fields: [requestId], references: [id], onDelete: Cascade)
  technician Technician         @relation(fields: [technicianId], references: [id])
  assigner   User               @relation("AssignedBy", fields: [assignedBy], references: [id])

  @@map("technician_assignments")
}

// Enums
enum UserRole {
  MAINTENANCE_MANAGER @map("maintenance_manager")
  BASMA_ADMIN        @map("basma_admin")
}

enum Priority {
  LOW    @map("low")
  MEDIUM @map("medium")
  HIGH   @map("high")
  URGENT @map("urgent")
}

enum RequestStatus {
  PENDING     @map("pending")
  ASSIGNED    @map("assigned")
  IN_PROGRESS @map("in_progress")
  COMPLETED   @map("completed")
  CANCELLED   @map("cancelled")
}

enum SkillLevel {
  JUNIOR       @map("junior")
  INTERMEDIATE @map("intermediate")
  SENIOR       @map("senior")
  EXPERT       @map("expert")
}

enum TechnicianStatus {
  AVAILABLE @map("available")
  BUSY      @map("busy")
  ON_LEAVE  @map("on_leave")
  INACTIVE  @map("inactive")
}

enum PartType {
  INTERNAL @map("internal")
  EXTERNAL @map("external")
}

enum PartStatus {
  ACTIVE        @map("active")
  DISCONTINUED  @map("discontinued")
  OUT_OF_STOCK  @map("out_of_stock")
}

enum RequestPartStatus {
  PENDING   @map("pending")
  APPROVED  @map("approved")
  REJECTED  @map("rejected")
  DELIVERED @map("delivered")
  USED      @map("used")
}

enum NotificationType {
  INFO    @map("info")
  SUCCESS @map("success")
  WARNING @map("warning")
  ERROR   @map("error")
}

enum AssignmentStatus {
  ASSIGNED  @map("assigned")
  STARTED   @map("started")
  COMPLETED @map("completed")
  CANCELLED @map("cancelled")
}
\`\`\`

## 4. Database Indexes and Performance

### 4.1 Critical Indexes
\`\`\`sql
-- Performance critical indexes
CREATE INDEX CONCURRENTLY idx_requests_status_priority ON maintenance_requests(status, priority);
CREATE INDEX CONCURRENTLY idx_requests_due_date_status ON maintenance_requests(due_date, status) WHERE status != 'completed';
CREATE INDEX CONCURRENTLY idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX CONCURRENTLY idx_parts_low_stock ON parts(quantity_in_stock, minimum_stock_level) WHERE quantity_in_stock <= minimum_stock_level;
\`\`\`

### 4.2 Full-Text Search
\`\`\`sql
-- Add full-text search capabilities
ALTER TABLE maintenance_requests ADD COLUMN search_vector tsvector;
CREATE INDEX idx_requests_search ON maintenance_requests USING gin(search_vector);

-- Update trigger for search vector
CREATE OR REPLACE FUNCTION update_request_search_vector()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector('english', COALESCE(NEW.title, '') || ' ' || COALESCE(NEW.description, '') || ' ' || COALESCE(NEW.location, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_request_search_trigger
  BEFORE INSERT OR UPDATE ON maintenance_requests
  FOR EACH ROW EXECUTE FUNCTION update_request_search_vector();
\`\`\`

## 5. Data Migration and Seeding

### 5.1 Initial Data Setup
\`\`\`sql
-- Insert default admin user
INSERT INTO users (email, password_hash, name, role) VALUES 
('admin@basma.com', '$2b$12$hash_here', 'System Administrator', 'basma_admin');

-- Insert sample technicians
INSERT INTO technicians (name, email, phone, specialization, skill_level) VALUES 
('أحمد محمد', 'ahmed@basma.com', '+966501234567', 'كهرباء', 'senior'),
('سارة أحمد', 'sara@basma.com', '+966501234568', 'سباكة', 'intermediate'),
('محمد علي', 'mohammed@basma.com', '+966501234569', 'تكييف', 'expert');

-- Insert sample parts
INSERT INTO parts (name, description, part_number, category, type, unit_price, quantity_in_stock) VALUES 
('مفتاح كهربائي', 'مفتاح كهربائي عادي', 'ELE001', 'كهرباء', 'internal', 25.00, 100),
('أنبوب PVC', 'أنبوب بلاستيك للسباكة', 'PLU001', 'سباكة', 'internal', 15.50, 50);
