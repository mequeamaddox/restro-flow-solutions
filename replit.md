# RestroFlow Restaurant Operations Platform

## Overview

RestroFlow is a comprehensive enterprise-grade restaurant operations platform designed to streamline operations with inventory management, OCR invoice processing, real-time analytics, and cost monitoring. The platform features a modular add-on architecture for scalability.

**Core Platform**: Offers inventory tracking, recipe costing, vendor management, purchase orders, waste tracking, OCR invoice processing, and real-time business intelligence.

**Employee Management Add-on**: Provides a comprehensive HR system with scheduling, task management, team messaging, performance tracking, time clock functionality, and payroll integration.

The platform also includes a Progressive Web App (PWA) for mobile-first management and a robust security framework.

## User Preferences

Preferred communication style: Simple, everyday language.
Multi-location restaurant business: Table-top restaurant and bar & grill as second location.
Target features: Location-specific inventory, bar-specific items, separate analytics per location.
POS Systems: Uses SpotOn POS at the bar, Clover at main restaurant - needs universal POS integration.
UI Preference: Single Analytics & Reports page instead of separate pages for streamlined navigation.
Business Strategy: Modular add-on approach for employee management to enable scalable revenue growth and market segmentation.

## Recent Changes

### September 30, 2025 - Invitation Database Table Creation Fix
- **Issue**: Invitation form submissions failed with error: `relation "invitation_tokens" does not exist`
- **Root Cause**: 
  - invitation_tokens table was defined in shared/schema.ts but didn't exist in the database
  - Attempted `npm run db:push --force` but drizzle-kit got stuck on interactive prompt about budgets table
  - Cannot edit drizzle.config.ts to add tablesFilter due to safety restrictions
- **Solution**:
  - Manually created invitation_status ENUM type with values: pending, accepted, expired, cancelled
  - Manually created invitation_tokens table via SQL with all columns matching schema definition
  - Verified table structure with 21 columns including foreign keys to locations, departments, positions, users, employees
- **Result**: Invitation submissions now work. Known limitation: schema drift exists - future db:push may have issues until drizzle.config.ts can be updated with tablesFilter to exclude legacy clover_* schemas.

### September 30, 2025 - Invitation Form Validation & Department/Position Filtering Fix
- **Issue**: Invitation form failed with 400 error and departments/positions didn't load properly.
- **Root Cause**: 
  - insertInvitationTokenSchema required invitedBy and expiresAt but frontend didn't provide them (should be server-side)
  - hourlyRate schema expected string but frontend sent number
  - InviteEmployeeDialog fetched departments/positions without locationId parameter, causing 400 errors
  - form.watch('locationId') was called before form was initialized, causing runtime error
- **Solution**:
  - Updated insertInvitationTokenSchema to make invitedBy and expiresAt optional with server-side defaults
  - Added transform for hourlyRate/salary to accept both string and number, converting to string
  - routes.ts now sets expiresAt to 48 hours if not provided
  - Fixed InviteEmployeeDialog to call form.watch() after useForm() initialization
  - Added custom queryFn for departments/positions that explicitly passes locationId query parameter
  - Added enabled flag to prevent queries until location is selected
- **Result**: Invitation form now submits successfully, departments and positions load correctly based on selected location, and personalMessage remains optional.

### September 30, 2025 - Invitation Email Bug Fix
- **Issue**: Invitation emails failed to display location, department, and position names - all showed as undefined.
- **Root Cause**: 
  - InvitationEmailService tried to access nested objects (invitation.location.name, invitation.department.name, invitation.position.title)
  - InvitationToken schema only stores IDs (locationId, departmentId, positionId) without relationship loading
  - Email service expected fully populated relationship data that didn't exist
- **Solution**:
  - Refactored InvitationEmailService to accept location/department/position names as optional string parameters
  - Updated routes.ts POST /api/invitations to fetch related entity names from storage before sending email
  - Added personalMessage support - displays in both HTML (styled blue box) and text versions of invitation emails
  - Added token validation guard to prevent emails with undefined invitation links
