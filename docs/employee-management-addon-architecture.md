# RestroFlow Employee Management Add-on Architecture

## Overview

The Employee Management Add-on extends RestroFlow's core inventory system with comprehensive HR capabilities including scheduling, task management, team messaging, performance tracking, and payroll integration. Designed as a modular add-on to maintain system performance and allow selective feature adoption.

## Business Model

### Pricing Strategy
- **Core RestroFlow**: $179/month (inventory, OCR, analytics)
- **Employee Management Add-on**: $79/month per location
- **Combined Value**: $258/month (22% savings vs MarginEdge $330)

### Target Market Segmentation
- **Solo Operators**: Core system only
- **Small Teams (2-10 employees)**: Core + Basic Employee features
- **Multi-location Chains**: Full suite with advanced scheduling and analytics

## Technical Architecture

### Database Schema Extensions

#### Core Employee Tables
```typescript
// Employee profiles and basic info
employees: {
  id: uuid (primary key)
  userId?: uuid (optional link to system users)
  employeeNumber: string (unique)
  firstName: string
  lastName: string
  email?: string
  phone: string
  emergencyContact: json
  address: json
  dateOfBirth: date
  hireDate: date
  terminationDate?: date
  status: enum ('active', 'inactive', 'terminated', 'on-leave')
  locationId: uuid (foreign key)
  departmentId: uuid (foreign key)
  positionId: uuid (foreign key)
  hourlyRate?: decimal
  salary?: decimal
  profilePhoto?: string
  notes?: text
  createdAt: timestamp
  updatedAt: timestamp
}

// Departments and organizational structure
departments: {
  id: uuid (primary key)
  name: string
  description?: text
  managerId?: uuid (foreign key to employees)
  locationId: uuid (foreign key)
  budget?: decimal
  createdAt: timestamp
  updatedAt: timestamp
}

// Job positions and roles
positions: {
  id: uuid (primary key)
  title: string
  description?: text
  departmentId: uuid (foreign key)
  minHourlyRate?: decimal
  maxHourlyRate?: decimal
  permissions: json (role-based access)
  requirements?: text
  createdAt: timestamp
  updatedAt: timestamp
}
```

#### Scheduling System
```typescript
// Employee schedules and shifts
shifts: {
  id: uuid (primary key)
  employeeId: uuid (foreign key)
  locationId: uuid (foreign key)
  departmentId: uuid (foreign key)
  startTime: timestamp
  endTime: timestamp
  breakDuration?: integer (minutes)
  status: enum ('scheduled', 'confirmed', 'completed', 'no-show', 'cancelled')
  notes?: text
  createdBy: uuid (foreign key to users)
  createdAt: timestamp
  updatedAt: timestamp
}

// Employee availability preferences
availability: {
  id: uuid (primary key)
  employeeId: uuid (foreign key)
  dayOfWeek: integer (0-6, Sunday=0)
  startTime: time
  endTime: time
  isAvailable: boolean
  notes?: string
  effectiveDate: date
  endDate?: date
  createdAt: timestamp
  updatedAt: timestamp
}

// Time-off requests and approvals
timeOffRequests: {
  id: uuid (primary key)
  employeeId: uuid (foreign key)
  requestType: enum ('vacation', 'sick', 'personal', 'bereavement', 'other')
  startDate: date
  endDate: date
  totalHours: decimal
  reason?: text
  status: enum ('pending', 'approved', 'denied', 'cancelled')
  approvedBy?: uuid (foreign key to users)
  approvalDate?: timestamp
  notes?: text
  createdAt: timestamp
  updatedAt: timestamp
}
```

#### Task Management
```typescript
// Task assignments and tracking
tasks: {
  id: uuid (primary key)
  title: string
  description: text
  assignedTo: uuid (foreign key to employees)
  assignedBy: uuid (foreign key to users)
  locationId: uuid (foreign key)
  departmentId?: uuid (foreign key)
  priority: enum ('low', 'medium', 'high', 'urgent')
  category: enum ('cleaning', 'inventory', 'maintenance', 'training', 'admin', 'other')
  dueDate?: timestamp
  estimatedHours?: decimal
  status: enum ('pending', 'in-progress', 'completed', 'cancelled', 'overdue')
  completedAt?: timestamp
  completionNotes?: text
  attachments?: json
  isRecurring: boolean
  recurrencePattern?: json
  createdAt: timestamp
  updatedAt: timestamp
}

// Task completion tracking and verification
taskCompletions: {
  id: uuid (primary key)
  taskId: uuid (foreign key)
  employeeId: uuid (foreign key)
  completedAt: timestamp
  actualHours?: decimal
  notes?: text
  photos?: json
  verifiedBy?: uuid (foreign key to users)
  verifiedAt?: timestamp
  rating?: integer (1-5)
  createdAt: timestamp
}
```

