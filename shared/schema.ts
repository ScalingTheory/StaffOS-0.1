import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, json, boolean, real, pgEnum, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const profiles = pgTable("profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  title: text("title").notNull(),
  location: text("location").notNull(),
  education: text("education"),
  portfolio: text("portfolio"),
  mobile: text("mobile"),
  whatsapp: text("whatsapp"),
  primaryEmail: text("primary_email"),
  secondaryEmail: text("secondary_email"),
  currentLocation: text("current_location"),
  preferredLocation: text("preferred_location"),
  dateOfBirth: text("date_of_birth"),
  gender: text("gender"),
  portfolioUrl: text("portfolio_url"),
  websiteUrl: text("website_url"),
  linkedinUrl: text("linkedin_url"),
  profilePicture: text("profile_picture"),
  bannerImage: text("banner_image"),
  resumeFile: text("resume_file"),
  resumeText: text("resume_text"),
  appliedJobsCount: text("applied_jobs_count").default("0"),
  // Education fields
  highestQualification: text("highest_qualification"),
  collegeName: text("college_name"),
  skills: text("skills"),
  // Job details fields
  pedigreeLevel: text("pedigree_level"),
  noticePeriod: text("notice_period"),
  currentCompany: text("current_company"),
  currentRole: text("current_role"),
  currentDomain: text("current_domain"),
  companyLevel: text("company_level"),
  productService: text("product_service"),
});

export const jobPreferences = pgTable("job_preferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  profileId: varchar("profile_id").notNull(),
  jobTitles: text("job_titles").notNull(),
  workMode: text("work_mode").notNull(),
  employmentType: text("employment_type").notNull(),
  locations: text("locations").notNull(),
  startDate: text("start_date").notNull(),
  instructions: text("instructions"),
});

export const skills = pgTable("skills", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  profileId: varchar("profile_id").notNull(),
  name: text("name").notNull(),
  category: text("category").notNull(), // primary, secondary, knowledge
});

export const activities = pgTable("activities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  profileId: varchar("profile_id").notNull(),
  type: text("type").notNull(), // resume_update, job_applied
  description: text("description").notNull(),
  date: text("date").notNull(),
});

export const jobApplications = pgTable("job_applications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  profileId: varchar("profile_id").notNull(),
  recruiterJobId: varchar("recruiter_job_id"), // Links to recruiter_jobs.id
  requirementId: varchar("requirement_id"), // Links to requirements.id (for recruiter-tagged applications)
  jobTitle: text("job_title").notNull(),
  company: text("company").notNull(),
  jobType: text("job_type"),
  status: text("status").notNull().default("In Process"), // In Process, Rejected, Applied, Shortlisted, Interview Scheduled, etc.
  source: text("source").notNull().default("job_board"), // job_board, recruiter_tagged, inbound
  appliedDate: timestamp("applied_date").notNull().defaultNow(),
  candidateName: text("candidate_name"),
  candidateEmail: text("candidate_email"),
  candidatePhone: text("candidate_phone"),
  description: text("description"),
  salary: text("salary"),
  location: text("location"),
  workMode: text("work_mode"),
  experience: text("experience"),
  skills: text("skills"), // JSON stringified array
  logo: text("logo"),
});

export const savedJobs = pgTable("saved_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  profileId: varchar("profile_id").notNull(),
  jobTitle: text("job_title").notNull(),
  company: text("company").notNull(),
  location: text("location").notNull(),
  salary: text("salary"),
  jobType: text("job_type").notNull(),
  savedDate: text("saved_date").notNull(),
});

export const teamMembers = pgTable("team_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  salary: text("salary").notNull(),
  year: text("year").notNull(),
  profilesCount: text("profiles_count").notNull().default("0"),
});

export const teamLeaderProfile = pgTable("team_leader_profile", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  role: text("role").notNull(),
  employeeId: text("employee_id").notNull(),
  phone: text("phone").notNull(),
  email: text("email").notNull(),
  joiningDate: text("joining_date").notNull(),
  department: text("department").notNull(),
  reportingTo: text("reporting_to").notNull(),
  totalContribution: text("total_contribution").notNull().default("2,50,000"),
});

export const targetMetrics = pgTable("target_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  currentQuarter: text("current_quarter").notNull(),
  minimumTarget: text("minimum_target").notNull(),
  targetAchieved: text("target_achieved").notNull(),
  incentiveEarned: text("incentive_earned").notNull(),
});

