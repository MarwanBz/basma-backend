# Technicians Management Module - Backend Requirements

## 1. Overview
The Technicians Module manages technician profiles, skills, availability, performance tracking, and assignment optimization for the maintenance management system.

## 2. Data Models

### 2.1 Technician Entity
\`\`\`typescript
interface Technician {
  id: string
  employeeId: string
  name: string
  email: string
  phone: string
  status: 'active' | 'inactive' | 'on_leave'
  hireDate: Date
  department: string
  position: string
  hourlyRate: number
  skills: TechnicianSkill[]
  availability: TechnicianAvailability[]
  performance: PerformanceMetrics
  createdAt: Date
  updatedAt: Date
}
\`\`\`

### 2.2 Technician Skills
\`\`\`typescript
interface TechnicianSkill {
  id: string
  technicianId: string
  skillName: string
  proficiencyLevel: 1 | 2 | 3 | 4 | 5 // 1=Beginner, 5=Expert
  certificationDate?: Date
  expiryDate?: Date
  certifiedBy?: string
}
\`\`\`

### 2.3 Availability
\`\`\`typescript
interface TechnicianAvailability {
  id: string
  technicianId: string
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6 // 0=Sunday
  startTime: string // HH:mm format
  endTime: string
  isAvailable: boolean
  effectiveFrom: Date
  effectiveTo?: Date
}
\`\`\`

### 2.4 Performance Metrics
\`\`\`typescript
interface PerformanceMetrics {
  technicianId: string
  period: string // YYYY-MM format
  requestsCompleted: number
  averageCompletionTime: number // in hours
  customerRating: number // 1-5 scale
  onTimeCompletion: number // percentage
  costEfficiency: number // actual vs estimated cost ratio
  skillUtilization: number // percentage
  updatedAt: Date
}
\`\`\`

## 3. API Endpoints

### 3.1 Technician CRUD

#### GET /api/technicians
\`\`\`typescript
interface GetTechniciansQuery {
  page?: number
  limit?: number
  status?: 'active' | 'inactive' | 'on_leave'
  department?: string
  skill?: string
  available?: boolean
  search?: string
}

interface GetTechniciansResponse {
  success: boolean
  data: {
    technicians: Technician[]
    pagination: PaginationInfo
    summary: {
      totalActive: number
      totalOnLeave: number
      averageRating: number
      skillDistribution: SkillDistribution[]
    }
  }
}
\`\`\`

#### POST /api/technicians
\`\`\`typescript
interface CreateTechnicianBody {
  employeeId: string
  name: string
  email: string
  phone: string
  department: string
  position: string
  hourlyRate: number
  hireDate: string
  skills?: {
    skillName: string
    proficiencyLevel: number
    certificationDate?: string
    expiryDate?: string
  }[]
}
\`\`\`

### 3.2 Skills Management

#### POST /api/technicians/:id/skills
\`\`\`typescript
interface AddSkillBody {
  skillName: string
  proficiencyLevel: number
  certificationDate?: string
  expiryDate?: string
  certifiedBy?: string
}
\`\`\`

#### PUT /api/technicians/:id/skills/:skillId
\`\`\`typescript
interface UpdateSkillBody {
  proficiencyLevel?: number
  certificationDate?: string
  expiryDate?: string
}
\`\`\`

### 3.3 Availability Management

#### GET /api/technicians/:id/availability
\`\`\`typescript
interface GetAvailabilityResponse {
  success: boolean
  data: {
    availability: TechnicianAvailability[]
    currentWeekSchedule: WeeklySchedule
    upcomingAssignments: Assignment[]
  }
}
\`\`\`

#### POST /api/technicians/:id/availability
\`\`\`typescript
interface SetAvailabilityBody {
  schedule: {
    dayOfWeek: number
    startTime: string
    endTime: string
    isAvailable: boolean
  }[]
  effectiveFrom: string
  effectiveTo?: string
}
\`\`\`

### 3.4 Assignment Optimization

#### POST /api/technicians/assign-optimal
\`\`\`typescript
interface OptimalAssignmentRequest {
  requestId: string
  requiredSkills?: string[]
  preferredDate?: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
}

interface OptimalAssignmentResponse {
  success: boolean
  data: {
    recommendedTechnicians: {
      technicianId: string
      name: string
      matchScore: number
      availability: string
      estimatedStartTime: string
      reasons: string[]
    }[]
  }
}
\`\`\`

### 3.5 Performance Tracking

#### GET /api/technicians/:id/performance
\`\`\`typescript
interface GetPerformanceQuery {
  period?: string // YYYY-MM or YYYY
  metric?: 'completion_time' | 'rating' | 'efficiency'
}

interface GetPerformanceResponse {
  success: boolean
  data: {
    currentPeriod: PerformanceMetrics
    historicalData: PerformanceMetrics[]
    trends: {
      completionTime: TrendData
      customerRating: TrendData
      efficiency: TrendData
    }
    ranking: {
      position: number
      totalTechnicians: number
      percentile: number
    }
  }
}
\`\`\`

## 4. Business Logic

### 4.1 Assignment Algorithm
\`\`\`typescript
interface AssignmentCriteria {
  skillMatch: number // 40% weight
  availability: number // 30% weight
  workload: number // 20% weight
  performance: number // 10% weight
}

// Scoring algorithm
function calculateAssignmentScore(
  technician: Technician,
  request: MaintenanceRequest
): number {
  const skillScore = calculateSkillMatch(technician.skills, request.requiredSkills)
  const availabilityScore = calculateAvailability(technician.id, request.scheduledDate)
  const workloadScore = calculateWorkload(technician.id)
  const performanceScore = technician.performance.customerRating / 5
  
  return (
    skillScore * 0.4 +
    availabilityScore * 0.3 +
    workloadScore * 0.2 +
    performanceScore * 0.1
  )
}
\`\`\`

### 4.2 Workload Management
- Maximum 5 active requests per technician
- Consider estimated duration for scheduling
- Balance workload across team
- Priority requests override normal limits

### 4.3 Skill Matching
- Exact skill match gets highest score
- Related skills get partial score
- Proficiency level affects matching score
- Certification requirements for specific tasks

## 5. Performance Calculations

### 5.1 Metrics Calculation
\`\`\`typescript
// Calculate monthly performance metrics
async function calculatePerformanceMetrics(
  technicianId: string,
  period: string
): Promise<PerformanceMetrics> {
  const requests = await getCompletedRequests(technicianId, period)
  
  return {
    technicianId,
    period,
    requestsCompleted: requests.length,
    averageCompletionTime: calculateAverageTime(requests),
    customerRating: calculateAverageRating(requests),
    onTimeCompletion: calculateOnTimePercentage(requests),
    costEfficiency: calculateCostEfficiency(requests),
    skillUtilization: calculateSkillUtilization(requests),
    updatedAt: new Date()
  }
}
\`\`\`

### 5.2 Ranking System
- Monthly performance rankings
- Department-wise comparisons
- Skill-based rankings
- Overall efficiency scores

## 6. Notifications

### 6.1 Assignment Notifications
- New request assigned
- Request priority changed
- Schedule conflicts detected

### 6.2 Performance Notifications
- Monthly performance reports
- Certification expiry alerts
- Training recommendations

### 6.3 Availability Notifications
- Schedule change confirmations
- Overtime alerts
- Leave request approvals

## 7. Integration Points
- HR system for employee data
- Training management system
- Certification tracking system
- Mobile app for technicians
- Calendar integration

## 8. Validation Rules
- Employee ID must be unique
- Email must be valid and unique
- Phone number format validation
- Hourly rate must be positive
- Skill proficiency level 1-5
- Availability times must be valid
