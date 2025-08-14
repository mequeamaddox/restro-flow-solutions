# RestroFlow Inventory Management System

## Overview

RestroFlow is a comprehensive enterprise-grade restaurant inventory management system built with a modern full-stack architecture. Inspired by MarginEdge platform capabilities, the application provides real-time inventory tracking, recipe costing, vendor management, purchase order creation, waste tracking, advanced analytics, and enterprise security features. It's designed to help restaurants optimize their food costs, reduce waste, streamline supply chain operations, and provide business intelligence for data-driven decisions.

The system features a React-based frontend with TypeScript, a Node.js/Express backend, PostgreSQL database with Drizzle ORM, enterprise-grade security middleware, comprehensive audit logging, real-time cost monitoring, and automated alerting systems.

## Recent Enterprise Fortification (August 2025)

Following MarginEdge platform analysis, RestroFlow has been enhanced with:

### Enterprise Security Features
- **SOC2-style Security Standards**: Rate limiting, security headers (Helmet), input validation
- **Comprehensive Audit Logging**: All user actions and data changes tracked with full context
- **Security Event Monitoring**: Real-time logging of authentication, authorization, and suspicious activities
- **Role-based Access Control**: Granular permissions system with location-specific access controls
- **Data Encryption & Privacy**: Sensitive data sanitization and secure transmission protocols

### Advanced Analytics & Business Intelligence
- **Real-time Cost Monitoring**: Automated tracking of food costs, waste percentages, and margin analysis
- **Daily Business Intelligence Reports**: Comprehensive P&L analysis with trend calculations
- **Intelligent Cost Alerts**: Automated alerts for price variances, budget overruns, and waste thresholds
- **Performance Benchmarking**: Industry-standard targets and variance tracking
- **MarginEdge-style Reporting**: Daily controllable P&L, theoretical vs actual analysis, multi-location comparison

### Automated Cost Control
- **Price Monitoring**: Automatic tracking of ingredient price changes with threshold-based alerts
- **Comprehensive Waste Tracking**: Real-time tracking of all waste types including plate waste (customer leftovers), kitchen waste, prep waste, and spoilage
- **Inventory Turnover Analysis**: Automated calculation of inventory efficiency metrics
- **Budget Management**: Period-based budget tracking with variance analysis

## User Preferences

Preferred communication style: Simple, everyday language.
Multi-location restaurant business: Table-top restaurant and bar & grill as second location.
Target features: Location-specific inventory, bar-specific items, separate analytics per location.
POS Systems: Uses SpotOn POS at the bar, Clover at main restaurant - needs universal POS integration.
UI Preference: Single Analytics & Reports page instead of separate pages for streamlined navigation.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite for development/build tooling
- **UI Framework**: shadcn/ui components built on Radix UI primitives with Tailwind CSS styling
- **State Management**: TanStack Query (React Query) for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Forms**: React Hook Form with Zod schema validation for type-safe form handling
- **Build System**: Vite with custom configuration supporting path aliases and development overlays

### Backend Architecture
- **Runtime**: Node.js with Express.js framework using ES modules
- **Database ORM**: Drizzle ORM with PostgreSQL dialect for type-safe database operations
- **Authentication**: Replit's OpenID Connect integration with Passport.js strategy
- **Session Management**: Express sessions stored in PostgreSQL using connect-pg-simple
- **Database Provider**: Neon PostgreSQL with serverless connection pooling
- **API Design**: RESTful endpoints following conventional HTTP methods and status codes

### Data Storage Solutions
- **Primary Database**: PostgreSQL hosted on Neon with connection pooling
- **Schema Management**: Drizzle migrations with schema defined in TypeScript
- **Session Storage**: Database-backed sessions for authentication persistence
- **Data Modeling**: Comprehensive relational schema covering inventory, recipes, vendors, purchase orders, and waste tracking

### Authentication and Authorization
- **Provider**: Replit OpenID Connect (OIDC) integration
- **Session Strategy**: Server-side sessions with secure HTTP-only cookies
- **User Management**: Automatic user creation/updates on authentication
- **Role System**: Basic role-based access (admin, manager, staff)
- **Security**: HTTPS-only cookies with secure session configuration

### Database Schema Design
The system uses a normalized relational database design with the following core entities:
- **Users**: Authentication and user profile management
- **Categories**: Hierarchical organization of inventory items
- **Vendors**: Supplier information and contact management
- **Inventory Items**: Core product catalog with quantities, costs, and reorder levels
- **Recipes**: Menu items with ingredient breakdowns and costing
- **Purchase Orders**: Procurement workflow with line items and status tracking
- **Waste Tracking**: Loss recording with categorization and cost analysis
- **Inventory Transactions**: Audit trail for all stock movements

## External Dependencies

### Database Services
- **Neon PostgreSQL**: Serverless PostgreSQL hosting with connection pooling and WebSocket support for real-time features

### Authentication Services
- **Replit OIDC**: OpenID Connect authentication provider integrated with Replit's user system

### Frontend Libraries
- **Radix UI**: Comprehensive set of accessible UI primitives for building the component library
- **Tailwind CSS**: Utility-first CSS framework for responsive design and consistent styling
- **TanStack Query**: Server state management with caching, background updates, and optimistic updates
- **React Hook Form**: Performant form library with minimal re-renders and built-in validation

### Development Tools
- **Vite**: Fast development server and build tool with HMR and TypeScript support
- **Drizzle Kit**: Database migration and schema management tooling
- **TypeScript**: Static type checking across the entire application stack

### Utility Libraries
- **date-fns**: Date manipulation and formatting utilities
- **Zod**: Runtime type validation and schema definition
- **clsx/twMerge**: Conditional CSS class utilities for dynamic styling