export const targetMappings = pgTable("target_mappings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teamLeadId: varchar("team_lead_id").notNull(),
  teamMemberId: varchar("team_member_id").notNull(),
  quarter: text("quarter").notNull(),
  year: integer("year").notNull(),
  minimumTarget: integer("minimum_target").notNull(),
  targetAchieved: integer("target_achieved").default(0),
  closures: integer("closures").default(0),
  incentives: integer("incentives").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const dailyMetrics = pgTable("daily_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  date: text("date").notNull(),
  totalRequirements: text("total_requirements").notNull(),
  completedRequirements: text("completed_requirements").notNull(),
  avgResumesPerRequirement: text("avg_resumes_per_requirement").notNull(),
  requirementsPerRecruiter: text("requirements_per_recruiter").notNull(),
  dailyDeliveryDelivered: text("daily_delivery_delivered").notNull(),
  dailyDeliveryDefaulted: text("daily_delivery_defaulted").notNull(),
});

export const meetingCategoryEnum = pgEnum("meeting_category", ["tl", "ceo_ta"]);
export const meetingStatusEnum = pgEnum("meeting_status", ["scheduled", "pending", "completed", "cancelled"]);
export const adminMessageStatusEnum = pgEnum("admin_message_status", ["active", "pending"]);

export const meetings = pgTable("meetings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  meetingType: text("meeting_type").notNull(),
  meetingDate: text("meeting_date").notNull(),
  meetingTime: text("meeting_time").notNull(),
  person: text("person").notNull(),
  personId: varchar("person_id"),
  agenda: text("agenda").notNull(),
  status: meetingStatusEnum("status").notNull().default("pending"),
  meetingCategory: meetingCategoryEnum("meeting_category").notNull(),
  notes: text("notes"),
  createdAt: text("created_at").notNull(),
});

export const ceoComments = pgTable("ceo_comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  comment: text("comment").notNull(),
  date: text("date").notNull(),
});

export const requirements = pgTable("requirements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  position: text("position").notNull(),
  criticality: text("criticality").notNull(), // HIGH, MEDIUM, LOW
  toughness: text("toughness").notNull().default("Medium"), // Easy, Medium, Tough
  company: text("company").notNull(),
  spoc: text("spoc").notNull(),
  talentAdvisor: text("talent_advisor"),
  talentAdvisorId: varchar("talent_advisor_id"), // Stable ID-based linkage to employees table
  teamLead: text("team_lead"),
  status: text("status").notNull().default("open"), // open, in_progress, completed
  completedAt: text("completed_at"),
  isArchived: boolean("is_archived").default(false),
  createdAt: text("created_at").notNull(),
});

export const archivedRequirements = pgTable("archived_requirements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  position: text("position").notNull(),
  criticality: text("criticality").notNull(),
  toughness: text("toughness").notNull().default("Medium"), // Easy, Medium, Tough
  company: text("company").notNull(),
  spoc: text("spoc").notNull(),
  talentAdvisor: text("talent_advisor"),
  teamLead: text("team_lead"),
  archivedAt: text("archived_at").notNull(),
  originalId: varchar("original_id").notNull(),
});

export const deliveries = pgTable("deliveries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  requirementId: varchar("requirement_id").notNull(), // Links to requirements.id
  candidateName: text("candidate_name").notNull(),
  candidateEmail: text("candidate_email"),
  recruiterName: text("recruiter_name").notNull(),
  deliveredAt: text("delivered_at").notNull(),
  status: text("status").notNull().default("delivered"), // delivered, accepted, rejected
  notes: text("notes"),
});