#### Team Communication
```typescript
// Team messaging and announcements
messages: {
  id: uuid (primary key)
  senderId: uuid (foreign key to users/employees)
  recipientType: enum ('individual', 'department', 'location', 'all')
  recipientId?: uuid (foreign key)
  subject?: string
  content: text
  messageType: enum ('message', 'announcement', 'alert', 'reminder')
  priority: enum ('normal', 'high', 'urgent')
  readBy: json (array of user IDs and timestamps)
  attachments?: json
  expiresAt?: timestamp
  createdAt: timestamp
  updatedAt: timestamp
}

// Message threads and conversations
messageThreads: {
  id: uuid (primary key)
  originalMessageId: uuid (foreign key)
  participants: json (array of user IDs)
  subject: string
  lastMessageAt: timestamp
  isActive: boolean
  createdAt: timestamp
  updatedAt: timestamp
}
```

#### Performance Tracking
```typescript
// Employee performance reviews and metrics
performanceReviews: {
  id: uuid (primary key)
  employeeId: uuid (foreign key)
  reviewerId: uuid (foreign key to users)
  reviewPeriodStart: date
  reviewPeriodEnd: date
  overallRating: decimal (1-5 scale)
  categories: json (performance categories and ratings)
  strengths: text
  areasForImprovement: text
  goals: json
  actionItems: json
  employeeComments?: text
  status: enum ('draft', 'pending-employee', 'completed', 'archived')
  scheduledDate?: timestamp
  completedDate?: timestamp
  createdAt: timestamp
  updatedAt: timestamp
}

// Time tracking and attendance
timeEntries: {
  id: uuid (primary key)
  employeeId: uuid (foreign key)
  shiftId?: uuid (foreign key)
  clockInTime: timestamp
  clockOutTime?: timestamp
  breakStartTime?: timestamp
  breakEndTime?: timestamp
  totalHours?: decimal
  overtimeHours?: decimal
  status: enum ('clocked-in', 'on-break', 'clocked-out')
  location: json (GPS coordinates if mobile)
  notes?: string
  approvedBy?: uuid (foreign key to users)
  approvedAt?: timestamp
  createdAt: timestamp
  updatedAt: timestamp
}
```

### API Endpoints Structure

#### Employee Management
```
GET    /api/hr/employees                 # List all employees
POST   /api/hr/employees                 # Create new employee
GET    /api/hr/employees/:id             # Get employee details
PUT    /api/hr/employees/:id             # Update employee
DELETE /api/hr/employees/:id             # Deactivate employee
GET    /api/hr/employees/:id/performance # Performance history
GET    /api/hr/employees/:id/schedule    # Employee schedule
```

#### Scheduling System
```
GET    /api/hr/schedules                 # Get schedules by date range
POST   /api/hr/schedules                 # Create/update schedule
GET    /api/hr/schedules/conflicts       # Check scheduling conflicts
POST   /api/hr/time-off                  # Submit time-off request
GET    /api/hr/time-off                  # List time-off requests
PUT    /api/hr/time-off/:id/approve      # Approve/deny request
```

#### Task Management
```
GET    /api/hr/tasks                     # List tasks (filtered by user)
POST   /api/hr/tasks                     # Create new task
PUT    /api/hr/tasks/:id                 # Update task status
POST   /api/hr/tasks/:id/complete        # Mark task complete
GET    /api/hr/tasks/analytics          # Task completion metrics
```

#### Team Communication
```
GET    /api/hr/messages                  # Get messages for user
POST   /api/hr/messages                  # Send message/announcement
PUT    /api/hr/messages/:id/read         # Mark message as read
GET    /api/hr/messages/threads/:id      # Get conversation thread
```

#### Performance & Analytics
```
GET    /api/hr/performance/:employeeId   # Individual performance data
POST   /api/hr/performance/review        # Create performance review
GET    /api/hr/analytics/labor-costs     # Labor cost analysis
GET    /api/hr/analytics/productivity    # Productivity metrics
GET    /api/hr/time-tracking            # Time entries and attendance
POST   /api/hr/time-tracking/clock-in   # Clock in/out endpoints
```

### Frontend Architecture

