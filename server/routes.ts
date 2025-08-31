import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import multer from "multer";
import { db } from "./db";
import { sql, eq, desc } from "drizzle-orm";
import { 
  inventoryItems,
  recipes,
  wasteEntries,
  posSales
} from "@shared/schema";
import { posService } from "./posService";
import { OCRService } from "./ocrService";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import fs from 'fs';
import path from 'path';
import {
  insertLocationSchema,
  insertCategorySchema,
  insertVendorSchema,
  insertInventoryItemSchema,
  insertRecipeSchema,
  insertMenuItemSchema,
  insertMenuItemIngredientSchema,
  insertPurchaseOrderSchema,
  insertPurchaseOrderItemSchema,
  insertWasteEntrySchema,
  insertInventoryTransactionSchema,
  insertPosIntegrationSchema,
} from "@shared/schema";

// File upload configuration

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit for invoice files
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and PDF files are allowed.'));
    }
  },
});



// OCR Access Helper Function
async function checkOcrAccess(userId: string): Promise<{ hasAccess: boolean; creditsRemaining: number; plan: string }> {
  const user = await storage.getUser(userId);
  if (!user) {
    return { hasAccess: false, creditsRemaining: 0, plan: 'free' };
  }

  const plan = user.subscriptionPlan || 'free';
  const ocrCreditsUsed = user.ocrCreditsUsed || 0;
  const maxOcrCredits = 5; // Free plan limit

  if (plan === 'professional' || plan === 'enterprise') {
    return { hasAccess: true, creditsRemaining: 999, plan };
  }

  const creditsRemaining = Math.max(0, maxOcrCredits - ocrCreditsUsed);
  return { hasAccess: creditsRemaining > 0, creditsRemaining, plan };
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Invoice Processing Routes
  app.get('/api/invoices', isAuthenticated, async (req, res) => {
    try {
      const { status, locationId } = req.query;
      const invoices = await storage.getInvoices(status as string, locationId as string);
      res.json(invoices);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      res.status(500).json({ message: "Failed to fetch invoices" });
    }
  });

  app.post('/api/invoices', isAuthenticated, async (req, res) => {
    try {
      const invoiceData = req.body;
      const invoice = await storage.createInvoice(invoiceData);
      res.status(201).json(invoice);
    } catch (error) {
      console.error("Error creating invoice:", error);
      res.status(400).json({ message: "Failed to create invoice" });
    }
  });

  app.put('/api/invoices/:id/status', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const invoice = await storage.updateInvoiceStatus(id, status);
      res.json(invoice);
    } catch (error) {
      console.error("Error updating invoice status:", error);
      res.status(400).json({ message: "Failed to update invoice status" });
    }
  });

  app.delete('/api/invoices/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteInvoice(id);
      res.json({ message: "Invoice deleted successfully" });
    } catch (error) {
      console.error("Error deleting invoice:", error);
      res.status(400).json({ message: "Failed to delete invoice" });
    }
  });

  app.get('/api/invoices/stats', isAuthenticated, async (req, res) => {
    try {
      const stats = await storage.getInvoiceStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching invoice stats:", error);
      res.status(500).json({ message: "Failed to fetch invoice stats" });
    }
  });

  // Invoice Upload with Premium OCR Processing
  app.post('/api/invoices/upload', isAuthenticated, upload.single('invoice'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      console.log('Processing file:', req.file.originalname, 'Type:', req.file.mimetype);
      
      // Check OCR access for current user
      const userId = (req.user as any)?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const ocrAccess = await storage.checkOcrAccess(userId);
      console.log('OCR access check:', ocrAccess);
      
      // Extract vendor hint from filename
      const filename = req.file.originalname.toLowerCase();
      let vendorHint = '';
      if (filename.includes('atlantic')) vendorHint = 'Atlantic Food Service Repairs';
      else if (filename.includes('inland')) vendorHint = 'Inland Foods';
      else if (filename.includes('food lion')) vendorHint = 'Food Lion';
      else if (filename.includes('c&c')) vendorHint = 'C&C Seafood';
      
      let ocrResult: { text: string; confidence: number };
      let processingMethod = 'basic';
      
      // Process with appropriate method based on user's subscription plan
      if (ocrAccess.hasAccess && (ocrAccess.plan === 'professional' || ocrAccess.plan === 'enterprise')) {
        // Premium OCR processing with full features
        processingMethod = 'premium_ocr';
        if (req.file.mimetype === 'application/pdf') {
          console.log('Premium PDF processing with OCR...');
          ocrResult = await OCRService.extractTextFromPDF(req.file.buffer);
        } else if (req.file.mimetype.startsWith('image/')) {
          console.log('Premium image processing with advanced OCR...');
          ocrResult = await OCRService.extractTextFromImage(req.file.buffer);
        } else if (req.file.mimetype === 'text/plain') {
          console.log('Processing text file directly...');
          const text = req.file.buffer.toString('utf-8')
            .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '') // Remove control characters
            .trim();
          ocrResult = { text, confidence: 100 };
        } else {
          throw new Error('Unsupported file type. Please upload PDF, image, or text files.');
        }
        
        // Update OCR credits used for free users - this logic is handled below
        // Premium users don't consume credits
        
      } else if (ocrAccess.hasAccess && ocrAccess.plan === 'free') {
        // Limited OCR processing for free users
        processingMethod = 'free_ocr';
        console.log(`Free user OCR processing (${ocrAccess.creditsRemaining} credits remaining)...`);
        
        // Only allow text-based PDFs and text files for free users
        if (req.file.mimetype === 'application/pdf') {
          console.log('Free PDF processing (text extraction only)...');
          ocrResult = await OCRService.extractTextFromPDF(req.file.buffer);
        } else if (req.file.mimetype === 'text/plain') {
          console.log('Processing text file directly...');
          const text = req.file.buffer.toString('utf-8')
            .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '') // Remove control characters
            .trim();
          ocrResult = { text, confidence: 100 };
        } else {
          return res.status(403).json({
            message: "Advanced OCR for images requires a premium subscription",
            reason: "image_ocr_blocked",
            plan: ocrAccess.plan,
            creditsRemaining: ocrAccess.creditsRemaining,
            upgradeRequired: true,
            upgradeUrl: "/pricing"
          });
        }
        
        // Update OCR credits used for free users
        const user = await storage.getUser(userId);
        await storage.updateOcrCreditsUsed(userId, (user?.ocrCreditsUsed || 0) + 1);
        
      } else {
        // No OCR access remaining
        return res.status(403).json({
          message: "OCR processing limit exceeded. Upgrade to premium for unlimited access",
          reason: "credits_exhausted",
          plan: ocrAccess.plan,
          creditsRemaining: ocrAccess.creditsRemaining,
          upgradeRequired: true,
          upgradeUrl: "/pricing"
        });
      }

      console.log('OCR completed with confidence:', ocrResult.confidence);
      console.log('Extracted text preview:', ocrResult.text.substring(0, 200) + '...');

      // Save the uploaded file permanently
      const timestamp = Date.now();
      const sanitizedFilename = req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
      const fileExtension = path.extname(sanitizedFilename);
      const baseFilename = path.basename(sanitizedFilename, fileExtension);
      const fileName = `${timestamp}_${baseFilename}${fileExtension}`;
      const filePath = path.join('uploads', 'invoices', fileName);
      
      // Ensure the directory exists
      const uploadDir = path.dirname(filePath);
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      
      // Write the file to disk
      fs.writeFileSync(filePath, req.file.buffer);
      console.log('Saved invoice file to:', filePath);

      // Parse invoice data from extracted text
      const parsedData = OCRService.parseInvoiceFromText(ocrResult.text);
      
      // Use vendor hint from filename if no vendor was detected
      if (!parsedData.vendorName || parsedData.vendorName === 'Unknown Vendor') {
        if (vendorHint) {
          parsedData.vendorName = vendorHint;
        }
      }
      
      // Find or create vendor based on the extracted name
      let vendorId = null;
      if (parsedData.vendorName && parsedData.vendorName !== 'Unknown Vendor') {
        // Try to find existing vendor with similar name
        const vendors = await storage.getVendors();
        const existingVendor = vendors.find(v => 
          v.name.toLowerCase().includes(parsedData.vendorName.toLowerCase()) ||
          parsedData.vendorName.toLowerCase().includes(v.name.toLowerCase())
        );
        
        if (existingVendor) {
          vendorId = existingVendor.id;
          console.log(`Found existing vendor: ${existingVendor.name} (${existingVendor.id})`);
          
          // Update vendor with additional info if we have it and it's missing
          if ((parsedData.vendorPhone && !existingVendor.phone) || 
              (parsedData.vendorAddress && !existingVendor.address)) {
            await storage.updateVendor(existingVendor.id, {
              phone: parsedData.vendorPhone || existingVendor.phone,
              address: parsedData.vendorAddress || existingVendor.address
            });
            console.log(`Updated vendor with phone: ${parsedData.vendorPhone}, address: ${parsedData.vendorAddress}`);
          }
        } else {
          // Create new vendor with all extracted information
          const newVendor = await storage.createVendor({
            name: parsedData.vendorName,
            contactPerson: null,
            email: null,
            phone: parsedData.vendorPhone || null,
            address: parsedData.vendorAddress || null
          });
          vendorId = newVendor.id;
          console.log(`Created new vendor: ${newVendor.name} with phone: ${parsedData.vendorPhone}, address: ${parsedData.vendorAddress} (${newVendor.id})`);
        }
      }
      
      // Enhanced logging for debugging
      console.log('Parsed invoice data:', {
        vendor: parsedData.vendorName,
        number: parsedData.invoiceNumber,
        total: parsedData.total,
        subtotal: parsedData.subtotal,
        date: parsedData.invoiceDate
      });
      
      // Sanitize original text to prevent database encoding issues
      const sanitizedText = ocrResult.text
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '') // Remove control characters
        .substring(0, 2000) // Limit text length
        .trim();
      
      // Calculate tax from total - subtotal
      const taxAmount = parsedData.total - parsedData.subtotal;
      const calculatedTax = taxAmount >= 0 ? taxAmount : 0;
      
      // Create invoice with OCR data
      const invoiceData = {
        invoiceNumber: parsedData.invoiceNumber,
        vendorId: vendorId, // Use the resolved vendor ID
        invoiceDate: parsedData.invoiceDate,
        subtotal: parsedData.subtotal.toString(),
        total: parsedData.total.toString(),
        tax: calculatedTax.toString(),
        ocrConfidence: Math.round(ocrResult.confidence),
        uploadMethod: req.body.uploadMethod || 'upload',
        status: 'pending',
        lineItems: parsedData.lineItems, // Include extracted line items
        fees: parsedData.fees, // Include IRS-compliant separate fee tracking
        attachmentPath: filePath, // Store path to original invoice file
        originalText: sanitizedText,
        processedAt: new Date(),
      };

      // Create the invoice in storage
      const invoice = await storage.createInvoice(invoiceData);
      
      res.status(201).json({
        ...invoice,
        ocrConfidence: invoiceData.ocrConfidence,
        extractedData: parsedData,
        processingMethod,
        userPlan: ocrAccess.plan,
        creditsRemaining: ocrAccess.creditsRemaining,
        message: `Invoice processed successfully with ${processingMethod.replace('_', ' ')}`
      });

    } catch (error) {
      console.error("Error processing invoice upload:", error);
      res.status(500).json({ 
        message: "Failed to process invoice upload",
        error: (error as Error).message 
      });
    }
  });

  // Route to serve invoice attachments
  app.get('/api/invoices/:id/attachment', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Get invoice data to find attachment path
      const invoices = await storage.getInvoices();
      const invoice = invoices.find(inv => inv.id === id);
      
      if (!invoice || !invoice.attachmentPath) {
        return res.status(404).json({ message: "Invoice attachment not found" });
      }
      
      // Check if file exists
      if (!fs.existsSync(invoice.attachmentPath)) {
        return res.status(404).json({ message: "Attachment file not found on disk" });
      }
      
      // Get file info
      const fileName = path.basename(invoice.attachmentPath);
      const fileExtension = path.extname(fileName);
      
      // Set appropriate content type
      let contentType = 'application/octet-stream';
      if (fileExtension === '.pdf') contentType = 'application/pdf';
      else if (fileExtension === '.jpg' || fileExtension === '.jpeg') contentType = 'image/jpeg';
      else if (fileExtension === '.png') contentType = 'image/png';
      else if (fileExtension === '.txt') contentType = 'text/plain';
      
      // Set headers for file download/viewing
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
      
      // Stream the file
      const fileStream = fs.createReadStream(invoice.attachmentPath);
      fileStream.pipe(res);
      
    } catch (error) {
      console.error("Error serving invoice attachment:", error);
      res.status(500).json({ message: "Failed to serve attachment" });
    }
  });

  // Invoice approval route - for saving reviewed/edited invoices
  app.put('/api/invoices/:id/approve', isAuthenticated, async (req: any, res) => {
    try {
      const invoiceId = req.params.id;
      console.log('🔍 Approve request received for invoice:', invoiceId);
      console.log('📦 Request body:', JSON.stringify(req.body, null, 2));
      
      const { vendor, invoiceNumber, invoiceDate, total, subtotal, lineItems, fees } = req.body;
      
      const updateData = {
        invoiceNumber,
        invoiceDate,
        total: parseFloat(total || '0'),
        subtotal: parseFloat(subtotal || '0'),
        lineItems: lineItems || [],
        fees: fees || [],
        status: 'approved'
      };
      
      console.log('💾 Update data:', JSON.stringify(updateData, null, 2));
      
      // Update the invoice with edited data and approve it
      const result = await storage.updateInvoice(invoiceId, updateData);
      
      console.log('✅ Update result:', JSON.stringify(result, null, 2));
      
      res.json({ message: "Invoice approved successfully", invoice: result });
    } catch (error) {
      console.error("❌ Error approving invoice:", error);
      res.status(500).json({ message: "Failed to approve invoice" });
    }
  });

  // Subscription and OCR Management Routes
  app.get('/api/user/subscription', isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const ocrAccess = await storage.checkOcrAccess(userId);
      const user = await storage.getUser(userId);
      
      res.json({
        plan: ocrAccess.plan,
        status: user?.subscriptionStatus || 'inactive',
        creditsUsed: user?.ocrCreditsUsed || 0,
        creditsLimit: user?.ocrCreditsLimit || 5,
        creditsRemaining: ocrAccess.creditsRemaining,
        hasUnlimitedOcr: ocrAccess.plan === 'professional' || ocrAccess.plan === 'enterprise',
        subscriptionEndDate: user?.subscriptionEndDate
      });
    } catch (error) {
      console.error("Error fetching user subscription:", error);
      res.status(500).json({ message: "Failed to fetch subscription info" });
    }
  });

  app.post('/api/user/upgrade-plan', isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const { plan } = req.body;
      
      if (!['professional', 'enterprise'].includes(plan)) {
        return res.status(400).json({ message: "Invalid subscription plan" });
      }

      // For now, we'll simulate upgrading without Stripe
      // This will be replaced with actual Stripe integration when keys are provided
      const updatedUser = await storage.updateUserSubscription(userId, {
        subscriptionPlan: plan as 'professional' | 'enterprise',
        subscriptionStatus: 'active',
        ocrCreditsLimit: 999, // Unlimited for premium
        subscriptionEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
      });

      res.json({
        message: `Successfully upgraded to ${plan} plan`,
        user: updatedUser,
        unlimitedOcr: true
      });
    } catch (error) {
      console.error("Error upgrading plan:", error);
      res.status(500).json({ message: "Failed to upgrade plan" });
    }
  });

  app.post('/api/user/reset-credits', isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      // Only allow for development/testing purposes
      const updatedUser = await storage.resetOcrCredits(userId);
      
      res.json({
        message: "OCR credits reset successfully",
        creditsUsed: updatedUser.ocrCreditsUsed
      });
    } catch (error) {
      console.error("Error resetting credits:", error);
      res.status(500).json({ message: "Failed to reset credits" });
    }
  });

  // Cost Monitoring Routes
  app.get('/api/cost-alerts', isAuthenticated, async (req, res) => {
    try {
      const { location } = req.query;
      const alerts = await storage.getCostAlerts(location as string);
      res.json(alerts);
    } catch (error) {
      console.error("Error fetching cost alerts:", error);
      res.status(500).json({ message: "Failed to fetch cost alerts" });
    }
  });

  app.get('/api/price-monitoring', isAuthenticated, async (req, res) => {
    try {
      const { range } = req.query;
      const monitoring = await storage.getPriceMonitoring(range as string);
      res.json(monitoring);
    } catch (error) {
      console.error("Error fetching price monitoring:", error);
      res.status(500).json({ message: "Failed to fetch price monitoring" });
    }
  });

  app.get('/api/cost-trends', isAuthenticated, async (req, res) => {
    try {
      const { range, location } = req.query;
      const trends = await storage.getCostTrends(range as string, location as string);
      res.json(trends);
    } catch (error) {
      console.error("Error fetching cost trends:", error);
      res.status(500).json({ message: "Failed to fetch cost trends" });
    }
  });

  app.get('/api/budget-tracking', isAuthenticated, async (req, res) => {
    try {
      const { location } = req.query;
      const tracking = await storage.getBudgetTracking(location as string);
      res.json(tracking);
    } catch (error) {
      console.error("Error fetching budget tracking:", error);
      res.status(500).json({ message: "Failed to fetch budget tracking" });
    }
  });

  // Business Intelligence Routes
  app.get('/api/business-intelligence/daily-pnl', isAuthenticated, async (req, res) => {
    try {
      const { range, location } = req.query;
      const pnl = await storage.getDailyPnL(range as string, location as string);
      res.json(pnl);
    } catch (error) {
      console.error("Error fetching daily P&L:", error);
      res.status(500).json({ message: "Failed to fetch daily P&L" });
    }
  });

  app.get('/api/business-intelligence/kpis', isAuthenticated, async (req, res) => {
    try {
      const { range, location } = req.query;
      const kpis = await storage.getKPIMetrics(range as string, location as string);
      res.json(kpis);
    } catch (error) {
      console.error("Error fetching KPIs:", error);
      res.status(500).json({ message: "Failed to fetch KPIs" });
    }
  });

  app.get('/api/business-intelligence/profitability', isAuthenticated, async (req, res) => {
    try {
      const { range, location } = req.query;
      const analysis = await storage.getProfitabilityAnalysis(range as string, location as string);
      res.json(analysis);
    } catch (error) {
      console.error("Error fetching profitability analysis:", error);
      res.status(500).json({ message: "Failed to fetch profitability analysis" });
    }
  });

  app.get('/api/business-intelligence/menu-performance', isAuthenticated, async (req, res) => {
    try {
      const { range, location } = req.query;
      const performance = await storage.getMenuPerformance(range as string, location as string);
      res.json(performance);
    } catch (error) {
      console.error("Error fetching menu performance:", error);
      res.status(500).json({ message: "Failed to fetch menu performance" });
    }
  });

  app.get('/api/business-intelligence/cost-analysis', isAuthenticated, async (req, res) => {
    try {
      const { range, location } = req.query;
      const analysis = await storage.getCostAnalysis(range as string, location as string);
      res.json(analysis);
    } catch (error) {
      console.error("Error fetching cost analysis:", error);
      res.status(500).json({ message: "Failed to fetch cost analysis" });
    }
  });

  // Locations
  app.get('/api/locations', isAuthenticated, async (req, res) => {
    try {
      const locations = await storage.getLocations();
      res.json(locations);
    } catch (error) {
      console.error("Error fetching locations:", error);
      res.status(500).json({ message: "Failed to fetch locations" });
    }
  });

  app.post('/api/locations', isAuthenticated, async (req, res) => {
    try {
      const locationData = insertLocationSchema.parse(req.body);
      const location = await storage.createLocation(locationData);
      res.status(201).json(location);
    } catch (error) {
      console.error("Error creating location:", error);
      res.status(400).json({ message: "Failed to create location" });
    }
  });

  // Dashboard metrics
  app.get('/api/dashboard/metrics', isAuthenticated, async (req, res) => {
    try {
      const locationId = req.query.locationId as string;
      const metrics = await storage.getDashboardMetrics(locationId);
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching dashboard metrics:", error);
      res.status(500).json({ message: "Failed to fetch dashboard metrics" });
    }
  });

  // Categories
  app.get('/api/categories', isAuthenticated, async (req, res) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  app.post('/api/categories', isAuthenticated, async (req, res) => {
    try {
      const categoryData = insertCategorySchema.parse(req.body);
      const category = await storage.createCategory(categoryData);
      res.status(201).json(category);
    } catch (error) {
      console.error("Error creating category:", error);
      res.status(400).json({ message: "Failed to create category" });
    }
  });

  app.put('/api/categories/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const categoryData = insertCategorySchema.partial().parse(req.body);
      const category = await storage.updateCategory(id, categoryData);
      res.json(category);
    } catch (error) {
      console.error("Error updating category:", error);
      res.status(400).json({ message: "Failed to update category" });
    }
  });

  app.delete('/api/categories/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteCategory(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting category:", error);
      res.status(400).json({ message: "Failed to delete category" });
    }
  });

  // Vendors
  app.get('/api/vendors', isAuthenticated, async (req, res) => {
    try {
      const locationId = req.query.locationId as string;
      const vendors = await storage.getVendors(locationId);
      res.json(vendors);
    } catch (error) {
      console.error("Error fetching vendors:", error);
      res.status(500).json({ message: "Failed to fetch vendors" });
    }
  });

  app.get('/api/vendors/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const vendor = await storage.getVendor(id);
      if (!vendor) {
        return res.status(404).json({ message: "Vendor not found" });
      }
      res.json(vendor);
    } catch (error) {
      console.error("Error fetching vendor:", error);
      res.status(500).json({ message: "Failed to fetch vendor" });
    }
  });

  app.post('/api/vendors', isAuthenticated, async (req, res) => {
    try {
      const vendorData = insertVendorSchema.parse(req.body);
      const vendor = await storage.createVendor(vendorData);
      res.status(201).json(vendor);
    } catch (error) {
      console.error("Error creating vendor:", error);
      res.status(400).json({ message: "Failed to create vendor" });
    }
  });

  app.put('/api/vendors/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const vendorData = insertVendorSchema.partial().parse(req.body);
      const vendor = await storage.updateVendor(id, vendorData);
      res.json(vendor);
    } catch (error) {
      console.error("Error updating vendor:", error);
      res.status(400).json({ message: "Failed to update vendor" });
    }
  });

  app.delete('/api/vendors/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteVendor(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting vendor:", error);
      res.status(400).json({ message: "Failed to delete vendor" });
    }
  });

  // Inventory Items
  app.get('/api/inventory', isAuthenticated, async (req, res) => {
    try {
      const locationId = req.query.locationId as string;
      const items = await storage.getInventoryItems(locationId);
      res.json(items);
    } catch (error) {
      console.error("Error fetching inventory items:", error);
      res.status(500).json({ message: "Failed to fetch inventory items" });
    }
  });

  app.get('/api/inventory/low-stock', isAuthenticated, async (req, res) => {
    try {
      const locationId = req.query.locationId as string;
      const items = await storage.getLowStockItems(locationId);
      res.json(items);
    } catch (error) {
      console.error("Error fetching low stock items:", error);
      res.status(500).json({ message: "Failed to fetch low stock items" });
    }
  });

  app.get('/api/inventory/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const item = await storage.getInventoryItem(id);
      if (!item) {
        return res.status(404).json({ message: "Inventory item not found" });
      }
      res.json(item);
    } catch (error) {
      console.error("Error fetching inventory item:", error);
      res.status(500).json({ message: "Failed to fetch inventory item" });
    }
  });

  // Import invoice line items to inventory
  app.post('/api/inventory/import-from-invoice', isAuthenticated, async (req, res) => {
    try {
      const { items, locationId } = req.body;
      const userId = (req.user as any)?.claims?.sub;
      
      if (!items || !Array.isArray(items)) {
        return res.status(400).json({ message: "Invalid items data" });
      }

      if (!locationId) {
        return res.status(400).json({ message: "Location ID is required for import" });
      }

      console.log('🔄 Importing items to inventory for location:', locationId, items);

      // Verify the location exists
      const locations = await storage.getLocations();
      const targetLocation = locations.find(loc => loc.id === locationId);
      
      if (!targetLocation) {
        return res.status(400).json({ message: "Invalid location ID" });
      }

      let importedCount = 0;
      for (const item of items) {
        try {
          console.log('💾 Attempting to save item:', {
            name: item.name,
            description: `Imported from invoice`,
            locationId: targetLocation.id,
            quantity: item.quantity.toString(),
            unit: item.unit,
            costPerUnit: item.costPerUnit.toString(),
            reorderLevel: item.reorderLevel.toString(),
          });
          
          const savedItem = await storage.createInventoryItem({
            name: item.name,
            description: `Imported from invoice`,
            categoryId: null, // Will need to map to actual category
            locationId: targetLocation.id,
            quantity: item.quantity.toString(),
            unit: item.unit,
            costPerUnit: item.costPerUnit.toString(),
            reorderLevel: item.reorderLevel.toString(),
            vendorId: null, // No vendor mapping yet
          });
          
          console.log('✅ Item saved with ID:', savedItem.id);
          importedCount++;
        } catch (error) {
          console.error('❌ Error importing item:', item.name, error);
          // Continue with other items even if one fails
        }
      }

      console.log(`✅ Successfully imported ${importedCount} out of ${items.length} items`);
      
      // Verify the items were actually saved by checking inventory count
      const allInventory = await storage.getInventoryItems();
      console.log(`📊 Total inventory items in database: ${allInventory.length}`);
      
      res.json({ 
        message: "Items imported successfully", 
        count: importedCount,
        total: items.length 
      });
    } catch (error) {
      console.error("❌ Error importing items to inventory:", error);
      res.status(500).json({ message: "Failed to import items" });
    }
  });

  app.post('/api/inventory', isAuthenticated, async (req, res) => {
    try {
      const itemData = insertInventoryItemSchema.parse(req.body);
      const item = await storage.createInventoryItem(itemData);
      
      // Create inventory transaction for initial stock
      await storage.createInventoryTransaction({
        inventoryItemId: item.id,
        locationId: itemData.locationId,
        type: "in",
        quantity: itemData.quantity?.toString() || "0",
        reference: "Initial stock",
        createdBy: (req.user as any)?.claims?.sub || "system",
      });
      
      res.status(201).json(item);
    } catch (error) {
      console.error("Error creating inventory item:", error);
      res.status(400).json({ message: "Failed to create inventory item" });
    }
  });

  app.put('/api/inventory/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const itemData = insertInventoryItemSchema.partial().parse(req.body);
      const item = await storage.updateInventoryItem(id, itemData);
      res.json(item);
    } catch (error) {
      console.error("Error updating inventory item:", error);
      res.status(400).json({ message: "Failed to update inventory item" });
    }
  });

  app.delete('/api/inventory/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteInventoryItem(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting inventory item:", error);
      res.status(400).json({ message: "Failed to delete inventory item" });
    }
  });

  // Menu Items & Recipes
  // Recipes
  app.get('/api/recipes', isAuthenticated, async (req, res) => {
    try {
      const locationId = req.query.locationId as string;
      const recipes = await storage.getRecipes(locationId);
      res.json(recipes);
    } catch (error) {
      console.error("Error fetching recipes:", error);
      res.status(500).json({ message: "Failed to fetch recipes" });
    }
  });

  app.get('/api/recipes/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const recipe = await storage.getRecipe(id);
      if (!recipe) {
        return res.status(404).json({ message: "Recipe not found" });
      }
      res.json(recipe);
    } catch (error) {
      console.error("Error fetching recipe:", error);
      res.status(500).json({ message: "Failed to fetch recipe" });
    }
  });

  app.post('/api/recipes', isAuthenticated, async (req, res) => {
    try {
      const { ingredients, ...recipeData } = req.body;
      const parsedRecipeData = insertRecipeSchema.parse(recipeData);
      
      if (ingredients && ingredients.length > 0) {
        // Create recipe with ingredients
        const recipe = await storage.createRecipeWithIngredients({
          ...parsedRecipeData,
          ingredients: ingredients.map((ing: any) => ({
            inventoryItemId: ing.inventoryItemId,
            quantity: ing.quantity,
            unit: ing.unit
          }))
        });
        res.status(201).json(recipe);
      } else {
        // Create recipe without ingredients
        const recipe = await storage.createRecipe(parsedRecipeData);
        res.status(201).json(recipe);
      }
    } catch (error) {
      console.error("Error creating recipe:", error);
      res.status(400).json({ message: "Failed to create recipe" });
    }
  });

  app.put('/api/recipes/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const recipeData = insertRecipeSchema.partial().parse(req.body);
      const recipe = await storage.updateRecipe(id, recipeData);
      res.json(recipe);
    } catch (error) {
      console.error("Error updating recipe:", error);
      res.status(400).json({ message: "Failed to update recipe" });
    }
  });

  app.delete('/api/recipes/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteRecipe(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting recipe:", error);
      res.status(400).json({ message: "Failed to delete recipe" });
    }
  });

  // Menu items (separate from recipes)
  app.get('/api/menu-items', isAuthenticated, async (req, res) => {
    try {
      const menuItems = await storage.getMenuItems();
      res.json(menuItems);
    } catch (error) {
      console.error("Error fetching menu items:", error);
      res.status(500).json({ message: "Failed to fetch menu items" });
    }
  });

  app.post('/api/menu-items', isAuthenticated, async (req, res) => {
    try {
      const menuItemData = insertMenuItemSchema.parse(req.body);
      const menuItem = await storage.createMenuItem(menuItemData);
      res.status(201).json(menuItem);
    } catch (error) {
      console.error("Error creating menu item:", error);
      res.status(400).json({ message: "Failed to create menu item" });
    }
  });

  // Menu item ingredients
  app.post('/api/recipes/:id/ingredients', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const ingredientData = insertMenuItemIngredientSchema.parse({
        ...req.body,
        menuItemId: id,
      });
      const ingredient = await storage.addMenuItemIngredient(ingredientData);
      res.status(201).json(ingredient);
    } catch (error) {
      console.error("Error adding menu item ingredient:", error);
      res.status(400).json({ message: "Failed to add menu item ingredient" });
    }
  });

  app.delete('/api/menu-item-ingredients/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.removeMenuItemIngredient(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error removing menu item ingredient:", error);
      res.status(400).json({ message: "Failed to remove menu item ingredient" });
    }
  });

  // Purchase Orders
  app.get('/api/purchase-orders', isAuthenticated, async (req, res) => {
    try {
      const locationId = req.query.locationId as string;
      const orders = await storage.getPurchaseOrders(locationId);
      res.json(orders);
    } catch (error) {
      console.error("Error fetching purchase orders:", error);
      res.status(500).json({ message: "Failed to fetch purchase orders" });
    }
  });

  app.get('/api/purchase-orders/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const order = await storage.getPurchaseOrder(id);
      if (!order) {
        return res.status(404).json({ message: "Purchase order not found" });
      }
      res.json(order);
    } catch (error) {
      console.error("Error fetching purchase order:", error);
      res.status(500).json({ message: "Failed to fetch purchase order" });
    }
  });

  app.post('/api/purchase-orders', isAuthenticated, async (req, res) => {
    try {
      // Generate order number
      const orderNumber = `PO-${Date.now()}`;
      
      // Convert string dates to Date objects and prepare data
      const orderData = {
        orderNumber,
        vendorId: req.body.vendorId,
        locationId: req.body.locationId,
        status: req.body.status || "draft",
        orderDate: req.body.orderDate ? new Date(req.body.orderDate) : new Date(),
        expectedDeliveryDate: req.body.expectedDeliveryDate && req.body.expectedDeliveryDate.trim() !== '' ? new Date(req.body.expectedDeliveryDate) : null,
        totalAmount: req.body.totalAmount,
        notes: req.body.notes || null,
        createdBy: (req.user as any)?.claims?.sub,
      };
      
      const order = await storage.createPurchaseOrder(orderData);
      res.status(201).json(order);
    } catch (error) {
      console.error("Error creating purchase order:", error);
      res.status(400).json({ message: "Failed to create purchase order" });
    }
  });

  app.put('/api/purchase-orders/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Get current order to check status change
      const currentOrder = await storage.getPurchaseOrder(id);
      if (!currentOrder) {
        return res.status(404).json({ message: "Purchase order not found" });
      }
      
      // Convert string dates to Date objects and prepare data
      const orderData = {
        vendorId: req.body.vendorId,
        status: req.body.status,
        orderDate: req.body.orderDate ? new Date(req.body.orderDate) : undefined,
        expectedDeliveryDate: req.body.expectedDeliveryDate && req.body.expectedDeliveryDate.trim() !== '' ? new Date(req.body.expectedDeliveryDate) : null,
        totalAmount: req.body.totalAmount,
        notes: req.body.notes || null,
      };
      
      // Update the purchase order
      const order = await storage.updatePurchaseOrder(id, orderData);
      
      // If status changed to "delivered", automatically receive inventory
      if (req.body.status === 'delivered' && currentOrder.status !== 'delivered') {
        console.log(`Purchase order ${id} marked as delivered - processing inventory receiving...`);
        
        // Get purchase order items and update inventory
        const orderWithItems = await storage.getPurchaseOrder(id);
        if (orderWithItems && orderWithItems.items.length > 0) {
          for (const item of orderWithItems.items) {
            try {
              // Create inventory transaction for receiving
              await storage.createInventoryTransaction({
                inventoryItemId: item.inventoryItemId,
                locationId: currentOrder.locationId,
                type: 'in',
                quantity: item.quantity.toString(),
                reference: `PO-${currentOrder.orderNumber}`,
                notes: `Received from purchase order ${currentOrder.orderNumber}`,
                createdBy: (req.user as any)?.claims?.sub
              });
              
              // Update inventory quantity
              const inventoryItem = await storage.getInventoryItem(item.inventoryItemId);
              if (inventoryItem) {
                const newQuantity = parseFloat(inventoryItem.quantity) + parseFloat(item.quantity.toString());
                await storage.updateInventoryItem(item.inventoryItemId, {
                  quantity: newQuantity.toString()
                });
                console.log(`Updated inventory ${inventoryItem.name}: +${item.quantity} (new total: ${newQuantity})`);
              }
            } catch (error) {
              console.error(`Error receiving item ${item.inventoryItemId}:`, error);
            }
          }
          console.log(`Successfully received ${orderWithItems.items.length} items into inventory`);
        }
      }
      
      res.json(order);
    } catch (error) {
      console.error("Error updating purchase order:", error);
      res.status(400).json({ message: "Failed to update purchase order" });
    }
  });

  app.delete('/api/purchase-orders/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deletePurchaseOrder(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting purchase order:", error);
      res.status(400).json({ message: "Failed to delete purchase order" });
    }
  });

  // Create purchase order from low stock items
  app.post('/api/purchase-orders/from-low-stock', isAuthenticated, async (req, res) => {
    try {
      const { vendorId, locationId, lowStockItems } = req.body;
      
      if (!vendorId || !locationId || !lowStockItems || lowStockItems.length === 0) {
        return res.status(400).json({ message: "Missing required fields: vendorId, locationId, or lowStockItems" });
      }
      
      // Generate order number
      const orderNumber = `PO-${Date.now()}`;
      
      // Calculate total amount from items
      let totalAmount = 0;
      const orderItems = lowStockItems.map((item: any) => {
        const itemTotal = parseFloat(item.unitCost || item.cost || 0) * parseFloat(item.quantity || 1);
        totalAmount += itemTotal;
        return {
          inventoryItemId: item.id,
          quantity: item.quantity || (parseFloat(item.reorderLevel) * 2).toString(), // Order 2x reorder level if no quantity specified
          unitCost: item.unitCost || item.cost || "0",
          totalCost: itemTotal.toString()
        };
      });
      
      // Create purchase order
      const orderData = {
        orderNumber,
        vendorId,
        locationId,
        status: "draft",
        orderDate: new Date(),
        expectedDeliveryDate: null,
        totalAmount: totalAmount.toString(),
        notes: `Auto-generated from ${lowStockItems.length} low stock items`,
        createdBy: (req.user as any)?.claims?.sub,
      };
      
      const order = await storage.createPurchaseOrder(orderData);
      
      // Add items to purchase order
      for (const itemData of orderItems) {
        await storage.addPurchaseOrderItem({
          ...itemData,
          purchaseOrderId: order.id
        });
      }
      
      console.log(`Created purchase order ${orderNumber} for ${orderItems.length} low stock items`);
      res.status(201).json({
        ...order,
        items: orderItems,
        message: `Purchase order created with ${orderItems.length} items`
      });
    } catch (error) {
      console.error("Error creating purchase order from low stock:", error);
      res.status(400).json({ message: "Failed to create purchase order from low stock items" });
    }
  });

  // Purchase order items
  app.post('/api/purchase-orders/:id/items', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const itemData = insertPurchaseOrderItemSchema.parse({
        ...req.body,
        purchaseOrderId: id,
      });
      const item = await storage.addPurchaseOrderItem(itemData);
      res.status(201).json(item);
    } catch (error) {
      console.error("Error adding purchase order item:", error);
      res.status(400).json({ message: "Failed to add purchase order item" });
    }
  });

  app.delete('/api/purchase-order-items/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.removePurchaseOrderItem(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error removing purchase order item:", error);
      res.status(400).json({ message: "Failed to remove purchase order item" });
    }
  });

  // Waste Tracking
  app.get('/api/waste', isAuthenticated, async (req, res) => {
    try {
      const locationId = req.query.locationId as string;
      const entries = await storage.getWasteEntries(locationId);
      res.json(entries);
    } catch (error) {
      console.error("Error fetching waste entries:", error);
      res.status(500).json({ message: "Failed to fetch waste entries" });
    }
  });

  app.post('/api/waste', isAuthenticated, async (req, res) => {
    try {
      const wasteData = insertWasteEntrySchema.parse({
        ...req.body,
        reportedBy: (req.user as any)?.claims?.sub,
      });
      const entry = await storage.createWasteEntry(wasteData);
      
      // Create inventory transaction for waste
      await storage.createInventoryTransaction({
        inventoryItemId: wasteData.inventoryItemId!,
        locationId: wasteData.locationId,
        type: "out",
        quantity: wasteData.quantity,
        reference: `Waste: ${wasteData.reason}`,
        notes: wasteData.notes,
        createdBy: (req.user as any)?.claims?.sub,
      });
      
      res.status(201).json(entry);
    } catch (error) {
      console.error("Error creating waste entry:", error);
      res.status(400).json({ message: "Failed to create waste entry" });
    }
  });

  app.get('/api/waste/stats', isAuthenticated, async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;
      const stats = await storage.getWasteStats(start, end);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching waste stats:", error);
      res.status(500).json({ message: "Failed to fetch waste stats" });
    }
  });

  // Inventory Transactions
  app.get('/api/transactions', isAuthenticated, async (req, res) => {
    try {
      const { itemId } = req.query;
      const transactions = await storage.getInventoryTransactions(itemId as string);
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching inventory transactions:", error);
      res.status(500).json({ message: "Failed to fetch inventory transactions" });
    }
  });

  app.post('/api/transactions', isAuthenticated, async (req, res) => {
    try {
      const transactionData = insertInventoryTransactionSchema.parse({
        ...req.body,
        createdBy: (req.user as any)?.claims?.sub,
      });
      const transaction = await storage.createInventoryTransaction(transactionData);
      res.status(201).json(transaction);
    } catch (error) {
      console.error("Error creating inventory transaction:", error);
      res.status(400).json({ message: "Failed to create inventory transaction" });
    }
  });

  // Universal POS Integration Routes
  app.get("/api/pos/integrations", isAuthenticated, async (req, res) => {
    try {
      const locationId = req.query.locationId as string;
      const integrations = await storage.getPosIntegrations(locationId);
      res.json(integrations);
    } catch (error) {
      console.error("Error fetching POS integrations:", error);
      res.status(500).json({ message: "Failed to fetch POS integrations" });
    }
  });

  app.post("/api/pos/integrations", isAuthenticated, async (req, res) => {
    try {
      const integrationData = insertPosIntegrationSchema.parse(req.body);
      const integration = await storage.createPosIntegration(integrationData);
      res.status(201).json(integration);
    } catch (error) {
      console.error("Error creating POS integration:", error);
      res.status(500).json({ message: "Failed to create POS integration" });
    }
  });

  app.get("/api/pos/integrations/:id/test", isAuthenticated, async (req, res) => {
    try {
      const success = await posService.testConnection(req.params.id);
      res.json({ success });
    } catch (error) {
      console.error("Error testing POS connection:", error);
      res.status(500).json({ message: "Failed to test POS connection" });
    }
  });

  app.post("/api/pos/integrations/:id/sync", isAuthenticated, async (req, res) => {
    try {
      await posService.syncMenuItems(req.params.id);
      res.json({ message: "Menu items synced successfully" });
    } catch (error) {
      console.error("Error syncing menu items:", error);
      res.status(500).json({ message: "Failed to sync menu items" });
    }
  });

  app.put("/api/pos/integrations/:id", isAuthenticated, async (req, res) => {
    try {
      const integrationData = insertPosIntegrationSchema.partial().parse(req.body);
      const integration = await storage.updatePosIntegration(req.params.id, integrationData);
      res.json(integration);
    } catch (error) {
      console.error("Error updating POS integration:", error);
      res.status(500).json({ message: "Failed to update POS integration" });
    }
  });

  app.delete("/api/pos/integrations/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deletePosIntegration(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting POS integration:", error);
      res.status(500).json({ message: "Failed to delete POS integration" });
    }
  });

  // POS Sales data
  app.get("/api/pos/sales", isAuthenticated, async (req, res) => {
    try {
      const locationId = req.query.locationId as string;
      const sales = await storage.getPosSales(locationId);
      res.json(sales);
    } catch (error) {
      console.error("Error fetching POS sales:", error);
      res.status(500).json({ message: "Failed to fetch POS sales" });
    }
  });

  // Universal POS webhook endpoint (not protected by auth)
  app.post("/api/pos/webhook", async (req, res) => {
    try {
      console.log('Received POS webhook:', {
        headers: req.headers,
        body: req.body,
        timestamp: new Date().toISOString()
      });
      
      await posService.processOrderWebhook(req.body);
      
      res.status(200).json({ 
        message: "Webhook processed successfully",
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error processing POS webhook:", error);
      res.status(500).json({ 
        message: "Failed to process webhook",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Clover-specific webhook endpoint with enhanced logging
  app.post("/api/webhooks/clover", async (req, res) => {
    try {
      const signature = req.headers['x-clover-signature'] as string;
      console.log('Received Clover webhook:', {
        signature,
        eventType: req.body.eventType,
        merchantId: req.body.merchantId,
        objectId: req.body.objectId,
        timestamp: new Date().toISOString()
      });
      
      // Process the webhook
      await posService.processOrderWebhook(req.body);
      
      res.status(200).json({ 
        message: "Clover webhook processed successfully",
        eventType: req.body.eventType,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error processing Clover webhook:", error);
      res.status(500).json({ 
        message: "Failed to process Clover webhook",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Webhook status endpoint
  app.get("/api/pos/webhook-status", isAuthenticated, async (req, res) => {
    try {
      const integrations = await storage.getPosIntegrations();
      const webhookStatus = integrations.map(integration => ({
        id: integration.id,
        provider: integration.provider,
        name: integration.name,
        isActive: integration.isActive,
        lastSyncAt: integration.lastSyncAt,
        webhookUrl: `${req.protocol}://${req.get('host')}/api/webhooks/${integration.provider}`,
        status: integration.isActive ? 'active' : 'inactive'
      }));
      
      res.json(webhookStatus);
    } catch (error) {
      console.error("Error fetching webhook status:", error);
      res.status(500).json({ message: "Failed to fetch webhook status" });
    }
  });

  // Analytics routes
  app.get('/api/analytics/alerts', isAuthenticated, async (req: any, res) => {
    try {
      const locationId = req.query.locationId;
      const result = await db.execute(sql`
        SELECT * FROM cost_alerts 
        WHERE location_id = ${locationId}::uuid AND is_active = true
        ORDER BY severity DESC, created_at DESC
        LIMIT 20
      `);
      res.json(result.rows);
    } catch (error) {
      console.error("Error fetching alerts:", error);
      res.status(500).json({ message: "Failed to fetch alerts" });
    }
  });

  app.get('/api/analytics/business-intelligence', isAuthenticated, async (req: any, res) => {
    try {
      const locationId = req.query.locationId;
      const period = req.query.period || 'today';
      
      let dateCondition = sql`DATE(report_date) = CURRENT_DATE`;
      if (period === 'week') {
        dateCondition = sql`report_date >= CURRENT_DATE - INTERVAL '7 days'`;
      } else if (period === 'month') {
        dateCondition = sql`report_date >= CURRENT_DATE - INTERVAL '30 days'`;
      }
      
      const result = await db.execute(sql`
        SELECT * FROM business_intelligence 
        WHERE location_id = ${locationId}::uuid AND report_date >= CURRENT_DATE - INTERVAL '30 days'
        ORDER BY report_date DESC
        LIMIT 1
      `);
      
      res.json(result.rows[0] || null);
    } catch (error) {
      console.error("Error fetching business intelligence:", error);
      res.status(500).json({ message: "Failed to fetch analytics data" });
    }
  });

  app.get('/api/analytics/profit-loss', isAuthenticated, async (req: any, res) => {
    try {
      const locationId = req.query.locationId;
      const period = req.query.period || 'today';
      
      // Calculate date range
      let startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
      let endDate = new Date();
      endDate.setHours(23, 59, 59, 999);
      
      if (period === 'week') {
        startDate.setDate(startDate.getDate() - 7);
      } else if (period === 'month') {
        startDate.setMonth(startDate.getMonth() - 1);
      }

      // Get sales data
      const salesResult = await db.execute(sql`
        SELECT COALESCE(SUM(CAST(total AS DECIMAL)), 0) as total_revenue,
               COUNT(*) as transaction_count
        FROM pos_sales 
        WHERE location_id = ${locationId}::uuid 
        AND order_date BETWEEN ${startDate.toISOString()}::timestamp AND ${endDate.toISOString()}::timestamp
      `);

      // Get purchase data
      const purchaseResult = await db.execute(sql`
        SELECT COALESCE(SUM(CAST(total_amount AS DECIMAL)), 0) as total_purchases
        FROM purchase_orders 
        WHERE location_id = ${locationId}::uuid 
        AND order_date BETWEEN ${startDate.toISOString()}::timestamp AND ${endDate.toISOString()}::timestamp
        AND status = 'delivered'
      `);

      const sales = salesResult.rows[0];
      const purchases = purchaseResult.rows[0];
      
      const totalRevenue = parseFloat(String(sales.total_revenue)) || 0;
      const totalPurchases = parseFloat(String(purchases.total_purchases)) || 0;
      const grossProfit = totalRevenue - totalPurchases;
      const grossMarginPercentage = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
      
      const report = {
        period: { startDate, endDate },
        revenue: {
          total: totalRevenue,
          transactionCount: parseInt(String(sales.transaction_count)) || 0,
          averageTicket: Number(sales.transaction_count) > 0 ? totalRevenue / parseInt(String(sales.transaction_count)) : 0
        },
        cogs: {
          total: totalPurchases,
          percentage: totalRevenue > 0 ? (totalPurchases / totalRevenue) * 100 : 0
        },
        margins: {
          grossProfit,
          grossMarginPercentage
        }
      };
      
      res.json(report);
    } catch (error) {
      console.error("Error generating P&L report:", error);
      res.status(500).json({ message: "Failed to generate P&L report" });
    }
  });

  // HR Employee Management Add-on API Endpoints (15 endpoints)
  
  // HR Departments
  app.get('/api/hr/departments', isAuthenticated, async (req, res) => {
    try {
      const departments = await storage.getDepartments();
      res.json(departments);
    } catch (error) {
      console.error('Error fetching departments:', error);
      res.status(500).json({ message: 'Failed to fetch departments' });
    }
  });

  app.post('/api/hr/departments', isAuthenticated, async (req, res) => {
    try {
      const department = await storage.createDepartment(req.body);
      res.status(201).json(department);
    } catch (error) {
      console.error('Error creating department:', error);
      res.status(500).json({ message: 'Failed to create department' });
    }
  });

  app.put('/api/hr/departments/:id', isAuthenticated, async (req, res) => {
    try {
      const department = await storage.updateDepartment(req.params.id, req.body);
      res.json(department);
    } catch (error) {
      console.error('Error updating department:', error);
      res.status(500).json({ message: 'Failed to update department' });
    }
  });

  // HR Positions
  app.get('/api/hr/positions', isAuthenticated, async (req, res) => {
    try {
      const positions = await storage.getPositions();
      res.json(positions);
    } catch (error) {
      console.error('Error fetching positions:', error);
      res.status(500).json({ message: 'Failed to fetch positions' });
    }
  });

  app.post('/api/hr/positions', isAuthenticated, async (req, res) => {
    try {
      const position = await storage.createPosition(req.body);
      res.status(201).json(position);
    } catch (error) {
      console.error('Error creating position:', error);
      res.status(500).json({ message: 'Failed to create position' });
    }
  });

  // HR Employees
  app.get('/api/hr/employees', isAuthenticated, async (req, res) => {
    try {
      const employees = await storage.getEmployees();
      res.json(employees);
    } catch (error) {
      console.error('Error fetching employees:', error);
      res.status(500).json({ message: 'Failed to fetch employees' });
    }
  });

  app.post('/api/hr/employees', isAuthenticated, async (req, res) => {
    try {
      const employee = await storage.createEmployee(req.body);
      res.status(201).json(employee);
    } catch (error) {
      console.error('Error creating employee:', error);
      res.status(500).json({ message: 'Failed to create employee' });
    }
  });

  app.put('/api/hr/employees/:id', isAuthenticated, async (req, res) => {
    try {
      const employee = await storage.updateEmployee(req.params.id, req.body);
      res.json(employee);
    } catch (error) {
      console.error('Error updating employee:', error);
      res.status(500).json({ message: 'Failed to update employee' });
    }
  });

  // HR Scheduling
  app.get('/api/hr/shifts', isAuthenticated, async (req, res) => {
    try {
      const shifts = await storage.getShifts();
      res.json(shifts);
    } catch (error) {
      console.error('Error fetching shifts:', error);
      res.status(500).json({ message: 'Failed to fetch shifts' });
    }
  });

  app.post('/api/hr/shifts', isAuthenticated, async (req, res) => {
    try {
      const shift = await storage.createShift(req.body);
      res.status(201).json(shift);
    } catch (error) {
      console.error('Error creating shift:', error);
      res.status(500).json({ message: 'Failed to create shift' });
    }
  });

  app.put('/api/hr/shifts/:id', isAuthenticated, async (req, res) => {
    try {
      const shift = await storage.updateShift(req.params.id, req.body);
      res.json(shift);
    } catch (error) {
      console.error('Error updating shift:', error);
      res.status(500).json({ message: 'Failed to update shift' });
    }
  });

  app.delete('/api/hr/shifts/:id', isAuthenticated, async (req, res) => {
    try {
      await storage.deleteShift(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting shift:', error);
      res.status(500).json({ message: 'Failed to delete shift' });
    }
  });

  // HR Time-off Requests
  app.get('/api/hr/time-off-requests', isAuthenticated, async (req, res) => {
    try {
      const requests = await storage.getTimeOffRequests();
      res.json(requests);
    } catch (error) {
      console.error('Error fetching time-off requests:', error);
      res.status(500).json({ message: 'Failed to fetch time-off requests' });
    }
  });

  app.post('/api/hr/time-off-requests', isAuthenticated, async (req, res) => {
    try {
      const request = await storage.createTimeOffRequest(req.body);
      res.status(201).json(request);
    } catch (error) {
      console.error('Error creating time-off request:', error);
      res.status(500).json({ message: 'Failed to create time-off request' });
    }
  });

  app.put('/api/hr/time-off-requests/:id/status', isAuthenticated, async (req, res) => {
    try {
      const { status, notes } = req.body;
      const request = await storage.updateTimeOffRequestStatus(req.params.id, status, notes, (req.user as any)?.claims?.sub);
      res.json(request);
    } catch (error) {
      console.error('Error updating time-off request status:', error);
      res.status(500).json({ message: 'Failed to update time-off request status' });
    }
  });

  // HR Analytics and Reports
  app.get('/api/hr/analytics', isAuthenticated, async (req, res) => {
    try {
      const analytics = await storage.getHRAnalytics();
      res.json(analytics);
    } catch (error) {
      console.error('Error fetching HR analytics:', error);
      res.status(500).json({ message: 'Failed to fetch HR analytics' });
    }
  });

  // HR Tasks
  app.get('/api/hr/tasks', isAuthenticated, async (req, res) => {
    try {
      const tasks = await storage.getTasks();
      res.json(tasks);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      res.status(500).json({ message: 'Failed to fetch tasks' });
    }
  });

  app.post('/api/hr/tasks', isAuthenticated, async (req, res) => {
    try {
      const task = await storage.createTask(req.body);
      res.status(201).json(task);
    } catch (error) {
      console.error('Error creating task:', error);
      res.status(500).json({ message: 'Failed to create task' });
    }
  });

  // HR Time Clock
  app.get('/api/hr/time-entries', isAuthenticated, async (req, res) => {
    try {
      const timeEntries = await storage.getTimeEntries();
      res.json(timeEntries);
    } catch (error) {
      console.error('Error fetching time entries:', error);
      res.status(500).json({ message: 'Failed to fetch time entries' });
    }
  });

  app.post('/api/hr/time-clock/in/:employeeId', isAuthenticated, async (req, res) => {
    try {
      const { shiftId } = req.body;
      const entry = await storage.clockIn(req.params.employeeId, shiftId);
      res.status(201).json(entry);
    } catch (error) {
      console.error('Error clocking in:', error);
      res.status(500).json({ message: 'Failed to clock in' });
    }
  });

  app.post('/api/hr/time-clock/out/:entryId', isAuthenticated, async (req, res) => {
    try {
      const entry = await storage.clockOut(req.params.entryId);
      res.json(entry);
    } catch (error) {
      console.error('Error clocking out:', error);
      res.status(500).json({ message: 'Failed to clock out' });
    }
  });

  // HR Payroll
  app.get('/api/hr/payroll/pay-periods', isAuthenticated, async (req, res) => {
    try {
      const payPeriods = await storage.getPayPeriods();
      res.json(payPeriods);
    } catch (error) {
      console.error('Error fetching pay periods:', error);
      res.status(500).json({ message: 'Failed to fetch pay periods' });
    }
  });

  app.post('/api/hr/payroll/pay-periods', isAuthenticated, async (req, res) => {
    try {
      const payPeriod = await storage.createPayPeriod(req.body);
      res.status(201).json(payPeriod);
    } catch (error) {
      console.error('Error creating pay period:', error);
      res.status(500).json({ message: 'Failed to create pay period' });
    }
  });

  app.post('/api/hr/payroll/pay-periods/:id/calculate', isAuthenticated, async (req, res) => {
    try {
      const paystubs = await storage.calculatePayroll(req.params.id);
      res.json(paystubs);
    } catch (error) {
      console.error('Error calculating payroll:', error);
      res.status(500).json({ message: 'Failed to calculate payroll' });
    }
  });

  app.post('/api/hr/payroll/pay-periods/:id/recalculate', isAuthenticated, async (req, res) => {
    try {
      const paystubs = await storage.recalculatePayroll(req.params.id);
      res.json(paystubs);
    } catch (error) {
      console.error('Error recalculating payroll:', error);
      res.status(500).json({ message: 'Failed to recalculate payroll' });
    }
  });

  app.post('/api/hr/payroll/pay-periods/:id/approve', isAuthenticated, async (req, res) => {
    try {
      const payPeriod = await storage.approvePayroll(req.params.id, (req.user as any)?.claims?.sub);
      res.json(payPeriod);
    } catch (error) {
      console.error('Error approving payroll:', error);
      res.status(500).json({ message: 'Failed to approve payroll' });
    }
  });

  app.get('/api/hr/payroll/paystubs/:payPeriodId', isAuthenticated, async (req, res) => {
    try {
      const paystubs = await storage.getPaystubsByPeriod(req.params.payPeriodId);
      res.json(paystubs);
    } catch (error) {
      console.error('Error fetching paystubs:', error);
      res.status(500).json({ message: 'Failed to fetch paystubs' });
    }
  });

  app.get('/api/hr/payroll/deductions', isAuthenticated, async (req, res) => {
    try {
      const deductions = await storage.getPayrollDeductions();
      res.json(deductions);
    } catch (error) {
      console.error('Error fetching deductions:', error);
      res.status(500).json({ message: 'Failed to fetch deductions' });
    }
  });

  app.get('/api/hr/payroll/summary', isAuthenticated, async (req, res) => {
    try {
      const summary = await storage.getPayrollSummary();
      res.json(summary);
    } catch (error) {
      console.error('Error fetching payroll summary:', error);
      res.status(500).json({ message: 'Failed to fetch payroll summary' });
    }
  });

  // Update time entry (for managers to edit punches)
  app.put('/api/hr/time-entries/:id', isAuthenticated, async (req, res) => {
    try {
      const { clockInTime, clockOutTime, breakStartTime, breakEndTime, notes } = req.body;
      const updateData: any = {};
      
      if (clockInTime) updateData.clockInTime = new Date(clockInTime);
      if (clockOutTime) updateData.clockOutTime = new Date(clockOutTime);
      if (breakStartTime) updateData.breakStartTime = new Date(breakStartTime);
      if (breakEndTime) updateData.breakEndTime = new Date(breakEndTime);
      if (notes !== undefined) updateData.notes = notes;
      
      const timeEntry = await storage.updateTimeEntry(req.params.id, updateData);
      res.json(timeEntry);
    } catch (error) {
      console.error('Error updating time entry:', error);
      res.status(500).json({ message: 'Failed to update time entry' });
    }
  });

  // Delete time entry
  app.delete('/api/hr/time-entries/:id', isAuthenticated, async (req, res) => {
    try {
      await storage.deleteTimeEntry(req.params.id);
      res.json({ message: 'Time entry deleted successfully' });
    } catch (error) {
      console.error('Error deleting time entry:', error);
      res.status(500).json({ message: 'Failed to delete time entry' });
    }
  });

  // HR Messaging
  app.get('/api/hr/messages', isAuthenticated, async (req, res) => {
    try {
      const messages = await storage.getMessages();
      res.json(messages);
    } catch (error) {
      console.error('Error fetching messages:', error);
      res.status(500).json({ message: 'Failed to fetch messages' });
    }
  });

  app.post('/api/hr/messages', isAuthenticated, async (req, res) => {
    try {
      const messageData = {
        ...req.body,
        senderId: (req.user as any)?.claims?.sub,
      };
      const message = await storage.createMessage(messageData);
      res.status(201).json(message);
    } catch (error) {
      console.error('Error creating message:', error);
      res.status(500).json({ message: 'Failed to create message' });
    }
  });

  // ============================================================================
  // AUTOMATED ORDERING ROUTES - TEMPORARILY DISABLED (COMING SOON FEATURE)
  // ============================================================================
  // Original functionality backed up in: backup/advanced-features/
  
  // Temporary placeholder route for coming soon feature
  app.get('/api/auto-ordering/rules', isAuthenticated, async (req: any, res) => {
    res.json([]); // Return empty array for coming soon feature
  });


  // ============================================================================
  // DEMAND FORECASTING ROUTES - TEMPORARILY DISABLED (COMING SOON FEATURE)
  // ============================================================================
  // Original functionality backed up in: backup/advanced-features/

  // Analytics and Activity Routes
  app.get('/api/activities', isAuthenticated, async (req, res) => {
    try {
      const locationId = req.query.locationId as string;
      // Return recent activities from various operations
      const activities: any[] = [];
      
      // Get recent inventory additions (last 10)
      const recentInventory = await db
        .select({
          id: inventoryItems.id,
          name: inventoryItems.name,
          createdAt: inventoryItems.createdAt,
        })
        .from(inventoryItems)
        .where(locationId ? eq(inventoryItems.locationId, locationId) : sql`1=1`)
        .orderBy(desc(inventoryItems.createdAt))
        .limit(5);
      
      recentInventory.forEach(item => {
        activities.push({
          id: `inv_${item.id}`,
          type: 'inventory',
          description: `Added ${item.name} to inventory`,
          createdAt: item.createdAt,
          user: 'System'
        });
      });
      
      // Get recent recipes (last 5)
      const recentRecipes = await db
        .select({
          id: recipes.id,
          name: recipes.name,
          createdAt: recipes.createdAt,
        })
        .from(recipes)
        .where(locationId ? eq(recipes.locationId, locationId) : sql`1=1`)
        .orderBy(desc(recipes.createdAt))
        .limit(3);
      
      recentRecipes.forEach(recipe => {
        activities.push({
          id: `recipe_${recipe.id}`,
          type: 'recipe',
          description: `Created recipe: ${recipe.name}`,
          createdAt: recipe.createdAt,
          user: 'Chef'
        });
      });
      
      // Sort by creation date and return most recent
      activities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      res.json(activities.slice(0, 8));
    } catch (error) {
      console.error("Error fetching activities:", error);
      res.status(500).json({ message: "Failed to fetch activities" });
    }
  });

  app.get('/api/analytics/realtime', isAuthenticated, async (req, res) => {
    try {
      const locationId = req.query.locationId as string;
      
      // Get basic metrics from POS sales if available
      const salesData = await db
        .select({
          totalSales: sql<number>`COALESCE(SUM(CAST(${posSales.total} AS DECIMAL)), 0)`,
          orderCount: sql<number>`COUNT(*)`,
        })
        .from(posSales)
        .where(
          sql`${posSales.orderDate} >= CURRENT_DATE 
          ${locationId ? sql`AND ${posSales.locationId} = ${locationId}` : sql``}`
        );
      
      const todaysSales = salesData[0] || { totalSales: 0, orderCount: 0 };
      const avgOrderValue = todaysSales.orderCount > 0 ? todaysSales.totalSales / todaysSales.orderCount : 0;
      
      res.json({
        currentSales: Number(todaysSales.totalSales),
        ordersToday: Number(todaysSales.orderCount),
        avgOrderValue: Number(avgOrderValue),
        kitchenWaitTime: 8.5, // This would come from POS integration
        topSellingItems: [] // This would be calculated from POS data
      });
    } catch (error) {
      console.error("Error fetching real-time data:", error);
      res.status(500).json({ message: "Failed to fetch real-time data" });
    }
  });

  app.get('/api/analytics/sales-trend', isAuthenticated, async (req, res) => {
    try {
      const locationId = req.query.locationId as string;
      const timeRange = req.query.timeRange as string || '7d';
      
      // Generate hourly sales data based on actual POS data or simulate if no data
      const hourlyData = [];
      for (let hour = 0; hour < 24; hour++) {
        // In a real implementation, this would query actual POS data grouped by hour
        const salesForHour = Math.floor(Math.random() * 500 + 100); // Placeholder
        hourlyData.push({
          hour,
          sales: salesForHour,
          orders: Math.floor(salesForHour / 25),
          avgOrder: 25
        });
      }
      
      res.json(hourlyData);
    } catch (error) {
      console.error("Error fetching sales trend:", error);
      res.status(500).json({ message: "Failed to fetch sales trend" });
    }
  });

  app.get('/api/waste/summary', isAuthenticated, async (req, res) => {
    try {
      const locationId = req.query.locationId as string;
      
      // Get waste data from database
      const wasteStats = await db
        .select({
          category: wasteEntries.reason,
          totalAmount: sql<number>`SUM(CAST(${wasteEntries.quantity} AS DECIMAL))`,
          totalCost: sql<number>`SUM(CAST(${wasteEntries.cost} AS DECIMAL))`,
        })
        .from(wasteEntries)
        .where(
          sql`${wasteEntries.createdAt} >= CURRENT_DATE - INTERVAL '7 days'
          ${locationId ? sql`AND ${wasteEntries.locationId} = ${locationId}` : sql``}`
        )
        .groupBy(wasteEntries.reason);
      
      const colorMap: { [key: string]: string } = {
        'food_prep': '#EF4444',
        'spoilage': '#F59E0B',
        'customer_leftover': '#10B981',
        'overproduction': '#8B5CF6'
      };
      
      const formattedWaste = wasteStats.map(stat => ({
        category: stat.category?.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'Other',
        amount: Number(stat.totalAmount || 0),
        cost: Number(stat.totalCost || 0),
        color: colorMap[stat.category || ''] || '#6B7280'
      }));
      
      res.json(formattedWaste);
    } catch (error) {
      console.error("Error fetching waste summary:", error);
      res.status(500).json({ message: "Failed to fetch waste summary" });
    }
  });

  // Object Storage Routes for Recipe Photos
  app.post("/api/objects/upload", isAuthenticated, async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ error: "Failed to get upload URL" });
    }
  });

  app.get("/objects/:objectPath(*)", async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error serving object:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  app.put("/api/recipes/:id/photo", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const { imageUrl } = req.body;
      
      if (!imageUrl) {
        return res.status(400).json({ error: "imageUrl is required" });
      }

      const objectStorageService = new ObjectStorageService();
      const objectPath = objectStorageService.normalizeObjectEntityPath(imageUrl);
      
      // Update recipe with the photo URL
      const updatedRecipe = await storage.updateRecipe(id, { imageUrl: objectPath });
      res.json(updatedRecipe);
    } catch (error) {
      console.error("Error updating recipe photo:", error);
      res.status(500).json({ error: "Failed to update recipe photo" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