export const employees = pgTable("employees", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employeeId: text("employee_id").notNull().unique(), // SCE001, SCE002, etc
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password"), // Optional - only required for login credentials
  role: text("role").notNull().default('employee_record'), // recruiter, team_leader, client, admin, employee_record
  
  // Basic Information
  address: text("address"),
  designation: text("designation"),
  phone: text("phone"),
  department: text("department"),
  joiningDate: text("joining_date"),
  employmentStatus: text("employment_status"), // Active, Inactive, etc
  
  // ESIC & EPFO
  esic: text("esic"), // Yes/No dropdown
  epfo: text("epfo"), // Yes/No dropdown
  esicNo: text("esic_no"),
  epfoNo: text("epfo_no"),
  
  // Family Details
  fatherName: text("father_name"),
  motherName: text("mother_name"),
  fatherNumber: text("father_number"),
  motherNumber: text("mother_number"),
  
  // CTC & Appraisal
  offeredCtc: text("offered_ctc"),
  currentStatus: text("current_status"), // dropdown
  incrementCount: text("increment_count"), // dropdown 
  appraisedQuarter: text("appraised_quarter"), // dropdown
  appraisedAmount: text("appraised_amount"),
  appraisedYear: text("appraised_year"), // dropdown
  yearlyCTC: text("yearly_ctc"),
  currentMonthlyCTC: text("current_monthly_ctc"),
  
  // Bank Details
  nameAsPerBank: text("name_as_per_bank"),
  accountNumber: text("account_number"),
  ifscCode: text("ifsc_code"),
  bankName: text("bank_name"),
  branch: text("branch"),
  city: text("city"),
  
  // Legacy/Other
  reportingTo: text("reporting_to"),
  isActive: boolean("is_active").default(true),
  createdAt: text("created_at").notNull(),
  
  // Profile media (for dashboard display)
  profilePicture: text("profile_picture"),
  bannerImage: text("banner_image"),
});

export const candidates = pgTable("candidates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  candidateId: text("candidate_id").notNull().unique(), // STCA001 format
  fullName: text("full_name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password"), // Optional for Google OAuth users
  googleId: text("google_id").unique(), // Google OAuth ID
  // Additional candidate details
  phone: text("phone"),
  company: text("company"),
  designation: text("designation"),
  age: text("age"),
  gender: text("gender"),
  location: text("location"),
  experience: text("experience"),
  skills: text("skills"),
  // Profile media
  profilePicture: text("profile_picture"),
  bannerImage: text("banner_image"),
  resumeFile: text("resume_file"),
  resumeText: text("resume_text"),
  // Additional profile fields
  education: text("education"),
  currentRole: text("current_role"),
  portfolioUrl: text("portfolio_url"),
  websiteUrl: text("website_url"),
  linkedinUrl: text("linkedin_url"),
  // Pipeline tracking fields
  pipelineStatus: text("pipeline_status").default("New"), // New, L1, L2, L3, Final Round, HR Round, Offer Stage, Closure
  addedBy: text("added_by"), // Recruiter name who added the candidate
  assignedTo: text("assigned_to"), // Recruiter name assigned to work on this candidate
  ctc: text("ctc"), // Current CTC
  ectc: text("ectc"), // Expected CTC
  noticePeriod: text("notice_period"), // Notice period
  position: text("position"), // Position applied for
  // Filter fields for sourcing
  pedigreeLevel: text("pedigree_level"), // Tier 1, Tier 2, Tier 3, Others
  companyLevel: text("company_level"), // Startup, Mid-size, Enterprise, MNC
  companySector: text("company_sector"), // Technology, Finance, Healthcare, etc.
  productService: text("product_service"), // SaaS, Product, Service, Hybrid
  productCategory: text("product_category"), // B2B, B2C, B2B2C
  productDomain: text("product_domain"), // Web Development, Mobile Apps, etc.
  employmentType: text("employment_type"), // Full-time, Part-time, Contract, etc.
  isActive: boolean("is_active").default(true),
  isVerified: boolean("is_verified").default(false),
  createdAt: text("created_at").notNull(),
});

export const candidateLoginAttempts = pgTable("candidate_login_attempts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull(),
  attempts: text("attempts").notNull().default("0"),
  lastAttemptAt: text("last_attempt_at"),
  lockedUntil: text("locked_until"), // ISO timestamp for 30-minute lockout
  createdAt: text("created_at").notNull(),
});

export const interviewTracker = pgTable("interview_tracker", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  candidateName: text("candidate_name").notNull(),
  position: text("position").notNull(),
  client: text("client").notNull(),
  interviewDate: text("interview_date").notNull(),
  interviewTime: text("interview_time").notNull(),
  interviewType: text("interview_type").notNull(), // video, phone, in-person
  interviewRound: text("interview_round").notNull(), // L1, L2, HR, etc.
  status: text("status").notNull().default("scheduled"), // scheduled, completed, cancelled, rescheduled
  recruiterName: text("recruiter_name").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at"),
});

