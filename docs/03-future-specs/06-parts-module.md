# Parts Management Module - Backend Requirements

## 1. Overview
The Parts Module manages inventory for both internal parts (managed by Maintenance Manager) and external parts (managed by Basma Admin) with approval workflows.

## 2. Business Logic

### 2.1 Part Categories
- **Internal Parts**: Managed by Maintenance Manager
  - Basic supplies and consumables
  - Common replacement parts
  - Tools and equipment
- **External Parts**: Managed by Basma Admin
  - Specialized equipment
  - High-value items
  - Vendor-specific parts

### 2.2 Approval Workflow
\`\`\`
Internal: Create → Available
External: Create → Pending → Approved → Available
                         ↓
                     Rejected
\`\`\`

## 3. Data Models

### 3.1 Part Entity
\`\`\`typescript
interface Part {
  id: string
  name: string
  description: string
  partNumber: string
  category: string
  type: 'internal' | 'external'
  status: 'pending' | 'approved' | 'rejected' | 'discontinued'
  currentStock: number
  minStock: number
  maxStock: number
  unitCost: number
  supplier?: string
  supplierPartNumber?: string
  location: string
  lastRestocked?: Date
  createdBy: string
  approvedBy?: string
  createdAt: Date
  updatedAt: Date
}
\`\`\`

### 3.2 Stock Movement
\`\`\`typescript
interface StockMovement {
  id: string
  partId: string
  type: 'in' | 'out' | 'adjustment'
  quantity: number
  reason: string
  requestId?: string
  userId: string
  createdAt: Date
}
\`\`\`

### 3.3 Part Request
\`\`\`typescript
interface PartRequest {
  id: string
  partId: string
  requestId: string
  quantityRequested: number
  quantityAllocated: number
  status: 'pending' | 'allocated' | 'used' | 'returned'
  allocatedBy?: string
  allocatedAt?: Date
  notes?: string
}
\`\`\`

## 4. API Endpoints

### 4.1 Parts CRUD

#### GET /api/parts
\`\`\`typescript
interface GetPartsQuery {
  page?: number
  limit?: number
  type?: 'internal' | 'external'
  category?: string
  status?: string
  lowStock?: boolean
  search?: string
}

interface GetPartsResponse {
  success: boolean
  data: {
    parts: Part[]
    pagination: PaginationInfo
    summary: {
      totalParts: number
      lowStockCount: number
      totalValue: number
      categories: CategorySummary[]
    }
  }
}
\`\`\`

#### POST /api/parts
\`\`\`typescript
interface CreatePartBody {
  name: string
  description: string
  partNumber: string
  category: string
  type: 'internal' | 'external'
  currentStock: number
  minStock: number
  maxStock: number
  unitCost: number
  supplier?: string
  supplierPartNumber?: string
  location: string
}
\`\`\`

### 4.2 Stock Management

#### POST /api/parts/:id/stock
\`\`\`typescript
interface UpdateStockBody {
  type: 'in' | 'out' | 'adjustment'
  quantity: number
  reason: string
  requestId?: string
}
\`\`\`

#### GET /api/parts/:id/movements
\`\`\`typescript
interface GetMovementsResponse {
  success: boolean
  data: {
    movements: StockMovement[]
    summary: {
      totalIn: number
      totalOut: number
      currentStock: number
    }
  }
}
\`\`\`

### 4.3 Part Approval (External Parts)

#### POST /api/parts/:id/approve
\`\`\`typescript
interface ApprovePartBody {
  approved: boolean
  notes?: string
}
\`\`\`

### 4.4 Part Allocation

#### POST /api/parts/allocate
\`\`\`typescript
interface AllocatePartsBody {
  requestId: string
  parts: {
    partId: string
    quantity: number
  }[]
}
\`\`\`

## 5. Business Rules

### 5.1 Stock Management
- Automatic low stock alerts when stock < minStock
- Prevent negative stock levels
- Track all stock movements with audit trail
- Auto-calculate total inventory value

### 5.2 Part Approval
- Internal parts: Auto-approved
- External parts: Require Basma Admin approval
- Rejected parts cannot be used in requests
- Approval notifications to relevant users

### 5.3 Allocation Rules
- Parts must be available (stock > 0)
- Cannot allocate more than current stock
- Allocated parts reserved for specific request
- Auto-return unused allocated parts after 7 days

## 6. Inventory Alerts

### 6.1 Low Stock Alerts
- Daily check for parts below minimum stock
- Email notifications to maintenance manager
- Dashboard indicators for low stock items

### 6.2 Reorder Suggestions
- Calculate optimal reorder quantities
- Consider usage patterns and lead times
- Generate purchase orders for external parts

## 7. Integration Points
- Purchase order system integration
- Supplier catalog integration
- Barcode scanning support
- Mobile inventory management

## 8. Performance Requirements
- Parts list loading: < 300ms
- Stock updates: < 100ms
- Search functionality: < 200ms
- Inventory reports: < 2 seconds
- Support 10,000+ parts in inventory