- **Result**: Invitation emails now properly display all role details and personal messages. SendGrid 401 error remains (separate issue: user needs to verify sender email and API key).

### September 30, 2025 - Employee Data Synchronization Fix
- **Issue**: Employee data displayed inconsistently across HR pages (Employees, Time Clock, Documents) due to mixed endpoint usage and HR addon access issues.
- **Root Cause**: 
  - HR Time Clock page used `/api/employees` instead of `/api/hr/employees`
  - queryClient didn't append locationId for HR endpoints
  - Bar & Grill location had HR addon disabled
- **Solution**:
  - Enabled HR addon for both locations
  - Standardized all HR pages to use `/api/hr/employees` with locationId
  - Extended queryClient to handle `/api/hr/` endpoints for location-specific data
  - Implemented location display feature on employee time clock with MapPin icon
- **Result**: All HR pages now show consistent employee counts and data across both locations.

## System Architecture

### UI/UX Decisions
- **Mobile App**: Progressive Web App (PWA) with mobile-first navigation, touch-optimized interface, responsive dashboard, and role-based UX.
- **Visual Identity**: Dark theme with gradient backgrounds, custom color schemes, and interactive elements.
- **User Experience**: Problem/solution sections, social proof, and conversion-optimized calls-to-action on landing pages.
- **Reporting**: Single Analytics & Reports page for streamlined navigation.

### Technical Implementations
- **Frontend**: React 18 with TypeScript and Vite, utilizing shadcn/ui (Radix UI + Tailwind CSS), TanStack Query for state management, Wouter for routing, and React Hook Form with Zod for forms.
- **Backend**: Node.js with Express.js (ES modules), Drizzle ORM (PostgreSQL dialect), and Replit's OpenID Connect integration with Passport.js for authentication.
- **Database**: PostgreSQL on Neon, using Drizzle for schema management and migrations.
- **Authentication**: Replit OIDC, server-side sessions with secure HTTP-only cookies, automatic user management, and basic role-based access control.
- **Security**: SOC2-style standards including rate limiting, security headers, input validation, comprehensive audit logging, and role-based access control.
- **Monetization**: Subscription-based OCR access with a freemium model and credit tracking.
- **Invoice Processing**: Real database operations for invoice creation/statistics, advanced free OCR (PDF-to-image conversion, Tesseract), multi-page PDF support, and data sanitization.
- **POS Integration**: Universal multi-provider connector supporting Clover (webhooks), Square (webhooks + pagination), SpotOn (scheduled polling with lag-window strategy), with comprehensive error handling, idempotency checks, and safeFetch helper. SpotOn connector includes near-realtime order polling (1-min intervals with 5-min replication lag buffer) and daily 26-hour backfill for reliability.
- **AI Features**: Real-time analytics with alerts and intelligent cost optimization.
- **SEO**: Comprehensive meta tags, Open Graph, Twitter Cards, Schema.org, and content optimization.
- **Pricing Strategy**: Modular pricing with competitive analysis against MarginEdge, offering savings and annual discounts.

### System Design Choices
- **Modular Architecture**: Core platform with add-ons (e.g., Employee Management) for scalable functionality and revenue growth.
- **Real-time Capabilities**: Real-time cost monitoring, analytics, and alerting systems.
- **Data Model**: Normalized relational database schema covering inventory, recipes, vendors, purchase orders, waste tracking, and transactions.

## External Dependencies

### Database Services
- **Neon PostgreSQL**: Serverless PostgreSQL hosting with connection pooling.

### Authentication Services
- **Replit OIDC**: OpenID Connect authentication provider.

### Frontend Libraries
- **Radix UI**: Accessible UI primitives.
- **Tailwind CSS**: Utility-first CSS framework.
- **TanStack Query**: Server state management.
- **React Hook Form**: Form management with validation.

### Development Tools
- **Vite**: Fast development server and build tool.
- **Drizzle Kit**: Database migration and schema management.
- **TypeScript**: Static type checking.

### Utility Libraries
- **date-fns**: Date manipulation.
- **Zod**: Runtime type validation.
- **clsx/twMerge**: Conditional CSS class utilities.