export const interviewTrackerCounts = pgTable("interview_tracker_counts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  todayScheduled: text("today_scheduled").notNull().default("0"),
  pendingCases: text("pending_cases").notNull().default("0"),
  completedToday: text("completed_today").notNull().default("0"),
  rescheduledToday: text("rescheduled_today").notNull().default("0"),
  cancelledToday: text("cancelled_today").notNull().default("0"),
  recruiterName: text("recruiter_name").notNull(),
  date: text("date").notNull(),
  updatedAt: text("updated_at"),
});

export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id").notNull(),
  type: text("type").notNull(), // bulk_upload_complete, bulk_upload_failed, general
  title: text("title").notNull(),
  message: text("message").notNull(),
  status: text("status").notNull().default("unread"), // read, unread
  relatedJobId: text("related_job_id"), // For bulk upload notifications
  createdAt: text("created_at").notNull(),
  readAt: text("read_at"),
});

export const impactMetrics = pgTable("impact_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: text("client_id"), // Optional - can be null for global metrics
  speedToHire: real("speed_to_hire").notNull().default(15),
  revenueImpactOfDelay: real("revenue_impact_of_delay").notNull().default(75000),
  clientNps: real("client_nps").notNull().default(60),
  candidateNps: real("candidate_nps").notNull().default(70),
  feedbackTurnAround: real("feedback_turn_around").notNull().default(2),
  feedbackTurnAroundAvgDays: real("feedback_turn_around_avg_days").notNull().default(5),
  firstYearRetentionRate: real("first_year_retention_rate").notNull().default(90),
  fulfillmentRate: real("fulfillment_rate").notNull().default(20),
  revenueRecovered: real("revenue_recovered").notNull().default(1.5),
});

export const clients = pgTable("clients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientCode: text("client_code").notNull().unique(),
  brandName: text("brand_name").notNull(),
  incorporatedName: text("incorporated_name"),
  gstin: text("gstin"),
  address: text("address"),
  location: text("location"),
  spoc: text("spoc"),
  email: text("email"),
  website: text("website"),
  linkedin: text("linkedin"),
  agreement: text("agreement"),
  percentage: text("percentage"),
  category: text("category"),
  paymentTerms: text("payment_terms"),
  source: text("source"),
  startDate: text("start_date"),
  referral: text("referral"),
  currentStatus: text("current_status").default("active"), // active, frozen, churned
  isLoginOnly: boolean("is_login_only").default(false), // true = User Management login only, false = Master Data client
  createdAt: text("created_at").notNull(),
});

export const chatRooms = pgTable("chat_rooms", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: text("type").notNull(), // direct, group
  isPinned: boolean("is_pinned").default(false),
  createdBy: text("created_by").notNull(), // employee ID
  lastMessageAt: text("last_message_at"),
  createdAt: text("created_at").notNull(),
});

export const chatParticipants = pgTable("chat_participants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  roomId: varchar("room_id").notNull(),
  participantId: text("participant_id").notNull(), // employee ID
  participantName: text("participant_name").notNull(),
  participantRole: text("participant_role").notNull(),
  joinedAt: text("joined_at").notNull(),
});

export const chatMessages = pgTable("chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  roomId: varchar("room_id").notNull(),
  senderId: text("sender_id").notNull(), // employee ID
  senderName: text("sender_name").notNull(),
  messageType: text("message_type").notNull(), // text, image, file, link
  content: text("content").notNull(),
  createdAt: text("created_at").notNull(),
});

export const chatAttachments = pgTable("chat_attachments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  messageId: varchar("message_id").notNull(),
  fileName: text("file_name").notNull(),
  fileUrl: text("file_url").notNull(),
  fileType: text("file_type").notNull(), // image, pdf, doc, etc
  fileSize: integer("file_size").notNull(),
  uploadedAt: text("uploaded_at").notNull(),
});

