// Comprehensive Restaurant Payroll System Schema Extensions
// This file contains advanced payroll tables for enterprise restaurant operations

import { sql } from 'drizzle-orm';
import {
  uuid,
  varchar,
  decimal,
  boolean,
  timestamp,
  text,
  date,
  integer,
  jsonb,
  pgTable,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { locations } from "./schema";
import { users } from "./schema";
import { employees } from "./schema";
import { payPeriods } from "./schema";

// Advanced payroll tax settings for multi-location compliance
export const payrollTaxSettings = pgTable("payroll_tax_settings", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  locationId: uuid("location_id").references(() => locations.id).notNull(),
  state: varchar("state", { length: 2 }).notNull(),
  city: varchar("city", { length: 100 }),
  county: varchar("county", { length: 100 }),
  
  // Federal tax settings
  federalEmployerId: varchar("federal_employer_id", { length: 20 }),
  
  // State tax settings
  stateEmployerId: varchar("state_employer_id", { length: 20 }),
  stateUnemploymentRate: decimal("state_unemployment_rate", { precision: 8, scale: 4 }).default("0.0270"),
  stateDisabilityRate: decimal("state_disability_rate", { precision: 8, scale: 4 }).default("0.0000"),
  stateTaxRate: decimal("state_tax_rate", { precision: 8, scale: 4 }).default("0.0000"),
  
  // Local tax settings
  localTaxRate: decimal("local_tax_rate", { precision: 8, scale: 4 }).default("0.0000"),
  localEmployerId: varchar("local_employer_id", { length: 20 }),
  
  // Workers compensation
  workersCompRate: decimal("workers_comp_rate", { precision: 8, scale: 4 }).default("0.0050"),
  workersCompClass: varchar("workers_comp_class", { length: 10 }),
  
  // Minimum wage settings
  minimumWage: decimal("minimum_wage", { precision: 10, scale: 2 }).notNull(),
  tippedMinimumWage: decimal("tipped_minimum_wage", { precision: 10, scale: 2 }).notNull(),
  maxTipCredit: decimal("max_tip_credit", { precision: 10, scale: 2 }).default("0.00"),
  
  // Overtime rules
  dailyOvertimeThreshold: decimal("daily_overtime_threshold", { precision: 8, scale: 2 }).default("8.00"),
  weeklyOvertimeThreshold: decimal("weekly_overtime_threshold", { precision: 8, scale: 2 }).default("40.00"),
  doubleTimeThreshold: decimal("double_time_threshold", { precision: 8, scale: 2 }),
  
  // Meal and rest break requirements
  requiresMealBreaks: boolean("requires_meal_breaks").default(false),
  mealBreakDuration: integer("meal_break_duration").default(30), // minutes
  mealBreakThreshold: decimal("meal_break_threshold", { precision: 8, scale: 2 }).default("5.00"), // hours worked
  
  isActive: boolean("is_active").default(true),
  effectiveDate: timestamp("effective_date").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Comprehensive tip reporting for restaurant compliance
export const tipReporting = pgTable("tip_reporting", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  employeeId: uuid("employee_id").references(() => employees.id).notNull(),
  locationId: uuid("location_id").references(() => locations.id).notNull(),
  payPeriodId: uuid("pay_period_id").references(() => payPeriods.id).notNull(),
  reportDate: date("report_date").notNull(),
  
  // Tip income types
  cashTips: decimal("cash_tips", { precision: 12, scale: 2 }).default("0"),
  creditCardTips: decimal("credit_card_tips", { precision: 12, scale: 2 }).default("0"),
  tipPoolDistribution: decimal("tip_pool_distribution", { precision: 12, scale: 2 }).default("0"),
  tipOutToBusser: decimal("tip_out_to_busser", { precision: 12, scale: 2 }).default("0"),
  tipOutToHost: decimal("tip_out_to_host", { precision: 12, scale: 2 }).default("0"),
  tipOutToKitchen: decimal("tip_out_to_kitchen", { precision: 12, scale: 2 }).default("0"),
  tipOutToBar: decimal("tip_out_to_bar", { precision: 12, scale: 2 }).default("0"),
  tipOutOther: decimal("tip_out_other", { precision: 12, scale: 2 }).default("0"),
  
  // Calculation fields
  grossSales: decimal("gross_sales", { precision: 12, scale: 2 }).default("0"),
  chargedTips: decimal("charged_tips", { precision: 12, scale: 2 }).default("0"),
  tipShortage: decimal("tip_shortage", { precision: 12, scale: 2 }).default("0"),
  
  // Totals
  totalTipsReceived: decimal("total_tips_received", { precision: 12, scale: 2 }).default("0"),
  totalTipsPaidOut: decimal("total_tips_paid_out", { precision: 12, scale: 2 }).default("0"),
  netTipsRetained: decimal("net_tips_retained", { precision: 12, scale: 2 }).default("0"),
  
  // Compliance
  reportedByEmployee: boolean("reported_by_employee").default(false),
  employeeSignature: varchar("employee_signature", { length: 100 }),
  reportingMethod: varchar("reporting_method", { length: 50 }).default("manual_entry"),
  
  // Audit trail
  verifiedBy: uuid("verified_by").references(() => users.id),
  verificationDate: timestamp("verification_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Advanced payroll reporting for tax compliance
export const payrollReports = pgTable("payroll_reports", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  reportType: varchar("report_type", { length: 50 }).notNull(),
  locationId: uuid("location_id").references(() => locations.id),
  reportPeriod: varchar("report_period", { length: 20 }).notNull(), // e.g., "2025-Q1" or "2025"
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  
  // Report data (stored as JSON for flexibility)
  reportData: jsonb("report_data").notNull(),
  summary: jsonb("summary"), // Key totals for quick reference
  
  // Filing information
  filingStatus: varchar("filing_status", { length: 20 }).default("draft"),
  filedDate: timestamp("filed_date"),
  confirmationNumber: varchar("confirmation_number", { length: 100 }),
  filedBy: uuid("filed_by").references(() => users.id),
  
  // Export and audit
  exportFormat: varchar("export_format", { length: 20 }),
  exportPath: varchar("export_path", { length: 500 }),
  
  notes: text("notes"),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Payroll export capabilities for accounting software integration
export const payrollExports = pgTable("payroll_exports", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  exportType: varchar("export_type", { length: 50 }).notNull(),
  payPeriodId: uuid("pay_period_id").references(() => payPeriods.id),
  locationId: uuid("location_id").references(() => locations.id),
  
  // Export details
  fileName: varchar("file_name", { length: 200 }).notNull(),
  filePath: varchar("file_path", { length: 500 }),
  fileFormat: varchar("file_format", { length: 20 }).notNull(),
  recordCount: integer("record_count").default(0),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).default("0"),
  
  // Processing status
  status: varchar("status", { length: 20 }).default("pending"),
  processedAt: timestamp("processed_at"),
  transmittedAt: timestamp("transmitted_at"),
  errorMessage: text("error_message"),
  
  // Banking and transmission details
  bankRoutingNumber: varchar("bank_routing_number", { length: 9 }),
  batchNumber: varchar("batch_number", { length: 20 }),
  transmissionId: varchar("transmission_id", { length: 50 }),
  
  exportedBy: uuid("exported_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Labor compliance tracking for restaurant regulations
export const laborComplianceTracking = pgTable("labor_compliance_tracking", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  locationId: uuid("location_id").references(() => locations.id).notNull(),
  employeeId: uuid("employee_id").references(() => employees.id).notNull(),
  payPeriodId: uuid("pay_period_id").references(() => payPeriods.id).notNull(),
  
  // Compliance checks
  minimumWageCompliant: boolean("minimum_wage_compliant").default(true),
  overtimeCompliant: boolean("overtime_compliant").default(true),
  mealBreakCompliant: boolean("meal_break_compliant").default(true),
  restBreakCompliant: boolean("rest_break_compliant").default(true),
  tipReportingCompliant: boolean("tip_reporting_compliant").default(true),
  
  // Violation details
  minimumWageDeficiency: decimal("minimum_wage_deficiency", { precision: 12, scale: 2 }).default("0"),
  overtimeDeficiency: decimal("overtime_deficiency", { precision: 12, scale: 2 }).default("0"),
  missedMealBreaks: integer("missed_meal_breaks").default(0),
  missedRestBreaks: integer("missed_rest_breaks").default(0),
  unreportedTips: decimal("unreported_tips", { precision: 12, scale: 2 }).default("0"),
  
  // Corrective actions
  correctionRequired: boolean("correction_required").default(false),
  correctionAmount: decimal("correction_amount", { precision: 12, scale: 2 }).default("0"),
  correctionApplied: boolean("correction_applied").default(false),
  correctionDate: timestamp("correction_date"),
  
  // Audit and documentation
  complianceNotes: text("compliance_notes"),
  reviewedBy: uuid("reviewed_by").references(() => users.id),
  reviewDate: timestamp("review_date"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Type exports for comprehensive payroll
export type PayrollTaxSetting = typeof payrollTaxSettings.$inferSelect;
export type InsertPayrollTaxSetting = typeof payrollTaxSettings.$inferInsert;
export type TipReporting = typeof tipReporting.$inferSelect;
export type InsertTipReporting = typeof tipReporting.$inferInsert;
export type PayrollReport = typeof payrollReports.$inferSelect;
export type InsertPayrollReport = typeof payrollReports.$inferInsert;
export type PayrollExport = typeof payrollExports.$inferSelect;
export type InsertPayrollExport = typeof payrollExports.$inferInsert;
export type LaborComplianceTracking = typeof laborComplianceTracking.$inferSelect;
export type InsertLaborComplianceTracking = typeof laborComplianceTracking.$inferInsert;

// Zod schemas for validation
export const insertPayrollTaxSettingSchema = createInsertSchema(payrollTaxSettings);
export const insertTipReportingSchema = createInsertSchema(tipReporting);
export const insertPayrollReportSchema = createInsertSchema(payrollReports);
export const insertPayrollExportSchema = createInsertSchema(payrollExports);
export const insertLaborComplianceTrackingSchema = createInsertSchema(laborComplianceTracking);