#### New Pages/Components
```
client/src/pages/hr/
├── dashboard.tsx              # HR dashboard overview
├── employees/
│   ├── directory.tsx          # Employee directory
│   ├── profile.tsx            # Individual employee profile
│   └── onboarding.tsx         # New employee setup
├── scheduling/
│   ├── calendar.tsx           # Drag-and-drop schedule builder
│   ├── availability.tsx       # Manage employee availability
│   └── time-off.tsx          # Time-off request management
├── tasks/
│   ├── dashboard.tsx          # Task overview and assignment
│   ├── create-task.tsx        # Task creation form
│   └── task-board.tsx         # Kanban-style task tracking
├── communication/
│   ├── messaging.tsx          # Team messaging interface
│   ├── announcements.tsx      # Company announcements
│   └── notifications.tsx      # Notification center
└── performance/
    ├── reviews.tsx            # Performance review system
    ├── analytics.tsx          # HR analytics dashboard
    └── time-tracking.tsx      # Attendance and time tracking
```

#### Shared Components
```
client/src/components/hr/
├── employee-card.tsx          # Reusable employee display
├── schedule-grid.tsx          # Calendar/schedule components
├── task-item.tsx              # Task display components
├── time-clock.tsx             # Clock in/out widget
└── hr-navigation.tsx          # HR-specific navigation
```

### Integration Points

#### With Core RestroFlow System
- **Authentication**: Extends existing Replit Auth with role-based permissions
- **Locations**: Links employees to existing restaurant locations
- **Cost Monitoring**: Integrates labor costs with food cost tracking
- **Analytics**: Combines HR metrics with operational analytics
- **POS Integration**: Links employee performance to sales data

#### External Integrations
- **Payroll Systems**: QuickBooks, ADP, Gusto integration APIs
- **Background Checks**: Integration with screening services
- **Tax Compliance**: Automated tax form generation (W-2, 1099)
- **Time Clock Hardware**: Support for physical time clock devices

### Security & Permissions

#### Role-Based Access Control
```typescript
enum HRPermissions {
  VIEW_ALL_EMPLOYEES = 'hr:employees:view:all',
  EDIT_EMPLOYEE_PROFILES = 'hr:employees:edit',
  MANAGE_SCHEDULES = 'hr:schedules:manage',
  APPROVE_TIME_OFF = 'hr:timeoff:approve',
  VIEW_PAYROLL = 'hr:payroll:view',
  SEND_ANNOUNCEMENTS = 'hr:messages:broadcast',
  CONDUCT_REVIEWS = 'hr:reviews:conduct'
}

// Role assignments
const roles = {
  owner: [...allPermissions],
  manager: [VIEW_ALL_EMPLOYEES, MANAGE_SCHEDULES, APPROVE_TIME_OFF],
  supervisor: [VIEW_DEPARTMENT_EMPLOYEES, MANAGE_DEPARTMENT_SCHEDULES],
  employee: [VIEW_OWN_PROFILE, VIEW_OWN_SCHEDULE, SUBMIT_TIME_OFF]
}
```

#### Data Privacy & Compliance
- **PII Protection**: Encrypted storage of sensitive employee data
- **Audit Logging**: Track all access to employee records
- **GDPR/CCPA Compliance**: Data deletion and portability features
- **Access Controls**: IP whitelisting and session management

### Deployment Strategy

#### Feature Rollout Phases
1. **Phase 1 (MVP)**: Employee directory, basic scheduling, task assignments
2. **Phase 2**: Team messaging, time tracking, performance reviews
3. **Phase 3**: Advanced analytics, payroll integration, mobile app

#### Subscription Management
- **Add-on Activation**: Toggle HR features based on subscription tier
- **Usage Tracking**: Monitor feature usage for billing and optimization
- **Scalable Pricing**: Per-employee or per-location pricing tiers

#### Performance Considerations
- **Lazy Loading**: HR features only load when subscription includes them
- **Separate Database**: Option to use dedicated HR database for large clients
- **Caching Strategy**: Redis caching for frequently accessed employee data

### Mobile Considerations

#### Employee Mobile App Features
- **Time Clock**: GPS-verified clock in/out
- **Schedule View**: Personal schedule and shift swapping
- **Task Management**: View and complete assigned tasks
- **Team Chat**: Basic messaging functionality
- **Time-off Requests**: Submit and track PTO requests

## Revenue Projections

### Pricing Scenarios
- **Basic HR Add-on**: $79/month (up to 25 employees)
- **Advanced HR Suite**: $149/month (unlimited employees + payroll integration)
- **Enterprise HR**: $299/month (multi-location + advanced analytics)

### Market Opportunity
- **Average Restaurant**: 15 employees × $79 = $1,185/year additional revenue
- **Multi-location Chain**: 3 locations × $149 = $5,364/year additional revenue
- **Total Addressable Market**: Existing RestroFlow customers can increase ARPU by 44-83%

This architecture provides a scalable, profitable employee management system that enhances RestroFlow's core value proposition while maintaining system performance and modularity.