export const revenueMappings = pgTable("revenue_mappings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  talentAdvisorId: varchar("talent_advisor_id").notNull(),
  talentAdvisorName: text("talent_advisor_name").notNull(),
  teamLeadId: varchar("team_lead_id").notNull(),
  teamLeadName: text("team_lead_name").notNull(),
  candidateName: text("candidate_name"), // Name of the candidate who was placed
  year: integer("year").notNull(),
  quarter: text("quarter").notNull(), // JFM, AMJ, JAS, OND
  position: text("position").notNull(),
  clientId: varchar("client_id").notNull(),
  clientName: text("client_name").notNull(),
  clientType: text("client_type").notNull(), // Direct, Partner
  partnerName: text("partner_name"),
  offeredDate: text("offered_date"),
  closureDate: text("closure_date"),
  percentage: real("percentage").notNull(),
  revenue: real("revenue").notNull(),
  incentivePlan: text("incentive_plan").notNull(), // TL, TA, Business Development
  incentive: real("incentive").notNull(),
  source: text("source").notNull(), // LinkedIn, Naukri, Referral, Direct, Other
  invoiceDate: text("invoice_date"),
  invoiceNumber: text("invoice_number"),
  receivedPayment: real("received_payment"),
  paymentDetails: text("payment_details"), // Fully paid, Part paid
  paymentStatus: text("payment_status"),
  incentivePaidMonth: text("incentive_paid_month"),
  createdAt: text("created_at").notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
});

export const insertProfileSchema = createInsertSchema(profiles).omit({
  id: true,
});

export const insertJobPreferencesSchema = createInsertSchema(jobPreferences).omit({
  id: true,
});

export const insertSkillSchema = createInsertSchema(skills).omit({
  id: true,
});

export const insertActivitySchema = createInsertSchema(activities).omit({
  id: true,
});

export const insertJobApplicationSchema = createInsertSchema(jobApplications).omit({
  id: true,
  profileId: true,
  appliedDate: true,
}).extend({
  skills: z.union([z.string(), z.array(z.string())]).optional().transform(val => 
    Array.isArray(val) ? JSON.stringify(val) : val
  ),
});

export const insertSavedJobSchema = createInsertSchema(savedJobs).omit({
  id: true,
});

export const insertTeamMemberSchema = createInsertSchema(teamMembers).omit({
  id: true,
});

export const insertTeamLeaderProfileSchema = createInsertSchema(teamLeaderProfile).omit({
  id: true,
});

export const insertTargetMetricsSchema = createInsertSchema(targetMetrics).omit({
  id: true,
});

export const insertTargetMappingsSchema = createInsertSchema(targetMappings).omit({
  id: true,
});

export const insertDailyMetricsSchema = createInsertSchema(dailyMetrics).omit({
  id: true,
});

export const insertMeetingSchema = createInsertSchema(meetings).omit({
  id: true,
  createdAt: true,
});

export const insertCeoCommentSchema = createInsertSchema(ceoComments).omit({
  id: true,
});

export const insertRequirementSchema = createInsertSchema(requirements).omit({
  id: true,
});

export const insertArchivedRequirementSchema = createInsertSchema(archivedRequirements).omit({
  id: true,
});

export const insertDeliverySchema = createInsertSchema(deliveries).omit({
  id: true,
});

export const insertEmployeeSchema = createInsertSchema(employees).omit({
  id: true,
  createdAt: true,
}).extend({
  password: z.string().min(6).optional().or(z.literal("")).transform((val) => val?.trim() ? val : undefined)
});

export const insertCandidateSchema = createInsertSchema(candidates).omit({
  id: true,
});

export const insertCandidateLoginAttemptsSchema = createInsertSchema(candidateLoginAttempts).omit({
  id: true,
});

export const insertInterviewTrackerSchema = createInsertSchema(interviewTracker).omit({
  id: true,
});

export const insertInterviewTrackerCountsSchema = createInsertSchema(interviewTrackerCounts).omit({
  id: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
});

export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
});

export const insertImpactMetricsSchema = createInsertSchema(impactMetrics).omit({
  id: true,
});

export const supportConversations = pgTable("support_conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id"),
  userEmail: text("user_email").notNull(),
  userName: text("user_name").notNull(),
  subject: text("subject"),
  status: text("status").notNull().default("open"), // open, in_progress, resolved, closed
  lastMessageAt: text("last_message_at").notNull(),
  createdAt: text("created_at").notNull(),
});

export const supportMessages = pgTable("support_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").notNull(),
  senderType: text("sender_type").notNull(), // user, support
  senderName: text("sender_name").notNull(),
  message: text("message").notNull(),
  createdAt: text("created_at").notNull(),
});

export const bulkUploadJobs = pgTable("bulk_upload_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobId: varchar("job_id").notNull().unique(),
  createdBy: text("created_by").notNull(),
  status: text("status").notNull().default("pending"), // pending, processing, completed, failed
  totalFiles: integer("total_files").notNull().default(0),
  processedFiles: integer("processed_files").notNull().default(0),
  successCount: integer("success_count").notNull().default(0),
  failureCount: integer("failure_count").notNull().default(0),
  errorMessage: text("error_message"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at"),
});

