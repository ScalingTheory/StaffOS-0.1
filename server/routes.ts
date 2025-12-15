import express, { type Express, type Request, type Response, type NextFunction } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import session from "express-session";
import fs from "fs";
import passport from "passport";
import { storage } from "./storage";
import { insertProfileSchema, insertJobPreferencesSchema, insertSkillSchema, insertSavedJobSchema, insertJobApplicationSchema, insertRequirementSchema, insertEmployeeSchema, insertImpactMetricsSchema, supportConversations, supportMessages, insertMeetingSchema, meetings, insertTargetMappingsSchema, insertRevenueMappingSchema, revenueMappings, chatRooms, chatMessages, chatParticipants, chatAttachments, insertChatRoomSchema, insertChatMessageSchema, insertChatParticipantSchema, insertChatAttachmentSchema, insertRecruiterCommandSchema, recruiterCommands, employees, candidates } from "@shared/schema";
import { z } from "zod";
import bcrypt from "bcrypt";
import multer from "multer";
import path from "path";
import "./types"; // Import session types
import { db } from "./db";
import { eq, desc, sql } from "drizzle-orm";
import { logRequirementAdded, logCandidateSubmitted, logClosureMade, logCandidatePipelineChanged } from "./activity-logger";
import { parseResumeFile, parseBulkResumes } from "./resume-parser";
import { sendEmployeeWelcomeEmail, sendCandidateWelcomeEmail } from "./email-service";
import { setupGoogleAuth } from "./passport-google";

// Ensure uploads directory exists
const uploadsDir = 'uploads';
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const chatUploadsDir = 'uploads/chat';
if (!fs.existsSync(chatUploadsDir)) {
  fs.mkdirSync(chatUploadsDir, { recursive: true });
}

const resumeUploadsDir = 'uploads/resumes';
if (!fs.existsSync(resumeUploadsDir)) {
  fs.mkdirSync(resumeUploadsDir, { recursive: true });
}

const upload = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
  }),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow image files and PDFs only
    const allowedExtensions = /\.(jpeg|jpg|png|gif|webp|avif|pdf)$/i;
    const extname = allowedExtensions.test(file.originalname.toLowerCase());
    
    // Check MIME types including modern image formats and PDF
    const allowedMimeTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
      'image/webp', 'image/avif', // Modern image formats
      'application/pdf'
    ];
    const mimetype = allowedMimeTypes.includes(file.mimetype);
    
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Only images (JPEG, PNG, GIF, WebP, AVIF), PDFs, and Word documents are allowed!'));
    }
  }
});

const chatUpload = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, chatUploadsDir);
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
  }),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit for chat files
  },
  fileFilter: (req, file, cb) => {
    // Allow images, PDFs, and document files
    const allowedExtensions = /\.(jpeg|jpg|png|gif|webp|avif|pdf|doc|docx)$/i;
    const extname = allowedExtensions.test(file.originalname.toLowerCase());
    
    const allowedMimeTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
      'image/webp', 'image/avif',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    const mimetype = allowedMimeTypes.includes(file.mimetype);
    
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Only images, PDFs, and Word documents are allowed!'));
    }
  }
});

const resumeUpload = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, resumeUploadsDir);
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, 'resume-' + uniqueSuffix + path.extname(file.originalname));
    }
  }),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit for resumes
  },
  fileFilter: (req, file, cb) => {
    const allowedExtensions = /\.(pdf|doc|docx)$/i;
    const extname = allowedExtensions.test(file.originalname.toLowerCase());
    
    const allowedMimeTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    const mimetype = allowedMimeTypes.includes(file.mimetype);
    
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Only PDF and Word documents are allowed!'));
    }
  }
});

// Validation schemas
const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required")
});

const candidateRegistrationSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  email: z.string().email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  phone: z.string().optional(),
  company: z.string().optional(),
  designation: z.string().optional(),
  age: z.string().optional(),
  location: z.string().optional()
});

const candidateLoginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required")
});

const otpVerificationSchema = z.object({
  email: z.string().email("Invalid email format"),
  otp: z.string().length(6, "OTP must be 6 digits")
});

// Authentication middleware for candidate routes
function requireCandidateAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.candidateId) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
}

// Authentication middleware for employee routes
function requireEmployeeAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.employeeId) {
    return res.status(401).json({ message: "Employee authentication required" });
  }
  next();
}

// Authentication middleware for support team ONLY
function requireSupportAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.employeeId || req.session.employeeRole !== 'support') {
    return res.status(403).json({ message: "Access denied. Support team authentication required." });
  }
  next();
}

// Authentication middleware for admin routes ONLY
function requireAdminAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.employeeId || req.session.employeeRole !== 'admin') {
    return res.status(403).json({ message: "Access denied. Admin authentication required." });
  }
  next();
}