export const bulkUploadFiles = pgTable("bulk_upload_files", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobId: varchar("job_id").notNull(),
  originalName: text("original_name").notNull(),
  storedFileName: text("stored_file_name").notNull(),
  path: text("path").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),
  status: text("status").notNull().default("pending"), // pending, processing, completed, failed
  error: text("error"),
  parsedCandidateId: text("parsed_candidate_id"),
  parsedEmail: text("parsed_email"),
  uploadedAt: text("uploaded_at").notNull(),
  processedAt: text("processed_at"),
});

export const adminMessages = pgTable("admin_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  senderEmployeeId: text("sender_employee_id").notNull(),
  recipientEmployeeId: text("recipient_employee_id").notNull(),
  recipientName: text("recipient_name").notNull(),
  preview: text("preview").notNull(),
  body: text("body").notNull(),
  status: adminMessageStatusEnum("status").notNull().default("active"),
  sentAt: timestamp("sent_at").notNull().defaultNow(),
});

export const recruiterCommands = pgTable("recruiter_commands", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  recruiterId: varchar("recruiter_id").notNull(), // Links to employees.id (the recruiter assigned)
  recruiterName: text("recruiter_name").notNull(),
  command: text("command").notNull(),
  status: text("status").notNull().default("pending"), // pending, completed, cancelled
  createdBy: text("created_by").notNull(), // Admin/CEO who created the command
  date: text("date").notNull(),
  completedAt: text("completed_at"),
  createdAt: text("created_at").notNull(),
});

export const recruiterJobs = pgTable("recruiter_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  recruiterId: varchar("recruiter_id"), // Links to employees.id (the recruiter who posted)
  companyName: text("company_name").notNull(),
  companyTagline: text("company_tagline"),
  companyType: text("company_type"),
  companyLogo: text("company_logo"),
  market: text("market"),
  field: text("field"),
  noOfPositions: integer("no_of_positions").default(1),
  role: text("role").notNull(),
  experience: text("experience").notNull(),
  location: text("location"),
  workMode: text("work_mode"), // Remote, Hybrid, On-site
  salaryPackage: text("salary_package"),
  aboutCompany: text("about_company"),
  roleDefinitions: text("role_definitions"),
  keyResponsibility: text("key_responsibility"),
  primarySkills: text("primary_skills"), // JSON stringified array
  secondarySkills: text("secondary_skills"), // JSON stringified array
  knowledgeOnly: text("knowledge_only"), // JSON stringified array
  status: text("status").notNull().default("Active"), // Active, Closed, Draft
  applicationCount: integer("application_count").default(0),
  postedDate: timestamp("posted_date").notNull().defaultNow(),
  closedDate: timestamp("closed_date"),
  createdAt: text("created_at").notNull(),
});

// User activities table for Admin/TL/Recruiter notifications
export const userActivities = pgTable("user_activities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  actorId: text("actor_id").notNull(), // Employee ID who performed the action
  actorName: text("actor_name").notNull(), // Name of the person who performed the action
  actorRole: text("actor_role").notNull(), // admin, team_leader, recruiter
  type: text("type").notNull(), // requirement_added, candidate_pipeline_changed, closure_made, candidate_submitted, interview_scheduled
  title: text("title").notNull(), // Short title for the activity
  description: text("description").notNull(), // Detailed description
  targetRole: text("target_role"), // Which roles should see this: admin, team_leader, recruiter, or comma-separated
  relatedId: text("related_id"), // Related entity ID (requirement, candidate, etc.)
  relatedType: text("related_type"), // Type of related entity (requirement, candidate, closure, etc.)
  createdAt: text("created_at").notNull(),
});

export const requirementAssignments = pgTable("requirement_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  requirementId: varchar("requirement_id").notNull(),
  recruiterId: varchar("recruiter_id").notNull(),
  recruiterName: text("recruiter_name").notNull(),
  teamLeadId: varchar("team_lead_id"),
  teamLeadName: text("team_lead_name"),
  assignedDate: text("assigned_date").notNull(),
  dueDate: text("due_date"),
  status: text("status").notNull().default("active"),
  createdAt: text("created_at").notNull(),
});

export const resumeSubmissions = pgTable("resume_submissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  requirementId: varchar("requirement_id").notNull(),
  assignmentId: varchar("assignment_id"),
  recruiterId: varchar("recruiter_id").notNull(),
  recruiterName: text("recruiter_name").notNull(),
  candidateId: varchar("candidate_id"),
  candidateName: text("candidate_name").notNull(),
  candidateEmail: text("candidate_email"),
  submittedAt: text("submitted_at").notNull(),
  status: text("status").notNull().default("submitted"),
  notes: text("notes"),
  createdAt: text("created_at").notNull(),
});

export const dailyMetricsSnapshots = pgTable("daily_metrics_snapshots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  date: text("date").notNull(),
  scopeType: text("scope_type").notNull(),
  scopeId: varchar("scope_id"),
  scopeName: text("scope_name"),
  delivered: integer("delivered").notNull().default(0),
  defaulted: integer("defaulted").notNull().default(0),
  requirementCount: integer("requirement_count").notNull().default(0),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at"),
});

export const insertRequirementAssignmentSchema = createInsertSchema(requirementAssignments).omit({
  id: true,
  createdAt: true,
});

export const insertResumeSubmissionSchema = createInsertSchema(resumeSubmissions).omit({
  id: true,
  createdAt: true,
});

export const insertDailyMetricsSnapshotSchema = createInsertSchema(dailyMetricsSnapshots).omit({
  id: true,
  createdAt: true,
});

export const insertUserActivitySchema = createInsertSchema(userActivities).omit({
  id: true,
});

export const insertSupportConversationSchema = createInsertSchema(supportConversations).omit({
  id: true,
});

export const insertSupportMessageSchema = createInsertSchema(supportMessages).omit({
  id: true,
});

export const insertBulkUploadJobSchema = createInsertSchema(bulkUploadJobs).omit({
  id: true,
});

export const insertBulkUploadFileSchema = createInsertSchema(bulkUploadFiles).omit({
  id: true,
});

export const insertChatRoomSchema = createInsertSchema(chatRooms).omit({
  id: true,
});

export const insertChatParticipantSchema = createInsertSchema(chatParticipants).omit({
  id: true,
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
});

export const insertChatAttachmentSchema = createInsertSchema(chatAttachments).omit({
  id: true,
});

export const insertRevenueMappingSchema = createInsertSchema(revenueMappings).omit({
  id: true,
  createdAt: true,
});

export const insertAdminMessageSchema = createInsertSchema(adminMessages).omit({
  id: true,
  sentAt: true,
});

export const insertRecruiterCommandSchema = createInsertSchema(recruiterCommands).omit({
  id: true,
  createdAt: true,
});