// Authentication middleware for client routes ONLY
function requireClientAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.employeeId || req.session.employeeRole !== 'client') {
    return res.status(403).json({ message: "Access denied. Client authentication required." });
  }
  next();
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize Passport for Google OAuth
  app.use(passport.initialize());
  app.use(passport.session());
  
  // Setup Google OAuth (will only work if credentials are configured)
  const googleAuthEnabled = setupGoogleAuth();
  
  // Google OAuth routes for candidates
  app.get("/api/auth/google", (req, res, next) => {
    if (!googleAuthEnabled) {
      return res.status(503).json({ 
        message: "Google login is not configured. Please contact the administrator." 
      });
    }
    passport.authenticate("google", { 
      scope: ["profile", "email"] 
    })(req, res, next);
  });

  app.get("/api/auth/google/callback", (req, res, next) => {
    if (!googleAuthEnabled) {
      return res.redirect("/candidate-login?error=google_not_configured");
    }
    passport.authenticate("google", { 
      failureRedirect: "/candidate-login?error=google_auth_failed" 
    })(req, res, () => {
      const candidate = req.user as any;
      if (candidate && candidate.candidateId) {
        req.session.candidateId = candidate.candidateId;
        req.session.userType = 'candidate';
        res.redirect("/candidate");
      } else {
        res.redirect("/candidate-login?error=authentication_failed");
      }
    });
  });

  // Health check endpoint for Render and monitoring
  app.get("/api/health", async (req, res) => {
    try {
      res.status(200).json({ 
        status: "healthy", 
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || "development"
      });
    } catch (error) {
      res.status(500).json({ status: "unhealthy", error: "Health check failed" });
    }
  });

  // Session Verification Route - Check if user session is valid and return user data
  app.get("/api/auth/verify-session", async (req, res) => {
    try {
      // Check for employee session
      if (req.session.employeeId) {
        const employee = await storage.getEmployeeById(req.session.employeeId);
        if (employee && employee.isActive) {
          const { password: _, ...employeeData } = employee;
          return res.json({
            authenticated: true,
            userType: 'employee',
            user: employeeData
          });
        }
      }
      
      // Check for candidate session
      if (req.session.candidateId) {
        const candidate = await storage.getCandidateByCandidateId(req.session.candidateId);
        if (candidate) {
          const { password: _, ...candidateData } = candidate;
          return res.json({
            authenticated: true,
            userType: 'candidate',
            user: candidateData
          });
        }
      }
      
      // No valid session
      return res.json({ authenticated: false });
    } catch (error) {
      console.error('Session verification error:', error);
      return res.json({ authenticated: false });
    }
  });

  // Logout Route - Clear session and redirect
  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error('Logout error:', err);
        return res.status(500).json({ message: "Logout failed" });
      }
      res.clearCookie('connect.sid');
      res.json({ success: true, message: "Logged out successfully" });
    });
  });

  // Employee Authentication Routes
  app.post("/api/auth/employee-login", async (req, res) => {
    try {
      // Validate request body
      const validationResult = loginSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid input", 
          errors: validationResult.error.errors 
        });
      }
      
      const { email, password } = validationResult.data;
      
      // Find employee by email
      const employee = await storage.getEmployeeByEmail(email);
      console.log('[DEBUG] Employee found:', employee ? `Yes (${employee.email})` : 'No');
      if (!employee) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      
      // Check if employee has login credentials configured
      if (!employee.password) {
        return res.status(401).json({ message: "Login credentials not configured for this account. Please contact your administrator." });
      }
      
      // Check password using bcrypt
      const isPasswordValid = await bcrypt.compare(password, employee.password);
      console.log('[DEBUG] Password valid:', isPasswordValid);
      if (!isPasswordValid) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      
      // Check if employee is active
      if (!employee.isActive) {
        return res.status(401).json({ message: "Account is inactive" });
      }
      
      // Regenerate session to prevent session fixation attacks
      req.session.regenerate((err) => {
        if (err) {
          console.error('Session regeneration error:', err);
          return res.status(500).json({ message: "Internal server error" });
        }
        
        // Set session after regeneration
        req.session.employeeId = employee.id;
        req.session.employeeRole = employee.role;
        req.session.userType = 'employee';
        
        // Save session before responding
        req.session.save((saveErr) => {
          if (saveErr) {
            console.error('Session save error:', saveErr);
            return res.status(500).json({ message: "Internal server error" });
          }
          
          // Return employee data (excluding password) for frontend routing
          const { password: _, ...employeeData } = employee;
          res.json({
            success: true,
            employee: employeeData,
            message: "Login successful"
          });
        });
      });
    } catch (error) {
      console.error('Employee login error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Support Team Authentication Route
  app.post("/api/auth/support-login", async (req, res) => {
    try {
      const validationResult = loginSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid input", 
          errors: validationResult.error.errors 
        });
      }
      
      const { email, password } = validationResult.data;
      
      // Find employee by email
      const employee = await storage.getEmployeeByEmail(email);
      
      // Check if employee exists and has support role
      if (!employee || employee.role !== 'support') {
        return res.status(401).json({ message: "Invalid credentials or access denied" });
      }
      
      // Check if employee has login credentials configured
      if (!employee.password) {
        return res.status(401).json({ message: "Login credentials not configured for this account. Please contact your administrator." });
      }
      
      // Check password using bcrypt
      const isPasswordValid = await bcrypt.compare(password, employee.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: "Invalid credentials or access denied" });
      }
      
      // Check if employee is active
      if (!employee.isActive) {
        return res.status(401).json({ message: "Account is inactive" });
      }
      
      // Regenerate session to prevent session fixation attacks
      req.session.regenerate((err) => {
        if (err) {
          console.error('Session regeneration error:', err);
          return res.status(500).json({ message: "Internal server error" });
        }
        
        // Set session with support role
        req.session.employeeId = employee.id;
        req.session.employeeRole = 'support';
        req.session.userType = 'support';
        
        // Save session before responding
        req.session.save((saveErr) => {
          if (saveErr) {
            console.error('Session save error:', saveErr);
            return res.status(500).json({ message: "Internal server error" });
          }
          
          // Return employee data (excluding password)
          const { password: _, ...employeeData } = employee;
          res.json({
            success: true,
            employee: employeeData,
            message: "Support login successful"
          });
        });
      });
    } catch (error) {
      console.error('Support login error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Candidate Authentication Routes
  app.post("/api/auth/candidate-register", async (req, res) => {
    try {
      // Validate request body
      const validationResult = candidateRegistrationSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          message: "Invalid input",
          errors: validationResult.error.errors
        });
      }

      const candidateData = validationResult.data;

      // Check if candidate already exists
      const existingCandidate = await storage.getCandidateByEmail(candidateData.email);
      if (existingCandidate) {
        return res.status(409).json({ message: "Email already registered" });
      }

      // Generate candidate ID and create candidate
      const candidateId = await storage.generateNextCandidateId();
      const newCandidate = await storage.createCandidate({
        ...candidateData,
        candidateId,
        isActive: true,
        isVerified: false,
        createdAt: new Date().toISOString()
      });

      // Generate 6-digit OTP for verification
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Store OTP with expiry (10 minutes)
      await storage.storeOTP(candidateData.email, otp);
      
      // Send welcome email to new candidate
      const loginUrl = process.env.REPLIT_DEV_DOMAIN 
        ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
        : 'http://localhost:5000';
      
      await sendCandidateWelcomeEmail({
        fullName: newCandidate.fullName,
        email: newCandidate.email,
        candidateId: newCandidate.candidateId,
        loginUrl
      });
      
      // For demo purposes, show OTP in alert as requested by user
      // In production, this would be sent via email
      res.json({
        success: true,
        message: "Registration successful! Please verify with OTP",
        candidateId: newCandidate.candidateId,
        otp: otp, // For demo only - in production, would send via email
        email: newCandidate.email,
        requiresVerification: true
      });
    } catch (error) {
      console.error('Candidate registration error:', error);
      res.status(500).json({ message: "Registration failed. Please try again." });
    }
  });

  app.post("/api/auth/candidate-login", async (req, res) => {
    try {
      // Validate request body
      const validationResult = candidateLoginSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          message: "Invalid input",
          errors: validationResult.error.errors
        });
      }

      const { email, password } = validationResult.data;

      // Check login attempts and lockout
      const loginAttempts = await storage.getLoginAttempts(email);
      const now = new Date().toISOString();
      
      if (loginAttempts?.lockedUntil && new Date(loginAttempts.lockedUntil) > new Date()) {
        return res.status(423).json({
          message: "You can't login for next 30 mins",
          locked: true,
          lockedUntil: loginAttempts.lockedUntil
        });
      }

      // Find candidate by email
      const candidate = await storage.getCandidateByEmail(email);
      if (!candidate) {
        // Increment login attempts for failed login
        await storage.createOrUpdateLoginAttempts({
          email,
          attempts: loginAttempts ? (parseInt(loginAttempts.attempts) + 1).toString() : "1",
          lastAttemptAt: now,
          lockedUntil: null,
          createdAt: loginAttempts?.createdAt || now
        });
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Check password using bcrypt
      const isPasswordValid = await bcrypt.compare(password, candidate.password);
      if (!isPasswordValid) {
        const currentAttempts = loginAttempts ? parseInt(loginAttempts.attempts) + 1 : 1;
        
        // Check if this is the 3rd failed attempt
        if (currentAttempts >= 3) {
          const lockUntil = new Date();
          lockUntil.setMinutes(lockUntil.getMinutes() + 30);
          
          await storage.createOrUpdateLoginAttempts({
            email,
            attempts: currentAttempts.toString(),
            lastAttemptAt: now,
            lockedUntil: lockUntil.toISOString(),
            createdAt: loginAttempts?.createdAt || now
          });
          
          return res.status(423).json({
            message: "You can't login for next 30 mins",
            locked: true,
            lockedUntil: lockUntil.toISOString()
          });
        } else {
          await storage.createOrUpdateLoginAttempts({
            email,
            attempts: currentAttempts.toString(),
            lastAttemptAt: now,
            lockedUntil: null,
            createdAt: loginAttempts?.createdAt || now
          });
          
          return res.status(401).json({
            message: "Invalid credentials",
            attemptsRemaining: 3 - currentAttempts
          });
        }
      }

      // Check if candidate is active
      if (!candidate.isActive) {
        return res.status(401).json({ message: "Account is inactive" });
      }

      // Check if candidate is verified
      if (!candidate.isVerified) {
        // Generate new OTP for unverified accounts
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        await storage.storeOTP(candidate.email, otp);
        
        return res.status(403).json({
          message: "Account not verified. Please verify with OTP",
          requiresVerification: true,
          otp: otp, // For demo only - in production, would send via email
          email: candidate.email
        });
      }

      // Reset login attempts on successful login
      await storage.resetLoginAttempts(email);

      // Store candidate ID (human-readable) in session for downstream lookups
      req.session.candidateId = candidate.candidateId;
      req.session.userType = 'candidate';

      // Return candidate data (excluding password) for frontend routing
      const { password: _, ...candidateData } = candidate;
      res.json({
        success: true,
        candidate: candidateData,
        message: "Login successful"
      });
    } catch (error) {
      console.error('Candidate login error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/auth/candidate-verify-otp", async (req, res) => {
    try {
      const validationResult = otpVerificationSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          message: "Invalid input",
          errors: validationResult.error.errors
        });
      }

      const { email, otp } = validationResult.data;

      // Find candidate by email
      const candidate = await storage.getCandidateByEmail(email);
      if (!candidate) {
        return res.status(404).json({ message: "Candidate not found" });
      }

      // Verify OTP against stored value with expiry check
      const isOtpValid = await storage.verifyOTP(email, otp);
      
      if (isOtpValid) {
        // Mark candidate as verified
        await storage.updateCandidate(candidate.id, { isVerified: true });

        // Reset login attempts
        await storage.resetLoginAttempts(email);

        // Store candidate ID (human-readable) in session for downstream lookups
        req.session.candidateId = candidate.candidateId;
        req.session.userType = 'candidate';

        const { password: _, ...candidateData } = candidate;
        res.json({
          success: true,
          candidate: { ...candidateData, isVerified: true },
          message: "Verification successful"
        });
      } else {
        res.status(400).json({ message: "Invalid or expired OTP" });
      }
    } catch (error) {
      console.error('OTP verification error:', error);
      res.status(500).json({ message: "Verification failed" });
    }
  });

  // Password change endpoints
  app.post("/api/employee/change-password", async (req, res) => {
    try {
      const { email, currentPassword, newPassword } = req.body;
      
      if (!email || !currentPassword || !newPassword) {
        return res.status(400).json({ message: "Email, current password and new password are required" });
      }
      
      if (newPassword.length < 6) {
        return res.status(400).json({ message: "New password must be at least 6 characters long" });
      }
      
      // Find employee by email
      const employee = await storage.getEmployeeByEmail(email);
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }
      
      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, employee.password);
      if (!isCurrentPasswordValid) {
        return res.status(401).json({ message: "Current password is incorrect" });
      }
      
      // Hash new password
      const saltRounds = 10;
      const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);
      
      // Update password in storage
      const updateSuccess = await storage.updateEmployeePassword(email, hashedNewPassword);
      if (!updateSuccess) {
        return res.status(500).json({ message: "Failed to update password" });
      }
      
      res.json({
        success: true,
        message: "Password changed successfully"
      });
    } catch (error) {
      console.error('Employee password change error:', error);
      res.status(500).json({ message: "Password change failed" });
    }
  });

  app.post("/api/candidate/change-password", async (req, res) => {
    try {
      const { email, currentPassword, newPassword } = req.body;
      
      if (!email || !currentPassword || !newPassword) {
        return res.status(400).json({ message: "Email, current password and new password are required" });
      }
      
      if (newPassword.length < 6) {
        return res.status(400).json({ message: "New password must be at least 6 characters long" });
      }
      
      // Find candidate by email
      const candidate = await storage.getCandidateByEmail(email);
      if (!candidate) {
        return res.status(404).json({ message: "Candidate not found" });
      }
      
      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, candidate.password);
      if (!isCurrentPasswordValid) {
        return res.status(401).json({ message: "Current password is incorrect" });
      }
      
      // Hash new password
      const saltRounds = 10;
      const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);
      
      // Update password in storage
      const updateSuccess = await storage.updateCandidatePassword(email, hashedNewPassword);
      if (!updateSuccess) {
        return res.status(500).json({ message: "Failed to update password" });
      }
      
      res.json({
        success: true,
        message: "Password changed successfully"
      });
    } catch (error) {
      console.error('Candidate password change error:', error);
      res.status(500).json({ message: "Password change failed" });
    }
  });

  // Logout endpoints
  app.post("/api/auth/candidate-logout", async (req, res) => {
    try {
      res.json({
        success: true,
        message: "Logged out successfully"
      });
    } catch (error) {
      console.error('Candidate logout error:', error);
      res.status(500).json({ message: "Logout failed" });
    }
  });

  app.post("/api/auth/employee-logout", async (req, res) => {
    try {
      req.session.destroy((err) => {
        if (err) {
          console.error('Session destruction error:', err);
          return res.status(500).json({ message: "Logout failed" });
        }
        res.json({
          success: true,
          message: "Logged out successfully"
        });
      });
    } catch (error) {
      console.error('Employee logout error:', error);
      res.status(500).json({ message: "Logout failed" });
    }
  });

  // Temporary seed endpoint to initialize sample employees for testing
  app.post("/api/seed-employees", async (req, res) => {
    try {
      // Check if employees already exist
      const existingEmployees = await storage.getAllEmployees();
      if (existingEmployees.length > 0) {
        return res.json({ message: "Employees already exist", count: existingEmployees.length });
      }

      // Create sample employees
      const currentTimestamp = new Date().toISOString();
      const sampleEmployees = [
        {
          employeeId: "STTA001",
          name: "Ram Kumar",
          email: "ram@gmail.com", 
          password: "ram123",
          role: "recruiter",
          age: "28",
          phone: "9876543210",
          department: "Talent Acquisition",
          joiningDate: "2024-01-15",
          reportingTo: "Team Lead",
          createdAt: currentTimestamp
        },
        {
          employeeId: "STTL001",
          name: "Priya Sharma",
          email: "priya@gmail.com",
          password: "priya123", 
          role: "team_leader",
          age: "32",
          phone: "9876543211",
          department: "Talent Acquisition",
          joiningDate: "2023-06-10",
          reportingTo: "Admin",
          createdAt: currentTimestamp
        },
        {
          employeeId: "STCL001",
          name: "Arjun Patel",
          email: "arjun@gmail.com",
          password: "arjun123",
          role: "client",
          age: "35", 
          phone: "9876543212",
          department: "Client Relations",
          joiningDate: "2023-03-20",
          reportingTo: "Admin",
          createdAt: currentTimestamp
        },
        {
          employeeId: "ADMIN",
          name: "Admin User",
          email: "admin@gmail.com",
          password: "admin123",
          role: "admin",
          age: "40",
          phone: "9876543213", 
          department: "Administration",
          joiningDate: "2022-01-01",
          reportingTo: "CEO",
          createdAt: currentTimestamp
        }
      ];

      const createdEmployees = [];
      for (const emp of sampleEmployees) {
        const employee = await storage.createEmployee(emp);
        createdEmployees.push({ id: employee.id, name: employee.name, email: employee.email, role: employee.role });
      }

      res.json({ 
        message: "Sample employees created successfully", 
        employees: createdEmployees 
      });
    } catch (error) {
      console.error('Seed employees error:', error);
      res.status(500).json({ message: "Failed to create sample employees", error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // NOTE: Admin endpoints disabled for security - require proper authentication before enabling

  // Get current candidate profile
  app.get("/api/profile", requireCandidateAuth, async (req, res) => {
    try {
      const candidateId = req.session.candidateId!;
      const candidate = await storage.getCandidateByCandidateId(candidateId);
      
      if (!candidate) {
        return res.status(404).json({ message: "Candidate not found" });
      }
      
      // Transform candidate data to match profile structure expected by frontend
      const profile = {
        id: candidate.id,
        userId: candidate.id,
        firstName: candidate.fullName.split(' ')[0] || '',
        lastName: candidate.fullName.split(' ').slice(1).join(' ') || '',
        email: candidate.email,
        phone: candidate.phone || '',
        title: candidate.designation || '',
        location: candidate.location || '',
        gender: candidate.gender || '',
        profilePicture: candidate.profilePicture || '',
        bannerImage: candidate.bannerImage || '',
        resumeFile: candidate.resumeFile || '',
        resumeText: candidate.resumeText || '',
        skills: candidate.skills || '',
        experience: candidate.experience || '',
        currentCompany: candidate.company || '',
        currentRole: candidate.currentRole || '',
        education: candidate.education || '',
        portfolioUrl: candidate.portfolioUrl || '',
        websiteUrl: candidate.websiteUrl || '',
        linkedinUrl: candidate.linkedinUrl || '',
      };
      
      res.json(profile);
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Legacy profile route for demo user (keeping for other parts of the app)
  app.get("/api/profile/demo", async (req, res) => {
    try {
      const users = await storage.getUserByUsername("mathew.anderson");
      if (!users) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const profile = await storage.getProfile(users.id);
      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }
      
      res.json(profile);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update profile
  app.patch("/api/profile", requireCandidateAuth, async (req, res) => {
    try {
      const candidateId = req.session.candidateId!;
      const candidate = await storage.getCandidateByCandidateId(candidateId);
      
      if (!candidate) {
        return res.status(404).json({ message: "Candidate not found" });
      }
      
      // Transform profile data to candidate fields
      const updates: any = {};
      
      // Map profile fields to candidate fields
      if (req.body.firstName || req.body.lastName) {
        const firstName = req.body.firstName || candidate.fullName.split(' ')[0];
        const lastName = req.body.lastName || candidate.fullName.split(' ').slice(1).join(' ');
        updates.fullName = `${firstName} ${lastName}`.trim();
      }
      
      if (req.body.phone !== undefined) updates.phone = req.body.phone;
      if (req.body.title !== undefined) updates.designation = req.body.title;
      if (req.body.location !== undefined) updates.location = req.body.location;
      if (req.body.gender !== undefined) updates.gender = req.body.gender;
      if (req.body.skills !== undefined) updates.skills = req.body.skills;
      if (req.body.currentCompany !== undefined) updates.company = req.body.currentCompany;
      if (req.body.currentRole !== undefined) updates.currentRole = req.body.currentRole;
      if (req.body.education !== undefined) updates.education = req.body.education;
      if (req.body.profilePicture !== undefined) updates.profilePicture = req.body.profilePicture;
      if (req.body.bannerImage !== undefined) updates.bannerImage = req.body.bannerImage;
      if (req.body.resumeFile !== undefined) updates.resumeFile = req.body.resumeFile;
      if (req.body.resumeText !== undefined) updates.resumeText = req.body.resumeText;
      if (req.body.portfolioUrl !== undefined) updates.portfolioUrl = req.body.portfolioUrl;
      if (req.body.websiteUrl !== undefined) updates.websiteUrl = req.body.websiteUrl;
      if (req.body.linkedinUrl !== undefined) updates.linkedinUrl = req.body.linkedinUrl;
      
      // Update candidate in storage
      const updatedCandidate = await storage.updateCandidate(candidate.id, updates);
      
      if (!updatedCandidate) {
        return res.status(404).json({ message: "Failed to update candidate" });
      }
      
      // Return data in profile format expected by frontend
      const profile = {
        id: updatedCandidate.id,
        userId: updatedCandidate.id,
        firstName: updatedCandidate.fullName.split(' ')[0] || '',
        lastName: updatedCandidate.fullName.split(' ').slice(1).join(' ') || '',
        email: updatedCandidate.email,
        phone: updatedCandidate.phone || '',
        title: updatedCandidate.designation || '',
        location: updatedCandidate.location || '',
        gender: updatedCandidate.gender || '',
        profilePicture: updatedCandidate.profilePicture || '',
        bannerImage: updatedCandidate.bannerImage || '',
        resumeFile: updatedCandidate.resumeFile || '',
        resumeText: updatedCandidate.resumeText || '',
        skills: updatedCandidate.skills || '',
        experience: updatedCandidate.experience || '',
        currentCompany: updatedCandidate.company || '',
        currentRole: updatedCandidate.currentRole || '',
        education: updatedCandidate.education || '',
        portfolioUrl: updatedCandidate.portfolioUrl || '',
        websiteUrl: updatedCandidate.websiteUrl || '',
        linkedinUrl: updatedCandidate.linkedinUrl || '',
      };
      
      res.json(profile);
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get job preferences for candidate
  app.get("/api/job-preferences", requireCandidateAuth, async (req, res) => {
    try {
      const candidateId = req.session.candidateId!;
      
      // Return mock job preferences for now
      const jobPreferences = {
        id: 'pref-1',
        profileId: candidateId,
        jobTitles: 'Software Engineer, Full Stack Developer',
        workMode: 'Remote',
        employmentType: 'Full-time',
        locations: 'Bangalore, Mumbai, Remote',
        startDate: 'Immediate',
        instructions: ''
      };
      
      res.json(jobPreferences);
    } catch (error) {
      console.error('Get job preferences error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Legacy job preferences route
  app.get("/api/job-preferences/demo", async (req, res) => {
    try {
      const users = await storage.getUserByUsername("mathew.anderson");
      if (!users) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const profile = await storage.getProfile(users.id);
      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }
      
      const preferences = await storage.getJobPreferences(profile.id);
      res.json(preferences);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update job preferences
  app.patch("/api/job-preferences", async (req, res) => {
    try {
      const users = await storage.getUserByUsername("mathew.anderson");
      if (!users) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const profile = await storage.getProfile(users.id);
      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }
      
      const updatedPreferences = await storage.updateJobPreferences(profile.id, req.body);
      res.json(updatedPreferences);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get skills for candidate
  app.get("/api/skills", requireCandidateAuth, async (req, res) => {
    try {
      const candidateId = req.session.candidateId!;
      const candidate = await storage.getCandidateByCandidateId(candidateId);
      
      if (!candidate || !candidate.skills) {
        return res.json([]);
      }
      
      // Parse skills string into array of skill objects
      const skillsArray = candidate.skills.split(',').map((skill, index) => ({
        id: `skill-${index}`,
        profileId: candidateId,
        name: skill.trim(),
        category: 'primary'
      }));
      
      res.json(skillsArray);
    } catch (error) {
      console.error('Get skills error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Legacy skills route
  app.get("/api/skills/demo", async (req, res) => {
    try {
      const users = await storage.getUserByUsername("mathew.anderson");
      if (!users) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const profile = await storage.getProfile(users.id);
      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }
      
      const skills = await storage.getSkillsByProfile(profile.id);
      res.json(skills);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get activities
  app.get("/api/activities", async (req, res) => {
    try {
      const users = await storage.getUserByUsername("mathew.anderson");
      if (!users) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const profile = await storage.getProfile(users.id);
      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }
      
      const activities = await storage.getActivitiesByProfile(profile.id);
      res.json(activities);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Create activity
  app.post("/api/activities", async (req, res) => {
    try {
      const users = await storage.getUserByUsername("mathew.anderson");
      if (!users) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const profile = await storage.getProfile(users.id);
      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }
      
      const activityData = {
        ...req.body,
        profileId: profile.id,
        date: new Date().toLocaleDateString()
      };
      
      const activity = await storage.createActivity(activityData);
      res.json(activity);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get job applications for candidate
  app.get("/api/job-applications", requireCandidateAuth, async (req, res) => {
    try {
      const candidateId = req.session.candidateId!;
      const candidate = await storage.getCandidateByCandidateId(candidateId);
      
      if (!candidate) {
        return res.status(404).json({ message: "Candidate not found" });
      }
      
      // Get real job applications from database
      const jobApplications = await storage.getJobApplicationsByProfile(candidate.id);
      
      res.json(jobApplications);
    } catch (error) {
      console.error('Get job applications error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Create job application for candidate
  app.post("/api/job-applications", requireCandidateAuth, async (req, res) => {
    try {
      const candidateId = req.session.candidateId!;
      const candidate = await storage.getCandidateByCandidateId(candidateId);
      
      if (!candidate) {
        return res.status(404).json({ message: "Candidate not found" });
      }

      // Validate request body using zod
      const validationResult = insertJobApplicationSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid input", 
          errors: validationResult.error.errors 
        });
      }

      // Check for duplicate application
      const existingApplications = await storage.getJobApplicationsByProfile(candidate.id);
      const isDuplicate = existingApplications.some(
        app => app.jobTitle === validationResult.data.jobTitle && app.company === validationResult.data.company
      );
      
      if (isDuplicate) {
        return res.status(400).json({ message: "You have already applied for this job" });
      }

      // Create the job application with server-side defaults
      const applicationData = {
        ...validationResult.data,
        profileId: candidate.id,
      };

      const application = await storage.createJobApplication(applicationData);
      
      res.status(201).json(application);
    } catch (error) {
      console.error('Create job application error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Legacy job applications route
  app.get("/api/job-applications/demo", async (req, res) => {
    try {
      const users = await storage.getUserByUsername("mathew.anderson");
      if (!users) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const profile = await storage.getProfile(users.id);
      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }
      
      const applications = await storage.getJobApplicationsByProfile(profile.id);
      res.json(applications);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // File upload endpoints
  app.post("/api/upload/banner", requireCandidateAuth, upload.single('banner'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      const candidateId = req.session.candidateId!;
      const candidate = await storage.getCandidateByCandidateId(candidateId);
      
      if (!candidate) {
        return res.status(404).json({ message: "Candidate not found" });
      }
      
      // In production, consider using cloud storage like AWS S3, Cloudinary, etc.
      // For now, using local storage with proper URL generation
      const baseUrl = process.env.NODE_ENV === 'production' 
        ? (process.env.BACKEND_URL || `https://${req.get('host')}`)
        : `http://${req.get('host')}`;
      
      const fileUrl = `${baseUrl}/uploads/${req.file.filename}`;
      
      // Save banner URL to candidate profile
      await storage.updateCandidate(candidate.id, { bannerImage: fileUrl });
      
      res.json({ url: fileUrl });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ message: "Upload failed", error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  app.post("/api/upload/profile", requireCandidateAuth, upload.single('profile'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      const candidateId = req.session.candidateId!;
      const candidate = await storage.getCandidateByCandidateId(candidateId);
      
      if (!candidate) {
        return res.status(404).json({ message: "Candidate not found" });
      }
      
      const baseUrl = process.env.NODE_ENV === 'production' 
        ? (process.env.BACKEND_URL || `https://${req.get('host')}`)
        : `http://${req.get('host')}`;
      
      const fileUrl = `${baseUrl}/uploads/${req.file.filename}`;
      
      // Save profile picture URL to candidate profile
      await storage.updateCandidate(candidate.id, { profilePicture: fileUrl });
      
      res.json({ url: fileUrl });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ message: "Upload failed", error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  app.post("/api/upload/resume", requireCandidateAuth, upload.single('resume'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      const candidateId = req.session.candidateId!;
      const candidate = await storage.getCandidateByCandidateId(candidateId);
      
      if (!candidate) {
        return res.status(404).json({ message: "Candidate not found" });
      }
      
      const baseUrl = process.env.NODE_ENV === 'production' 
        ? (process.env.BACKEND_URL || `https://${req.get('host')}`)
        : `http://${req.get('host')}`;
      
      const fileUrl = `${baseUrl}/uploads/${req.file.filename}`;
      
      // Save resume URL to candidate profile
      await storage.updateCandidate(candidate.id, { resumeFile: fileUrl });
      
      res.json({ url: fileUrl });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ message: "Upload failed", error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Placeholder image generator
  app.get('/api/placeholder/:width/:height', (req, res) => {
    const { width, height } = req.params;
    const size = Math.min(parseInt(width) || 60, parseInt(height) || 60);
    
    // Generate a simple SVG placeholder
    const svg = `
      <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#f0f0f0" stroke="#ddd" stroke-width="1"/>
        <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" 
              font-family="Arial, sans-serif" font-size="12" fill="#666">
          Logo
        </text>
      </svg>
    `;
    
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(svg);
  });

  // Serve uploaded files
  app.use('/uploads', express.static('uploads'));

  // Get saved jobs for candidate
  app.get("/api/saved-jobs", requireCandidateAuth, async (req, res) => {
    try {
      const candidateId = req.session.candidateId!;
      const candidate = await storage.getCandidateByCandidateId(candidateId);
      
      if (!candidate) {
        return res.status(404).json({ message: "Candidate not found" });
      }
      
      // Use candidate's UUID as profileId for saved jobs
      const savedJobs = await storage.getSavedJobsByProfile(candidate.id);
      res.json(savedJobs);
    } catch (error) {
      console.error('Get saved jobs error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Legacy saved jobs route
  app.get("/api/saved-jobs/demo", async (req, res) => {
    try {
      const users = await storage.getUserByUsername("mathew.anderson");
      if (!users) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const profile = await storage.getProfile(users.id);
      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }
      
      const savedJobs = await storage.getSavedJobsByProfile(profile.id);
      res.json(savedJobs);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Save a job
  app.post("/api/saved-jobs", requireCandidateAuth, async (req, res) => {
    try {
      const candidateId = req.session.candidateId!;
      const candidate = await storage.getCandidateByCandidateId(candidateId);
      
      if (!candidate) {
        return res.status(404).json({ message: "Candidate not found" });
      }

      const validatedData = insertSavedJobSchema.parse({
        ...req.body,
        profileId: candidate.id,
        savedDate: new Date().toISOString()
      });
      
      const savedJob = await storage.createSavedJob(validatedData);
      res.json(savedJob);
    } catch (error) {
      console.error('Save job error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Remove saved job
  app.delete("/api/saved-jobs", requireCandidateAuth, async (req, res) => {
    try {
      const { jobTitle, company } = req.body;
      const candidateId = req.session.candidateId!;
      
      const candidate = await storage.getCandidateByCandidateId(candidateId);
      if (!candidate) {
        return res.status(404).json({ message: "Candidate not found" });
      }
      
      const removed = await storage.removeSavedJob(candidate.id, jobTitle, company);
      if (removed) {
        res.json({ message: "Job removed from saved jobs" });
      } else {
        res.status(404).json({ message: "Saved job not found" });
      }
    } catch (error) {
      console.error('Remove saved job error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Team Leader Dashboard API routes
  app.get("/api/team-leader/team-members", requireEmployeeAuth, async (req, res) => {
    try {
      const session = req.session as any;
      const employee = await storage.getEmployeeById(session.employeeId);
      if (!employee || employee.role !== 'team_leader') {
        return res.status(403).json({ message: "Access denied. Team Leader role required." });
      }

      const allEmployees = await storage.getAllEmployees();
      const recruiters = allEmployees.filter(
        emp => emp.role === 'recruiter' && emp.reportingTo === employee.employeeId
      );

      const year = new Date().getFullYear();
      const teamMembers = await Promise.all(recruiters.map(async (rec) => {
        const revenueMappings = await storage.getRevenueMappingsByRecruiterId(rec.id);
        const totalRevenue = revenueMappings.reduce((sum, rm) => sum + (rm.revenue || 0), 0);
        
        let tenure = "0";
        if (rec.joiningDate) {
          try {
            const joinDate = new Date(rec.joiningDate);
            if (!isNaN(joinDate.getTime())) {
              const now = new Date();
              tenure = ((now.getTime() - joinDate.getTime()) / (1000 * 60 * 60 * 24 * 365)).toFixed(1);
            }
          } catch (e) {
            tenure = "0";
          }
        }
        
        return {
          id: rec.id,
          name: rec.name,
          email: rec.email,
          position: rec.designation || 'Recruiter',
          department: rec.department || 'Recruitment',
          salary: totalRevenue > 0 ? `${totalRevenue.toLocaleString('en-IN')} INR` : "0 INR",
          year: `${year}-${year + 1}`,
          profilesCount: String(revenueMappings.length),
          closures: revenueMappings.filter(rm => rm.status === 'closed').length,
          joiningDate: rec.joiningDate ? new Date(rec.joiningDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-',
          tenure: tenure,
          status: 'online',
          profilePicture: rec.profilePicture || null
        };
      }));

      res.json(teamMembers);
    } catch (error) {
      console.error('Get team leader team members error:', error);
      res.status(500).json({ message: "Failed to fetch team members" });
    }
  });

  // Legacy endpoint - returns 0 defaults for backward compatibility
  app.get("/api/team-leader/target-metrics", (req, res) => {
    const targetMetrics = {
      id: "target-001",
      currentQuarter: `Q${Math.ceil((new Date().getMonth() + 1) / 3)}-${new Date().getFullYear()}`,
      minimumTarget: "0",
      targetAchieved: "0",
      incentiveEarned: "0"
    };
    res.json(targetMetrics);
  });

  // Get aggregated target data for team leader
  app.get("/api/team-leader/aggregated-targets", requireEmployeeAuth, async (req, res) => {
    try {
      const session = req.session as any;
      const employee = await storage.getEmployeeById(session.employeeId);
      if (!employee || employee.role !== 'team_leader') {
        return res.status(403).json({ message: "Access denied - Team Leaders only" });
      }

      const targetSummary = await storage.getTeamLeaderTargetSummary(employee.id);
      res.json(targetSummary);
    } catch (error) {
      console.error('Get aggregated targets error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/team-leader/daily-metrics", requireEmployeeAuth, async (req, res) => {
    try {
      const session = req.session as any;
      const employee = await storage.getEmployeeById(session.employeeId);
      if (!employee || employee.role !== 'team_leader') {
        return res.status(403).json({ message: "Access denied. Team Leader role required." });
      }

      // Import getResumeTarget for calculations
      const { getResumeTarget } = await import("@shared/constants");

      // Get filter parameter - now uses member ID instead of name for security
      const memberIdFilter = req.query.memberId as string | undefined;

      const allEmployees = await storage.getAllEmployees();
      const teamRecruiters = allEmployees.filter(
        emp => emp.role === 'recruiter' && emp.reportingTo === employee.employeeId
      );
      const teamRecruiterIds = teamRecruiters.map(r => r.id);

      // Get requirements based on filter - using strict ID-based lookup
      let requirements: any[] = [];
      let filteredRecruiters = teamRecruiters;
      
      if (memberIdFilter && memberIdFilter !== 'overall') {
        // Validate that memberId belongs to this TL's team (ID-based security check)
        if (!teamRecruiterIds.includes(memberIdFilter)) {
          return res.status(403).json({ message: "Access denied. Member does not belong to your team." });
        }
        const selectedRecruiter = teamRecruiters.find(r => r.id === memberIdFilter);
        if (selectedRecruiter) {
          requirements = await storage.getRequirementsByTalentAdvisorId(selectedRecruiter.id);
          filteredRecruiters = [selectedRecruiter];
        }
      } else {
        // Overall - get all requirements for team members using their IDs
        for (const rec of teamRecruiters) {
          const recReqs = await storage.getRequirementsByTalentAdvisorId(rec.id);
          requirements.push(...recReqs);
        }
      }

      // Get all resume submissions by team recruiters
      const { resumeSubmissions } = await import("@shared/schema");
      const recruiterIds = filteredRecruiters.map(r => r.id);
      const allSubmissions = await db.select().from(resumeSubmissions);
      const teamSubmissions = allSubmissions.filter(s => recruiterIds.includes(s.recruiterId));
      
      // Calculate metrics for all requirements
      let totalResumesRequired = 0;
      let totalResumesDelivered = 0;
      let completedRequirements = 0;
      
      for (const req of requirements) {
        const target = getResumeTarget(req.criticality, req.toughness);
        totalResumesRequired += target;
        
        // Count resumes submitted for this requirement
        const deliveredForReq = teamSubmissions.filter(s => s.requirementId === req.id).length;
        totalResumesDelivered += deliveredForReq;
        
        // Check if this requirement is fully delivered
        if (deliveredForReq >= target) {
          completedRequirements++;
        }
      }

      const performanceData = await Promise.all(teamRecruiters.map(async (rec) => {
        const recReqs = await storage.getRequirementsByTalentAdvisorId(rec.id);
        return { member: rec.name, requirements: recReqs.length };
      }));

      const totalRequirements = requirements.length;
      
      // Calculate averages
      const avgResumesPerRequirement = totalRequirements > 0 
        ? (totalResumesDelivered / totalRequirements).toFixed(2) 
        : "0.00";
      const requirementsPerRecruiter = filteredRecruiters.length > 0 
        ? (totalRequirements / filteredRecruiters.length).toFixed(2) 
        : "0.00";

      const dailyMetrics = {
        id: `daily-tl-${employee.id}`,
        date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-'),
        totalRequirements,
        completedRequirements,
        avgResumesPerRequirement,
        requirementsPerRecruiter,
        totalResumes: totalResumesDelivered,
        totalResumesDelivered,
        totalResumesRequired,
        dailyDeliveryDelivered: totalResumesDelivered,
        dailyDeliveryDefaulted: Math.max(0, totalResumesRequired - totalResumesDelivered),
        overallPerformance: totalResumesDelivered >= totalResumesRequired ? "G" : "R",
        deliveredItems: [],
        defaultedItems: [],
        performanceData,
        teamMembers: teamRecruiters.map(r => ({ id: r.id, name: r.name }))
      };
      res.json(dailyMetrics);
    } catch (error) {
      console.error('Get team leader daily metrics error:', error);
      res.status(500).json({ message: "Failed to fetch daily metrics" });
    }
  });

  app.get("/api/team-leader/meetings", requireEmployeeAuth, async (req, res) => {
    try {
      const session = req.session as any;
      const employee = await storage.getEmployeeById(session.employeeId);
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }

      if (employee.role !== 'team_leader') {
        return res.status(403).json({ message: "Access denied. Team Leader role required." });
      }

      const allMeetings = await db.select().from(meetings).orderBy(desc(meetings.createdAt));
      const teamLeaderMeetings = allMeetings.filter(m => 
        m.personId === employee.id || m.person === employee.name
      );

      const meetingSummary = [];
      const tlMeetings = teamLeaderMeetings.filter(m => m.meetingType === "TL's Meeting");
      const ceoMeetings = teamLeaderMeetings.filter(m => m.meetingType === "CEO's Meeting");
      
      if (tlMeetings.length > 0) {
        meetingSummary.push({ id: "meeting-tl", type: "TL's Meeting", count: String(tlMeetings.length) });
      }
      if (ceoMeetings.length > 0) {
        meetingSummary.push({ id: "meeting-ceo", type: "CEO's Meeting", count: String(ceoMeetings.length) });
      }
      
      res.json(meetingSummary);
    } catch (error) {
      console.error('Get team leader meetings error:', error);
      res.status(500).json({ message: "Failed to fetch meetings" });
    }
  });

  // Team leader detailed meetings endpoint for modal
  app.get("/api/team-leader/meetings/details", requireEmployeeAuth, async (req, res) => {
    try {
      const session = req.session as any;
      const employee = await storage.getEmployeeById(session.employeeId);
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }

      if (employee.role !== 'team_leader') {
        return res.status(403).json({ message: "Access denied. Team Leader role required." });
      }

      const allMeetings = await db.select().from(meetings).orderBy(desc(meetings.createdAt));
      const teamLeaderMeetings = allMeetings.filter(m => 
        m.personId === employee.id || m.person === employee.name
      );

      const formattedMeetings = teamLeaderMeetings.map(m => ({
        id: m.id,
        meetingType: m.meetingType,
        date: m.meetingDate,
        time: m.meetingTime,
        person: m.person,
        agenda: m.agenda,
        status: m.status || 'Pending'
      }));
      
      res.json(formattedMeetings);
    } catch (error) {
      console.error('Get team leader detailed meetings error:', error);
      res.status(500).json({ message: "Failed to fetch detailed meetings" });
    }
  });

  app.get("/api/team-leader/ceo-comments", requireEmployeeAuth, async (req, res) => {
    try {
      const session = req.session as any;
      const employee = await storage.getEmployeeById(session.employeeId);
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }

      if (employee.role !== 'team_leader') {
        return res.status(403).json({ message: "Access denied. Team Leader role required." });
      }

      const commands = await db.select().from(recruiterCommands)
        .where(eq(recruiterCommands.recruiterId, employee.id))
        .orderBy(desc(recruiterCommands.createdAt));
      
      const comments = commands.map((cmd: any) => ({
        id: cmd.id,
        comment: cmd.command,
        date: cmd.commandDate || new Date(cmd.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-')
      }));
      
      res.json(comments);
    } catch (error) {
      console.error('Get team leader ceo comments error:', error);
      res.status(500).json({ message: "Failed to fetch CEO comments" });
    }
  });

  // Team leader pipeline endpoint - fetch candidates from team members
  app.get("/api/team-leader/pipeline", requireEmployeeAuth, async (req, res) => {
    try {
      const session = req.session as any;
      const employee = await storage.getEmployeeById(session.employeeId);
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }

      if (employee.role !== 'team_leader') {
        return res.status(403).json({ message: "Access denied. Team Leader role required." });
      }

      // Get team members (recruiters reporting to this TL)
      const allEmployees = await storage.getAllEmployees();
      const teamRecruiters = allEmployees.filter(
        emp => emp.role === 'recruiter' && emp.reportingTo === employee.employeeId
      );
      const teamRecruiterNames = teamRecruiters.map(r => r.name.toLowerCase());

      // Get all candidates and filter by team members using name-based matching
      // Candidates are linked via addedBy (string name) or assignedTo (string name)
      const allCandidates = await db.select().from(candidates).orderBy(desc(candidates.createdAt));
      const teamCandidates = allCandidates.filter(c => {
        const addedByMatch = c.addedBy && teamRecruiterNames.includes(c.addedBy.toLowerCase());
        const assignedToMatch = c.assignedTo && teamRecruiterNames.includes(c.assignedTo.toLowerCase());
        return addedByMatch || assignedToMatch;
      });

      // Format pipeline data
      const pipelineData = teamCandidates.map((candidate: any) => ({
        id: candidate.id,
        name: candidate.name,
        company: candidate.company || '-',
        position: candidate.position || '-',
        status: candidate.pipelineStatus || candidate.status || 'New',
        recruiter: candidate.addedBy || candidate.assignedTo || '-',
        ctc: candidate.ctc || '-',
        ectc: candidate.ectc || '-',
        noticePeriod: candidate.noticePeriod || '-',
        createdAt: candidate.createdAt
      }));
      
      res.json(pipelineData);
    } catch (error) {
      console.error('Get team leader pipeline error:', error);
      res.status(500).json({ message: "Failed to fetch pipeline data" });
    }
  });

  // Team leader pipeline counts endpoint - get counts for each pipeline stage
  app.get("/api/team-leader/pipeline-counts", requireEmployeeAuth, async (req, res) => {
    try {
      const session = req.session as any;
      const employee = await storage.getEmployeeById(session.employeeId);
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }

      if (employee.role !== 'team_leader') {
        return res.status(403).json({ message: "Access denied. Team Leader role required." });
      }

      // Get team members (recruiters reporting to this TL)
      const allEmployees = await storage.getAllEmployees();
      const teamRecruiters = allEmployees.filter(
        emp => emp.role === 'recruiter' && emp.reportingTo === employee.employeeId
      );
      const teamRecruiterNames = teamRecruiters.map(r => r.name.toLowerCase());

      // Get all candidates and filter by team members
      const allCandidates = await db.select().from(candidates).orderBy(desc(candidates.createdAt));
      const teamCandidates = allCandidates.filter(c => {
        const addedByMatch = c.addedBy && teamRecruiterNames.includes(c.addedBy.toLowerCase());
        const assignedToMatch = c.assignedTo && teamRecruiterNames.includes(c.assignedTo.toLowerCase());
        return addedByMatch || assignedToMatch;
      });

      // Count candidates by pipeline status
      const stageCounts: Record<string, number> = {
        SOURCED: 0,
        SHORTLISTED: 0,
        INTRO_CALL: 0,
        ASSIGNMENT: 0,
        L1: 0,
        L2: 0,
        L3: 0,
        FINAL_ROUND: 0,
        HR_ROUND: 0,
        OFFER_STAGE: 0,
        CLOSURE: 0,
        OFFER_DROP: 0
      };

      teamCandidates.forEach((candidate: any) => {
        const status = (candidate.pipelineStatus || candidate.status || 'SOURCED').toUpperCase();
        // Map various status values to our stage keys
        const statusMapping: Record<string, string> = {
          'NEW': 'SOURCED',
          'SOURCED': 'SOURCED',
          'SHORTLISTED': 'SHORTLISTED',
          'INTRO CALL': 'INTRO_CALL',
          'INTRO_CALL': 'INTRO_CALL',
          'ASSIGNMENT': 'ASSIGNMENT',
          'L1': 'L1',
          'L2': 'L2',
          'L3': 'L3',
          'FINAL ROUND': 'FINAL_ROUND',
          'FINAL_ROUND': 'FINAL_ROUND',
          'HR ROUND': 'HR_ROUND',
          'HR_ROUND': 'HR_ROUND',
          'OFFER STAGE': 'OFFER_STAGE',
          'OFFER_STAGE': 'OFFER_STAGE',
          'CLOSURE': 'CLOSURE',
          'CLOSED': 'CLOSURE',
          'OFFER DROP': 'OFFER_DROP',
          'OFFER_DROP': 'OFFER_DROP',
          'REJECTED': 'OFFER_DROP'
        };
        const mappedStatus = statusMapping[status] || 'SOURCED';
        if (stageCounts.hasOwnProperty(mappedStatus)) {
          stageCounts[mappedStatus]++;
        }
      });

      res.json(stageCounts);
    } catch (error) {
      console.error('Get team leader pipeline counts error:', error);
      res.status(500).json({ message: "Failed to fetch pipeline counts" });
    }
  });

  // Team leader requirements endpoint - fetch requirements assigned to logged-in TL
  app.get("/api/team-leader/requirements", requireEmployeeAuth, async (req, res) => {
    try {
      // Get the employee from session
      const employee = await storage.getEmployeeById(req.session.employeeId!);
      if (!employee) {
        return res.status(401).json({ message: "Employee not found" });
      }

      // Verify employee is a team leader
      if (employee.role !== 'team_leader') {
        return res.status(403).json({ message: "Access denied. Team Leader role required." });
      }

      // Get all team members (recruiters reporting to this TL) - ID-based lookup
      const allEmployees = await storage.getAllEmployees();
      const teamRecruiters = allEmployees.filter(
        emp => emp.role === 'recruiter' && emp.reportingTo === employee.employeeId
      );

      // Fetch requirements for each team member using ID-based lookup
      const allRequirements: any[] = [];
      const addedIds = new Set<string>();
      
      for (const recruiter of teamRecruiters) {
        const recruiterRequirements = await storage.getRequirementsByTalentAdvisorId(recruiter.id);
        for (const req of recruiterRequirements) {
          if (!addedIds.has(req.id)) {
            allRequirements.push(req);
            addedIds.add(req.id);
          }
        }
      }

      // Also fetch requirements assigned to this TL but not yet assigned to any recruiter
      // These are "unassigned" requirements where teamLead matches TL's name but talentAdvisorId is null
      const allReqs = await storage.getRequirements();
      const unassignedTLRequirements = allReqs.filter(req => 
        req.teamLead === employee.name && 
        !req.talentAdvisorId && 
        !req.isArchived
      );
      
      for (const req of unassignedTLRequirements) {
        if (!addedIds.has(req.id)) {
          allRequirements.push(req);
          addedIds.add(req.id);
        }
      }

      res.json(allRequirements);
    } catch (error) {
      console.error('Get team leader requirements error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Assign talent advisor to a requirement (Team Leader only)
  app.post("/api/team-leader/requirements/:id/assign-ta", requireEmployeeAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { talentAdvisor } = req.body;

      if (!talentAdvisor) {
        return res.status(400).json({ message: "Talent Advisor is required" });
      }

      // Get the employee from session
      const employee = await storage.getEmployeeById(req.session.employeeId!);
      if (!employee) {
        return res.status(401).json({ message: "Employee not found" });
      }

      // Verify employee is a team leader
      if (employee.role !== 'team_leader') {
        return res.status(403).json({ message: "Access denied. Team Leader role required." });
      }

      // Get team members first (recruiters reporting to this TL) - ID-based lookup
      const allEmployees = await storage.getAllEmployees();
      const teamRecruiters = allEmployees.filter(
        emp => emp.role === 'recruiter' && emp.reportingTo === employee.employeeId
      );
      const teamRecruiterIds = teamRecruiters.map(rec => rec.id);
      const allowedTalentAdvisors = teamRecruiters.map(rec => rec.name);

      // Get the requirement and verify it belongs to this TL's team (ID-based check)
      const requirements = await storage.getRequirements();
      const requirement = requirements.find(r => r.id === id);
      
      if (!requirement) {
        return res.status(404).json({ message: "Requirement not found" });
      }

      // Check if requirement belongs to this TL's team (ID-based)
      // Requirement must either have talentAdvisorId belonging to this TL's team,
      // OR be unassigned and have teamLead matching this TL's name (legacy fallback)
      const belongsToTeam = requirement.talentAdvisorId 
        ? teamRecruiterIds.includes(requirement.talentAdvisorId)
        : requirement.teamLead === employee.name;
      
      if (!belongsToTeam) {
        return res.status(403).json({ message: "Access denied. This requirement is not assigned to your team." });
      }
      
      if (!allowedTalentAdvisors.includes(talentAdvisor)) {
        return res.status(400).json({ 
          message: allowedTalentAdvisors.length > 0 
            ? "Invalid Talent Advisor. Must be one of your team members: " + allowedTalentAdvisors.join(', ')
            : "No team members available to assign. Please add recruiters to your team first."
        });
      }

      // Find the recruiter's ID to set talentAdvisorId
      const recruiter = teamRecruiters.find(rec => rec.name === talentAdvisor);
      if (!recruiter) {
        return res.status(400).json({ message: "Could not find recruiter ID for assignment" });
      }

      // Update the requirement with both talentAdvisor name and talentAdvisorId
      const updated = await storage.updateRequirement(id, { 
        talentAdvisor,
        talentAdvisorId: recruiter.id
      });
      if (!updated) {
        return res.status(404).json({ message: "Requirement not found" });
      }

      res.json(updated);
    } catch (error) {
      console.error('Assign talent advisor error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Team Leader file upload endpoints
  app.post("/api/team-leader/upload/banner", upload.single('file'), (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      const baseUrl = process.env.NODE_ENV === 'production' 
        ? (process.env.BACKEND_URL || `https://${req.get('host')}`)
        : `http://${req.get('host')}`;
      
      const url = `${baseUrl}/uploads/${req.file.filename}`;
      res.json({ url });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ message: "Upload failed", error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  app.post("/api/team-leader/upload/profile", upload.single('file'), (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      const baseUrl = process.env.NODE_ENV === 'production' 
        ? (process.env.BACKEND_URL || `https://${req.get('host')}`)
        : `http://${req.get('host')}`;
      
      const url = `${baseUrl}/uploads/${req.file.filename}`;
      res.json({ url });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ message: "Upload failed", error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Get team leader profile from database based on logged-in user
  app.get("/api/team-leader/profile", requireEmployeeAuth, async (req, res) => {
    try {
      const session = req.session as any;
      const employee = await storage.getEmployeeById(session.employeeId);
      
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }

      if (employee.role !== 'team_leader') {
        return res.status(403).json({ message: "Access denied. Team Leader role required." });
      }

      // Get team members count
      const allEmployees = await storage.getAllEmployees();
      const teamMembers = allEmployees.filter(
        emp => emp.role === 'recruiter' && emp.reportingTo === employee.employeeId
      );

      // Get revenue mappings for total contribution calculation
      const revenueMappings = await storage.getRevenueMappingsByTeamLeaderId(employee.id);
      const totalContribution = revenueMappings.reduce((sum, rm) => sum + (rm.revenue || 0), 0);

      // Find reporting manager's name
      let reportingToName = '-';
      if (employee.reportingTo) {
        const manager = allEmployees.find(emp => emp.employeeId === employee.reportingTo);
        if (manager) {
          reportingToName = manager.name;
        }
      }

      const profile = {
        id: employee.id,
        name: employee.name,
        role: "Team Leader",
        employeeId: employee.employeeId,
        phone: employee.phoneNumber || '-',
        email: employee.email,
        joiningDate: employee.joiningDate ? new Date(employee.joiningDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }).replace(/ /g, '-') : '-',
        department: employee.department || 'Talent Advisory',
        reportingTo: reportingToName,
        totalContribution: totalContribution.toLocaleString('en-IN'),
        bannerImage: null,
        profilePicture: employee.profilePicture || null,
        teamMembersCount: teamMembers.length
      };

      res.json(profile);
    } catch (error) {
      console.error('Get team leader profile error:', error);
      res.status(500).json({ message: "Failed to fetch profile" });
    }
  });

  // Team Leader profile update endpoint
  app.patch("/api/team-leader/profile", requireEmployeeAuth, async (req, res) => {
    try {
      const session = req.session as any;
      const employee = await storage.getEmployeeById(session.employeeId);
      
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }

      if (employee.role !== 'team_leader') {
        return res.status(403).json({ message: "Access denied. Team Leader role required." });
      }

      const updates = req.body;
      
      // Update employee record if needed
      // For now, return the updated profile data
      res.json({ ...updates, id: employee.id });
    } catch (error) {
      console.error('Update team leader profile error:', error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Team Leader stats endpoint - returns profile data for the team boxes component
  app.get("/api/team-leader/stats", requireEmployeeAuth, async (req, res) => {
    try {
      const session = req.session as any;
      const employee = await storage.getEmployeeById(session.employeeId);
      if (!employee || employee.role !== 'team_leader') {
        return res.status(403).json({ message: "Access denied. Team Leader role required." });
      }

      const allEmployees = await storage.getAllEmployees();
      const teamMembers = allEmployees.filter(
        emp => emp.role === 'recruiter' && emp.reportingTo === employee.employeeId
      );

      let joiningDate = employee.joiningDate;
      let tenure = "0";
      if (joiningDate) {
        try {
          const date = new Date(joiningDate);
          if (!isNaN(date.getTime())) {
            const now = new Date();
            tenure = ((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24 * 365)).toFixed(1);
          }
        } catch (e) {
          tenure = "0";
        }
      }

      const revenueMappings = await storage.getRevenueMappingsByTeamLeaderId(employee.id);
      const qtrsAchieved = new Set(revenueMappings.map(rm => rm.quarter)).size;
      const nextMilestone = qtrsAchieved > 0 ? `+${Math.ceil(qtrsAchieved / 4) * 4 - qtrsAchieved}` : "0";
      const totalRevenue = revenueMappings.reduce((sum, rm) => sum + (rm.revenue || 0), 0);
      const performanceScore = teamMembers.length > 0 ? Math.min(100, (revenueMappings.length / teamMembers.length) * 20) : 0;

      res.json({
        id: employee.id,
        name: employee.name,
        image: null,
        members: teamMembers.length,
        tenure: tenure,
        qtrsAchieved,
        nextMilestone,
        email: employee.email,
        position: "Team Leader",
        department: employee.department || "Recruitment",
        performanceScore: Math.round(performanceScore * 10) / 10
      });
    } catch (error) {
      console.error('Get team leader stats error:', error);
      res.status(500).json({ message: "Failed to fetch team leader stats" });
    }
  });

  // Team Leader team performance endpoint
  app.get("/api/team-leader/team-performance", requireEmployeeAuth, async (req, res) => {
    try {
      const session = req.session as any;
      const employee = await storage.getEmployeeById(session.employeeId);
      if (!employee || employee.role !== 'team_leader') {
        return res.status(403).json({ message: "Access denied. Team Leader role required." });
      }

      const allEmployees = await storage.getAllEmployees();
      const recruiters = allEmployees.filter(
        emp => emp.role === 'recruiter' && emp.reportingTo === employee.employeeId
      );

      const performanceData = await Promise.all(recruiters.map(async (rec) => {
        const revenueMappings = await storage.getRevenueMappingsByRecruiterId(rec.id);
        const closures = revenueMappings.filter(rm => rm.status === 'closed').length;
        
        let tenure = "0";
        if (rec.joiningDate) {
          try {
            const joinDate = new Date(rec.joiningDate);
            if (!isNaN(joinDate.getTime())) {
              const now = new Date();
              const years = Math.floor((now.getTime() - joinDate.getTime()) / (1000 * 60 * 60 * 24 * 365));
              const months = Math.floor(((now.getTime() - joinDate.getTime()) % (1000 * 60 * 60 * 24 * 365)) / (1000 * 60 * 60 * 24 * 30));
              tenure = years > 0 ? `${years}y ${months}m` : `${months}m`;
            }
          } catch (e) {
            tenure = "0";
          }
        }

        // Count unique quarters with closures
        const closedMappings = revenueMappings.filter(rm => rm.status === 'closed');
        const qtrsAchieved = new Set(closedMappings.map(rm => rm.quarter)).size;
        
        // Find last closure date
        const lastClosure = closedMappings.length > 0 
          ? closedMappings.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())[0]
          : null;

        return {
          name: rec.name,
          joiningDate: rec.joiningDate ? new Date(rec.joiningDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-',
          tenure,
          closures,
          lastClosure: lastClosure ? new Date(lastClosure.createdAt || Date.now()).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : '-',
          qtrsAchieved
        };
      }));

      res.json(performanceData);
    } catch (error) {
      console.error('Get team leader team performance error:', error);
      res.status(500).json({ message: "Failed to fetch team performance" });
    }
  });

  // Team Leader team member performance graph data endpoint
  app.get("/api/team-leader/team-performance-graph", requireEmployeeAuth, async (req, res) => {
    try {
      const session = req.session as any;
      const employee = await storage.getEmployeeById(session.employeeId);
      if (!employee || employee.role !== 'team_leader') {
        return res.status(403).json({ message: "Access denied. Team Leader role required." });
      }

      const memberId = req.query.memberId as string | undefined;
      const allEmployees = await storage.getAllEmployees();
      const recruiters = allEmployees.filter(
        emp => emp.role === 'recruiter' && emp.reportingTo === employee.employeeId
      );

      // Get members list for filter dropdown
      const members = recruiters.map(rec => ({
        id: rec.id,
        name: rec.name
      }));

      // Calculate performance data per quarter for each member
      const performanceByMember: Record<string, { resumesDelivered: number; closures: number }[]> = {};
      const quarterlyData: Record<string, { resumesDelivered: number; closures: number }> = {};

      // Filter recruiters if memberId is specified
      const targetRecruiters = memberId && memberId !== 'all' 
        ? recruiters.filter(rec => rec.id === memberId)
        : recruiters;

      for (const rec of targetRecruiters) {
        const revenueMappings = await storage.getRevenueMappingsByRecruiterId(rec.id);
        
        for (const rm of revenueMappings) {
          const quarter = rm.quarter || 'Unknown';
          if (!quarterlyData[quarter]) {
            quarterlyData[quarter] = { resumesDelivered: 0, closures: 0 };
          }
          
          // Count resumes delivered (all mappings count as resumes)
          quarterlyData[quarter].resumesDelivered += 1;
          
          // Count closures (only closed status)
          if (rm.status === 'closed') {
            quarterlyData[quarter].closures += 1;
          }
        }
      }

      // Convert to array format for chart
      const chartData = Object.entries(quarterlyData).map(([quarter, data]) => ({
        quarter,
        resumesDelivered: data.resumesDelivered,
        closures: data.closures
      })).sort((a, b) => {
        // Sort by quarter (e.g., "Q1 2024" < "Q2 2024")
        return a.quarter.localeCompare(b.quarter);
      });

      res.json({
        members,
        chartData,
        selectedMemberId: memberId || 'all'
      });
    } catch (error) {
      console.error('Get team leader team performance graph error:', error);
      res.status(500).json({ message: "Failed to fetch team performance graph data" });
    }
  });

  // Team Leader closures list endpoint
  app.get("/api/team-leader/closures", requireEmployeeAuth, async (req, res) => {
    try {
      const session = req.session as any;
      const employee = await storage.getEmployeeById(session.employeeId);
      if (!employee || employee.role !== 'team_leader') {
        return res.status(403).json({ message: "Access denied. Team Leader role required." });
      }

      const allEmployees = await storage.getAllEmployees();
      const recruiters = allEmployees.filter(
        emp => emp.role === 'recruiter' && emp.reportingTo === employee.employeeId
      );

      const closures: any[] = [];
      for (const rec of recruiters) {
        const revenueMappings = await storage.getRevenueMappingsByRecruiterId(rec.id);
        const closedMappings = revenueMappings.filter(rm => rm.status === 'closed');
        
        for (const mapping of closedMappings) {
          closures.push({
            name: mapping.candidateName || 'Unknown',
            position: mapping.position || 'Unknown Position',
            company: mapping.company || 'Unknown Company',
            closureMonth: mapping.quarter || 'N/A',
            talentAdvisor: rec.name,
            package: mapping.package ? `${Number(mapping.package).toLocaleString('en-IN')}` : '0',
            revenue: mapping.revenue ? `${Number(mapping.revenue).toLocaleString('en-IN')}` : '0'
          });
        }
      }

      res.json(closures);
    } catch (error) {
      console.error('Get team leader closures error:', error);
      res.status(500).json({ message: "Failed to fetch closures" });
    }
  });

  // Admin Dashboard API routes and file uploads
  // Session-based admin profile endpoint - fetches from database based on logged-in user
  app.get("/api/admin/profile", requireEmployeeAuth, async (req, res) => {
    try {
      const session = req.session as any;
      const employee = await storage.getEmployeeById(session.employeeId);
      
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }

      if (employee.role !== 'admin') {
        return res.status(403).json({ message: "Access denied. Admin role required." });
      }

      // Get all revenue mappings for total contribution calculation (admin sees all)
      const allRevenueMappings = await storage.getAllRevenueMappings();
      const totalContribution = allRevenueMappings.reduce((sum, rm) => sum + (rm.revenue || 0), 0);

      const profile = {
        id: employee.id,
        name: employee.name,
        role: employee.designation || "CEO",
        employeeId: employee.employeeId,
        phone: employee.phone || '-',
        email: employee.email,
        joiningDate: employee.joiningDate ? new Date(employee.joiningDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }).replace(/ /g, '-') : '-',
        department: employee.department || 'Administration',
        reportingTo: 'Board of Directors',
        totalContribution: totalContribution.toLocaleString('en-IN'),
        bannerImage: employee.bannerImage || null,
        profilePicture: employee.profilePicture || null
      };

      res.json(profile);
    } catch (error) {
      console.error('Get admin profile error:', error);
      res.status(500).json({ message: "Failed to fetch profile" });
    }
  });

  app.patch("/api/admin/profile", requireEmployeeAuth, async (req, res) => {
    try {
      const session = req.session as any;
      const employee = await storage.getEmployeeById(session.employeeId);
      
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }

      if (employee.role !== 'admin') {
        return res.status(403).json({ message: "Access denied. Admin role required." });
      }

      const updates = req.body;
      
      // Update the employee record in database
      const updatedEmployee = await storage.updateEmployee(employee.id, {
        phone: updates.phone !== undefined ? updates.phone : employee.phone,
        bannerImage: updates.bannerImage !== undefined ? updates.bannerImage : employee.bannerImage,
        profilePicture: updates.profilePicture !== undefined ? updates.profilePicture : employee.profilePicture,
        department: updates.department !== undefined ? updates.department : employee.department
      });

      if (!updatedEmployee) {
        return res.status(500).json({ message: "Failed to update profile" });
      }

      // Get all revenue mappings for total contribution calculation
      const allRevenueMappings = await storage.getAllRevenueMappings();
      const totalContribution = allRevenueMappings.reduce((sum, rm) => sum + (rm.revenue || 0), 0);

      const profile = {
        id: updatedEmployee.id,
        name: updatedEmployee.name,
        role: updatedEmployee.designation || "CEO",
        employeeId: updatedEmployee.employeeId,
        phone: updatedEmployee.phone || '-',
        email: updatedEmployee.email,
        joiningDate: updatedEmployee.joiningDate ? new Date(updatedEmployee.joiningDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }).replace(/ /g, '-') : '-',
        department: updatedEmployee.department || 'Administration',
        reportingTo: 'Board of Directors',
        totalContribution: totalContribution.toLocaleString('en-IN'),
        bannerImage: updatedEmployee.bannerImage || null,
        profilePicture: updatedEmployee.profilePicture || null
      };

      res.json(profile);
    } catch (error) {
      console.error('Update admin profile error:', error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Admin file upload endpoints
  app.post("/api/admin/upload/banner", upload.single('file'), (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      const baseUrl = process.env.NODE_ENV === 'production' 
        ? (process.env.BACKEND_URL || `https://${req.get('host')}`)
        : `http://${req.get('host')}`;
      
      const url = `${baseUrl}/uploads/${req.file.filename}`;
      res.json({ url });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ message: "Upload failed", error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  app.post("/api/admin/upload/profile", upload.single('file'), (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      const baseUrl = process.env.NODE_ENV === 'production' 
        ? (process.env.BACKEND_URL || `https://${req.get('host')}`)
        : `http://${req.get('host')}`;
      
      const url = `${baseUrl}/uploads/${req.file.filename}`;
      res.json({ url });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ message: "Upload failed", error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Admin team leaders endpoint - fetch all team leaders with their recruiter counts
  app.get("/api/admin/team-leaders", requireAdminAuth, async (req, res) => {
    try {
      const allEmployees = await storage.getAllEmployees();
      
      // Filter team leaders
      const teamLeaders = allEmployees.filter(emp => emp.role === 'team_leader');
      
      // For each team leader, count their recruiters
      const teamLeadersWithCounts = teamLeaders.map(tl => {
        // Count recruiters reporting to this team leader
        const recruiterCount = allEmployees.filter(
          emp => emp.role === 'recruiter' && emp.reportingTo === tl.employeeId
        ).length;
        
        return {
          id: tl.id,
          employeeId: tl.employeeId,
          name: tl.name,
          email: tl.email || 'not filled',
          phone: tl.phone || 'not filled',
          age: tl.age || 'not filled',
          department: tl.department || 'not filled',
          joiningDate: tl.joiningDate || 'not filled',
          reportingTo: tl.reportingTo || 'not filled',
          members: recruiterCount,
          // Default metrics for new profiles
          tenure: '0',
          qtrsAchieved: 0,
          nextMilestone: '+0',
          totalClosures: 0,
          targetAchievement: 0,
          totalRevenue: '0',
          role: 'Team Leader',
          image: null,
          lastLogin: 'not filled',
          lastClosure: 'not filled'
        };
      });
      
      res.json(teamLeadersWithCounts);
    } catch (error) {
      console.error('Get team leaders error:', error);
      res.status(500).json({ message: "Failed to fetch team leaders", error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Recruiter Dashboard API routes
  // Get recruiter profile from database based on logged-in user (session-based)
  app.get("/api/recruiter/profile", requireEmployeeAuth, async (req, res) => {
    try {
      const session = req.session as any;
      const employee = await storage.getEmployeeById(session.employeeId);
      
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }

      if (employee.role !== 'recruiter') {
        return res.status(403).json({ message: "Access denied. Recruiter role required." });
      }

      // Get all employees to find reporting manager's name
      const allEmployees = await storage.getAllEmployees();
      let reportingToName = '-';
      if (employee.reportingTo) {
        const manager = allEmployees.find(emp => emp.employeeId === employee.reportingTo);
        if (manager) {
          reportingToName = manager.name;
        }
      }

      // Get revenue mappings for total contribution calculation
      const revenueMappings = await storage.getRevenueMappingsByTalentAdvisorId(employee.id);
      const totalContribution = revenueMappings.reduce((sum, rm) => sum + (rm.revenue || 0), 0);

      const profile = {
        id: employee.id,
        name: employee.name,
        role: "Talent Advisor",
        employeeId: employee.employeeId,
        phone: employee.phone || '-',
        email: employee.email,
        joiningDate: employee.joiningDate ? new Date(employee.joiningDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }).replace(/ /g, '-') : '-',
        department: employee.department || 'Talent Advisory',
        reportingTo: reportingToName,
        totalContribution: totalContribution.toLocaleString('en-IN'),
        bannerImage: employee.bannerImage || null,
        profilePicture: employee.profilePicture || null
      };

      res.json(profile);
    } catch (error) {
      console.error('Get recruiter profile error:', error);
      res.status(500).json({ message: "Failed to fetch profile" });
    }
  });

  // Recruiter profile update endpoint - updates the employee record in database
  app.patch("/api/recruiter/profile", requireEmployeeAuth, async (req, res) => {
    try {
      const session = req.session as any;
      const employee = await storage.getEmployeeById(session.employeeId);
      
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }

      if (employee.role !== 'recruiter') {
        return res.status(403).json({ message: "Access denied. Recruiter role required." });
      }

      const updates = req.body;
      
      // Map profile fields to employee fields for database update
      const employeeUpdates: any = {};
      if (updates.name) employeeUpdates.name = updates.name;
      if (updates.phone) employeeUpdates.phone = updates.phone;
      if (updates.email) employeeUpdates.email = updates.email;
      if (updates.department) employeeUpdates.department = updates.department;
      if (updates.bannerImage !== undefined) employeeUpdates.bannerImage = updates.bannerImage;
      if (updates.profilePicture !== undefined) employeeUpdates.profilePicture = updates.profilePicture;
      
      // Update employee record in database
      const updatedEmployee = await storage.updateEmployee(employee.id, employeeUpdates);
      
      if (!updatedEmployee) {
        return res.status(500).json({ message: "Failed to update profile" });
      }

      // Return the updated profile in the expected format
      const allEmployees = await storage.getAllEmployees();
      let reportingToName = '-';
      if (updatedEmployee.reportingTo) {
        const manager = allEmployees.find(emp => emp.employeeId === updatedEmployee.reportingTo);
        if (manager) {
          reportingToName = manager.name;
        }
      }

      const revenueMappings = await storage.getRevenueMappingsByTalentAdvisorId(updatedEmployee.id);
      const totalContribution = revenueMappings.reduce((sum, rm) => sum + (rm.revenue || 0), 0);

      const profile = {
        id: updatedEmployee.id,
        name: updatedEmployee.name,
        role: "Talent Advisor",
        employeeId: updatedEmployee.employeeId,
        phone: updatedEmployee.phone || '-',
        email: updatedEmployee.email,
        joiningDate: updatedEmployee.joiningDate ? new Date(updatedEmployee.joiningDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }).replace(/ /g, '-') : '-',
        department: updatedEmployee.department || 'Talent Advisory',
        reportingTo: reportingToName,
        totalContribution: totalContribution.toLocaleString('en-IN'),
        bannerImage: updatedEmployee.bannerImage || null,
        profilePicture: updatedEmployee.profilePicture || null
      };

      res.json(profile);
    } catch (error) {
      console.error('Update recruiter profile error:', error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Recruiter file upload endpoints
  // Recruiter data endpoints - same as team leader
  // Legacy endpoint - returns 0 defaults for backward compatibility
  app.get("/api/recruiter/target-metrics", (req, res) => {
    const targetMetrics = {
      id: "target-rec-001",
      currentQuarter: `Q${Math.ceil((new Date().getMonth() + 1) / 3)}-${new Date().getFullYear()}`,
      minimumTarget: "0",
      targetAchieved: "0",
      incentiveEarned: "0"
    };
    res.json(targetMetrics);
  });

  // Get aggregated target data for recruiter/TA based on their individual target mappings
  app.get("/api/recruiter/aggregated-targets", async (req, res) => {
    try {
      const session = req.session as any;
      if (!session?.employeeId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const employee = await storage.getEmployeeById(session.employeeId);
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }

      // Fetch target summary for this recruiter (they are the teamMemberId)
      const targetSummary = await storage.getRecruiterTargetSummary(employee.id);
      res.json(targetSummary);
    } catch (error) {
      console.error('Get recruiter aggregated targets error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/recruiter/daily-metrics", requireEmployeeAuth, async (req, res) => {
    try {
      const session = req.session as any;
      const employee = await storage.getEmployeeById(session.employeeId);
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }

      const dateParam = req.query.date as string | undefined;
      const today = dateParam || new Date().toISOString().split('T')[0];
      
      // Import getResumeTarget for calculations
      const { getResumeTarget } = await import("@shared/constants");
      
      // Get requirements assigned to this recruiter directly from requirements table
      const requirements = await storage.getRequirementsByTalentAdvisorId(employee.id);
      const totalRequirements = requirements.length;
      
      // Calculate total required resumes and track per-requirement delivery
      let totalResumesRequired = 0;
      let totalResumesDelivered = 0;
      let completedRequirements = 0;
      
      // Get all resume submissions by this recruiter for their requirements
      const { resumeSubmissions } = await import("@shared/schema");
      const allSubmissions = await db.select().from(resumeSubmissions)
        .where(eq(resumeSubmissions.recruiterId, employee.id));
      
      for (const req of requirements) {
        const target = getResumeTarget(req.criticality, req.toughness);
        totalResumesRequired += target;
        
        // Count resumes submitted for this requirement
        const deliveredForReq = allSubmissions.filter(s => s.requirementId === req.id).length;
        totalResumesDelivered += deliveredForReq;
        
        // Check if this requirement is fully delivered
        if (deliveredForReq >= target) {
          completedRequirements++;
        }
      }
      
      const dailyMetrics = {
        id: `daily-rec-${employee.id}`,
        date: new Date(today).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-'),
        totalRequirements,
        completedRequirements,
        totalResumes: totalResumesDelivered,
        totalResumesDelivered,
        totalResumesRequired,
        dailyDeliveryDelivered: totalResumesDelivered,
        dailyDeliveryDefaulted: Math.max(0, totalResumesRequired - totalResumesDelivered),
        overallPerformance: totalResumesDelivered >= totalResumesRequired ? "G" : "R",
        delivered: totalResumesDelivered,
        defaulted: Math.max(0, totalResumesRequired - totalResumesDelivered),
        required: totalResumesRequired,
        requirementCount: totalRequirements
      };
      res.json(dailyMetrics);
    } catch (error) {
      console.error('Get recruiter daily metrics error:', error);
      res.status(500).json({ message: "Failed to fetch daily metrics" });
    }
  });

  // Calculate and store daily metrics snapshot for recruiter
  app.post("/api/recruiter/daily-metrics/calculate", requireEmployeeAuth, async (req, res) => {
    try {
      const session = req.session as any;
      const employee = await storage.getEmployeeById(session.employeeId);
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }

      const { date } = req.body;
      const targetDate = date || new Date().toISOString().split('T')[0];
      
      const metrics = await storage.calculateRecruiterDailyMetrics(employee.id, targetDate);
      
      // Check if snapshot exists and update, otherwise create
      const existingSnapshot = await storage.getDailyMetricsSnapshot(targetDate, 'recruiter', employee.id);
      
      let snapshot;
      if (existingSnapshot) {
        snapshot = await storage.updateDailyMetricsSnapshot(existingSnapshot.id, {
          delivered: metrics.delivered,
          defaulted: metrics.defaulted,
          requirementCount: metrics.requirementCount
        });
      } else {
        snapshot = await storage.createDailyMetricsSnapshot({
          date: targetDate,
          scopeType: 'recruiter',
          scopeId: employee.id,
          scopeName: employee.name,
          delivered: metrics.delivered,
          defaulted: metrics.defaulted,
          requirementCount: metrics.requirementCount
        });
      }
      
      res.json({ ...metrics, snapshot });
    } catch (error) {
      console.error('Calculate recruiter daily metrics error:', error);
      res.status(500).json({ message: "Failed to calculate daily metrics" });
    }
  });

  // Get daily metrics history for recruiter (for charts)
  app.get("/api/recruiter/daily-metrics/history", requireEmployeeAuth, async (req, res) => {
    try {
      const session = req.session as any;
      const employee = await storage.getEmployeeById(session.employeeId);
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }

      const { startDate, endDate } = req.query;
      const today = new Date().toISOString().split('T')[0];
      const start = (startDate as string) || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const end = (endDate as string) || today;
      
      const snapshots = await storage.getDailyMetricsSnapshotsByDateRange(start, end, 'recruiter', employee.id);
      res.json(snapshots);
    } catch (error) {
      console.error('Get recruiter daily metrics history error:', error);
      res.status(500).json({ message: "Failed to fetch daily metrics history" });
    }
  });

  // Team Lead daily metrics - aggregated team view
  app.get("/api/team-leader/daily-metrics", requireEmployeeAuth, async (req, res) => {
    try {
      const session = req.session as any;
      const employee = await storage.getEmployeeById(session.employeeId);
      if (!employee || employee.role !== 'team_leader') {
        return res.status(403).json({ message: "Access denied. Team Leader role required." });
      }

      const dateParam = req.query.date as string | undefined;
      const today = dateParam || new Date().toISOString().split('T')[0];
      
      const metrics = await storage.calculateTeamDailyMetrics(employee.id, today);
      
      res.json({
        id: `daily-team-${employee.id}`,
        date: new Date(today).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-'),
        delivered: metrics.delivered,
        defaulted: metrics.defaulted,
        required: metrics.required,
        requirementCount: metrics.requirementCount,
        performanceRatio: metrics.required > 0 ? (metrics.delivered / metrics.required * 100).toFixed(1) : '100',
        overallPerformance: metrics.delivered >= metrics.required ? "G" : "R"
      });
    } catch (error) {
      console.error('Get team leader daily metrics error:', error);
      res.status(500).json({ message: "Failed to fetch team daily metrics" });
    }
  });

  // Team Lead daily metrics history (for charts)
  app.get("/api/team-leader/daily-metrics/history", requireEmployeeAuth, async (req, res) => {
    try {
      const session = req.session as any;
      const employee = await storage.getEmployeeById(session.employeeId);
      if (!employee || employee.role !== 'team_leader') {
        return res.status(403).json({ message: "Access denied. Team Leader role required." });
      }

      const { startDate, endDate } = req.query;
      const today = new Date().toISOString().split('T')[0];
      const start = (startDate as string) || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const end = (endDate as string) || today;
      
      const snapshots = await storage.getDailyMetricsSnapshotsByDateRange(start, end, 'team', employee.id);
      res.json(snapshots);
    } catch (error) {
      console.error('Get team leader daily metrics history error:', error);
      res.status(500).json({ message: "Failed to fetch team daily metrics history" });
    }
  });

  // Admin org-wide daily metrics (new algorithm-based)
  app.get("/api/admin/daily-metrics/new", requireEmployeeAuth, async (req, res) => {
    try {
      const session = req.session as any;
      const employee = await storage.getEmployeeById(session.employeeId);
      if (!employee || (employee.role !== 'admin' && employee.role !== 'manager')) {
        return res.status(403).json({ message: "Access denied. Admin role required." });
      }

      const dateParam = req.query.date as string | undefined;
      const today = dateParam || new Date().toISOString().split('T')[0];
      
      const metrics = await storage.calculateOrgDailyMetrics(today);
      
      res.json({
        id: `daily-org-${today}`,
        date: new Date(today).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-'),
        delivered: metrics.delivered,
        defaulted: metrics.defaulted,
        required: metrics.required,
        requirementCount: metrics.requirementCount,
        performanceRatio: metrics.required > 0 ? (metrics.delivered / metrics.required * 100).toFixed(1) : '100',
        overallPerformance: metrics.delivered >= metrics.required ? "G" : "R"
      });
    } catch (error) {
      console.error('Get admin daily metrics error:', error);
      res.status(500).json({ message: "Failed to fetch org daily metrics" });
    }
  });

  // Admin daily metrics history (for charts)
  app.get("/api/admin/daily-metrics/history", requireEmployeeAuth, async (req, res) => {
    try {
      const session = req.session as any;
      const employee = await storage.getEmployeeById(session.employeeId);
      if (!employee || (employee.role !== 'admin' && employee.role !== 'manager')) {
        return res.status(403).json({ message: "Access denied. Admin role required." });
      }

      const { startDate, endDate } = req.query;
      const today = new Date().toISOString().split('T')[0];
      const start = (startDate as string) || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const end = (endDate as string) || today;
      
      const snapshots = await storage.getDailyMetricsSnapshotsByDateRange(start, end, 'organization');
      res.json(snapshots);
    } catch (error) {
      console.error('Get admin daily metrics history error:', error);
      res.status(500).json({ message: "Failed to fetch org daily metrics history" });
    }
  });

  app.get("/api/recruiter/meetings", requireEmployeeAuth, async (req, res) => {
    try {
      const session = req.session as any;
      const employee = await storage.getEmployeeById(session.employeeId);
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }

      // Fetch meetings assigned to this recruiter by personId first, fallback to name
      const allMeetings = await db.select().from(meetings).orderBy(desc(meetings.createdAt));
      
      // Filter meetings by personId (primary) or person name (fallback)
      const recruiterMeetings = allMeetings.filter(m => 
        m.personId === employee.id || m.person === employee.name
      );
      
      res.json(recruiterMeetings);
    } catch (error) {
      console.error('Get recruiter meetings error:', error);
      res.status(500).json({ message: "Failed to fetch meetings" });
    }
  });

  app.get("/api/recruiter/ceo-comments", requireEmployeeAuth, async (req, res) => {
    try {
      const session = req.session as any;
      const employee = await storage.getEmployeeById(session.employeeId);
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }

      // Fetch commands assigned to this recruiter
      const commands = await db.select().from(recruiterCommands)
        .where(eq(recruiterCommands.recruiterId, employee.id))
        .orderBy(desc(recruiterCommands.createdAt));
      
      res.json(commands);
    } catch (error) {
      console.error('Get recruiter commands error:', error);
      res.status(500).json({ message: "Failed to fetch commands" });
    }
  });

  // Get requirements assigned to the logged-in recruiter (Talent Advisor)
  app.get("/api/recruiter/requirements", requireEmployeeAuth, async (req, res) => {
    try {
      const session = req.session as any;
      const employee = await storage.getEmployeeById(session.employeeId);
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }

      // Fetch requirements assigned to this recruiter/talent advisor (using ID-based lookup)
      const recruiterRequirements = await storage.getRequirementsByTalentAdvisorId(employee.id);
      
      // Also get job applications for each requirement to calculate delivery counts
      const requirementsWithCounts = await Promise.all(
        recruiterRequirements.map(async (req) => {
          const applications = await storage.getJobApplicationsByRequirementId(req.id);
          return {
            ...req,
            deliveredCount: applications.length
          };
        })
      );
      
      res.json(requirementsWithCounts);
    } catch (error) {
      console.error('Get recruiter requirements error:', error);
      res.status(500).json({ message: "Failed to fetch requirements" });
    }
  });

  // Get closure reports (revenue mappings) for the logged-in recruiter
  app.get("/api/recruiter/closure-reports", requireEmployeeAuth, async (req, res) => {
    try {
      const session = req.session as any;
      const employee = await storage.getEmployeeById(session.employeeId);
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }

      // Fetch revenue mappings where this recruiter is the talent advisor
      const revenueMappings = await storage.getRevenueMappingsByRecruiterId(session.employeeId);
      
      // Transform to closure report format for frontend with full data
      const closureReports = revenueMappings.map((mapping) => ({
        id: mapping.id,
        candidate: mapping.candidateName || 'N/A',
        position: mapping.position || 'N/A',
        client: mapping.clientName || 'N/A',
        offeredOn: mapping.offeredDate || 'N/A',
        joinedOn: mapping.closureDate || 'N/A',
        quarter: mapping.quarter || 'N/A',
        closureValue: mapping.revenue ? mapping.revenue.toLocaleString('en-IN') : '0',
        incentive: mapping.incentive ? mapping.incentive.toLocaleString('en-IN') : '0',
        revenue: mapping.revenue ? mapping.revenue.toLocaleString('en-IN') : '0'
      }));
      
      res.json(closureReports);
    } catch (error) {
      console.error('Get recruiter closure reports error:', error);
      res.status(500).json({ message: "Failed to fetch closure reports" });
    }
  });

  // Get recruiter quarterly performance data (resumes delivered and closures per quarter)
  app.get("/api/recruiter/quarterly-performance", requireEmployeeAuth, async (req, res) => {
    try {
      const session = req.session as any;
      const employee = await storage.getEmployeeById(session.employeeId);
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }

      const quarterlyData = await storage.getRecruiterQuarterlyPerformance(session.employeeId);
      res.json(quarterlyData);
    } catch (error) {
      console.error('Get recruiter quarterly performance error:', error);
      res.status(500).json({ message: "Failed to fetch quarterly performance data" });
    }
  });

  // Get recruiter performance summary (tenure, total closures, recent closure, etc.)
  app.get("/api/recruiter/performance-summary", requireEmployeeAuth, async (req, res) => {
    try {
      const session = req.session as any;
      const employee = await storage.getEmployeeById(session.employeeId);
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }

      const summary = await storage.getRecruiterPerformanceSummary(session.employeeId);
      res.json(summary);
    } catch (error) {
      console.error('Get recruiter performance summary error:', error);
      res.status(500).json({ message: "Failed to fetch performance summary" });
    }
  });

  app.post("/api/recruiter/upload/banner", upload.single('file'), (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      const baseUrl = process.env.NODE_ENV === 'production' 
        ? (process.env.BACKEND_URL || `https://${req.get('host')}`)
        : `http://${req.get('host')}`;
      
      const url = `${baseUrl}/uploads/${req.file.filename}`;
      res.json({ url });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ message: "Upload failed", error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  app.post("/api/recruiter/upload/profile", upload.single('file'), (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      const baseUrl = process.env.NODE_ENV === 'production' 
        ? (process.env.BACKEND_URL || `https://${req.get('host')}`)
        : `http://${req.get('host')}`;
      
      const url = `${baseUrl}/uploads/${req.file.filename}`;
      res.json({ url });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ message: "Upload failed", error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Requirements API endpoints
  app.get("/api/admin/requirements", requireAdminAuth, async (req, res) => {
    try {
      const requirements = await storage.getRequirements();
      res.json(requirements);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/admin/requirements", requireAdminAuth, async (req, res) => {
    try {
      const validatedData = insertRequirementSchema.parse(req.body);
      const requirement = await storage.createRequirement(validatedData);
      
      logRequirementAdded(
        storage,
        'admin',
        'Admin',
        'admin',
        requirement.position,
        requirement.company,
        requirement.id
      );
      
      res.status(201).json(requirement);
    } catch (error) {
      res.status(400).json({ message: "Invalid requirement data" });
    }
  });

  app.patch("/api/admin/requirements/:id", requireAdminAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const updatedRequirement = await storage.updateRequirement(id, req.body);
      if (!updatedRequirement) {
        return res.status(404).json({ message: "Requirement not found" });
      }
      res.json(updatedRequirement);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/admin/requirements/:id/archive", requireAdminAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const archivedRequirement = await storage.archiveRequirement(id);
      if (!archivedRequirement) {
        return res.status(404).json({ message: "Requirement not found" });
      }
      res.json(archivedRequirement);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/admin/archived-requirements", requireAdminAuth, async (req, res) => {
    try {
      const archivedRequirements = await storage.getArchivedRequirements();
      res.json(archivedRequirements);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Meetings API endpoints
  app.get("/api/admin/meetings", requireAdminAuth, async (req, res) => {
    try {
      const { category } = req.query;
      const allMeetings = await db.select().from(meetings).orderBy(meetings.createdAt);
      
      if (category && (category === 'tl' || category === 'ceo_ta')) {
        const filteredMeetings = allMeetings.filter(m => m.meetingCategory === category);
        return res.json(filteredMeetings);
      }
      
      res.json(allMeetings);
    } catch (error) {
      console.error('Get meetings error:', error);
      res.status(500).json({ message: "Failed to get meetings" });
    }
  });

  app.post("/api/admin/meetings", requireAdminAuth, async (req, res) => {
    try {
      const validatedData = insertMeetingSchema.parse(req.body);
      
      const [meeting] = await db.insert(meetings).values([{
        ...validatedData,
        createdAt: new Date().toISOString(),
      }]).returning();
      res.status(201).json(meeting);
    } catch (error: any) {
      console.error('Create meeting error:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid meeting data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create meeting" });
    }
  });

  app.patch("/api/admin/meetings/:id", requireAdminAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = insertMeetingSchema.partial().parse(req.body);
      
      const [updatedMeeting] = await db.update(meetings)
        .set(updateData)
        .where(eq(meetings.id, id))
        .returning();
      
      if (!updatedMeeting) {
        return res.status(404).json({ message: "Meeting not found" });
      }
      
      res.json(updatedMeeting);
    } catch (error: any) {
      console.error('Update meeting error:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid meeting data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update meeting" });
    }
  });

  app.delete("/api/admin/meetings/:id", requireAdminAuth, async (req, res) => {
    try {
      const { id } = req.params;
      
      const [deletedMeeting] = await db.delete(meetings)
        .where(eq(meetings.id, id))
        .returning();
      
      if (!deletedMeeting) {
        return res.status(404).json({ message: "Meeting not found" });
      }
      
      res.json({ message: "Meeting deleted successfully" });
    } catch (error) {
      console.error('Delete meeting error:', error);
      res.status(500).json({ message: "Failed to delete meeting" });
    }
  });

  // Recruiter Commands API endpoints for Admin
  app.get("/api/admin/recruiter-commands", requireAdminAuth, async (req, res) => {
    try {
      const allCommands = await db.select().from(recruiterCommands).orderBy(desc(recruiterCommands.createdAt));
      res.json(allCommands);
    } catch (error) {
      console.error('Get recruiter commands error:', error);
      res.status(500).json({ message: "Failed to get recruiter commands" });
    }
  });

  app.post("/api/admin/recruiter-commands", requireAdminAuth, async (req, res) => {
    try {
      const validatedData = insertRecruiterCommandSchema.parse(req.body);
      
      const [command] = await db.insert(recruiterCommands).values({
        ...validatedData,
        createdAt: new Date().toISOString(),
      }).returning();
      res.status(201).json(command);
    } catch (error: any) {
      console.error('Create recruiter command error:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid command data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create recruiter command" });
    }
  });

  app.patch("/api/admin/recruiter-commands/:id", requireAdminAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = insertRecruiterCommandSchema.partial().parse(req.body);
      
      const [updatedCommand] = await db.update(recruiterCommands)
        .set(updateData)
        .where(eq(recruiterCommands.id, id))
        .returning();
      
      if (!updatedCommand) {
        return res.status(404).json({ message: "Recruiter command not found" });
      }
      
      res.json(updatedCommand);
    } catch (error: any) {
      console.error('Update recruiter command error:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid command data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update recruiter command" });
    }
  });

  app.delete("/api/admin/recruiter-commands/:id", requireAdminAuth, async (req, res) => {
    try {
      const { id } = req.params;
      
      const [deletedCommand] = await db.delete(recruiterCommands)
        .where(eq(recruiterCommands.id, id))
        .returning();
      
      if (!deletedCommand) {
        return res.status(404).json({ message: "Recruiter command not found" });
      }
      
      res.json({ message: "Recruiter command deleted successfully" });
    } catch (error) {
      console.error('Delete recruiter command error:', error);
      res.status(500).json({ message: "Failed to delete recruiter command" });
    }
  });

  // Get all recruiters for admin selection (when assigning commands/meetings)
  app.get("/api/admin/recruiters", requireAdminAuth, async (req, res) => {
    try {
      const allRecruiters = await db.select().from(employees)
        .where(eq(employees.role, 'recruiter'))
        .orderBy(employees.name);
      res.json(allRecruiters);
    } catch (error) {
      console.error('Get recruiters error:', error);
      res.status(500).json({ message: "Failed to get recruiters" });
    }
  });

  // Daily Metrics API endpoint
  app.get("/api/admin/daily-metrics", requireAdminAuth, async (req, res) => {
    try {
      // Import getResumeTarget for calculations
      const { getResumeTarget } = await import("@shared/constants");
      
      // Import schema tables
      const { requirements, employees, candidates } = await import("@shared/schema");
      
      // Get all active (non-archived) requirements
      const allRequirements = await db.select().from(requirements)
        .where(eq(requirements.isArchived, false));
      
      const totalRequirements = allRequirements.length;
      
      // Get all resume submissions for calculating delivery
      const { resumeSubmissions } = await import("@shared/schema");
      const allSubmissions = await db.select().from(resumeSubmissions);
      
      // Calculate metrics for all requirements
      let totalResumesRequired = 0;
      let totalResumesDelivered = 0;
      let completedRequirements = 0;
      
      for (const req of allRequirements) {
        const target = getResumeTarget(req.criticality, req.toughness);
        totalResumesRequired += target;
        
        // Count resumes submitted for this requirement
        const deliveredForReq = allSubmissions.filter(s => s.requirementId === req.id).length;
        totalResumesDelivered += deliveredForReq;
        
        // Check if this requirement is fully delivered
        if (deliveredForReq >= target) {
          completedRequirements++;
        }
      }
      
      // Calculate averages
      const avgResumesPerRequirement = totalRequirements > 0 
        ? (totalResumesDelivered / totalRequirements).toFixed(2)
        : "0.00";
      
      // Get count of active recruiters for requirements per recruiter calculation
      const allEmployees = await db.select().from(employees);
      const activeRecruiters = allEmployees.filter(emp => 
        (emp.role === 'recruiter' || emp.role === 'team_leader') && emp.isActive === true
      );
      const recruiterCount = activeRecruiters.length;
      const requirementsPerRecruiter = recruiterCount > 0
        ? (totalRequirements / recruiterCount).toFixed(2)
        : "0.00";
      
      // Return the calculated metrics
      res.json({
        totalRequirements,
        avgResumesPerRequirement,
        requirementsPerRecruiter,
        completedRequirements,
        totalResumes: totalResumesDelivered,
        totalResumesDelivered,
        totalResumesRequired,
        dailyDeliveryDelivered: totalResumesDelivered,
        dailyDeliveryDefaulted: Math.max(0, totalResumesRequired - totalResumesDelivered),
        overallPerformance: totalResumesDelivered >= totalResumesRequired ? "G" : "R"
      });
    } catch (error) {
      console.error('Daily metrics error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Key Aspects API endpoint for Key Metrics chart data
  app.get("/api/admin/key-aspects", requireAdminAuth, async (req, res) => {
    try {
      // For now, return default values of 0 (will be populated from actual data sources later)
      // These metrics would typically come from financial data, HR data, and business analytics
      res.json({
        growthMoM: 0,
        growthYoY: 0,
        burnRate: 0,
        churnRate: 0,
        attrition: 0,
        netProfit: 0,
        revenuePerEmployee: 0,
        clientAcquisitionCost: 0,
        chartData: [] // Empty chart data - will be populated from historical records
      });
    } catch (error) {
      console.error('Key aspects error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Master Data Totals API endpoint
  app.get("/api/admin/master-data-totals", requireAdminAuth, async (req, res) => {
    try {
      const { requirements, employees, candidates, clients } = await import("@shared/schema");
      
      // Get counts from database
      const allEmployees = await db.select().from(employees);
      const allCandidates = await db.select().from(candidates);
      
      // Calculate totals
      const headCount = allEmployees.filter(emp => emp.isActive === true).length;
      const resumes = allCandidates.length;
      
      // For now, return 0 for financial data (would come from finance/expense tables)
      res.json({
        directUploads: 0,
        recruiterUploads: resumes, // Using candidate count as recruiter uploads
        resumes: resumes,
        headCount: headCount,
        salaryPaid: 0,
        otherExpenses: 0,
        toolsAndDatabases: 0,
        rentPaid: 0
      });
    } catch (error) {
      console.error('Master data totals error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Employer forgot password endpoint
  app.post("/api/employer/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: "Invalid email format" });
      }

      // Simulate sending notification to admin
      console.log(`Password reset request for employer email: ${email}`);
      console.log(`Admin notification: New password reset request from ${email}`);
      
      // In a real implementation, you would:
      // 1. Check if email exists in the employer database
      // 2. Generate a reset token
      // 3. Send email to admin with the request details
      // 4. Store the reset request in database
      
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      res.json({ 
        message: "Password reset request sent to admin",
        details: "You will receive an email notification once your request has been processed by the admin team."
      });
    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Google OAuth endpoints (placeholder for future implementation)
  app.get("/api/auth/google", async (req, res) => {
    // Placeholder for Google OAuth initiation
    res.status(501).json({ message: "Google OAuth not yet implemented" });
  });

  app.get("/api/auth/google/callback", async (req, res) => {
    // Placeholder for Google OAuth callback
    res.status(501).json({ message: "Google OAuth callback not yet implemented" });
  });

  // Get notifications for user
  app.get("/api/notifications/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const notifications = await storage.getNotificationsByUserId(userId);
      
      res.json(notifications);
    } catch (error) {
      console.error('Get notifications error:', error);
      res.status(500).json({ message: "Failed to get notifications" });
    }
  });

  // Mark notification as read
  app.post("/api/notifications/:id/read", async (req, res) => {
    try {
      const { id } = req.params;
      const notification = await storage.markNotificationAsRead(id);
      
      if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
      }
      
      res.json(notification);
    } catch (error) {
      console.error('Mark notification as read error:', error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  // Get user activities for role (Admin/TL/Recruiter notifications)
  app.get("/api/user-activities/:role", async (req, res) => {
    try {
      const { role } = req.params;
      const limit = parseInt(req.query.limit as string) || 5;
      const activities = await storage.getUserActivities(role, limit);
      res.json(activities);
    } catch (error) {
      console.error('Get user activities error:', error);
      res.status(500).json({ message: "Failed to get user activities" });
    }
  });

  // Create user activity (for logging actions)
  app.post("/api/user-activities", async (req, res) => {
    try {
      const activityData = {
        ...req.body,
        createdAt: new Date().toISOString()
      };
      const activity = await storage.createUserActivity(activityData);
      res.status(201).json(activity);
    } catch (error) {
      console.error('Create user activity error:', error);
      res.status(500).json({ message: "Failed to create user activity" });
    }
  });

  // Bootstrap admin - UNAUTHENTICATED endpoint for first-time setup
  app.post("/api/bootstrap/admin", async (req, res) => {
    try {
      // Check if any admin already exists
      const allEmployees = await storage.getAllEmployees();
      const existingAdmins = allEmployees.filter(emp => emp.role === 'admin');
      
      if (existingAdmins.length > 0) {
        return res.status(403).json({ 
          message: "Admin account already exists. Please use the login page.",
          adminExists: true 
        });
      }

      // Validate using Zod schema
      const bootstrapAdminSchema = insertEmployeeSchema.omit({ 
        createdAt: true, 
        employeeId: true 
      }).extend({
        role: z.literal('admin'),
        name: z.string().min(2, "Name must be at least 2 characters"),
        email: z.string().email("Invalid email address"),
        password: z.string().min(6, "Password must be at least 6 characters"),
        phone: z.string().min(10, "Phone number must be at least 10 digits"),
      });

      const validatedData = bootstrapAdminSchema.parse(req.body);

      // Store raw password for email before it gets hashed
      const rawPassword = validatedData.password;

      // Generate admin employee ID
      const employeeId = await storage.generateNextEmployeeId('admin');
      
      const employeeData = {
        ...validatedData,
        employeeId,
        createdAt: new Date().toISOString(),
        isActive: true,
      };
      
      // Password will be hashed by storage layer
      const admin = await storage.createEmployee(employeeData);
      
      // Send welcome email to new admin
      const loginUrl = process.env.REPLIT_DEV_DOMAIN 
        ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
        : (process.env.REPLIT_DOMAINS ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}` : 'http://localhost:5000');
      
      try {
        await sendEmployeeWelcomeEmail({
          name: admin.name,
          email: admin.email,
          employeeId: admin.employeeId,
          role: admin.role,
          password: rawPassword,
          loginUrl
        });
        console.log(`Welcome email sent to admin: ${admin.email}`);
      } catch (emailError) {
        console.error('Failed to send welcome email to admin:', emailError);
        // Continue with success response - email failure shouldn't block admin creation
      }
      
      res.status(201).json({ 
        message: "Admin account created successfully",
        employee: {
          id: admin.id,
          name: admin.name,
          email: admin.email,
          role: admin.role
        }
      });
    } catch (error: any) {
      console.error('Bootstrap admin error:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          message: "Invalid admin data", 
          errors: error.errors 
        });
      }
      if (error.message?.includes('duplicate') || error.message?.includes('unique')) {
        return res.status(409).json({ 
          message: "An account with this email already exists" 
        });
      }
      res.status(500).json({ message: "Failed to create admin account" });
    }
  });

  // Check if admin exists - UNAUTHENTICATED endpoint
  app.get("/api/bootstrap/check", async (req, res) => {
    try {
      const allEmployees = await storage.getAllEmployees();
      const existingAdmins = allEmployees.filter(emp => emp.role === 'admin');
      
      // For testing purposes, return admin email if exists
      const adminInfo = existingAdmins.length > 0 ? {
        email: existingAdmins[0].email,
        name: existingAdmins[0].name,
        note: "Password is encrypted and cannot be displayed for security"
      } : null;
      
      res.json({ 
        adminExists: existingAdmins.length > 0,
        setupRequired: existingAdmins.length === 0,
        adminInfo
      });
    } catch (error) {
      console.error('Admin check error:', error);
      res.status(500).json({ message: "Failed to check admin status" });
    }
  });

  // Delete admin - UNAUTHENTICATED endpoint (protected by security key)
  app.delete("/api/bootstrap/admin", async (req, res) => {
    try {
      const { securityKey } = req.body;
      
      // Verify security key
      const ADMIN_RESET_KEY = process.env.ADMIN_RESET_KEY;
      
      if (!ADMIN_RESET_KEY) {
        return res.status(500).json({ 
          message: "Admin reset feature is not configured. Please contact system administrator." 
        });
      }
      
      if (!securityKey || securityKey !== ADMIN_RESET_KEY) {
        return res.status(403).json({ 
          message: "Invalid security key. Access denied." 
        });
      }
      
      // Get all admin accounts
      const allEmployees = await storage.getAllEmployees();
      const existingAdmins = allEmployees.filter(emp => emp.role === 'admin');
      
      if (existingAdmins.length === 0) {
        return res.status(404).json({ 
          message: "No admin account found to delete." 
        });
      }
      
      // Delete all admin accounts
      let deletedCount = 0;
      for (const admin of existingAdmins) {
        const deleted = await storage.deleteEmployee(admin.id);
        if (deleted) {
          deletedCount++;
        }
      }
      
      res.json({ 
        message: `Successfully deleted ${deletedCount} admin account(s). You can now create a new admin.`,
        deletedCount
      });
    } catch (error) {
      console.error('Delete admin error:', error);
      res.status(500).json({ message: "Failed to delete admin account" });
    }
  });

  // Bootstrap support - UNAUTHENTICATED endpoint for first-time setup
  app.post("/api/bootstrap/support", async (req, res) => {
    try {
      // Check if any support already exists
      const allEmployees = await storage.getAllEmployees();
      const existingSupport = allEmployees.filter(emp => emp.role === 'support');
      
      if (existingSupport.length > 0) {
        return res.status(403).json({ 
          message: "Support account already exists. Please use the login page.",
          supportExists: true 
        });
      }

      // Validate using Zod schema
      const bootstrapSupportSchema = insertEmployeeSchema.omit({ 
        createdAt: true, 
        employeeId: true 
      }).extend({
        role: z.literal('support'),
        name: z.string().min(2, "Name must be at least 2 characters"),
        email: z.string().email("Invalid email address"),
        password: z.string().min(6, "Password must be at least 6 characters"),
        phone: z.string().min(10, "Phone number must be at least 10 digits"),
      });

      const validatedData = bootstrapSupportSchema.parse(req.body);

      // Generate support employee ID
      const employeeId = await storage.generateNextEmployeeId('support');
      
      const employeeData = {
        ...validatedData,
        employeeId,
        createdAt: new Date().toISOString(),
        isActive: true,
      };
      
      // Password will be hashed by storage layer
      const support = await storage.createEmployee(employeeData);
      
      res.status(201).json({ 
        message: "Support account created successfully",
        employee: {
          id: support.id,
          name: support.name,
          email: support.email,
          role: support.role
        }
      });
    } catch (error: any) {
      console.error('Bootstrap support error:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          message: "Invalid support data", 
          errors: error.errors 
        });
      }
      if (error.message?.includes('duplicate') || error.message?.includes('unique')) {
        return res.status(409).json({ 
          message: "An account with this email already exists" 
        });
      }
      res.status(500).json({ message: "Failed to create support account" });
    }
  });

  // Check if support exists - UNAUTHENTICATED endpoint
  app.get("/api/bootstrap/support/check", async (req, res) => {
    try {
      const allEmployees = await storage.getAllEmployees();
      const existingSupport = allEmployees.filter(emp => emp.role === 'support');
      
      // For testing purposes, return support email if exists
      const supportInfo = existingSupport.length > 0 ? {
        email: existingSupport[0].email,
        name: existingSupport[0].name,
        note: "Password is encrypted and cannot be displayed for security"
      } : null;
      
      res.json({ 
        supportExists: existingSupport.length > 0,
        setupRequired: existingSupport.length === 0,
        supportInfo
      });
    } catch (error) {
      console.error('Support check error:', error);
      res.status(500).json({ message: "Failed to check support status" });
    }
  });

  // Delete support - UNAUTHENTICATED endpoint (protected by security key)
  app.delete("/api/bootstrap/support", async (req, res) => {
    try {
      const { securityKey } = req.body;
      
      // Verify security key - use same key as admin for simplicity
      const SUPPORT_RESET_KEY = process.env.ADMIN_RESET_KEY;
      
      if (!SUPPORT_RESET_KEY) {
        return res.status(500).json({ 
          message: "Support reset feature is not configured. Please contact system administrator." 
        });
      }
      
      if (!securityKey || securityKey !== SUPPORT_RESET_KEY) {
        return res.status(403).json({ 
          message: "Invalid security key. Access denied." 
        });
      }
      
      // Get all support accounts
      const allEmployees = await storage.getAllEmployees();
      const existingSupport = allEmployees.filter(emp => emp.role === 'support');
      
      if (existingSupport.length === 0) {
        return res.status(404).json({ 
          message: "No support account found to delete." 
        });
      }
      
      // Delete all support accounts
      let deletedCount = 0;
      for (const support of existingSupport) {
        const deleted = await storage.deleteEmployee(support.id);
        if (deleted) {
          deletedCount++;
        }
      }
      
      res.json({ 
        message: `Successfully deleted ${deletedCount} support account(s). You can now create a new support account.`,
        deletedCount
      });
    } catch (error) {
      console.error('Delete support error:', error);
      res.status(500).json({ message: "Failed to delete support account" });
    }
  });

  // Create employee
  app.post("/api/admin/employees", requireAdminAuth, async (req, res) => {
    try {
      // Always generate employee ID on backend (SCE001, SCE002, etc.)
      const employeeId = await storage.generateNextEmployeeId(req.body.role || 'employee');
      
      const employeeData = insertEmployeeSchema.parse({
        ...req.body,
        employeeId, // Override any client-provided ID
        createdAt: new Date().toISOString(),
      });
      
      // Store raw password for email before it gets hashed
      const rawPassword = employeeData.password || 'StaffOS@123';
      
      // Password will be hashed by storage layer
      const employee = await storage.createEmployee(employeeData);
      
      // Send welcome email to new employee
      if (employee.email && rawPassword) {
        const loginUrl = process.env.REPLIT_DEV_DOMAIN 
          ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
          : 'http://localhost:5000';
        
        await sendEmployeeWelcomeEmail({
          name: employee.name,
          email: employee.email,
          employeeId: employee.employeeId,
          role: employee.role,
          password: rawPassword,
          loginUrl
        });
      }
      
      res.status(201).json({ message: "Employee created successfully", employee });
    } catch (error: any) {
      console.error('Create employee error:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid employee data", errors: error.errors });
      }
      if (error.message?.includes('duplicate') || error.message?.includes('unique')) {
        return res.status(409).json({ message: "Employee with this email or ID already exists" });
      }
      res.status(500).json({ message: "Failed to create employee" });
    }
  });

  // Create client
  app.post("/api/admin/clients", requireAdminAuth, async (req, res) => {
    try {
      const clientSchema = z.object({
        clientCode: z.string().optional(),
        brandName: z.string().min(1),
        incorporatedName: z.string().optional(),
        gstin: z.string().optional(),
        address: z.string().optional(),
        location: z.string().optional(),
        spoc: z.string().optional(),
        email: z.string().email(),
        password: z.string().min(6),
        website: z.string().optional(),
        linkedin: z.string().optional(),
        agreement: z.string().optional(),
        percentage: z.string().optional(),
        category: z.string().optional(),
        paymentTerms: z.string().optional(),
        source: z.string().optional(),
        startDate: z.string().optional(),
        currentStatus: z.string().optional(),
        createdAt: z.string(),
      });

      let clientCode = req.body.clientCode;
      if (!clientCode) {
        clientCode = await storage.generateNextClientCode();
      }

      const validatedData = clientSchema.parse({
        ...req.body,
        clientCode,
        createdAt: new Date().toISOString(),
      });

      // Create client record (without password)
      const { password, ...clientDataWithoutPassword } = validatedData;
      // Ensure clientCode is included in the data
      const clientDataToInsert = {
        ...clientDataWithoutPassword,
        clientCode
      };
      const client = await storage.createClient(clientDataToInsert);
      
      // Create employee profile for client login
      // Note: storage.createEmployee will hash the password, so pass raw password
      const rawPassword = validatedData.password;
      const employeeData = {
        employeeId: clientCode,
        name: validatedData.brandName,
        email: validatedData.email,
        password: validatedData.password,
        role: "client",
        phone: validatedData.spoc || "",
        department: "Client",
        joiningDate: validatedData.startDate || new Date().toISOString().split('T')[0],
        reportingTo: "Admin",
        isActive: true,
        createdAt: new Date().toISOString(),
      };
      
      const createdEmployee = await storage.createEmployee(employeeData);
      
      // Send welcome email to client
      if (createdEmployee.email && rawPassword) {
        const loginUrl = process.env.REPLIT_DEV_DOMAIN 
          ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
          : 'http://localhost:5000';
        
        await sendEmployeeWelcomeEmail({
          name: createdEmployee.name,
          email: createdEmployee.email,
          employeeId: createdEmployee.employeeId,
          role: createdEmployee.role,
          password: rawPassword,
          loginUrl
        });
      }
      
      res.status(201).json({ message: "Client profile created successfully", client });
    } catch (error: any) {
      console.error('Create client error:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid client data", errors: error.errors });
      }
      if (error.message?.includes('duplicate') || error.message?.includes('unique')) {
        return res.status(409).json({ message: "Client with this email or code already exists" });
      }
      res.status(500).json({ message: "Failed to create client" });
    }
  });

  // Create client credentials (simplified - for User Management)
  app.post("/api/admin/clients/credentials", requireAdminAuth, async (req, res) => {
    try {
      const credentialsSchema = z.object({
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        name: z.string().min(1),
        phoneNumber: z.string().min(1),
        email: z.string().email(),
        password: z.string().min(6),
        joiningDate: z.string(),
        linkedinProfile: z.string().optional(),
      });

      const validatedData = credentialsSchema.parse(req.body);
      
      // Generate client code
      const clientCode = await storage.generateNextClientCode();

      // Create minimal client record with just the essential information
      // Mark as login-only so it doesn't appear in Master Data tables
      const minimalClientData = {
        clientCode,
        brandName: validatedData.name,
        email: validatedData.email,
        currentStatus: 'active',
        isLoginOnly: true,
        createdAt: new Date().toISOString(),
      };
      
      const client = await storage.createClient(minimalClientData);
      
      // Create employee profile for client login
      // SECURITY: Always set role to "client" on server-side to prevent privilege escalation
      const employeeData = {
        employeeId: clientCode,
        name: validatedData.name,
        email: validatedData.email,
        password: validatedData.password,
        role: "client",
        phone: validatedData.phoneNumber,
        department: "Client",
        joiningDate: validatedData.joiningDate,
        reportingTo: "Admin",
        isActive: true,
        createdAt: new Date().toISOString(),
      };
      
      await storage.createEmployee(employeeData);
      
      res.status(201).json({ 
        message: "Client credentials created successfully", 
        client,
        employeeId: clientCode
      });
    } catch (error: any) {
      console.error('Create client credentials error:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid credentials data", errors: error.errors });
      }
      if (error.message?.includes('duplicate') || error.message?.includes('unique')) {
        return res.status(409).json({ message: "Client with this email already exists" });
      }
      res.status(500).json({ message: "Failed to create client credentials" });
    }
  });

  // Create target mapping
  app.post("/api/admin/target-mappings", requireAdminAuth, async (req, res) => {
    try {
      // Validate only the required fields from client
      const { teamLeadId, teamMemberId, quarter, year, minimumTarget } = req.body;
      
      if (!teamLeadId || !teamMemberId || !quarter || !year || minimumTarget === undefined) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      // Validate team lead and member are different
      if (teamLeadId === teamMemberId) {
        return res.status(400).json({ message: "Team lead and team member cannot be the same person" });
      }
      
      // Validate numeric fields parse correctly
      const yearNum = parseInt(year);
      const minimumTargetNum = parseInt(minimumTarget);
      
      if (isNaN(yearNum) || yearNum < 2000 || yearNum > 2100) {
        return res.status(400).json({ message: "Invalid year value" });
      }
      
      if (isNaN(minimumTargetNum) || minimumTargetNum < 0) {
        return res.status(400).json({ message: "Invalid minimum target value" });
      }
      
      // Fetch employee information to verify and get metadata
      const teamLead = await storage.getEmployeeById(teamLeadId);
      const teamMember = await storage.getEmployeeById(teamMemberId);
      
      if (!teamLead) {
        return res.status(400).json({ message: "Team lead not found" });
      }
      
      if (!teamMember) {
        return res.status(400).json({ message: "Team member not found" });
      }
      
      // Validate team lead role
      if (teamLead.role !== "team_leader") {
        return res.status(400).json({ message: "Selected employee is not a team leader" });
      }
      
      // Server-side derived data - createdAt is handled by database default
      const targetMappingData = insertTargetMappingsSchema.parse({
        teamLeadId,
        teamMemberId,
        quarter,
        year: yearNum,
        minimumTarget: minimumTargetNum,
      });
      
      const targetMapping = await storage.createTargetMapping(targetMappingData);
      
      res.status(201).json({ message: "Target mapping created successfully", targetMapping });
    } catch (error: any) {
      console.error('Create target mapping error:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid target mapping data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create target mapping" });
    }
  });

  // Get all target mappings with joined employee data
  app.get("/api/admin/target-mappings", requireAdminAuth, async (req, res) => {
    try {
      const targetMappings = await storage.getAllTargetMappings();
      
      // Enrich with employee data
      const enrichedMappings = await Promise.all(
        targetMappings.map(async (mapping) => {
          const teamLead = await storage.getEmployeeById(mapping.teamLeadId);
          const teamMember = await storage.getEmployeeById(mapping.teamMemberId);
          
          return {
            ...mapping,
            teamLeadName: teamLead?.name || "Unknown",
            teamMemberName: teamMember?.name || "Unknown",
            teamMemberRole: teamMember?.role || "Unknown",
          };
        })
      );
      
      res.json(enrichedMappings);
    } catch (error) {
      console.error('Get target mappings error:', error);
      res.status(500).json({ message: "Failed to get target mappings" });
    }
  });

  // Revenue Mappings CRUD operations
  
  // Create revenue mapping
  app.post("/api/admin/revenue-mappings", requireAdminAuth, async (req, res) => {
    try {
      const {
        talentAdvisorId,
        teamLeadId,
        candidateName,
        year,
        quarter,
        position,
        clientId,
        clientType,
        partnerName,
        offeredDate,
        closureDate,
        percentage,
        revenue,
        incentivePlan,
        incentive,
        source,
        invoiceDate,
        invoiceNumber,
        receivedPayment,
        paymentDetails,
        paymentStatus,
        incentivePaidMonth,
      } = req.body;

      // Fetch employee and client information for validation and names
      const talentAdvisor = await storage.getEmployeeById(talentAdvisorId);
      const teamLead = await storage.getEmployeeById(teamLeadId);
      const client = await storage.getClientById(clientId);

      if (!talentAdvisor) {
        return res.status(400).json({ message: "Talent advisor not found" });
      }

      if (!teamLead) {
        return res.status(400).json({ message: "Team lead not found" });
      }

      if (!client) {
        return res.status(400).json({ message: "Client not found" });
      }

      const revenueMappingData = insertRevenueMappingSchema.parse({
        talentAdvisorId,
        talentAdvisorName: talentAdvisor.name,
        teamLeadId,
        teamLeadName: teamLead.name,
        candidateName: candidateName || null,
        year: parseInt(year),
        quarter,
        position,
        clientId,
        clientName: client.brandName,
        clientType,
        partnerName: clientType === "Partner" ? partnerName : null,
        offeredDate,
        closureDate,
        percentage: parseFloat(percentage),
        revenue: parseFloat(revenue),
        incentivePlan,
        incentive: parseFloat(incentive),
        source,
        invoiceDate,
        invoiceNumber,
        receivedPayment: receivedPayment ? parseFloat(receivedPayment) : null,
        paymentDetails,
        paymentStatus,
        incentivePaidMonth,
        createdAt: new Date().toISOString(),
      });

      const revenueMapping = await storage.createRevenueMapping(revenueMappingData);

      logClosureMade(
        storage,
        talentAdvisorId,
        talentAdvisor.name,
        'recruiter',
        candidateName || 'Candidate',
        position,
        client.brandName,
        revenueMapping.id
      );

      res.status(201).json({
        message: "Revenue mapping created successfully",
        revenueMapping,
      });
    } catch (error: any) {
      console.error("Create revenue mapping error:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({
          message: "Invalid revenue mapping data",
          errors: error.errors,
        });
      }
      res.status(500).json({ message: "Failed to create revenue mapping" });
    }
  });

  // Get all revenue mappings
  app.get("/api/admin/revenue-mappings", requireAdminAuth, async (req, res) => {
    try {
      const revenueMappings = await storage.getAllRevenueMappings();
      res.json(revenueMappings);
    } catch (error) {
      console.error("Get revenue mappings error:", error);
      res.status(500).json({ message: "Failed to get revenue mappings" });
    }
  });

  // Update revenue mapping
  app.put("/api/admin/revenue-mappings/:id", requireAdminAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const {
        talentAdvisorId,
        teamLeadId,
        year,
        quarter,
        position,
        clientId,
        clientType,
        partnerName,
        offeredDate,
        closureDate,
        percentage,
        revenue,
        incentivePlan,
        incentive,
        source,
        invoiceDate,
        invoiceNumber,
        receivedPayment,
        paymentDetails,
        paymentStatus,
        incentivePaidMonth,
      } = req.body;

      // Fetch employee and client information if IDs are being updated
      let talentAdvisorName, teamLeadName, clientName;

      if (talentAdvisorId) {
        const talentAdvisor = await storage.getEmployeeById(talentAdvisorId);
        if (!talentAdvisor) {
          return res.status(400).json({ message: "Talent advisor not found" });
        }
        talentAdvisorName = talentAdvisor.name;
      }

      if (teamLeadId) {
        const teamLead = await storage.getEmployeeById(teamLeadId);
        if (!teamLead) {
          return res.status(400).json({ message: "Team lead not found" });
        }
        teamLeadName = teamLead.name;
      }

      if (clientId) {
        const client = await storage.getClientById(clientId);
        if (!client) {
          return res.status(400).json({ message: "Client not found" });
        }
        clientName = client.brandName;
      }

      const updateData: any = {};
      if (talentAdvisorId) updateData.talentAdvisorId = talentAdvisorId;
      if (talentAdvisorName) updateData.talentAdvisorName = talentAdvisorName;
      if (teamLeadId) updateData.teamLeadId = teamLeadId;
      if (teamLeadName) updateData.teamLeadName = teamLeadName;
      if (year) updateData.year = parseInt(year);
      if (quarter) updateData.quarter = quarter;
      if (position) updateData.position = position;
      if (clientId) updateData.clientId = clientId;
      if (clientName) updateData.clientName = clientName;
      if (clientType) updateData.clientType = clientType;
      if (partnerName !== undefined) updateData.partnerName = clientType === "Partner" ? partnerName : null;
      if (offeredDate) updateData.offeredDate = offeredDate;
      if (closureDate) updateData.closureDate = closureDate;
      if (percentage) updateData.percentage = parseFloat(percentage);
      if (revenue) updateData.revenue = parseFloat(revenue);
      if (incentivePlan) updateData.incentivePlan = incentivePlan;
      if (incentive) updateData.incentive = parseFloat(incentive);
      if (source) updateData.source = source;
      if (invoiceDate) updateData.invoiceDate = invoiceDate;
      if (invoiceNumber) updateData.invoiceNumber = invoiceNumber;
      if (receivedPayment !== undefined) updateData.receivedPayment = receivedPayment ? parseFloat(receivedPayment) : null;
      if (paymentDetails) updateData.paymentDetails = paymentDetails;
      if (paymentStatus) updateData.paymentStatus = paymentStatus;
      if (incentivePaidMonth) updateData.incentivePaidMonth = incentivePaidMonth;

      const updatedRevenueMapping = await storage.updateRevenueMapping(id, updateData);

      if (!updatedRevenueMapping) {
        return res.status(404).json({ message: "Revenue mapping not found" });
      }

      res.json({
        message: "Revenue mapping updated successfully",
        revenueMapping: updatedRevenueMapping,
      });
    } catch (error: any) {
      console.error("Update revenue mapping error:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({
          message: "Invalid revenue mapping data",
          errors: error.errors,
        });
      }
      res.status(500).json({ message: "Failed to update revenue mapping" });
    }
  });

  // Delete revenue mapping
  app.delete("/api/admin/revenue-mappings/:id", requireAdminAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteRevenueMapping(id);

      if (!deleted) {
        return res.status(404).json({ message: "Revenue mapping not found" });
      }

      res.json({ message: "Revenue mapping deleted successfully" });
    } catch (error) {
      console.error("Delete revenue mapping error:", error);
      res.status(500).json({ message: "Failed to delete revenue mapping" });
    }
  });

  // ===================== PERFORMANCE PAGE API ENDPOINTS =====================

  // Performance Graph Data - Returns resume delivery counts by team member
  app.get("/api/admin/performance-graph", requireAdminAuth, async (req, res) => {
    try {
      const { teamId, dateFrom, dateTo, period } = req.query;
      const { employees, deliveries, requirements } = await import("@shared/schema");
      
      // Get all recruiters/talent advisors
      const allEmployees = await db.select().from(employees);
      const recruiters = allEmployees.filter(emp => 
        (emp.role === 'recruiter' || emp.role === 'team_leader') && emp.isActive === true
      );
      
      // Get all deliveries
      const allDeliveries = await db.select().from(deliveries);
      
      // Filter by date range if provided
      let filteredDeliveries = allDeliveries;
      if (dateFrom || dateTo) {
        filteredDeliveries = allDeliveries.filter(delivery => {
          const deliveryDate = new Date(delivery.deliveredAt);
          if (dateFrom && new Date(dateFrom as string) > deliveryDate) return false;
          if (dateTo && new Date(dateTo as string) < deliveryDate) return false;
          return true;
        });
      }
      
      // Calculate resume counts per recruiter (delivered vs required based on requirements)
      const allRequirements = await db.select().from(requirements);
      
      const performanceData = recruiters.slice(0, 10).map((recruiter, index) => {
        // Count deliveries by this recruiter
        const recruiterDeliveries = filteredDeliveries.filter(d => 
          d.recruiterName.toLowerCase() === recruiter.name.toLowerCase()
        );
        
        // Count requirements assigned to this recruiter/TA
        const assignedRequirements = allRequirements.filter(req => 
          req.talentAdvisor?.toLowerCase() === recruiter.name.toLowerCase()
        );
        
        // Calculate expected resumes based on criticality
        let expectedResumes = 0;
        assignedRequirements.forEach(req => {
          if (req.criticality === 'HIGH') expectedResumes += 1;
          else if (req.criticality === 'MEDIUM') expectedResumes += 3;
          else expectedResumes += 5;
        });
        
        return {
          memberIndex: index + 1,
          member: recruiter.name,
          resumesA: recruiterDeliveries.length, // Delivered
          resumesB: expectedResumes // Required
        };
      });
      
      res.json(performanceData);
    } catch (error) {
      console.error("Performance graph error:", error);
      res.status(500).json({ message: "Failed to get performance graph data" });
    }
  });

  // Default Rate (Individual) - Returns completion stats by criticality for a specific member
  app.get("/api/admin/default-rate/:memberId", requireAdminAuth, async (req, res) => {
    try {
      const { memberId } = req.params;
      const { dateFrom, dateTo } = req.query;
      const { employees, requirements } = await import("@shared/schema");
      
      // Get the member
      const allEmployees = await db.select().from(employees);
      const member = allEmployees.find(emp => emp.id === memberId || emp.name === memberId);
      
      if (!member) {
        return res.json({
          memberName: memberId,
          stats: {}
        });
      }
      
      // Get requirements assigned to this member
      const allRequirements = await db.select().from(requirements);
      let memberRequirements = allRequirements.filter(req => 
        req.talentAdvisor?.toLowerCase() === member.name.toLowerCase() ||
        req.talentAdvisorId === member.id
      );
      
      // Filter by date if provided
      if (dateFrom || dateTo) {
        memberRequirements = memberRequirements.filter(req => {
          const reqDate = new Date(req.createdAt);
          if (dateFrom && new Date(dateFrom as string) > reqDate) return false;
          if (dateTo && new Date(dateTo as string) < reqDate) return false;
          return true;
        });
      }
      
      // Group by criticality and toughness combination
      const criticalityMap: Record<string, { total: number, completed: number }> = {
        'HT': { total: 0, completed: 0 }, // High criticality, Tough
        'HM': { total: 0, completed: 0 }, // High criticality, Medium
        'MM': { total: 0, completed: 0 }, // Medium criticality, Medium
        'ME': { total: 0, completed: 0 }  // Medium/Low criticality, Easy
      };
      
      memberRequirements.forEach(req => {
        let key = '';
        if (req.criticality === 'HIGH' && req.toughness === 'Tough') key = 'HT';
        else if (req.criticality === 'HIGH') key = 'HM';
        else if (req.criticality === 'MEDIUM' && req.toughness !== 'Easy') key = 'MM';
        else key = 'ME';
        
        if (criticalityMap[key]) {
          criticalityMap[key].total++;
          if (req.status === 'completed') {
            criticalityMap[key].completed++;
          }
        }
      });
      
      res.json({
        memberName: member.name,
        stats: criticalityMap
      });
    } catch (error) {
      console.error("Default rate error:", error);
      res.status(500).json({ message: "Failed to get default rate data" });
    }
  });

  // Team Performance Data - Returns team member performance metrics
  app.get("/api/admin/team-performance", requireAdminAuth, async (req, res) => {
    try {
      const { employees, targetMappings, revenueMappings } = await import("@shared/schema");
      
      // Get all active recruiters/team members
      const allEmployees = await db.select().from(employees);
      const teamMembers = allEmployees.filter(emp => 
        (emp.role === 'recruiter' || emp.role === 'team_leader') && emp.isActive === true
      );
      
      // Get all target mappings
      const allTargetMappings = await db.select().from(targetMappings);
      
      // Get all revenue mappings for closures
      const allRevenueMappings = await db.select().from(revenueMappings);
      
      // Build team performance data
      const performanceData = teamMembers.map(member => {
        // Get target mappings for this member
        const memberTargets = allTargetMappings.filter(tm => 
          tm.teamMemberId === member.id
        );
        
        // Get closures for this member
        const memberClosures = allRevenueMappings.filter(rm => 
          rm.talentAdvisorId === member.id || 
          rm.talentAdvisorName.toLowerCase() === member.name.toLowerCase()
        );
        
        // Calculate tenure
        let tenure = "N/A";
        if (member.joiningDate) {
          const joinDate = new Date(member.joiningDate);
          const now = new Date();
          const years = Math.floor((now.getTime() - joinDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
          const months = Math.floor(((now.getTime() - joinDate.getTime()) % (365.25 * 24 * 60 * 60 * 1000)) / (30.44 * 24 * 60 * 60 * 1000));
          if (years > 0) {
            tenure = `${years} yr${years > 1 ? 's' : ''},${months} month${months !== 1 ? 's' : ''}`;
          } else {
            tenure = `${months} month${months !== 1 ? 's' : ''}`;
          }
        }
        
        // Get last closure date
        let lastClosure = "N/A";
        if (memberClosures.length > 0) {
          const lastClosureRecord = memberClosures.sort((a, b) => {
            const dateA = a.closureDate ? new Date(a.closureDate).getTime() : 0;
            const dateB = b.closureDate ? new Date(b.closureDate).getTime() : 0;
            return dateB - dateA;
          })[0];
          if (lastClosureRecord.closureDate) {
            lastClosure = lastClosureRecord.closureDate;
          }
        }
        
        // Count quarters achieved (where target was met)
        const quartersAchieved = memberTargets.filter(tm => 
          (tm.targetAchieved ?? 0) >= tm.minimumTarget
        ).length;
        
        return {
          id: member.id,
          talentAdvisor: member.name,
          joiningDate: member.joiningDate || "N/A",
          tenure,
          closures: memberClosures.length,
          lastClosure,
          qtrsAchieved: quartersAchieved
        };
      });
      
      res.json(performanceData);
    } catch (error) {
      console.error("Team performance error:", error);
      res.status(500).json({ message: "Failed to get team performance data" });
    }
  });

  // Closures List Data - Returns detailed closure information
  app.get("/api/admin/closures-list", requireAdminAuth, async (req, res) => {
    try {
      const { revenueMappings } = await import("@shared/schema");
      
      // Get all revenue mappings (closures)
      const allRevenueMappings = await db.select().from(revenueMappings);
      
      // Transform to closure list format
      const closuresList = allRevenueMappings.map(rm => ({
        id: rm.id,
        candidate: rm.candidateName || "N/A",
        position: rm.position,
        client: rm.clientName,
        quarter: `${rm.quarter}, ${rm.year}`,
        talentAdvisor: rm.talentAdvisorName,
        ctc: rm.revenue ? (rm.revenue / (rm.percentage / 100)).toLocaleString('en-IN') : "N/A",
        revenue: rm.revenue ? rm.revenue.toLocaleString('en-IN') : "0"
      }));
      
      res.json(closuresList);
    } catch (error) {
      console.error("Closures list error:", error);
      res.status(500).json({ message: "Failed to get closures list" });
    }
  });

  // Revenue Analysis Data - Returns revenue by team member for chart
  app.get("/api/admin/revenue-analysis", requireAdminAuth, async (req, res) => {
    try {
      const { employees, revenueMappings } = await import("@shared/schema");
      
      // Get all active recruiters
      const allEmployees = await db.select().from(employees);
      const recruiters = allEmployees.filter(emp => 
        (emp.role === 'recruiter' || emp.role === 'team_leader') && emp.isActive === true
      );
      
      // Get all revenue mappings
      const allRevenueMappings = await db.select().from(revenueMappings);
      
      // Calculate total revenue per member
      const revenueData = recruiters.slice(0, 10).map(member => {
        const memberRevenue = allRevenueMappings
          .filter(rm => 
            rm.talentAdvisorId === member.id || 
            rm.talentAdvisorName.toLowerCase() === member.name.toLowerCase()
          )
          .reduce((sum, rm) => sum + (rm.revenue || 0), 0);
        
        return {
          member: member.name,
          revenue: memberRevenue
        };
      });
      
      // Calculate average for benchmark
      const totalRevenue = revenueData.reduce((sum, d) => sum + d.revenue, 0);
      const avgRevenue = revenueData.length > 0 ? totalRevenue / revenueData.length : 0;
      
      res.json({
        data: revenueData,
        benchmark: avgRevenue
      });
    } catch (error) {
      console.error("Revenue analysis error:", error);
      res.status(500).json({ message: "Failed to get revenue analysis data" });
    }
  });

  // Performance Metrics - Returns current quarter targets and achievements
  app.get("/api/admin/performance-metrics", requireAdminAuth, async (req, res) => {
    try {
      const { targetMappings, revenueMappings } = await import("@shared/schema");
      
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;
      
      // Determine current quarter
      let currentQuarter = "Q1";
      if (currentMonth >= 1 && currentMonth <= 3) currentQuarter = "Q1";
      else if (currentMonth >= 4 && currentMonth <= 6) currentQuarter = "Q2";
      else if (currentMonth >= 7 && currentMonth <= 9) currentQuarter = "Q3";
      else currentQuarter = "Q4";
      
      // Get target mappings for current quarter
      const allTargetMappings = await db.select().from(targetMappings);
      const currentQuarterTargets = allTargetMappings.filter(tm => 
        tm.quarter === currentQuarter && tm.year === currentYear
      );
      
      // Calculate totals
      const totalMinTarget = currentQuarterTargets.reduce((sum, tm) => sum + tm.minimumTarget, 0);
      const totalAchieved = currentQuarterTargets.reduce((sum, tm) => sum + (tm.targetAchieved ?? 0), 0);
      const totalIncentives = currentQuarterTargets.reduce((sum, tm) => sum + (tm.incentives ?? 0), 0);
      
      // Get current quarter revenue from revenue mappings
      const allRevenueMappings = await db.select().from(revenueMappings);
      const currentQuarterClosures = allRevenueMappings.filter(rm => {
        // Map quarter codes: JFM=Q1, AMJ=Q2, JAS=Q3, OND=Q4
        const quarterMap: Record<string, string> = {
          'JFM': 'Q1', 'AMJ': 'Q2', 'JAS': 'Q3', 'OND': 'Q4',
          'Q1': 'Q1', 'Q2': 'Q2', 'Q3': 'Q3', 'Q4': 'Q4'
        };
        return quarterMap[rm.quarter] === currentQuarter && rm.year === currentYear;
      });
      
      const totalRevenue = currentQuarterClosures.reduce((sum, rm) => sum + (rm.revenue || 0), 0);
      const closuresCount = currentQuarterClosures.length;
      
      // Calculate performance percentage for gauge
      const performancePercentage = totalMinTarget > 0 ? Math.min((totalAchieved / totalMinTarget) * 100, 100) : 0;
      
      res.json({
        currentQuarter: `${currentQuarter} ${currentYear}`,
        minimumTarget: totalMinTarget,
        targetAchieved: totalAchieved,
        incentiveEarned: totalIncentives,
        totalRevenue,
        closuresCount,
        performancePercentage: Math.round(performancePercentage)
      });
    } catch (error) {
      console.error("Performance metrics error:", error);
      res.status(500).json({ message: "Failed to get performance metrics" });
    }
  });

  // Monthly Performance Chart Data - Returns monthly revenue/closures by team or members
  app.get("/api/admin/monthly-performance", requireAdminAuth, async (req, res) => {
    try {
      const { team } = req.query; // 'all', 'arun', 'anusha', or team lead ID
      const { employees, revenueMappings, targetMappings } = await import("@shared/schema");
      
      // Get all team leaders and members
      const allEmployees = await db.select().from(employees);
      const teamLeaders = allEmployees.filter(emp => emp.role === 'team_leader' && emp.isActive === true);
      const recruiters = allEmployees.filter(emp => emp.role === 'recruiter' && emp.isActive === true);
      
      // Get revenue mappings for closures/revenue data
      const allRevenueMappings = await db.select().from(revenueMappings);
      
      // Generate last 6 months
      const months = [];
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push({
          name: date.toLocaleString('default', { month: 'short' }),
          monthNum: date.getMonth() + 1,
          year: date.getFullYear()
        });
      }
      
      // Calculate monthly data
      const monthlyData = months.map(month => {
        const monthRevenueMappings = allRevenueMappings.filter(rm => {
          if (!rm.closureDate) return false;
          const closureDate = new Date(rm.closureDate);
          return closureDate.getMonth() + 1 === month.monthNum && closureDate.getFullYear() === month.year;
        });
        
        // Group by team leader
        const teamData: Record<string, number> = {};
        const memberData: Record<string, number> = {};
        
        teamLeaders.forEach(tl => {
          // Get recruiters reporting to this TL
          const teamRecruiters = recruiters.filter(r => r.reportingTo === tl.employeeId || r.reportingTo === tl.name);
          const teamMemberIds = [tl.id, ...teamRecruiters.map(r => r.id)];
          const teamMemberNames = [tl.name.toLowerCase(), ...teamRecruiters.map(r => r.name.toLowerCase())];
          
          // Calculate team revenue
          const teamRevenue = monthRevenueMappings
            .filter(rm => teamMemberIds.includes(rm.talentAdvisorId) || teamMemberNames.includes(rm.talentAdvisorName.toLowerCase()))
            .reduce((sum, rm) => sum + (rm.revenue || 0), 0);
          
          const tlName = tl.name.toLowerCase().includes('arun') ? 'arunTeam' : 
                        tl.name.toLowerCase().includes('anusha') ? 'anushaTeam' : 
                        `${tl.name.replace(/\s+/g, '')}Team`;
          teamData[tlName] = teamRevenue;
          
          // Calculate individual member revenue for team detail view
          teamRecruiters.forEach(recruiter => {
            const memberRevenue = monthRevenueMappings
              .filter(rm => rm.talentAdvisorId === recruiter.id || rm.talentAdvisorName.toLowerCase() === recruiter.name.toLowerCase())
              .reduce((sum, rm) => sum + (rm.revenue || 0), 0);
            memberData[recruiter.name.toLowerCase().replace(/\s+/g, '')] = memberRevenue;
          });
        });
        
        return {
          month: month.name,
          ...teamData,
          ...memberData
        };
      });
      
      // Get unique team and member keys
      const teamKeys = [...new Set(teamLeaders.map(tl => 
        tl.name.toLowerCase().includes('arun') ? 'arunTeam' : 
        tl.name.toLowerCase().includes('anusha') ? 'anushaTeam' : 
        `${tl.name.replace(/\s+/g, '')}Team`
      ))];
      
      const memberNames = recruiters.map(r => ({
        key: r.name.toLowerCase().replace(/\s+/g, ''),
        name: r.name,
        teamLeader: r.reportingTo
      }));
      
      res.json({
        data: monthlyData,
        teams: teamKeys,
        members: memberNames
      });
    } catch (error) {
      console.error("Monthly performance error:", error);
      res.status(500).json({ message: "Failed to get monthly performance data" });
    }
  });

  // Reset Performance Data - Clears target and revenue mappings
  app.delete("/api/admin/reset-performance-data", requireAdminAuth, async (req, res) => {
    try {
      const { targetMappings, revenueMappings } = await import("@shared/schema");
      
      // Clear all target mappings
      await db.delete(targetMappings);
      
      // Clear all revenue mappings  
      await db.delete(revenueMappings);
      
      res.json({ 
        message: "Performance data reset successfully. All target and revenue mappings have been cleared.",
        success: true
      });
    } catch (error) {
      console.error("Reset performance data error:", error);
      res.status(500).json({ message: "Failed to reset performance data" });
    }
  });

  // Reset Master Data - Clears resumes/candidates and related data
  app.delete("/api/admin/reset-master-data", requireAdminAuth, async (req, res) => {
    try {
      const { candidates, deliveries } = await import("@shared/schema");
      
      // Clear all deliveries first (depends on candidates)
      await db.delete(deliveries);
      
      // Clear all candidates/resumes
      await db.delete(candidates);
      
      res.json({ 
        message: "Master data reset successfully. All resumes and candidates have been cleared.",
        success: true
      });
    } catch (error) {
      console.error("Reset master data error:", error);
      res.status(500).json({ message: "Failed to reset master data" });
    }
  });

  // Get all team members list (recruiters and TAs) for dropdown selection
  app.get("/api/admin/team-members-list", requireAdminAuth, async (req, res) => {
    try {
      const { employees } = await import("@shared/schema");
      
      const allEmployees = await db.select().from(employees);
      const teamMembers = allEmployees
        .filter(emp => (emp.role === 'recruiter' || emp.role === 'team_leader') && emp.isActive === true)
        .map(emp => ({
          id: emp.id,
          name: emp.name,
          role: emp.role
        }));
      
      res.json(teamMembers);
    } catch (error) {
      console.error("Team members list error:", error);
      res.status(500).json({ message: "Failed to get team members list" });
    }
  });

  // ===================== RECRUITER JOBS ROUTES =====================

  // Create a new recruiter job posting
  app.post("/api/recruiter/jobs", async (req, res) => {
    try {
      const {
        title,
        company,
        location,
        locationType,
        experienceMin,
        experienceMax,
        salaryMin,
        salaryMax,
        description,
        requirements,
        responsibilities,
        benefits,
        skills,
        department,
        employmentType,
        openings,
        status,
        companyLogo
      } = req.body;

      const recruiterId = req.session.employeeId || null;

      // Format experience as text (e.g., "2-5 years")
      let experienceText = '';
      if (experienceMin !== null && experienceMin !== undefined) {
        if (experienceMax !== null && experienceMax !== undefined) {
          experienceText = `${experienceMin}-${experienceMax} years`;
        } else {
          experienceText = `${experienceMin}+ years`;
        }
      }

      // Format salary as text (e.g., "10-15 LPA")
      let salaryText = '';
      if (salaryMin !== null && salaryMin !== undefined) {
        const minLPA = Math.round(salaryMin / 100000);
        if (salaryMax !== null && salaryMax !== undefined) {
          const maxLPA = Math.round(salaryMax / 100000);
          salaryText = `${minLPA}-${maxLPA} LPA`;
        } else {
          salaryText = `${minLPA}+ LPA`;
        }
      }

      // Prepare skills as JSON string
      const skillsArray = Array.isArray(skills) ? skills : (skills ? skills.split(',').map((s: string) => s.trim()) : []);

      const jobData = {
        recruiterId,
        companyName: company || 'Company',
        companyTagline: benefits || null,
        companyType: null,
        companyLogo: companyLogo || null,
        market: null,
        field: department || null,
        noOfPositions: openings ? parseInt(openings) : 1,
        role: title || 'Job Role',
        experience: experienceText || '0-1 years',
        location: location || null,
        workMode: locationType || 'On-site',
        salaryPackage: salaryText || null,
        aboutCompany: description || null,
        roleDefinitions: requirements || null,
        keyResponsibility: responsibilities || null,
        primarySkills: JSON.stringify(skillsArray),
        secondarySkills: null,
        knowledgeOnly: null,
        status: status || 'Active',
        applicationCount: 0,
        createdAt: new Date().toISOString()
      };

      const job = await storage.createRecruiterJob(jobData);
      res.status(201).json({ message: "Job posted successfully", job });
    } catch (error: any) {
      console.error("Create recruiter job error:", error);
      res.status(500).json({ message: "Failed to create job posting" });
    }
  });

  // Get recruiter jobs (filtered by logged-in user if authenticated)
  app.get("/api/recruiter/jobs", async (req, res) => {
    try {
      const session = req.session as any;
      let jobs;
      
      // If user is authenticated, filter jobs by their ID for multi-tenant support
      if (session?.employeeId) {
        jobs = await storage.getRecruiterJobsByRecruiterId(session.employeeId);
      } else {
        // Fallback to all jobs for unauthenticated requests (job board view)
        jobs = await storage.getAllRecruiterJobs();
      }
      
      res.json(jobs);
    } catch (error) {
      console.error("Get recruiter jobs error:", error);
      res.status(500).json({ message: "Failed to get jobs" });
    }
  });

  // Get job counts for dashboard (scoped by recruiter)
  app.get("/api/recruiter/jobs/counts", requireEmployeeAuth, async (req, res) => {
    try {
      const session = req.session as any;
      // Get jobs for this specific recruiter
      const jobs = await storage.getRecruiterJobsByRecruiterId(session.employeeId);
      const counts = {
        total: jobs.length,
        active: jobs.filter(j => j.status === "Active").length,
        closed: jobs.filter(j => j.status === "Closed").length,
        draft: jobs.filter(j => j.status === "Draft").length
      };
      res.json(counts);
    } catch (error) {
      console.error("Get job counts error:", error);
      res.status(500).json({ message: "Failed to get job counts" });
    }
  });

  // Get candidate counts for dashboard (scoped by recruiter's job applications)
  app.get("/api/recruiter/candidates/counts", requireEmployeeAuth, async (req, res) => {
    try {
      const session = req.session as any;
      // Get this recruiter's jobs
      const jobs = await storage.getRecruiterJobsByRecruiterId(session.employeeId);
      const jobIds = jobs.map(j => j.id);
      
      // Get applications for recruiter's jobs only
      const allApplications = await storage.getAllJobApplications();
      const recruiterApplications = allApplications.filter(app => 
        app.recruiterJobId && jobIds.includes(app.recruiterJobId)
      );
      
      // Count unique candidates from these applications
      const candidateIds = new Set(recruiterApplications.map(app => app.profileId));
      const counts = {
        total: candidateIds.size,
        active: candidateIds.size, // All are considered active for this recruiter
        inactive: 0
      };
      res.json(counts);
    } catch (error) {
      console.error("Get candidate counts error:", error);
      res.status(500).json({ message: "Failed to get candidate counts" });
    }
  });

  // Get a specific job by ID (with ownership check)
  app.get("/api/recruiter/jobs/:id", requireEmployeeAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const session = req.session as any;
      const job = await storage.getRecruiterJobById(id);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      // Verify ownership - job must belong to this recruiter
      if (job.recruiterId !== session.employeeId) {
        return res.status(403).json({ message: "Access denied. This job does not belong to you." });
      }
      res.json(job);
    } catch (error) {
      console.error("Get recruiter job error:", error);
      res.status(500).json({ message: "Failed to get job" });
    }
  });

  // Update a recruiter job (with ownership check)
  app.put("/api/recruiter/jobs/:id", requireEmployeeAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const session = req.session as any;
      const updates = req.body;
      
      // Verify ownership first
      const existingJob = await storage.getRecruiterJobById(id);
      if (!existingJob) {
        return res.status(404).json({ message: "Job not found" });
      }
      if (existingJob.recruiterId !== session.employeeId) {
        return res.status(403).json({ message: "Access denied. This job does not belong to you." });
      }
      
      if (updates.skills && typeof updates.skills === 'string') {
        updates.skills = updates.skills.split(',').map((s: string) => s.trim());
      }
      
      const job = await storage.updateRecruiterJob(id, updates);
      res.json({ message: "Job updated successfully", job });
    } catch (error) {
      console.error("Update recruiter job error:", error);
      res.status(500).json({ message: "Failed to update job" });
    }
  });

  // Delete a recruiter job (with ownership check)
  app.delete("/api/recruiter/jobs/:id", requireEmployeeAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const session = req.session as any;
      
      // Verify ownership first
      const existingJob = await storage.getRecruiterJobById(id);
      if (!existingJob) {
        return res.status(404).json({ message: "Job not found" });
      }
      if (existingJob.recruiterId !== session.employeeId) {
        return res.status(403).json({ message: "Access denied. This job does not belong to you." });
      }
      
      const deleted = await storage.deleteRecruiterJob(id);
      res.json({ message: "Job deleted successfully" });
    } catch (error) {
      console.error("Delete recruiter job error:", error);
      res.status(500).json({ message: "Failed to delete job" });
    }
  });

  // Close a recruiter job (mark as Closed) (with ownership check)
  app.post("/api/recruiter/jobs/:id/close", requireEmployeeAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const session = req.session as any;
      
      // Verify ownership first
      const existingJob = await storage.getRecruiterJobById(id);
      if (!existingJob) {
        return res.status(404).json({ message: "Job not found" });
      }
      if (existingJob.recruiterId !== session.employeeId) {
        return res.status(403).json({ message: "Access denied. This job does not belong to you." });
      }
      
      const job = await storage.updateRecruiterJob(id, { 
        status: "Closed",
        closedDate: new Date()
      });
      res.json({ message: "Job closed successfully", job });
    } catch (error) {
      console.error("Close recruiter job error:", error);
      res.status(500).json({ message: "Failed to close job" });
    }
  });

  // Get active jobs for candidates (public endpoint)
  app.get("/api/jobs", async (req, res) => {
    try {
      const jobs = await storage.getAllRecruiterJobs();
      // Filter only active jobs for candidates
      const activeJobs = jobs.filter(job => job.status === "Active");
      res.json(activeJobs);
    } catch (error) {
      console.error("Get jobs error:", error);
      res.status(500).json({ message: "Failed to get jobs" });
    }
  });

  // ===================== JOB APPLICATIONS ROUTES =====================

  // Get job applications (scoped to recruiter's jobs AND tagged requirements)
  app.get("/api/recruiter/applications", requireEmployeeAuth, async (req, res) => {
    try {
      const session = req.session as any;
      
      // Get this recruiter's jobs
      const jobs = await storage.getRecruiterJobsByRecruiterId(session.employeeId);
      const jobIds = jobs.map(j => j.id);
      
      // Get this recruiter's assigned requirements
      const requirements = await storage.getRequirementsByTalentAdvisorId(session.employeeId);
      const requirementIds = requirements.map(r => r.id);
      
      // Get all applications and filter to those for recruiter's jobs OR tagged requirements
      const allApplications = await storage.getAllJobApplications();
      const recruiterApplications = allApplications.filter(app => 
        (app.recruiterJobId && jobIds.includes(app.recruiterJobId)) ||
        (app.requirementId && requirementIds.includes(app.requirementId))
      );
      
      res.json(recruiterApplications);
    } catch (error) {
      console.error("Get applications error:", error);
      res.status(500).json({ message: "Failed to get applications" });
    }
  });

  // Get applications for a specific job (with ownership check)
  app.get("/api/recruiter/jobs/:id/applications", requireEmployeeAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const session = req.session as any;
      
      // Verify job ownership first
      const job = await storage.getRecruiterJobById(id);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      if (job.recruiterId !== session.employeeId) {
        return res.status(403).json({ message: "Access denied. This job does not belong to you." });
      }
      
      const applications = await storage.getJobApplicationsByRecruiterJobId(id);
      res.json(applications);
    } catch (error) {
      console.error("Get job applications error:", error);
      res.status(500).json({ message: "Failed to get applications" });
    }
  });

  // Create a job application (for recruiter tagging candidates to requirements)
  app.post("/api/recruiter/applications", requireEmployeeAuth, async (req, res) => {
    try {
      const { 
        candidateName, 
        candidateEmail, 
        candidatePhone, 
        jobTitle, 
        company, 
        requirementId,
        experience,
        skills,
        location
      } = req.body;

      // Validate required fields
      if (!candidateName || !jobTitle || !company) {
        return res.status(400).json({ message: "Candidate name, job title, and company are required" });
      }

      // Validate candidateName is a non-empty string
      if (typeof candidateName !== 'string' || candidateName.trim().length === 0) {
        return res.status(400).json({ message: "Invalid candidate name" });
      }

      // Validate jobTitle is a non-empty string
      if (typeof jobTitle !== 'string' || jobTitle.trim().length === 0) {
        return res.status(400).json({ message: "Invalid job title" });
      }

      // Validate company is a non-empty string
      if (typeof company !== 'string' || company.trim().length === 0) {
        return res.status(400).json({ message: "Invalid company name" });
      }

      const applicationData = {
        profileId: `recruiter-tagged-${Date.now()}`,
        requirementId: requirementId || null,
        jobTitle: jobTitle.trim(),
        company: company.trim(),
        status: "In Process",
        source: "recruiter_tagged",
        candidateName: candidateName.trim(),
        candidateEmail: candidateEmail?.trim() || null,
        candidatePhone: candidatePhone?.trim() || null,
        experience: experience?.toString() || null,
        skills: Array.isArray(skills) ? JSON.stringify(skills) : (skills || null),
        location: location?.trim() || null,
        appliedDate: new Date(),
      };

      const application = await storage.createJobApplication(applicationData);
      
      const employee = await storage.getEmployeeById(req.session.employeeId!);
      logCandidateSubmitted(
        storage,
        req.session.employeeId || 'unknown',
        employee?.name || 'Recruiter',
        'recruiter',
        candidateName.trim(),
        jobTitle.trim(),
        application.id
      );
      
      res.status(201).json({ message: "Application created successfully", application });
    } catch (error) {
      console.error("Create recruiter application error:", error);
      res.status(500).json({ message: "Failed to create application" });
    }
  });

  // Update application status
  app.patch("/api/recruiter/applications/:id/status", async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      if (!status) {
        return res.status(400).json({ message: "Status is required" });
      }
      
      const existingApplication = await storage.getJobApplicationById(id);
      const previousStatus = existingApplication?.status;
      
      const application = await storage.updateJobApplicationStatus(id, status);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }
      
      if (previousStatus && previousStatus !== status) {
        logCandidatePipelineChanged(
          storage,
          'system',
          'System',
          'system',
          application.candidateName || 'Candidate',
          previousStatus,
          status,
          application.id
        );
      }
      
      res.json({ message: "Application status updated", application });
    } catch (error) {
      console.error("Update application status error:", error);
      res.status(500).json({ message: "Failed to update application status" });
    }
  });

  // Get all job applications for Admin pipeline (view all recruiters' pipeline data)
  app.get("/api/admin/pipeline", requireAdminAuth, async (req, res) => {
    try {
      const applications = await storage.getAllJobApplications();
      res.json(applications);
    } catch (error) {
      console.error("Get admin pipeline error:", error);
      res.status(500).json({ message: "Failed to get pipeline data" });
    }
  });

  // Get all employees
  app.get("/api/admin/employees", requireAdminAuth, async (req, res) => {
    try {
      const employees = await storage.getAllEmployees();
      res.json(employees);
    } catch (error) {
      console.error('Get employees error:', error);
      res.status(500).json({ message: "Failed to get employees" });
    }
  });

  // Get all clients
  app.get("/api/admin/clients", requireAdminAuth, async (req, res) => {
    try {
      const clients = await storage.getAllClients();
      res.json(clients);
    } catch (error) {
      console.error('Get clients error:', error);
      res.status(500).json({ message: "Failed to get clients" });
    }
  });

  // Get all candidates (for Master Database)
  app.get("/api/admin/candidates", requireAdminAuth, async (req, res) => {
    try {
      const candidatesList = await storage.getAllCandidates();
      res.json(candidatesList);
    } catch (error) {
      console.error('Get candidates error:', error);
      res.status(500).json({ message: "Failed to get candidates" });
    }
  });

  // Parse single resume and extract info
  app.post("/api/admin/parse-resume", requireAdminAuth, resumeUpload.single('resume'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No resume file uploaded" });
      }

      const parsed = await parseResumeFile(req.file.path, req.file.mimetype);
      
      res.json({
        success: true,
        data: {
          fullName: parsed.fullName,
          email: parsed.email,
          phone: parsed.phone,
          filePath: req.file.path,
          fileName: req.file.originalname
        }
      });
    } catch (error) {
      console.error('Parse resume error:', error);
      res.status(500).json({ message: "Failed to parse resume" });
    }
  });

  // Parse bulk resumes
  app.post("/api/admin/parse-resumes-bulk", requireAdminAuth, resumeUpload.array('resumes', 20), async (req, res) => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ message: "No resume files uploaded" });
      }

      const fileData = files.map(f => ({
        path: f.path,
        originalname: f.originalname,
        mimetype: f.mimetype
      }));

      const results = await parseBulkResumes(fileData);
      
      const successCount = results.filter(r => r.success).length;
      const failedCount = results.filter(r => !r.success).length;

      res.json({
        total: results.length,
        successCount,
        failedCount,
        results: results.map(r => ({
          fileName: r.fileName,
          success: r.success,
          data: r.success ? {
            fullName: r.data?.fullName,
            email: r.data?.email,
            phone: r.data?.phone
          } : null,
          error: r.error
        }))
      });
    } catch (error) {
      console.error('Bulk parse resume error:', error);
      res.status(500).json({ message: "Failed to parse resumes" });
    }
  });

  // Import single candidate from resume
  app.post("/api/admin/import-candidate", requireAdminAuth, async (req, res) => {
    try {
      const { fullName, email, phone, designation, experience, skills, location, resumeFilePath, addedBy } = req.body;

      if (!fullName || !email) {
        return res.status(400).json({ message: "Full name and email are required" });
      }

      // Check if candidate already exists
      const existing = await storage.getCandidateByEmail(email);
      if (existing) {
        return res.status(409).json({ message: "A candidate with this email already exists" });
      }

      const candidateId = await storage.generateNextCandidateId();
      
      const newCandidate = await storage.createCandidate({
        candidateId,
        fullName,
        email: email.toLowerCase(),
        phone: phone || null,
        designation: designation || null,
        experience: experience || null,
        skills: skills || null,
        location: location || null,
        resumeFile: resumeFilePath || null,
        addedBy: addedBy || 'Admin Import',
        pipelineStatus: 'New',
        isActive: true,
        isVerified: false,
        createdAt: new Date().toISOString()
      });

      res.json({ 
        success: true, 
        message: "Candidate imported successfully",
        candidate: newCandidate 
      });
    } catch (error: any) {
      console.error('Import candidate error:', error);
      if (error.message?.includes('duplicate') || error.message?.includes('unique')) {
        return res.status(409).json({ message: "A candidate with this email already exists" });
      }
      res.status(500).json({ message: "Failed to import candidate" });
    }
  });

  // Bulk import candidates from resumes
  app.post("/api/admin/import-candidates-bulk", requireAdminAuth, async (req, res) => {
    try {
      const { candidates, addedBy } = req.body;

      if (!candidates || !Array.isArray(candidates) || candidates.length === 0) {
        return res.status(400).json({ message: "No candidates to import" });
      }

      const results: Array<{ fileName: string; success: boolean; candidateId?: string; error?: string }> = [];

      for (const candidate of candidates) {
        try {
          if (!candidate.fullName || !candidate.email) {
            results.push({
              fileName: candidate.fileName || 'Unknown',
              success: false,
              error: 'Missing name or email'
            });
            continue;
          }

          // Check for existing candidate
          const existing = await storage.getCandidateByEmail(candidate.email.toLowerCase());
          if (existing) {
            results.push({
              fileName: candidate.fileName || 'Unknown',
              success: false,
              error: 'Email already exists'
            });
            continue;
          }

          const candidateId = await storage.generateNextCandidateId();
          
          await storage.createCandidate({
            candidateId,
            fullName: candidate.fullName,
            email: candidate.email.toLowerCase(),
            phone: candidate.phone || null,
            designation: null,
            experience: null,
            skills: null,
            location: null,
            resumeFile: null,
            addedBy: addedBy || 'Admin Bulk Import',
            pipelineStatus: 'New',
            isActive: true,
            isVerified: false,
            createdAt: new Date().toISOString()
          });

          results.push({
            fileName: candidate.fileName || 'Unknown',
            success: true,
            candidateId
          });
        } catch (err: any) {
          results.push({
            fileName: candidate.fileName || 'Unknown',
            success: false,
            error: err.message || 'Failed to create candidate'
          });
        }
      }

      const successCount = results.filter(r => r.success).length;
      const failedCount = results.filter(r => !r.success).length;

      res.json({
        total: results.length,
        successCount,
        failedCount,
        results
      });
    } catch (error) {
      console.error('Bulk import candidates error:', error);
      res.status(500).json({ message: "Failed to import candidates" });
    }
  });

  // Update employee
  app.put("/api/admin/employees/:id", requireAdminAuth, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Validate update data with partial schema
      const updateSchema = insertEmployeeSchema.partial();
      const validatedData = updateSchema.parse(req.body);
      
      // Hash password if it's being updated
      if (validatedData.password) {
        validatedData.password = await bcrypt.hash(validatedData.password, 10);
      }
      
      const updatedEmployee = await storage.updateEmployee(id, validatedData);
      
      if (!updatedEmployee) {
        return res.status(404).json({ message: "Employee not found" });
      }
      
      res.json({ message: "Employee updated successfully", employee: updatedEmployee });
    } catch (error: any) {
      console.error('Update employee error:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid employee data", errors: error.errors });
      }
      if (error.message?.includes('duplicate') || error.message?.includes('unique')) {
        return res.status(409).json({ message: "Employee with this email or ID already exists" });
      }
      res.status(500).json({ message: "Failed to update employee" });
    }
  });

  // Delete employee
  app.delete("/api/admin/employees/:id", requireAdminAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteEmployee(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Employee not found" });
      }
      
      res.json({ message: "Employee deleted successfully" });
    } catch (error) {
      console.error('Delete employee error:', error);
      res.status(500).json({ message: "Failed to delete employee" });
    }
  });

  // Update client
  app.put("/api/admin/clients/:id", requireAdminAuth, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Validate update data with partial schema
      const updateSchema = z.object({
        clientCode: z.string().min(1).optional(),
        brandName: z.string().min(1).optional(),
        incorporatedName: z.string().optional(),
        gstin: z.string().optional(),
        address: z.string().optional(),
        location: z.string().optional(),
        spoc: z.string().optional(),
        email: z.string().email().optional().or(z.literal('')),
        website: z.string().optional(),
        linkedin: z.string().optional(),
        agreement: z.string().optional(),
        percentage: z.string().optional(),
        category: z.string().optional(),
        paymentTerms: z.string().optional(),
        source: z.string().optional(),
        startDate: z.string().optional(),
        referral: z.string().optional(),
        currentStatus: z.string().optional(),
      });
      
      const validatedData = updateSchema.parse(req.body);
      
      const updatedClient = await storage.updateClient(id, validatedData);
      
      if (!updatedClient) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      res.json({ message: "Client updated successfully", client: updatedClient });
    } catch (error: any) {
      console.error('Update client error:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid client data", errors: error.errors });
      }
      if (error.message?.includes('duplicate') || error.message?.includes('unique')) {
        return res.status(409).json({ message: "Client with this code already exists" });
      }
      res.status(500).json({ message: "Failed to update client" });
    }
  });

  // Delete client
  app.delete("/api/admin/clients/:id", requireAdminAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteClient(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      res.json({ message: "Client deleted successfully" });
    } catch (error) {
      console.error('Delete client error:', error);
      res.status(500).json({ message: "Failed to delete client" });
    }
  });

  // Seed database endpoint - call once to populate initial data
  app.post("/api/admin/seed-database", requireAdminAuth, async (req, res) => {
    try {
      // Check if employees already exist
      const existingEmployees = await storage.getAllEmployees();
      if (existingEmployees.length > 0) {
        return res.status(400).json({ message: "Database already seeded. Employees exist." });
      }

      // Sample employee data
      const sampleEmployees = [
        {
          employeeId: "STTL001",
          name: "Priya Sharma",
          email: "priya@gmail.com",
          password: "priya123",
          role: "team_leader",
          age: "32",
          phone: "9876543211",
          department: "Talent Acquisition",
          joiningDate: "2023-06-10",
          reportingTo: "ADMIN"
        },
        {
          employeeId: "STTA001",
          name: "Ram Kumar",
          email: "ram@gmail.com",
          password: "ram123",
          role: "recruiter",
          age: "28",
          phone: "9876543210",
          department: "Talent Acquisition",
          joiningDate: "2024-01-15",
          reportingTo: "STTL001"
        },
        {
          employeeId: "STCL001",
          name: "Arjun Patel",
          email: "arjun@gmail.com",
          password: "arjun123",
          role: "client",
          age: "35",
          phone: "9876543212",
          department: "Client Relations",
          joiningDate: "2023-03-20",
          reportingTo: "Admin"
        },
        {
          employeeId: "ADMIN",
          name: "Admin User",
          email: "admin@gmail.com",
          password: "admin123",
          role: "admin",
          age: "40",
          phone: "9876543213",
          department: "Administration",
          joiningDate: "2022-01-01",
          reportingTo: "CEO"
        }
      ];

      // Hash passwords and create employees
      const saltRounds = 10;
      const createdEmployees = [];
      for (const emp of sampleEmployees) {
        const hashedPassword = await bcrypt.hash(emp.password, saltRounds);
        const employee = await storage.createEmployee({
          employeeId: emp.employeeId,
          name: emp.name,
          email: emp.email,
          password: hashedPassword,
          role: emp.role,
          age: emp.age,
          phone: emp.phone,
          department: emp.department,
          joiningDate: emp.joiningDate,
          reportingTo: emp.reportingTo
        });
        createdEmployees.push(employee);
      }

      res.json({
        success: true,
        message: `Database seeded successfully. Created ${createdEmployees.length} employees.`,
        employees: createdEmployees.map(e => ({ email: e.email, role: e.role }))
      });
    } catch (error) {
      console.error('Seed database error:', error);
      res.status(500).json({ message: "Failed to seed database" });
    }
  });

  // Impact Metrics routes
  // Create impact metrics
  app.post("/api/admin/impact-metrics", requireAdminAuth, async (req, res) => {
    try {
      const validatedData = insertImpactMetricsSchema.parse(req.body);
      const metrics = await storage.createImpactMetrics(validatedData);
      res.json({ message: "Impact metrics created successfully", metrics });
    } catch (error: any) {
      console.error('Create impact metrics error:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid impact metrics data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create impact metrics" });
    }
  });

  // Get all impact metrics
  app.get("/api/admin/impact-metrics", requireAdminAuth, async (req, res) => {
    try {
      const { clientId } = req.query;
      
      if (clientId && typeof clientId === 'string') {
        const metrics = await storage.getImpactMetrics(clientId);
        if (!metrics) {
          return res.status(404).json({ message: "Impact metrics not found" });
        }
        return res.json(metrics);
      }
      
      const allMetrics = await storage.getAllImpactMetrics();
      res.json(allMetrics);
    } catch (error) {
      console.error('Get impact metrics error:', error);
      res.status(500).json({ message: "Failed to get impact metrics" });
    }
  });

  // Update impact metrics
  app.put("/api/admin/impact-metrics/:id", requireAdminAuth, async (req, res) => {
    try {
      const { id } = req.params;
      
      const updateSchema = z.object({
        clientId: z.string().optional(),
        speedToHire: z.number().optional(),
        revenueImpactOfDelay: z.number().optional(),
        clientNps: z.number().optional(),
        candidateNps: z.number().optional(),
        feedbackTurnAround: z.number().optional(),
        feedbackTurnAroundAvgDays: z.number().optional(),
        firstYearRetentionRate: z.number().optional(),
        fulfillmentRate: z.number().optional(),
        revenueRecovered: z.number().optional(),
      });
      
      const validatedData = updateSchema.parse(req.body);
      const updatedMetrics = await storage.updateImpactMetrics(id, validatedData);
      
      if (!updatedMetrics) {
        return res.status(404).json({ message: "Impact metrics not found" });
      }
      
      res.json({ message: "Impact metrics updated successfully", metrics: updatedMetrics });
    } catch (error: any) {
      console.error('Update impact metrics error:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid impact metrics data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update impact metrics" });
    }
  });

  // Delete impact metrics
  app.delete("/api/admin/impact-metrics/:id", requireAdminAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteImpactMetrics(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Impact metrics not found" });
      }
      
      res.json({ message: "Impact metrics deleted successfully" });
    } catch (error) {
      console.error('Delete impact metrics error:', error);
      res.status(500).json({ message: "Failed to delete impact metrics" });
    }
  });

  // Client Metrics Endpoints
  // Speed metrics current values
  app.get("/api/client/speed-metrics", (req, res) => {
    res.json({
      timeToFirstSubmission: 0,
      timeToInterview: 0,
      timeToOffer: 0,
      timeToFill: 0
    });
  });

  // Quality metrics current values
  app.get("/api/client/quality-metrics", (req, res) => {
    res.json({
      submissionToShortList: 0,
      interviewToOffer: 0,
      offerAcceptance: 0,
      earlyAttrition: 0
    });
  });

  // Speed metrics chart data
  app.get("/api/client/speed-metrics-chart", (req, res) => {
    res.json([
      { month: 'Jan', timeToFirstSubmission: 0, timeToInterview: 0, timeToOffer: 0, timeToFill: 0 },
      { month: 'Feb', timeToFirstSubmission: 0, timeToInterview: 0, timeToOffer: 0, timeToFill: 0 },
      { month: 'Mar', timeToFirstSubmission: 0, timeToInterview: 0, timeToOffer: 0, timeToFill: 0 },
      { month: 'Apr', timeToFirstSubmission: 0, timeToInterview: 0, timeToOffer: 0, timeToFill: 0 },
      { month: 'May', timeToFirstSubmission: 0, timeToInterview: 0, timeToOffer: 0, timeToFill: 0 },
      { month: 'Jun', timeToFirstSubmission: 0, timeToInterview: 0, timeToOffer: 0, timeToFill: 0 }
    ]);
  });

  // Quality metrics chart data
  app.get("/api/client/quality-metrics-chart", (req, res) => {
    res.json([
      { month: 'Jan', submissionToShortList: 0, interviewToOffer: 0, offerAcceptance: 0, earlyAttrition: 0 },
      { month: 'Feb', submissionToShortList: 0, interviewToOffer: 0, offerAcceptance: 0, earlyAttrition: 0 },
      { month: 'Mar', submissionToShortList: 0, interviewToOffer: 0, offerAcceptance: 0, earlyAttrition: 0 },
      { month: 'Apr', submissionToShortList: 0, interviewToOffer: 0, offerAcceptance: 0, earlyAttrition: 0 },
      { month: 'May', submissionToShortList: 0, interviewToOffer: 0, offerAcceptance: 0, earlyAttrition: 0 },
      { month: 'Jun', submissionToShortList: 0, interviewToOffer: 0, offerAcceptance: 0, earlyAttrition: 0 }
    ]);
  });

  // Client Dashboard Stats - Get authenticated client's dashboard statistics
  app.get("/api/client/dashboard-stats", requireClientAuth, async (req, res) => {
    try {
      const employee = await storage.getEmployeeById(req.session.employeeId!);
      if (!employee) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      // Get client by email to find company name
      const clients = await storage.getAllClients();
      const client = clients.find(c => c.email === employee.email);
      const companyName = client?.brandName || employee.name;
      
      const stats = await storage.getClientDashboardStats(companyName);
      res.json(stats);
    } catch (error) {
      console.error('Get client dashboard stats error:', error);
      res.status(500).json({ message: "Failed to get dashboard stats" });
    }
  });

  // Client Requirements - Get requirements for client's company
  app.get("/api/client/requirements", requireClientAuth, async (req, res) => {
    try {
      const employee = await storage.getEmployeeById(req.session.employeeId!);
      if (!employee) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      const clients = await storage.getAllClients();
      const client = clients.find(c => c.email === employee.email);
      const companyName = client?.brandName || employee.name;
      
      const requirements = await storage.getRequirementsByCompany(companyName);
      
      // Transform requirements for client view
      const rolesData = requirements.map(req => ({
        roleId: req.id,
        role: req.position,
        team: req.teamLead || 'N/A',
        recruiter: req.talentAdvisor || 'N/A',
        sharedOn: req.createdAt ? new Date(req.createdAt).toLocaleDateString('en-GB', { 
          day: '2-digit', month: '2-digit', year: 'numeric' 
        }).replace(/\//g, '-') : 'N/A',
        status: req.status === 'open' ? 'Active' : req.status === 'in_progress' ? 'Active' : req.status === 'completed' ? 'Closed' : 'Paused',
        profilesShared: 0,
        lastActive: req.createdAt ? new Date(req.createdAt).toLocaleDateString('en-GB', { 
          day: '2-digit', month: '2-digit', year: 'numeric' 
        }).replace(/\//g, '-') : 'N/A'
      }));
      
      res.json(rolesData);
    } catch (error) {
      console.error('Get client requirements error:', error);
      res.status(500).json({ message: "Failed to get requirements" });
    }
  });

  // Client Pipeline - Get pipeline data for client's company
  app.get("/api/client/pipeline", requireClientAuth, async (req, res) => {
    try {
      const employee = await storage.getEmployeeById(req.session.employeeId!);
      if (!employee) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      const clients = await storage.getAllClients();
      const client = clients.find(c => c.email === employee.email);
      const companyName = client?.brandName || employee.name;
      
      const applications = await storage.getJobApplicationsByCompany(companyName);
      
      // Transform applications to pipeline data format
      const pipelineData = applications.map((app, index) => {
        const statusMap: Record<string, string> = {
          'In Process': 'L1',
          'In-Process': 'L1',
          'Shortlisted': 'L1',
          'Reviewed': 'L1',
          'Screened Out': 'Rejected',
          'L1': 'L1',
          'L2': 'L2',
          'L3': 'L3',
          'Final Round': 'Final Round',
          'HR Round': 'HR Round',
          'Selected': 'Closure',
          'Joined': 'Closure',
          'Interview Scheduled': 'L1',
          'Applied': 'L1',
          'Offer Stage': 'Offer Stage',
          'Closure': 'Closure',
          'Offer Drop': 'Rejected',
          'Declined': 'Rejected',
          'Rejected': 'Rejected'
        };

        return {
          id: app.id || `app-${index + 1}`,
          candidateName: app.candidateName || 'Unknown',
          roleApplied: app.jobTitle || 'N/A',
          currentStatus: statusMap[app.status] || 'L1',
          email: app.candidateEmail || 'N/A',
          phone: app.candidatePhone || 'N/A',
          appliedDate: app.appliedDate ? new Date(app.appliedDate).toLocaleDateString('en-GB', { 
            day: '2-digit', month: '2-digit', year: 'numeric' 
          }).replace(/\//g, '-') : 'N/A'
        };
      });
      
      res.json(pipelineData);
    } catch (error) {
      console.error('Get client pipeline error:', error);
      res.status(500).json({ message: "Failed to get pipeline data" });
    }
  });

  // Client Update Application Status - Allow client to update status (e.g., reject)
  app.patch("/api/client/applications/:id/status", requireClientAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { status, reason } = req.body;
      
      if (!status) {
        return res.status(400).json({ message: "Status is required" });
      }
      
      const application = await storage.updateJobApplicationStatus(id, status);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }
      
      res.json({ success: true, application });
    } catch (error) {
      console.error('Update application status error:', error);
      res.status(500).json({ message: "Failed to update application status" });
    }
  });

  // Client Closures - Get closure reports for client's company
  app.get("/api/client/closures", requireClientAuth, async (req, res) => {
    try {
      const employee = await storage.getEmployeeById(req.session.employeeId!);
      if (!employee) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      const clients = await storage.getAllClients();
      const client = clients.find(c => c.email === employee.email);
      const companyName = client?.brandName || employee.name;
      
      const closures = await storage.getRevenueMappingsByClientName(companyName);
      
      // Transform closures for client view
      const closureReports = closures.map(closure => ({
        candidate: closure.candidateName || 'N/A',
        position: closure.position || 'N/A',
        advisor: closure.talentAdvisorName || 'N/A',
        offered: closure.offeredDate || 'N/A',
        joined: closure.closureDate || 'N/A'
      }));
      
      res.json(closureReports);
    } catch (error) {
      console.error('Get client closures error:', error);
      res.status(500).json({ message: "Failed to get closures" });
    }
  });

  // Client Profile - Get current client's profile with linked client details
  app.get("/api/client/profile", requireClientAuth, async (req, res) => {
    try {
      const employee = await storage.getEmployeeById(req.session.employeeId!);
      if (!employee) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      const clients = await storage.getAllClients();
      const client = clients.find(c => c.email === employee.email);
      
      // Check if client profile is linked (admin created a client record with matching email)
      const profileLinked = !!client;
      
      res.json({
        id: employee.id,
        name: employee.name,
        email: employee.email,
        phone: employee.phone,
        profileLinked,
        // Basic company info
        company: client?.brandName || employee.name,
        // Extended client details (only if profile is linked)
        clientDetails: profileLinked ? {
          clientCode: client.clientCode,
          brandName: client.brandName,
          incorporatedName: client.incorporatedName,
          gstin: client.gstin,
          address: client.address,
          location: client.location,
          spoc: client.spoc,
          website: client.website,
          linkedin: client.linkedin,
          category: client.category,
          currentStatus: client.currentStatus,
          startDate: client.startDate
        } : null,
        bannerImage: null,
        profilePicture: null
      });
    } catch (error) {
      console.error('Get client profile error:', error);
      res.status(500).json({ message: "Failed to get profile" });
    }
  });

  app.post("/api/support/send-message", async (req, res) => {
    try {
      const { message } = req.body;

      if (!message || !message.trim()) {
        return res.status(400).json({ 
          error: "Message is required" 
        });
      }

      if (!req.session.supportUserId) {
        req.session.supportUserId = `guest-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      }

      const candidateEmail = req.session.candidateId 
        ? (await storage.getCandidateByCandidateId(req.session.candidateId))?.email 
        : null;
      
      const emailToUse = candidateEmail || `${req.session.supportUserId}@guest.staffos.com`;
      const nameToUse = candidateEmail ? 'Candidate' : 'Guest User';
      
      const now = new Date().toISOString();
      let convId = req.session.conversationId;

      if (!convId) {
        const existingConv = await db.select()
          .from(supportConversations)
          .where(eq(supportConversations.userEmail, emailToUse))
          .orderBy(desc(supportConversations.createdAt))
          .limit(1);

        if (existingConv.length > 0 && existingConv[0].status !== 'closed') {
          convId = existingConv[0].id;
          await db.update(supportConversations)
            .set({ lastMessageAt: now })
            .where(eq(supportConversations.id, convId));
        } else {
          const newConv = await db.insert(supportConversations).values({
            userId: req.session.candidateId || req.session.supportUserId || null,
            userEmail: emailToUse,
            userName: nameToUse,
            subject: message.substring(0, 100),
            status: 'open',
            lastMessageAt: now,
            createdAt: now,
          }).returning();
          convId = newConv[0].id;
        }
        
        req.session.conversationId = convId;
        await new Promise<void>((resolve, reject) => {
          req.session.save((err) => {
            if (err) reject(err);
            else resolve();
          });
        });
      } else {
        await db.update(supportConversations)
          .set({ lastMessageAt: now })
          .where(eq(supportConversations.id, convId));
      }

      await db.insert(supportMessages).values({
        conversationId: convId,
        senderType: 'user',
        senderName: nameToUse,
        message: message,
        createdAt: now,
      });

      res.json({ 
        success: true, 
        conversationId: convId,
        message: "Your message has been sent to our support team. We'll get back to you shortly." 
      });
    } catch (error) {
      console.error('Error sending support message:', error);
      res.status(500).json({ 
        error: "Failed to send message. Please try again later." 
      });
    }
  });

  app.get("/api/support/conversations", requireSupportAuth, async (req, res) => {
    try {
      const conversations = await db.select()
        .from(supportConversations)
        .orderBy(desc(supportConversations.lastMessageAt));

      const conversationsWithCount = await Promise.all(
        conversations.map(async (conv) => {
          const messages = await db.select()
            .from(supportMessages)
            .where(eq(supportMessages.conversationId, conv.id));
          
          const lastMessage = messages[messages.length - 1];
          
          return {
            ...conv,
            messageCount: messages.length,
            lastMessage: lastMessage?.message || '',
          };
        })
      );

      res.json(conversationsWithCount);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  app.get("/api/support/conversations/:id/messages", requireSupportAuth, async (req, res) => {
    try {
      const { id } = req.params;
      
      const conversation = await db.select()
        .from(supportConversations)
        .where(eq(supportConversations.id, id))
        .limit(1);

      if (conversation.length === 0) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      const messages = await db.select()
        .from(supportMessages)
        .where(eq(supportMessages.conversationId, id))
        .orderBy(supportMessages.createdAt);

      res.json({
        conversation: conversation[0],
        messages: messages,
      });
    } catch (error) {
      console.error('Error fetching messages:', error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  app.post("/api/support/conversations/:id/reply", requireSupportAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { message, senderName } = req.body;

      if (!message || !message.trim()) {
        return res.status(400).json({ error: "Message is required" });
      }

      const conversation = await db.select()
        .from(supportConversations)
        .where(eq(supportConversations.id, id))
        .limit(1);

      if (conversation.length === 0) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      const now = new Date().toISOString();

      await db.insert(supportMessages).values({
        conversationId: id,
        senderType: 'support',
        senderName: senderName || 'Support Team',
        message: message,
        createdAt: now,
      });

      await db.update(supportConversations)
        .set({ 
          lastMessageAt: now,
          status: 'in_progress' 
        })
        .where(eq(supportConversations.id, id));

      res.json({ success: true });
    } catch (error) {
      console.error('Error sending reply:', error);
      res.status(500).json({ error: "Failed to send reply" });
    }
  });

  app.patch("/api/support/conversations/:id/status", requireSupportAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!['open', 'in_progress', 'resolved', 'closed'].includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }

      await db.update(supportConversations)
        .set({ status })
        .where(eq(supportConversations.id, id));

      res.json({ success: true });
    } catch (error) {
      console.error('Error updating status:', error);
      res.status(500).json({ error: "Failed to update status" });
    }
  });

  app.get("/api/support/my-conversation", async (req, res) => {
    try {
      if (!req.session.supportUserId && !req.session.candidateId) {
        req.session.supportUserId = `guest-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        await new Promise<void>((resolve, reject) => {
          req.session.save((err) => {
            if (err) reject(err);
            else resolve();
          });
        });
      }

      const candidateEmail = req.session.candidateId 
        ? (await storage.getCandidateByCandidateId(req.session.candidateId))?.email 
        : null;
      
      const emailToUse = candidateEmail || `${req.session.supportUserId}@guest.staffos.com`;

      const conversation = await db.select()
        .from(supportConversations)
        .where(eq(supportConversations.userEmail, emailToUse))
        .orderBy(desc(supportConversations.createdAt))
        .limit(1);

      if (conversation.length === 0) {
        return res.json({ conversation: null, messages: [] });
      }

      const messages = await db.select()
        .from(supportMessages)
        .where(eq(supportMessages.conversationId, conversation[0].id))
        .orderBy(supportMessages.createdAt);

      res.json({
        conversation: conversation[0],
        messages: messages,
      });
    } catch (error) {
      console.error('Error fetching my conversation:', error);
      res.status(500).json({ error: "Failed to fetch conversation" });
    }
  });

  // Chat API Routes
  app.get("/api/chat/rooms", requireEmployeeAuth, async (req, res) => {
    try {
      const employeeId = req.session.employeeId!;

      const participations = await db.select()
        .from(chatParticipants)
        .where(eq(chatParticipants.participantId, employeeId));

      const roomIds = participations.map(p => p.roomId);

      if (roomIds.length === 0) {
        return res.json({ rooms: [] });
      }

      const rooms = await db.select()
        .from(chatRooms)
        .where(sql`${chatRooms.id} IN (${sql.join(roomIds.map(id => sql`${id}`), sql`, `)})`);

      const roomsWithParticipants = await Promise.all(rooms.map(async (room) => {
        const participants = await db.select()
          .from(chatParticipants)
          .where(eq(chatParticipants.roomId, room.id));

        return {
          ...room,
          participants: participants
        };
      }));

      res.json({ rooms: roomsWithParticipants.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        const aTime = a.lastMessageAt || a.createdAt;
        const bTime = b.lastMessageAt || b.createdAt;
        return new Date(bTime).getTime() - new Date(aTime).getTime();
      }) });
    } catch (error) {
      console.error('Error fetching chat rooms:', error);
      res.status(500).json({ error: "Failed to fetch chat rooms" });
    }
  });

  app.get("/api/chat/rooms/:roomId/messages", requireEmployeeAuth, async (req, res) => {
    try {
      const { roomId } = req.params;

      const messages = await db.select()
        .from(chatMessages)
        .where(eq(chatMessages.roomId, roomId))
        .orderBy(chatMessages.createdAt);

      const messagesWithAttachments = await Promise.all(messages.map(async (message) => {
        const attachments = await db.select()
          .from(chatAttachments)
          .where(eq(chatAttachments.messageId, message.id));

        return {
          ...message,
          attachments: attachments
        };
      }));

      res.json({ messages: messagesWithAttachments });
    } catch (error) {
      console.error('Error fetching messages:', error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  app.post("/api/chat/rooms/:roomId/messages", requireEmployeeAuth, async (req, res) => {
    try {
      const { roomId } = req.params;
      const { content, messageType = 'text' } = req.body;
      const employeeId = req.session.employeeId!;

      const employee = await storage.getEmployeeById(employeeId);
      if (!employee) {
        return res.status(404).json({ error: "Employee not found" });
      }

      const newMessage = await db.insert(chatMessages)
        .values({
          roomId,
          senderId: employeeId,
          senderName: employee.name,
          messageType,
          content,
          createdAt: new Date().toISOString()
        })
        .returning();

      await db.update(chatRooms)
        .set({ lastMessageAt: new Date().toISOString() })
        .where(eq(chatRooms.id, roomId));

      // Server-side broadcast to all participants in the room
      if ((app as any).broadcastToRoom) {
        await (app as any).broadcastToRoom(roomId, {
          type: 'new_message',
          roomId,
          message: newMessage[0]
        }, employeeId);
      }

      res.json({ message: newMessage[0] });
    } catch (error) {
      console.error('Error sending message:', error);
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  app.post("/api/chat/upload", requireEmployeeAuth, chatUpload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const fileUrl = `/uploads/chat/${req.file.filename}`;
      
      let fileType = 'file';
      if (req.file.mimetype.startsWith('image/')) {
        fileType = 'image';
      } else if (req.file.mimetype === 'application/pdf') {
        fileType = 'pdf';
      } else if (req.file.mimetype.includes('word')) {
        fileType = 'doc';
      }

      res.json({
        fileUrl,
        fileName: req.file.originalname,
        fileType,
        fileSize: req.file.size
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      res.status(500).json({ error: "Failed to upload file" });
    }
  });

  app.post("/api/chat/rooms/:roomId/messages/attachment", requireEmployeeAuth, async (req, res) => {
    try {
      const { roomId } = req.params;
      const { fileUrl, fileName, fileType, fileSize } = req.body;
      const employeeId = req.session.employeeId!;

      const employee = await storage.getEmployeeById(employeeId);
      if (!employee) {
        return res.status(404).json({ error: "Employee not found" });
      }

      const newMessage = await db.insert(chatMessages)
        .values({
          roomId,
          senderId: employeeId,
          senderName: employee.name,
          messageType: fileType,
          content: fileName,
          createdAt: new Date().toISOString()
        })
        .returning();

      const newAttachment = await db.insert(chatAttachments)
        .values({
          messageId: newMessage[0].id,
          fileName,
          fileUrl,
          fileType,
          fileSize,
          uploadedAt: new Date().toISOString()
        })
        .returning();

      await db.update(chatRooms)
        .set({ lastMessageAt: new Date().toISOString() })
        .where(eq(chatRooms.id, roomId));

      // Server-side broadcast to all participants in the room
      if ((app as any).broadcastToRoom) {
        await (app as any).broadcastToRoom(roomId, {
          type: 'new_message',
          roomId,
          message: {
            ...newMessage[0],
            attachments: [newAttachment[0]]
          }
        }, employeeId);
      }

      res.json({ message: newMessage[0] });
    } catch (error) {
      console.error('Error sending attachment:', error);
      res.status(500).json({ error: "Failed to send attachment" });
    }
  });

  app.get("/api/chat/employees", requireEmployeeAuth, async (req, res) => {
    try {
      const employees = await storage.getAllEmployees();
      const activeEmployees = employees.filter(emp => emp.isActive);
      
      const employeeList = activeEmployees.map(emp => ({
        id: emp.id,
        name: emp.name,
        email: emp.email,
        role: emp.role,
        employeeId: emp.employeeId
      }));

      res.json({ employees: employeeList });
    } catch (error) {
      console.error('Error fetching employees:', error);
      res.status(500).json({ error: "Failed to fetch employees" });
    }
  });

  app.post("/api/chat/rooms", requireEmployeeAuth, async (req, res) => {
    try {
      const { name, type, participantIds } = req.body;
      const employeeId = req.session.employeeId!;
      const employee = await storage.getEmployeeById(employeeId);

      if (!employee) {
        return res.status(404).json({ error: "Employee not found" });
      }

      const newRoom = await db.insert(chatRooms)
        .values({
          name,
          type,
          isPinned: type === 'group' && name === 'Team Chat',
          createdBy: employeeId,
          createdAt: new Date().toISOString()
        })
        .returning();

      const allParticipantIds = [employeeId, ...participantIds];
      for (const participantId of allParticipantIds) {
        const participant = await storage.getEmployeeById(participantId);
        if (participant) {
          await db.insert(chatParticipants)
            .values({
              roomId: newRoom[0].id,
              participantId,
              participantName: participant.name,
              participantRole: participant.role,
              joinedAt: new Date().toISOString()
            });
        }
      }

      res.json({ room: newRoom[0] });
    } catch (error) {
      console.error('Error creating chat room:', error);
      res.status(500).json({ error: "Failed to create chat room" });
    }
  });

  const httpServer = createServer(app);

  // Set up WebSocket server for real-time chat  
  const wss = new WebSocketServer({ noServer: true });

  interface ChatWebSocket extends WebSocket {
    employeeId?: string;
    employeeName?: string;
  }

  // Session parser for WebSocket upgrade
  const sessionParser = session({
    secret: process.env.SESSION_SECRET || 'staffos-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false
  });

  // Handle WebSocket upgrade using session authentication
  httpServer.on('upgrade', (request: any, socket, head) => {
    if (request.url !== '/ws/chat') {
      socket.destroy();
      return;
    }

    // Parse session using express-session middleware
    sessionParser(request, {} as any, async () => {
      try {
        // Validate session and get employee ID
        if (!request.session || !request.session.employeeId) {
          socket.write('HTTP/1.1 401 Unauthorized\r\nContent-Type: text/plain\r\n\r\nNo valid employee session\r\n');
          socket.destroy();
          return;
        }

        // Get employee details from database using session employee ID
        const employee = await storage.getEmployeeById(request.session.employeeId);
        if (!employee || !employee.isActive) {
          socket.write('HTTP/1.1 401 Unauthorized\r\nContent-Type: text/plain\r\n\r\nEmployee not found or inactive\r\n');
          socket.destroy();
          return;
        }

        // Upgrade the connection and attach verified employee identity
        wss.handleUpgrade(request, socket, head, (ws: ChatWebSocket) => {
          ws.employeeId = employee.id;
          ws.employeeName = employee.name;
          wss.emit('connection', ws, request);
        });
      } catch (error) {
        console.error('WebSocket upgrade error:', error);
        socket.write('HTTP/1.1 500 Internal Server Error\r\n\r\n');
        socket.destroy();
      }
    });
  });

  // Broadcast function to send messages to all clients in a room
  const broadcastToRoom = async (roomId: string, message: any, excludeEmployeeId?: string) => {
    // Get all participants in the room
    const participants = await db.select()
      .from(chatParticipants)
      .where(eq(chatParticipants.roomId, roomId));

    const participantIds = participants.map(p => p.participantId);

    wss.clients.forEach((client) => {
      const chatClient = client as ChatWebSocket;
      if (client.readyState === WebSocket.OPEN && 
          chatClient.employeeId && 
          participantIds.includes(chatClient.employeeId) &&
          chatClient.employeeId !== excludeEmployeeId) {
        client.send(JSON.stringify(message));
      }
    });
  };

  wss.on('connection', (ws: ChatWebSocket, req: any) => {
    // Employee identity is now set during upgrade - verified via session
    console.log(`WebSocket connection established for ${ws.employeeName} (${ws.employeeId})`);

    // Send confirmation with server-verified identity
    ws.send(JSON.stringify({ 
      type: 'authenticated', 
      success: true,
      employeeId: ws.employeeId,
      employeeName: ws.employeeName 
    }));

    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        // Only accept typing indicators - identity is already verified
        if (data.type === 'typing' && ws.employeeId) {
          await broadcastToRoom(data.roomId, {
            type: 'typing',
            roomId: data.roomId,
            employeeeName: ws.employeeName,
            employeeId: ws.employeeId
          }, ws.employeeId);
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', () => {
      console.log(`WebSocket connection closed for ${ws.employeeName}`);
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });

  // Export broadcast function for use in message endpoints
  (app as any).broadcastToRoom = broadcastToRoom;

  return httpServer;
}