export const insertRecruiterJobSchema = createInsertSchema(recruiterJobs).omit({
  id: true,
  postedDate: true,
  closedDate: true,
}).extend({
  primarySkills: z.union([z.string(), z.array(z.string())]).optional().transform(val =>
    Array.isArray(val) ? JSON.stringify(val) : val
  ),
  secondarySkills: z.union([z.string(), z.array(z.string())]).optional().transform(val =>
    Array.isArray(val) ? JSON.stringify(val) : val
  ),
  knowledgeOnly: z.union([z.string(), z.array(z.string())]).optional().transform(val =>
    Array.isArray(val) ? JSON.stringify(val) : val
  ),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertProfile = z.infer<typeof insertProfileSchema>;
export type Profile = typeof profiles.$inferSelect;
export type InsertJobPreferences = z.infer<typeof insertJobPreferencesSchema>;
export type JobPreferences = typeof jobPreferences.$inferSelect;
export type InsertSkill = z.infer<typeof insertSkillSchema>;
export type Skill = typeof skills.$inferSelect;
export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type Activity = typeof activities.$inferSelect;
export type InsertJobApplication = z.infer<typeof insertJobApplicationSchema>;
export type JobApplication = typeof jobApplications.$inferSelect;
export type InsertSavedJob = z.infer<typeof insertSavedJobSchema>;
export type SavedJob = typeof savedJobs.$inferSelect;
export type InsertTeamMember = z.infer<typeof insertTeamMemberSchema>;
export type TeamMember = typeof teamMembers.$inferSelect;
export type InsertTeamLeaderProfile = z.infer<typeof insertTeamLeaderProfileSchema>;
export type TeamLeaderProfile = typeof teamLeaderProfile.$inferSelect;
export type InsertTargetMetrics = z.infer<typeof insertTargetMetricsSchema>;
export type TargetMetrics = typeof targetMetrics.$inferSelect;
export type InsertTargetMappings = z.infer<typeof insertTargetMappingsSchema>;
export type TargetMappings = typeof targetMappings.$inferSelect;
export type InsertDailyMetrics = z.infer<typeof insertDailyMetricsSchema>;
export type DailyMetrics = typeof dailyMetrics.$inferSelect;
export type InsertMeeting = z.infer<typeof insertMeetingSchema>;
export type Meeting = typeof meetings.$inferSelect;
export type InsertCeoComment = z.infer<typeof insertCeoCommentSchema>;
export type CeoComment = typeof ceoComments.$inferSelect;
export type InsertRequirement = z.infer<typeof insertRequirementSchema>;
export type Requirement = typeof requirements.$inferSelect;
export type InsertArchivedRequirement = z.infer<typeof insertArchivedRequirementSchema>;
export type ArchivedRequirement = typeof archivedRequirements.$inferSelect;
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;
export type Employee = typeof employees.$inferSelect;
export type InsertCandidate = z.infer<typeof insertCandidateSchema>;
export type Candidate = typeof candidates.$inferSelect;
export type InsertCandidateLoginAttempts = z.infer<typeof insertCandidateLoginAttemptsSchema>;
export type CandidateLoginAttempts = typeof candidateLoginAttempts.$inferSelect;
export type InsertInterviewTracker = z.infer<typeof insertInterviewTrackerSchema>;
export type InterviewTracker = typeof interviewTracker.$inferSelect;
export type InsertInterviewTrackerCounts = z.infer<typeof insertInterviewTrackerCountsSchema>;
export type InterviewTrackerCounts = typeof interviewTrackerCounts.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clients.$inferSelect;
export type InsertImpactMetrics = z.infer<typeof insertImpactMetricsSchema>;
export type ImpactMetrics = typeof impactMetrics.$inferSelect;
export type InsertSupportConversation = z.infer<typeof insertSupportConversationSchema>;
export type SupportConversation = typeof supportConversations.$inferSelect;
export type InsertSupportMessage = z.infer<typeof insertSupportMessageSchema>;
export type SupportMessage = typeof supportMessages.$inferSelect;
export type InsertBulkUploadJob = z.infer<typeof insertBulkUploadJobSchema>;
export type BulkUploadJob = typeof bulkUploadJobs.$inferSelect;
export type InsertBulkUploadFile = z.infer<typeof insertBulkUploadFileSchema>;
export type BulkUploadFile = typeof bulkUploadFiles.$inferSelect;
export type InsertChatRoom = z.infer<typeof insertChatRoomSchema>;
export type ChatRoom = typeof chatRooms.$inferSelect;
export type InsertChatParticipant = z.infer<typeof insertChatParticipantSchema>;
export type ChatParticipant = typeof chatParticipants.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatAttachment = z.infer<typeof insertChatAttachmentSchema>;
export type ChatAttachment = typeof chatAttachments.$inferSelect;
export type InsertRevenueMapping = z.infer<typeof insertRevenueMappingSchema>;
export type RevenueMapping = typeof revenueMappings.$inferSelect;
export type InsertAdminMessage = z.infer<typeof insertAdminMessageSchema>;
export type AdminMessage = typeof adminMessages.$inferSelect;
export type InsertRecruiterCommand = z.infer<typeof insertRecruiterCommandSchema>;
export type RecruiterCommand = typeof recruiterCommands.$inferSelect;
export type InsertRecruiterJob = z.infer<typeof insertRecruiterJobSchema>;
export type RecruiterJob = typeof recruiterJobs.$inferSelect;
export type InsertUserActivity = z.infer<typeof insertUserActivitySchema>;
export type UserActivity = typeof userActivities.$inferSelect;
export type InsertRequirementAssignment = z.infer<typeof insertRequirementAssignmentSchema>;
export type RequirementAssignment = typeof requirementAssignments.$inferSelect;
export type InsertResumeSubmission = z.infer<typeof insertResumeSubmissionSchema>;
export type ResumeSubmission = typeof resumeSubmissions.$inferSelect;
export type InsertDailyMetricsSnapshot = z.infer<typeof insertDailyMetricsSnapshotSchema>;
export type DailyMetricsSnapshot = typeof dailyMetricsSnapshots.$inferSelect;
