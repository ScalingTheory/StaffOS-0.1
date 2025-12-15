import { 
  type User, 
  type InsertUser, 
  type Profile, 
  type InsertProfile,
  type JobPreferences,
  type InsertJobPreferences,
  type Skill,
  type InsertSkill,
  type Activity,
  type InsertActivity,
  type JobApplication,
  type InsertJobApplication,
  type SavedJob,
  type InsertSavedJob,
  type Requirement,
  type InsertRequirement,
  type ArchivedRequirement,
  type InsertArchivedRequirement,
  type Employee,
  type InsertEmployee,
  type Candidate,
  type InsertCandidate,
  type CandidateLoginAttempts,
  type InsertCandidateLoginAttempts,
  type Notification,
  type InsertNotification,
  type Client,
  type InsertClient,
  type ImpactMetrics,
  type InsertImpactMetrics,
  type TargetMappings,
  type InsertTargetMappings,
  type RevenueMapping,
  type InsertRevenueMapping,
  type RecruiterJob,
  type InsertRecruiterJob,
  type UserActivity,
  type InsertUserActivity,
  type RequirementAssignment,
  type InsertRequirementAssignment,
  type ResumeSubmission,
  type InsertResumeSubmission,
  type DailyMetricsSnapshot,
  type InsertDailyMetricsSnapshot
} from "@shared/schema";
import { randomUUID } from "crypto";
import bcrypt from "bcrypt";
import { DatabaseStorage } from "./database-storage";
import { getResumeTarget } from "@shared/constants";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getProfile(userId: string): Promise<Profile | undefined>;
  createProfile(profile: InsertProfile): Promise<Profile>;
  updateProfile(userId: string, profile: Partial<Profile>): Promise<Profile | undefined>;
  
  getJobPreferences(profileId: string): Promise<JobPreferences | undefined>;
  createJobPreferences(preferences: InsertJobPreferences): Promise<JobPreferences>;
  updateJobPreferences(profileId: string, preferences: Partial<JobPreferences>): Promise<JobPreferences | undefined>;
  
  getSkillsByProfile(profileId: string): Promise<Skill[]>;
  createSkill(skill: InsertSkill): Promise<Skill>;
  updateSkillsByProfile(profileId: string, skills: InsertSkill[]): Promise<Skill[]>;
  
  getActivitiesByProfile(profileId: string): Promise<Activity[]>;
  createActivity(activity: InsertActivity): Promise<Activity>;
  
  getJobApplicationsByProfile(profileId: string): Promise<JobApplication[]>;
  createJobApplication(application: InsertJobApplication): Promise<JobApplication>;
  
  getSavedJobsByProfile(profileId: string): Promise<SavedJob[]>;
  createSavedJob(savedJob: InsertSavedJob): Promise<SavedJob>;
  removeSavedJob(profileId: string, jobTitle: string, company: string): Promise<boolean>;
  
  // Requirements methods
  getRequirements(): Promise<Requirement[]>;
  getRequirementsByTeamLead(teamLeadName: string): Promise<Requirement[]>;
  getRequirementsByTalentAdvisor(talentAdvisorName: string): Promise<Requirement[]>;
  getRequirementsByTalentAdvisorId(talentAdvisorId: string): Promise<Requirement[]>;
  createRequirement(requirement: InsertRequirement): Promise<Requirement>;
  updateRequirement(id: string, updates: Partial<Requirement>): Promise<Requirement | undefined>;
  archiveRequirement(id: string): Promise<ArchivedRequirement | undefined>;
  getArchivedRequirements(): Promise<ArchivedRequirement[]>;
  
  // Employee methods
  getEmployeeById(id: string): Promise<Employee | undefined>;
  getEmployeeByEmail(email: string): Promise<Employee | undefined>;
  getEmployeeByEmployeeId(employeeId: string): Promise<Employee | undefined>;
  createEmployee(employee: InsertEmployee): Promise<Employee>;
  getAllEmployees(): Promise<Employee[]>;
  updateEmployee(id: string, updates: Partial<Employee>): Promise<Employee | undefined>;
  deleteEmployee(id: string): Promise<boolean>;
  updateEmployeePassword(email: string, newPasswordHash: string): Promise<boolean>;
  generateNextEmployeeId(role: string): Promise<string>;
  
  // Candidate methods
  getCandidateByEmail(email: string): Promise<Candidate | undefined>;
  getCandidateByCandidateId(candidateId: string): Promise<Candidate | undefined>;
  getCandidateByGoogleId(googleId: string): Promise<Candidate | undefined>;
  createCandidate(candidate: InsertCandidate): Promise<Candidate>;
  createCandidateWithGoogle(candidateData: { candidateId: string; fullName: string; email: string; googleId: string; profilePicture?: string; isActive: boolean; isVerified: boolean; createdAt: string }): Promise<Candidate>;
  getAllCandidates(): Promise<Candidate[]>;
  updateCandidate(id: string, updates: Partial<Candidate>): Promise<Candidate | undefined>;
  deleteCandidate(id: string): Promise<boolean>;
  generateNextCandidateId(): Promise<string>;
  updateCandidatePassword(email: string, newPasswordHash: string): Promise<boolean>;
  getCandidateCounts(): Promise<{total: number, active: number, inactive: number}>;
  
  // Login attempt tracking methods
  getLoginAttempts(email: string): Promise<CandidateLoginAttempts | undefined>;
  createOrUpdateLoginAttempts(attempts: InsertCandidateLoginAttempts): Promise<CandidateLoginAttempts>;
  resetLoginAttempts(email: string): Promise<boolean>;
  
  // OTP storage methods
  storeOTP(email: string, otp: string): Promise<void>;
  verifyOTP(email: string, otp: string): Promise<boolean>;

  // Notification methods
  createNotification(notification: InsertNotification): Promise<Notification>;
  getNotificationsByUserId(userId: string): Promise<Notification[]>;
  markNotificationAsRead(id: string): Promise<Notification | undefined>;
  deleteNotification(id: string): Promise<boolean>;
  
  // User Activity methods (for Admin/TL/Recruiter notifications)
  createUserActivity(activity: InsertUserActivity): Promise<UserActivity>;
  getUserActivities(role: string, limit?: number): Promise<UserActivity[]>;
  
  // Client methods
  generateNextClientCode(): Promise<string>;
  createClient(client: InsertClient): Promise<Client>;
  getAllClients(): Promise<Client[]>;
  getClientByClientCode(clientCode: string): Promise<Client | undefined>;
  updateClient(id: string, updates: Partial<Client>): Promise<Client | undefined>;
  deleteClient(id: string): Promise<boolean>;
  
  // Client-specific data methods (for client dashboard)
  getRequirementsByCompany(companyName: string): Promise<Requirement[]>;
  getJobApplicationsByCompany(companyName: string): Promise<JobApplication[]>;
  getRevenueMappingsByClientName(clientName: string): Promise<RevenueMapping[]>;
  getClientDashboardStats(companyName: string): Promise<{
    rolesAssigned: number;
    totalPositions: number;
    activeRoles: number;
    successfulHires: number;
    pausedRoles: number;
    withdrawnRoles: number;
  }>;
  getClientPipelineData(companyName: string): Promise<any[]>;
  
  // Impact Metrics methods
  createImpactMetrics(metrics: InsertImpactMetrics): Promise<ImpactMetrics>;
  getImpactMetrics(clientId?: string): Promise<ImpactMetrics | undefined>;
  getAllImpactMetrics(): Promise<ImpactMetrics[]>;
  updateImpactMetrics(id: string, updates: Partial<ImpactMetrics>): Promise<ImpactMetrics | undefined>;
  deleteImpactMetrics(id: string): Promise<boolean>;
  
  // Target Mapping methods
  createTargetMapping(mapping: InsertTargetMappings): Promise<TargetMappings>;
  getAllTargetMappings(): Promise<TargetMappings[]>;
  getTeamLeaderTargetSummary(teamLeadId: string): Promise<{
    currentQuarter: {
      quarter: string;
      year: number;
      minimumTarget: number;
      targetAchieved: number;
      incentiveEarned: number;
      closures: number;
    };
    allQuarters: Array<{
      quarter: string;
      year: number;
      minimumTarget: number;
      targetAchieved: number;
      incentiveEarned: number;
      closures: number;
      status: string;
    }>;
  }>;
  getRecruiterTargetSummary(recruiterId: string): Promise<{
    currentQuarter: {
      quarter: string;
      year: number;
      minimumTarget: number;
      targetAchieved: number;
      incentiveEarned: number;
      closures: number;
    };
    allQuarters: Array<{
      quarter: string;
      year: number;
      minimumTarget: number;
      targetAchieved: number;
      incentiveEarned: number;
      closures: number;
      status: string;
    }>;
  }>;
  
  // Revenue Mapping methods
  createRevenueMapping(mapping: InsertRevenueMapping): Promise<RevenueMapping>;
  getAllRevenueMappings(): Promise<RevenueMapping[]>;
  getRevenueMappingsByRecruiterId(recruiterId: string): Promise<RevenueMapping[]>;
  getRevenueMappingsByTalentAdvisorId(talentAdvisorId: string): Promise<RevenueMapping[]>;
  getRevenueMappingsByTeamLeaderId(teamLeaderId: string): Promise<RevenueMapping[]>;
  getRevenueMappingById(id: string): Promise<RevenueMapping | undefined>;
  updateRevenueMapping(id: string, updates: Partial<RevenueMapping>): Promise<RevenueMapping | undefined>;
  deleteRevenueMapping(id: string): Promise<boolean>;
  getClientById(id: string): Promise<Client | undefined>;
  
  // Recruiter Quarterly Performance methods
  getRecruiterQuarterlyPerformance(recruiterId: string): Promise<Array<{
    quarter: string;
    resumesDelivered: number;
    closures: number;
  }>>;
  getRecruiterPerformanceSummary(recruiterId: string): Promise<{
    tenure: number;
    totalClosures: number;
    totalResumesDelivered: number;
    recentClosure: string | null;
    lastClosureMonths: number;
    lastClosureDays: number;
    totalRevenue: number;
    totalIncentives: number;
  }>;
  
  // Recruiter Jobs methods
  createRecruiterJob(job: InsertRecruiterJob): Promise<RecruiterJob>;
  getAllRecruiterJobs(): Promise<RecruiterJob[]>;
  getRecruiterJobsByRecruiterId(recruiterId: string): Promise<RecruiterJob[]>;
  getRecruiterJobById(id: string): Promise<RecruiterJob | undefined>;
  updateRecruiterJob(id: string, updates: Partial<RecruiterJob>): Promise<RecruiterJob | undefined>;
  deleteRecruiterJob(id: string): Promise<boolean>;
  getRecruiterJobCounts(): Promise<{total: number, active: number, closed: number, draft: number}>;
  
  // Applicant methods (for job applications from job board and recruiter tags)
  getAllJobApplications(): Promise<JobApplication[]>;
  getJobApplicationById(id: string): Promise<JobApplication | undefined>;
  getJobApplicationsByRecruiterJobId(recruiterJobId: string): Promise<JobApplication[]>;
  getJobApplicationsByRequirementId(requirementId: string): Promise<JobApplication[]>;
  createRecruiterJobApplication(application: InsertJobApplication & { profileId: string }): Promise<JobApplication>;
  updateJobApplicationStatus(id: string, status: string): Promise<JobApplication | undefined>;
  
  // Requirement Assignment methods
  createRequirementAssignment(assignment: InsertRequirementAssignment): Promise<RequirementAssignment>;
  getRequirementAssignmentsByRecruiterId(recruiterId: string): Promise<RequirementAssignment[]>;
  getRequirementAssignmentsByTeamLeadId(teamLeadId: string): Promise<RequirementAssignment[]>;
  getRequirementAssignmentsByDate(date: string): Promise<RequirementAssignment[]>;
  getActiveRequirementAssignments(): Promise<RequirementAssignment[]>;
  updateRequirementAssignment(id: string, updates: Partial<RequirementAssignment>): Promise<RequirementAssignment | undefined>;
  
  // Resume Submission methods
  createResumeSubmission(submission: InsertResumeSubmission): Promise<ResumeSubmission>;
  getResumeSubmissionsByRecruiterId(recruiterId: string): Promise<ResumeSubmission[]>;
  getResumeSubmissionsByRequirementId(requirementId: string): Promise<ResumeSubmission[]>;
  getResumeSubmissionsByDate(date: string): Promise<ResumeSubmission[]>;
  getResumeSubmissionsCountByRecruiterAndDate(recruiterId: string, date: string): Promise<number>;
  
  // Daily Metrics Snapshot methods
  createDailyMetricsSnapshot(snapshot: InsertDailyMetricsSnapshot): Promise<DailyMetricsSnapshot>;
  getDailyMetricsSnapshot(date: string, scopeType: string, scopeId?: string): Promise<DailyMetricsSnapshot | undefined>;
  getDailyMetricsSnapshotsByDateRange(startDate: string, endDate: string, scopeType: string, scopeId?: string): Promise<DailyMetricsSnapshot[]>;
  updateDailyMetricsSnapshot(id: string, updates: Partial<DailyMetricsSnapshot>): Promise<DailyMetricsSnapshot | undefined>;
  calculateRecruiterDailyMetrics(recruiterId: string, date: string): Promise<{ delivered: number; defaulted: number; required: number; requirementCount: number }>;
  calculateTeamDailyMetrics(teamLeadId: string, date: string): Promise<{ delivered: number; defaulted: number; required: number; requirementCount: number }>;
  calculateOrgDailyMetrics(date: string): Promise<{ delivered: number; defaulted: number; required: number; requirementCount: number }>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private profiles: Map<string, Profile>;
  private jobPreferences: Map<string, JobPreferences>;
  private skills: Map<string, Skill>;
  private activities: Map<string, Activity>;
  private jobApplications: Map<string, JobApplication>;
  private savedJobs: Map<string, SavedJob>;
  private requirements: Map<string, Requirement>;
  private archivedRequirements: Map<string, ArchivedRequirement>;
  private employees: Map<string, Employee>;
  private candidates: Map<string, Candidate>;
  private candidateLoginAttempts: Map<string, CandidateLoginAttempts>;
  private otpStorage: Map<string, { otp: string; expiry: Date; email: string }>;
  private notifications: Map<string, Notification>;
  private userActivities: Map<string, UserActivity>;
  private requirementAssignments: Map<string, RequirementAssignment>;
  private resumeSubmissions: Map<string, ResumeSubmission>;
  private dailyMetricsSnapshots: Map<string, DailyMetricsSnapshot>;

  constructor() {
    this.users = new Map();
    this.profiles = new Map();
    this.jobPreferences = new Map();
    this.skills = new Map();
    this.activities = new Map();
    this.jobApplications = new Map();
    this.savedJobs = new Map();
    this.requirements = new Map();
    this.archivedRequirements = new Map();
    this.employees = new Map();
    this.candidates = new Map();
    this.candidateLoginAttempts = new Map();
    this.otpStorage = new Map();
    this.notifications = new Map();
    this.userActivities = new Map();
    this.requirementAssignments = new Map();
    this.resumeSubmissions = new Map();
    this.dailyMetricsSnapshots = new Map();
    
    // Initialize with sample data (async)
    this.initSampleData().catch(console.error);
  }

  private async initSampleData() {
    const userId = randomUUID();
    const user: User = {
      id: userId,
      username: "mathew.anderson",
      password: "password123"
    };
    this.users.set(userId, user);

    const profileId = randomUUID();
    const profile: Profile = {
      id: profileId,
      userId: userId,
      firstName: "Mathew",
      lastName: "Anderson",
      email: "mathew.and@gmail.com",
      phone: "90347 59099",
      title: "Cloud Engineer",
      location: "Chennai",
      education: "Indian Institute of Science (IISc) in Bangalore",
      portfolio: "https://www.yourwork.com",
      mobile: "90347 59099",
      whatsapp: "90347 59099",
      primaryEmail: "anderson123@gmail.com",
      secondaryEmail: "mathew.and@gmail.com",
      currentLocation: "Chennai",
      preferredLocation: "Bengaluru",
      dateOfBirth: "8-May-2000",
      portfolioUrl: "https://www.yourwork.com",
      websiteUrl: "https://www.mynetwork.com",
      linkedinUrl: "https://www.linkedin.com/in/Mathew Anderson",
      profilePicture: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=150&h=150",
      bannerImage: null,
      appliedJobsCount: "12",
      resumeFile: null,
      // Education fields
      highestQualification: "Master's Degree",
      collegeName: "Indian Institute of Science (IISc)",
      skills: "Cloud Architecture, DevOps, AWS, Docker, Kubernetes",
      // Job details fields
      pedigreeLevel: "Tier 1",
      noticePeriod: "30 days",
      currentCompany: "TechCorp Solutions",
      currentRole: "Senior Cloud Engineer",
      currentDomain: "Cloud Infrastructure",
      companyLevel: "Mid-size",
      productService: "Cloud Services"
    };
    this.profiles.set(userId, profile);

    const preferences: JobPreferences = {
      id: randomUUID(),
      profileId: profileId,
      jobTitles: "Frontend Developer, Senior Frontend developer, User Interface Engineer and UI Developer",
      workMode: "On-site • Hybrid • Remote",
      employmentType: "Full-time",
      locations: "Delhi,India - Guruguram,Haryana,India - Noida ,Uttar Prakash,India",
      startDate: "Immediately, I am actively applying",
      instructions: "Don't call me post 6 PM and Weekends\nIf i don't pick the call message me in WhatsApp"
    };
    this.jobPreferences.set(profileId, preferences);

    // Sample skills
    const primarySkills = [
      "Business Development", "International Sales", "Marketing Analysis", 
      "Digital Marketing", "Lead Generation", "SEO"
    ];
    const secondarySkills = [
      "Corporate Sales", "Customer Service", "Resource Manager", 
      "Direct sales", "Customer Interaction"
    ];
    const knowledgeSkills = [
      "Telecalling", "Sales requirement", "ILETS English communication"
    ];

    [...primarySkills, ...secondarySkills, ...knowledgeSkills].forEach((skillName, index) => {
      const skill: Skill = {
        id: randomUUID(),
        profileId: profileId,
        name: skillName,
        category: primarySkills.includes(skillName) ? "primary" : 
                 secondarySkills.includes(skillName) ? "secondary" : "knowledge"
      };
      this.skills.set(skill.id, skill);
    });

    // Sample activities
    const activities = [
      { type: "resume_update", description: "Resume Updated", date: "12-03-2025" },
      { type: "job_applied", description: "Last Job Applied", date: "12-03-2025" }
    ];

    activities.forEach(activity => {
      const act: Activity = {
        id: randomUUID(),
        profileId: profileId,
        type: activity.type,
        description: activity.description,
        date: activity.date
      };
      this.activities.set(act.id, act);
    });

    // Sample job applications
    const applications = [
      { 
        jobTitle: "UX Designer", 
        company: "Micro soft", 
        jobType: "Internship", 
        status: "In Process",
        daysAgo: "2 days",
        description: "Design user experiences for Microsoft products",
        salary: "₹ 8 LPA",
        location: "Bengaluru",
        workMode: "Work from office",
        experience: "1-2 years",
        skills: JSON.stringify(["Figma", "UI/UX", "Design"]),
        logo: null
      },
      { 
        jobTitle: "Software Designer", 
        company: "Zoho", 
        jobType: "Full-Time", 
        status: "In Process",
        daysAgo: "31 days",
        description: "Design software solutions for enterprise clients",
        salary: "₹ 12 LPA",
        location: "Chennai",
        workMode: "Work from office",
        experience: "2-4 years",
        skills: JSON.stringify(["Java", "Design Patterns", "Architecture"]),
        logo: null
      },
      { 
        jobTitle: "UX testing", 
        company: "Google", 
        jobType: "Part-Time", 
        status: "Rejected",
        daysAgo: "33 days",
        description: "Test and improve UX for Google products",
        salary: "₹ 10 LPA",
        location: "Hyderabad",
        workMode: "Remote",
        experience: "1-3 years",
        skills: JSON.stringify(["Testing", "UX", "Analytics"]),
        logo: null
      },
      { 
        jobTitle: "Software Designer", 
        company: "Unity", 
        jobType: "Full-Time", 
        status: "In Process",
        daysAgo: "40 days",
        description: "Design game engines and tools",
        salary: "₹ 15 LPA",
        location: "Bengaluru",
        workMode: "Hybrid",
        experience: "3-5 years",
        skills: JSON.stringify(["C++", "Graphics", "Unity"]),
        logo: null
      },
      { 
        jobTitle: "Software Designer", 
        company: "Zoho", 
        jobType: "Internship", 
        status: "In Process",
        daysAgo: "38 days",
        description: "Internship in software design",
        salary: "₹ 5 LPA",
        location: "Chennai",
        workMode: "Work from office",
        experience: "0-1 years",
        skills: JSON.stringify(["Java", "OOP", "Design"]),
        logo: null
      }
    ];

    applications.forEach(app => {
      const application: JobApplication = {
        id: randomUUID(),
        profileId: profileId,
        jobTitle: app.jobTitle,
        company: app.company,
        jobType: app.jobType,
        status: app.status,
        appliedDate: "12-03-2025",
        daysAgo: app.daysAgo,
        description: app.description,
        salary: app.salary,
        location: app.location,
        workMode: app.workMode,
        experience: app.experience,
        skills: app.skills,
        logo: app.logo
      };
      this.jobApplications.set(application.id, application);
    });

    // Sample requirements data
    const sampleRequirements = [
      { position: "Mobile App Developer", criticality: "HIGH", toughness: "Tough", company: "Tesco", spoc: "Mel Gibson", talentAdvisor: "Mel Gibson", teamLead: "Arun" },
      { position: "Backend Developer", criticality: "LOW", toughness: "Easy", company: "CodeLabs", spoc: "Robert Kim", talentAdvisor: "Robert Kim", teamLead: "Arun" },
      { position: "Frontend Developer", criticality: "MEDIUM", toughness: "Medium", company: "TechCorp", spoc: "David Wilson", talentAdvisor: "Unassigned", teamLead: "Arun" },
      { position: "QA Tester", criticality: "HIGH", toughness: "Easy", company: "AppLogic", spoc: "Kevin Brown", talentAdvisor: "Unassigned", teamLead: "Unassigned" },
      { position: "Mobile App Developer", criticality: "MEDIUM", toughness: "Medium", company: "Tesco", spoc: "Mel Gibson", talentAdvisor: "Mel Gibson", teamLead: "Arun" },
      { position: "Backend Developer", criticality: "LOW", toughness: "Tough", company: "CodeLabs", spoc: "Robert Kim", talentAdvisor: "Robert Kim", teamLead: "Arun" },
      { position: "UI/UX Designer", criticality: "MEDIUM", toughness: "Easy", company: "Designify", spoc: "Tom Anderson", talentAdvisor: "Unassigned", teamLead: "Anusha" },
      { position: "Frontend Developer", criticality: "HIGH", toughness: "Medium", company: "TechCorp", spoc: "David Wilson", talentAdvisor: "Unassigned", teamLead: "Arun" },
      { position: "UI/UX Designer", criticality: "MEDIUM", toughness: "Tough", company: "Designify", spoc: "Tom Anderson", talentAdvisor: "Unassigned", teamLead: "Anusha" },
      { position: "QA Tester", criticality: "MEDIUM", toughness: "Easy", company: "AppLogic", spoc: "Kevin Brown", talentAdvisor: "Unassigned", teamLead: "Unassigned" }
    ];

    sampleRequirements.forEach(req => {
      const requirement: Requirement = {
        id: randomUUID(),
        position: req.position,
        criticality: req.criticality,
        toughness: req.toughness,
        company: req.company,
        spoc: req.spoc,
        talentAdvisor: req.talentAdvisor,
        teamLead: req.teamLead,
        status: "open",
        completedAt: null,
        isArchived: false,
        createdAt: new Date().toISOString()
      };
      this.requirements.set(requirement.id, requirement);
    });

    // Sample employee data
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
        reportingTo: "Team Lead"
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
        reportingTo: "Admin"
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

    // Hash passwords and create sample employees
    const saltRounds = 10;
    for (const emp of sampleEmployees) {
      const hashedPassword = await bcrypt.hash(emp.password, saltRounds);
      const employee: Employee = {
        id: randomUUID(),
        employeeId: emp.employeeId,
        name: emp.name,
        email: emp.email,
        password: hashedPassword, // Store hashed password
        role: emp.role,
        age: emp.age,
        phone: emp.phone,
        department: emp.department,
        joiningDate: emp.joiningDate,
        reportingTo: emp.reportingTo,
        isActive: true,
        createdAt: new Date().toISOString()
      };
      this.employees.set(employee.id, employee);
    }

    // Create test candidate
    const testCandidateId = randomUUID();
    const candidatePassword = await bcrypt.hash("test123", saltRounds);
    const testCandidate: Candidate = {
      id: testCandidateId,
      candidateId: "STCA001",
      fullName: "John Doe",
      email: "john@example.com",
      password: candidatePassword,
      phone: "9876543210",
      company: "Tech Solutions Inc",
      designation: "Software Engineer",
      age: "28",
      location: "Bangalore",
      experience: "5 years",
      skills: "JavaScript, React, Node.js, TypeScript, AWS",
      isActive: true,
      isVerified: true,
      createdAt: new Date().toISOString()
    };
    this.candidates.set(testCandidate.id, testCandidate);

    // Create test candidate profile
    const testProfileId = randomUUID();
    const testProfile: Profile = {
      id: testProfileId,
      userId: null,
      candidateId: "STCA001",
      firstName: "John",
      lastName: "Doe",
      experience: "5 years",
      designation: "Software Engineer",
      currentLocation: "Bangalore",
      preferredLocation: "Bangalore, Hyderabad",
      skills: "JavaScript, React, Node.js, TypeScript, AWS",
      education: "B.Tech Computer Science",
      portfolio: null,
      mobile: "9876543210",
      whatsapp: "9876543210",
      primaryEmail: "john@example.com",
      secondaryEmail: null,
      dateOfBirth: "1996-01-15",
      portfolioUrl: null,
      websiteUrl: null,
      linkedinUrl: "https://linkedin.com/in/johndoe",
      profilePicture: null,
      bannerImage: null,
      appliedJobsCount: "5",
      githubUrl: null,
      resumeUrl: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.profiles.set(testProfile.id, testProfile);

    // Create test job applications for the candidate
    const testApplications = [
      { 
        jobTitle: "Frontend Developer", 
        company: "Tech Corp", 
        jobType: "Full-Time", 
        status: "In Process",
        daysAgo: "3 days",
        description: "Build amazing user experiences with React",
        salary: "₹ 15 LPA",
        location: "Bengaluru",
        workMode: "Work from office",
        experience: "3-5 years",
        skills: JSON.stringify(["React", "TypeScript", "CSS"]),
        logo: null
      },
      { 
        jobTitle: "React Developer", 
        company: "Innovate Labs", 
        jobType: "Full-Time", 
        status: "In Process",
        daysAgo: "7 days",
        description: "Join our innovative team building cutting-edge products",
        salary: "₹ 12 LPA",
        location: "Mumbai",
        workMode: "Hybrid",
        experience: "2-4 years",
        skills: JSON.stringify(["React", "Node.js", "MongoDB"]),
        logo: null
      },
      { 
        jobTitle: "Full Stack Developer", 
        company: "StartupXYZ", 
        jobType: "Full-Time", 
        status: "Rejected",
        daysAgo: "12 days",
        description: "Build end-to-end solutions for our platform",
        salary: "₹ 18 LPA",
        location: "Delhi",
        workMode: "Remote",
        experience: "4-6 years",
        skills: JSON.stringify(["React", "Node.js", "PostgreSQL"]),
        logo: null
      },
      { 
        jobTitle: "Node.js Developer", 
        company: "CloudTech", 
        jobType: "Full-Time", 
        status: "In Process",
        daysAgo: "18 days",
        description: "Develop scalable backend services",
        salary: "₹ 14 LPA",
        location: "Hyderabad",
        workMode: "Work from office",
        experience: "3-5 years",
        skills: JSON.stringify(["Node.js", "Express", "AWS"]),
        logo: null
      },
      { 
        jobTitle: "Senior Developer", 
        company: "Enterprise Inc", 
        jobType: "Full-Time", 
        status: "In Process",
        daysAgo: "25 days",
        description: "Lead development of enterprise applications",
        salary: "₹ 20 LPA",
        location: "Pune",
        workMode: "Hybrid",
        experience: "5-7 years",
        skills: JSON.stringify(["Java", "Spring", "Microservices"]),
        logo: null
      }
    ];

    testApplications.forEach(app => {
      const application: JobApplication = {
        id: randomUUID(),
        profileId: testProfileId,
        jobTitle: app.jobTitle,
        company: app.company,
        jobType: app.jobType,
        status: app.status,
        appliedDate: new Date().toISOString().split('T')[0],
        daysAgo: app.daysAgo,
        description: app.description,
        salary: app.salary,
        location: app.location,
        workMode: app.workMode,
        experience: app.experience,
        skills: app.skills,
        logo: app.logo
      };
      this.jobApplications.set(application.id, application);
    });
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getProfile(userId: string): Promise<Profile | undefined> {
    return Array.from(this.profiles.values()).find(profile => profile.userId === userId);
  }

  async createProfile(insertProfile: InsertProfile): Promise<Profile> {
    const id = randomUUID();
    const profile: Profile = { 
      ...insertProfile, 
      id,
      education: insertProfile.education || null,
      portfolio: insertProfile.portfolio || null,
      mobile: insertProfile.mobile || null,
      whatsapp: insertProfile.whatsapp || null,
      primaryEmail: insertProfile.primaryEmail || null,
      secondaryEmail: insertProfile.secondaryEmail || null,
      currentLocation: insertProfile.currentLocation || null,
      preferredLocation: insertProfile.preferredLocation || null,
      dateOfBirth: insertProfile.dateOfBirth || null,
      portfolioUrl: insertProfile.portfolioUrl || null,
      websiteUrl: insertProfile.websiteUrl || null,
      linkedinUrl: insertProfile.linkedinUrl || null,
      profilePicture: insertProfile.profilePicture || null,
      bannerImage: insertProfile.bannerImage || null,
      appliedJobsCount: insertProfile.appliedJobsCount || null,
      resumeFile: insertProfile.resumeFile || null,
      // Education fields
      highestQualification: insertProfile.highestQualification || null,
      collegeName: insertProfile.collegeName || null,
      skills: insertProfile.skills || null,
      // Job details fields
      pedigreeLevel: insertProfile.pedigreeLevel || null,
      noticePeriod: insertProfile.noticePeriod || null,
      currentCompany: insertProfile.currentCompany || null,
      currentRole: insertProfile.currentRole || null,
      currentDomain: insertProfile.currentDomain || null,
      companyLevel: insertProfile.companyLevel || null,
      productService: insertProfile.productService || null
    };
    this.profiles.set(profile.userId, profile);
    return profile;
  }

  async updateProfile(userId: string, updates: Partial<Profile>): Promise<Profile | undefined> {
    const profile = Array.from(this.profiles.values()).find(p => p.userId === userId);
    if (!profile) return undefined;
    
    const updatedProfile = { ...profile, ...updates };
    this.profiles.set(userId, updatedProfile);
    return updatedProfile;
  }

  async getJobPreferences(profileId: string): Promise<JobPreferences | undefined> {
    return this.jobPreferences.get(profileId);
  }

  async createJobPreferences(insertPreferences: InsertJobPreferences): Promise<JobPreferences> {
    const id = randomUUID();
    const preferences: JobPreferences = { 
      ...insertPreferences, 
      id,
      instructions: insertPreferences.instructions || null
    };
    this.jobPreferences.set(preferences.profileId, preferences);
    return preferences;
  }

  async updateJobPreferences(profileId: string, updates: Partial<JobPreferences>): Promise<JobPreferences | undefined> {
    const preferences = this.jobPreferences.get(profileId);
    if (!preferences) return undefined;
    
    const updatedPreferences = { ...preferences, ...updates };
    this.jobPreferences.set(profileId, updatedPreferences);
    return updatedPreferences;
  }

  async getSkillsByProfile(profileId: string): Promise<Skill[]> {
    return Array.from(this.skills.values()).filter(skill => skill.profileId === profileId);
  }

  async createSkill(insertSkill: InsertSkill): Promise<Skill> {
    const id = randomUUID();
    const skill: Skill = { ...insertSkill, id };
    this.skills.set(id, skill);
    return skill;
  }

  async updateSkillsByProfile(profileId: string, newSkills: InsertSkill[]): Promise<Skill[]> {
    // Remove existing skills for this profile
    const existingSkills = Array.from(this.skills.entries()).filter(([_, skill]) => skill.profileId === profileId);
    existingSkills.forEach(([id]) => this.skills.delete(id));
    
    // Add new skills
    const skills: Skill[] = [];
    for (const skillData of newSkills) {
      const skill = await this.createSkill(skillData);
      skills.push(skill);
    }
    return skills;
  }

  async getActivitiesByProfile(profileId: string): Promise<Activity[]> {
    return Array.from(this.activities.values()).filter(activity => activity.profileId === profileId);
  }

  async createActivity(insertActivity: InsertActivity): Promise<Activity> {
    const id = randomUUID();
    const activity: Activity = { ...insertActivity, id };
    this.activities.set(id, activity);
    return activity;
  }

  async getJobApplicationsByProfile(profileId: string): Promise<JobApplication[]> {
    return Array.from(this.jobApplications.values()).filter(app => app.profileId === profileId);
  }

  async createJobApplication(insertApplication: InsertJobApplication): Promise<JobApplication> {
    const id = randomUUID();
    const application: JobApplication = { ...insertApplication, id };
    this.jobApplications.set(id, application);
    return application;
  }

  async getJobApplicationById(id: string): Promise<JobApplication | undefined> {
    return this.jobApplications.get(id);
  }

  async getSavedJobsByProfile(profileId: string): Promise<SavedJob[]> {
    return Array.from(this.savedJobs.values()).filter(
      job => job.profileId === profileId
    );
  }

  async createSavedJob(savedJob: InsertSavedJob): Promise<SavedJob> {
    const id = randomUUID();
    const newSavedJob: SavedJob = {
      ...savedJob,
      id,
      salary: savedJob.salary || null,
    };
    this.savedJobs.set(id, newSavedJob);
    return newSavedJob;
  }

  async removeSavedJob(profileId: string, jobTitle: string, company: string): Promise<boolean> {
    const savedJobsArray = Array.from(this.savedJobs.entries());
    const jobToRemove = savedJobsArray.find(([, job]) => 
      job.profileId === profileId && 
      job.jobTitle === jobTitle && 
      job.company === company
    );
    
    if (jobToRemove) {
      this.savedJobs.delete(jobToRemove[0]);
      return true;
    }
    return false;
  }

  // Requirements methods implementation
  async getRequirements(): Promise<Requirement[]> {
    return Array.from(this.requirements.values()).filter(req => !req.isArchived);
  }

  async getRequirementsByTeamLead(teamLeadName: string): Promise<Requirement[]> {
    return Array.from(this.requirements.values()).filter(req => 
      !req.isArchived && req.teamLead === teamLeadName
    );
  }

  async getRequirementsByTalentAdvisor(talentAdvisorName: string): Promise<Requirement[]> {
    return Array.from(this.requirements.values()).filter(req => 
      !req.isArchived && req.talentAdvisor === talentAdvisorName
    );
  }

  async getRequirementsByTalentAdvisorId(talentAdvisorId: string): Promise<Requirement[]> {
    return Array.from(this.requirements.values()).filter(req => 
      !req.isArchived && req.talentAdvisorId === talentAdvisorId
    );
  }

  async createRequirement(insertRequirement: InsertRequirement): Promise<Requirement> {
    const id = randomUUID();
    const requirement: Requirement = {
      ...insertRequirement,
      id,
      talentAdvisor: insertRequirement.talentAdvisor || null,
      teamLead: insertRequirement.teamLead || null,
      isArchived: false,
      createdAt: new Date().toISOString()
    };
    this.requirements.set(id, requirement);
    return requirement;
  }

  async updateRequirement(id: string, updates: Partial<Requirement>): Promise<Requirement | undefined> {
    const existing = this.requirements.get(id);
    if (!existing) return undefined;
    
    const updated: Requirement = { ...existing, ...updates };
    this.requirements.set(id, updated);
    return updated;
  }

  async archiveRequirement(id: string): Promise<ArchivedRequirement | undefined> {
    const requirement = this.requirements.get(id);
    if (!requirement) return undefined;

    // Create archived version
    const archivedId = randomUUID();
    const archived: ArchivedRequirement = {
      id: archivedId,
      position: requirement.position,
      criticality: requirement.criticality,
      toughness: requirement.toughness,
      company: requirement.company,
      spoc: requirement.spoc,
      talentAdvisor: requirement.talentAdvisor,
      teamLead: requirement.teamLead,
      archivedAt: new Date().toISOString(),
      originalId: requirement.id
    };

    this.archivedRequirements.set(archivedId, archived);
    
    // Mark original as archived
    const updated = { ...requirement, isArchived: true };
    this.requirements.set(id, updated);
    
    return archived;
  }

  async getArchivedRequirements(): Promise<ArchivedRequirement[]> {
    return Array.from(this.archivedRequirements.values());
  }

  // Employee methods implementation
  async getEmployeeByEmail(email: string): Promise<Employee | undefined> {
    return Array.from(this.employees.values()).find(emp => emp.email === email);
  }

  async getEmployeeByEmployeeId(employeeId: string): Promise<Employee | undefined> {
    return Array.from(this.employees.values()).find(emp => emp.employeeId === employeeId);
  }

  async createEmployee(insertEmployee: InsertEmployee): Promise<Employee> {
    const id = randomUUID();
    
    // Hash password before storing
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(insertEmployee.password, saltRounds);
    
    const employee: Employee = {
      ...insertEmployee,
      id,
      password: hashedPassword, // Store hashed password
      phone: insertEmployee.phone || null,
      department: insertEmployee.department || null,
      joiningDate: insertEmployee.joiningDate || null,
      reportingTo: insertEmployee.reportingTo || null,
      isActive: insertEmployee.isActive ?? true,
      createdAt: new Date().toISOString()
    };
    this.employees.set(id, employee);
    return employee;
  }

  async getAllEmployees(): Promise<Employee[]> {
    return Array.from(this.employees.values()).filter(emp => emp.isActive);
  }

  async updateEmployee(id: string, updates: Partial<Employee>): Promise<Employee | undefined> {
    const existing = this.employees.get(id);
    if (!existing) return undefined;
    
    const updated: Employee = { ...existing, ...updates };
    this.employees.set(id, updated);
    return updated;
  }

  async deleteEmployee(id: string): Promise<boolean> {
    const employee = this.employees.get(id);
    if (!employee) return false;
    
    // Soft delete by setting isActive to false
    const updated = { ...employee, isActive: false };
    this.employees.set(id, updated);
    return true;
  }

  async generateNextEmployeeId(role: string): Promise<string> {
    const allEmployees = Array.from(this.employees.values());
    
    // Use uniform "SCE" prefix for all employees
    const prefix = 'SCE';

    // Find the highest ID number for SCE prefix
    let maxNumber = 0;
    for (const employee of allEmployees) {
      if (employee.employeeId.startsWith(prefix)) {
        const match = employee.employeeId.match(/SCE(\d+)/);
        if (match) {
          const number = parseInt(match[1]);
          if (number > maxNumber) {
            maxNumber = number;
          }
        }
      }
    }
    
    const nextNumber = maxNumber + 1;
    return `${prefix}${nextNumber.toString().padStart(3, '0')}`;
  }

  // Candidate methods using in-memory storage
  async getCandidateByEmail(email: string): Promise<Candidate | undefined> {
    const candidatesList = Array.from(this.candidates.values());
    for (const candidate of candidatesList) {
      if (candidate.email === email) {
        return candidate;
      }
    }
    return undefined;
  }

  async getCandidateByCandidateId(candidateId: string): Promise<Candidate | undefined> {
    const candidatesList = Array.from(this.candidates.values());
    for (const candidate of candidatesList) {
      if (candidate.candidateId === candidateId) {
        return candidate;
      }
    }
    return undefined;
  }

  async createCandidate(candidate: InsertCandidate): Promise<Candidate> {
    const id = randomUUID();
    const candidateId = candidate.candidateId || await this.generateNextCandidateId();
    const hashedPassword = await bcrypt.hash(candidate.password, 10);
    
    const newCandidate: Candidate = {
      id,
      candidateId,
      fullName: candidate.fullName,
      email: candidate.email,
      password: hashedPassword,
      phone: candidate.phone || null,
      company: candidate.company || null,
      designation: candidate.designation || null,
      age: candidate.age || null,
      location: candidate.location || null,
      experience: candidate.experience || null,
      skills: candidate.skills || null,
      isActive: candidate.isActive ?? true,
      isVerified: candidate.isVerified ?? false,
      createdAt: candidate.createdAt || new Date().toISOString()
    };
    
    this.candidates.set(id, newCandidate);
    return newCandidate;
  }

  async getAllCandidates(): Promise<Candidate[]> {
    return Array.from(this.candidates.values()).filter(candidate => candidate.isActive);
  }

  async updateCandidate(id: string, updates: Partial<Candidate>): Promise<Candidate | undefined> {
    const existing = this.candidates.get(id);
    if (!existing) return undefined;
    
    const updated: Candidate = { ...existing, ...updates };
    this.candidates.set(id, updated);
    return updated;
  }

  async deleteCandidate(id: string): Promise<boolean> {
    const candidate = this.candidates.get(id);
    if (!candidate) return false;
    
    // Soft delete by setting isActive to false
    const updated = { ...candidate, isActive: false };
    this.candidates.set(id, updated);
    return true;
  }

  async generateNextCandidateId(): Promise<string> {
    const allCandidates = Array.from(this.candidates.values());
    
    if (allCandidates.length === 0) {
      return "STCA001";
    }

    // Find the highest ID number
    let maxNumber = 0;
    for (const candidate of allCandidates) {
      const match = candidate.candidateId.match(/STCA(\d+)/);
      if (match) {
        const number = parseInt(match[1]);
        if (number > maxNumber) {
          maxNumber = number;
        }
      }
    }
    
    const nextNumber = maxNumber + 1;
    return `STCA${nextNumber.toString().padStart(3, '0')}`;
  }

  // Login attempt tracking methods using in-memory storage
  async getLoginAttempts(email: string): Promise<CandidateLoginAttempts | undefined> {
    return this.candidateLoginAttempts.get(email);
  }

  async createOrUpdateLoginAttempts(attempts: InsertCandidateLoginAttempts): Promise<CandidateLoginAttempts> {
    const existing = this.candidateLoginAttempts.get(attempts.email);
    
    if (existing) {
      // Update existing record
      const updated: CandidateLoginAttempts = {
        ...existing,
        attempts: attempts.attempts || existing.attempts,
        lastAttemptAt: attempts.lastAttemptAt || existing.lastAttemptAt,
        lockedUntil: attempts.lockedUntil || existing.lockedUntil
      };
      this.candidateLoginAttempts.set(attempts.email, updated);
      return updated;
    } else {
      // Create new record
      const id = randomUUID();
      const newRecord: CandidateLoginAttempts = {
        id,
        email: attempts.email,
        attempts: attempts.attempts || "0",
        lastAttemptAt: attempts.lastAttemptAt || null,
        lockedUntil: attempts.lockedUntil || null,
        createdAt: attempts.createdAt || new Date().toISOString()
      };
      this.candidateLoginAttempts.set(attempts.email, newRecord);
      return newRecord;
    }
  }

  async resetLoginAttempts(email: string): Promise<boolean> {
    const existing = this.candidateLoginAttempts.get(email);
    if (!existing) return false;
    
    const updated: CandidateLoginAttempts = {
      ...existing,
      attempts: "0",
      lastAttemptAt: null,
      lockedUntil: null
    };
    this.candidateLoginAttempts.set(email, updated);
    return true;
  }

  // OTP storage methods for verification
  async storeOTP(email: string, otp: string): Promise<void> {
    const expiry = new Date();
    expiry.setMinutes(expiry.getMinutes() + 10); // 10 minutes expiry
    this.otpStorage.set(email, { otp, expiry, email });
  }

  async verifyOTP(email: string, otp: string): Promise<boolean> {
    const stored = this.otpStorage.get(email);
    if (!stored) return false;
    
    if (new Date() > stored.expiry) {
      this.otpStorage.delete(email);
      return false;
    }
    
    if (stored.otp === otp) {
      this.otpStorage.delete(email);
      return true;
    }
    
    return false;
  }

  async updateEmployeePassword(email: string, newPasswordHash: string): Promise<boolean> {
    // Find employee by email
    const employee = Array.from(this.employees.values()).find(emp => emp.email === email);
    if (!employee) return false;
    
    // Update password
    const updated: Employee = { ...employee, password: newPasswordHash };
    this.employees.set(employee.id, updated);
    return true;
  }

  async updateCandidatePassword(email: string, newPasswordHash: string): Promise<boolean> {
    // Find candidate by email
    const candidate = Array.from(this.candidates.values()).find(cand => cand.email === email);
    if (!candidate) return false;
    
    // Update password
    const updated: Candidate = { ...candidate, password: newPasswordHash };
    this.candidates.set(candidate.id, updated);
    return true;
  }

  async getCandidateCounts(): Promise<{total: number, active: number, inactive: number}> {
    const allCandidates = Array.from(this.candidates.values());
    const total = allCandidates.length;
    const active = allCandidates.filter(c => c.isActive).length;
    const inactive = allCandidates.filter(c => !c.isActive).length;
    return { total, active, inactive };
  }

  // Notification methods
  async createNotification(notification: InsertNotification): Promise<Notification> {
    const id = randomUUID();
    const newNotification: Notification = {
      id,
      userId: notification.userId,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      status: notification.status || "unread",
      relatedJobId: notification.relatedJobId || null,
      createdAt: notification.createdAt,
      readAt: notification.readAt || null
    };
    this.notifications.set(id, newNotification);
    return newNotification;
  }

  async getNotificationsByUserId(userId: string): Promise<Notification[]> {
    return Array.from(this.notifications.values()).filter(notification => notification.userId === userId);
  }

  async markNotificationAsRead(id: string): Promise<Notification | undefined> {
    const existing = this.notifications.get(id);
    if (!existing) return undefined;
    
    const updated: Notification = { ...existing, status: "read", readAt: new Date().toISOString() };
    this.notifications.set(id, updated);
    return updated;
  }

  async deleteNotification(id: string): Promise<boolean> {
    return this.notifications.delete(id);
  }

  // User Activity methods
  async createUserActivity(activity: InsertUserActivity): Promise<UserActivity> {
    const id = randomUUID();
    const newActivity: UserActivity = {
      id,
      actorId: activity.actorId,
      actorName: activity.actorName,
      actorRole: activity.actorRole,
      type: activity.type,
      title: activity.title,
      description: activity.description,
      targetRole: activity.targetRole || null,
      relatedId: activity.relatedId || null,
      relatedType: activity.relatedType || null,
      createdAt: activity.createdAt
    };
    this.userActivities.set(id, newActivity);
    return newActivity;
  }

  async getUserActivities(role: string, limit: number = 5): Promise<UserActivity[]> {
    const activities = Array.from(this.userActivities.values())
      .filter(activity => {
        // Show to the specified role or if targetRole includes the role or is null (visible to all)
        if (!activity.targetRole) return true;
        return activity.targetRole.includes(role) || activity.targetRole === 'all';
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
    return activities;
  }

  // Client methods (stub - not implemented in MemStorage)
  async generateNextClientCode(): Promise<string> {
    throw new Error("Client methods not implemented in MemStorage. Use DatabaseStorage.");
  }

  async createClient(client: InsertClient): Promise<Client> {
    throw new Error("Client methods not implemented in MemStorage. Use DatabaseStorage.");
  }

  async getAllClients(): Promise<Client[]> {
    throw new Error("Client methods not implemented in MemStorage. Use DatabaseStorage.");
  }

  async getClientByClientCode(clientCode: string): Promise<Client | undefined> {
    throw new Error("Client methods not implemented in MemStorage. Use DatabaseStorage.");
  }

  async updateClient(id: string, updates: Partial<Client>): Promise<Client | undefined> {
    throw new Error("Client methods not implemented in MemStorage. Use DatabaseStorage.");
  }

  async deleteClient(id: string): Promise<boolean> {
    throw new Error("Client methods not implemented in MemStorage. Use DatabaseStorage.");
  }

  // Client-specific data methods (for client dashboard)
  async getRequirementsByCompany(companyName: string): Promise<Requirement[]> {
    return Array.from(this.requirements.values()).filter(r => 
      r.company.toLowerCase() === companyName.toLowerCase()
    );
  }

  async getJobApplicationsByCompany(companyName: string): Promise<JobApplication[]> {
    return Array.from(this.jobApplications.values()).filter(app => 
      app.company.toLowerCase() === companyName.toLowerCase()
    );
  }

  async getRevenueMappingsByClientName(clientName: string): Promise<RevenueMapping[]> {
    throw new Error("Revenue Mapping methods not implemented in MemStorage. Use DatabaseStorage.");
  }

  async getClientDashboardStats(companyName: string): Promise<{
    rolesAssigned: number;
    totalPositions: number;
    activeRoles: number;
    successfulHires: number;
    pausedRoles: number;
    withdrawnRoles: number;
  }> {
    const requirements = await this.getRequirementsByCompany(companyName);
    const activeRoles = requirements.filter(r => r.status === 'open' || r.status === 'in_progress').length;
    const completedRoles = requirements.filter(r => r.status === 'completed').length;
    
    return {
      rolesAssigned: requirements.length,
      totalPositions: requirements.length,
      activeRoles,
      successfulHires: completedRoles,
      pausedRoles: 0,
      withdrawnRoles: 0
    };
  }

  async getClientPipelineData(companyName: string): Promise<any[]> {
    const applications = await this.getJobApplicationsByCompany(companyName);
    return applications;
  }

  // Impact Metrics methods (stub - not implemented in MemStorage)
  async createImpactMetrics(metrics: InsertImpactMetrics): Promise<ImpactMetrics> {
    throw new Error("Impact Metrics methods not implemented in MemStorage. Use DatabaseStorage.");
  }

  async getImpactMetrics(clientId?: string): Promise<ImpactMetrics | undefined> {
    throw new Error("Impact Metrics methods not implemented in MemStorage. Use DatabaseStorage.");
  }

  async getAllImpactMetrics(): Promise<ImpactMetrics[]> {
    throw new Error("Impact Metrics methods not implemented in MemStorage. Use DatabaseStorage.");
  }

  async updateImpactMetrics(id: string, updates: Partial<ImpactMetrics>): Promise<ImpactMetrics | undefined> {
    throw new Error("Impact Metrics methods not implemented in MemStorage. Use DatabaseStorage.");
  }

  async deleteImpactMetrics(id: string): Promise<boolean> {
    throw new Error("Impact Metrics methods not implemented in MemStorage. Use DatabaseStorage.");
  }

  // Requirement Assignment methods
  async createRequirementAssignment(assignment: InsertRequirementAssignment): Promise<RequirementAssignment> {
    const id = randomUUID();
    const newAssignment: RequirementAssignment = {
      id,
      requirementId: assignment.requirementId,
      recruiterId: assignment.recruiterId,
      recruiterName: assignment.recruiterName,
      teamLeadId: assignment.teamLeadId || null,
      teamLeadName: assignment.teamLeadName || null,
      assignedDate: assignment.assignedDate,
      dueDate: assignment.dueDate || null,
      status: assignment.status || "active",
      createdAt: new Date().toISOString()
    };
    this.requirementAssignments.set(id, newAssignment);
    return newAssignment;
  }

  async getRequirementAssignmentsByRecruiterId(recruiterId: string): Promise<RequirementAssignment[]> {
    return Array.from(this.requirementAssignments.values()).filter(a => a.recruiterId === recruiterId);
  }

  async getRequirementAssignmentsByTeamLeadId(teamLeadId: string): Promise<RequirementAssignment[]> {
    return Array.from(this.requirementAssignments.values()).filter(a => a.teamLeadId === teamLeadId);
  }

  async getRequirementAssignmentsByDate(date: string): Promise<RequirementAssignment[]> {
    return Array.from(this.requirementAssignments.values()).filter(a => a.assignedDate === date);
  }

  async getActiveRequirementAssignments(): Promise<RequirementAssignment[]> {
    return Array.from(this.requirementAssignments.values()).filter(a => a.status === "active");
  }

  async updateRequirementAssignment(id: string, updates: Partial<RequirementAssignment>): Promise<RequirementAssignment | undefined> {
    const existing = this.requirementAssignments.get(id);
    if (!existing) return undefined;
    const updated: RequirementAssignment = { ...existing, ...updates };
    this.requirementAssignments.set(id, updated);
    return updated;
  }

  // Resume Submission methods
  async createResumeSubmission(submission: InsertResumeSubmission): Promise<ResumeSubmission> {
    const id = randomUUID();
    const newSubmission: ResumeSubmission = {
      id,
      requirementId: submission.requirementId,
      assignmentId: submission.assignmentId || null,
      recruiterId: submission.recruiterId,
      recruiterName: submission.recruiterName,
      candidateId: submission.candidateId || null,
      candidateName: submission.candidateName,
      candidateEmail: submission.candidateEmail || null,
      submittedAt: submission.submittedAt,
      status: submission.status || "submitted",
      notes: submission.notes || null,
      createdAt: new Date().toISOString()
    };
    this.resumeSubmissions.set(id, newSubmission);
    return newSubmission;
  }

  async getResumeSubmissionsByRecruiterId(recruiterId: string): Promise<ResumeSubmission[]> {
    return Array.from(this.resumeSubmissions.values()).filter(s => s.recruiterId === recruiterId);
  }

  async getResumeSubmissionsByRequirementId(requirementId: string): Promise<ResumeSubmission[]> {
    return Array.from(this.resumeSubmissions.values()).filter(s => s.requirementId === requirementId);
  }

  async getResumeSubmissionsByDate(date: string): Promise<ResumeSubmission[]> {
    return Array.from(this.resumeSubmissions.values()).filter(s => s.submittedAt.startsWith(date));
  }

  async getResumeSubmissionsCountByRecruiterAndDate(recruiterId: string, date: string): Promise<number> {
    return Array.from(this.resumeSubmissions.values())
      .filter(s => s.recruiterId === recruiterId && s.submittedAt.startsWith(date))
      .length;
  }

  // Daily Metrics Snapshot methods
  async createDailyMetricsSnapshot(snapshot: InsertDailyMetricsSnapshot): Promise<DailyMetricsSnapshot> {
    const id = randomUUID();
    const newSnapshot: DailyMetricsSnapshot = {
      id,
      date: snapshot.date,
      scopeType: snapshot.scopeType,
      scopeId: snapshot.scopeId || null,
      scopeName: snapshot.scopeName || null,
      delivered: snapshot.delivered ?? 0,
      defaulted: snapshot.defaulted ?? 0,
      requirementCount: snapshot.requirementCount ?? 0,
      createdAt: new Date().toISOString(),
      updatedAt: snapshot.updatedAt || null
    };
    this.dailyMetricsSnapshots.set(id, newSnapshot);
    return newSnapshot;
  }

  async getDailyMetricsSnapshot(date: string, scopeType: string, scopeId?: string): Promise<DailyMetricsSnapshot | undefined> {
    return Array.from(this.dailyMetricsSnapshots.values()).find(s => 
      s.date === date && s.scopeType === scopeType && (scopeId ? s.scopeId === scopeId : !s.scopeId)
    );
  }

  async getDailyMetricsSnapshotsByDateRange(startDate: string, endDate: string, scopeType: string, scopeId?: string): Promise<DailyMetricsSnapshot[]> {
    return Array.from(this.dailyMetricsSnapshots.values()).filter(s => 
      s.date >= startDate && s.date <= endDate && 
      s.scopeType === scopeType && 
      (scopeId ? s.scopeId === scopeId : !s.scopeId)
    );
  }

  async updateDailyMetricsSnapshot(id: string, updates: Partial<DailyMetricsSnapshot>): Promise<DailyMetricsSnapshot | undefined> {
    const existing = this.dailyMetricsSnapshots.get(id);
    if (!existing) return undefined;
    const updated: DailyMetricsSnapshot = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    this.dailyMetricsSnapshots.set(id, updated);
    return updated;
  }

  async calculateRecruiterDailyMetrics(recruiterId: string, date: string): Promise<{ delivered: number; defaulted: number; required: number; requirementCount: number }> {
    const assignments = Array.from(this.requirementAssignments.values())
      .filter(a => a.recruiterId === recruiterId && a.status === "active");
    
    let required = 0;
    for (const assignment of assignments) {
      const requirement = this.requirements.get(assignment.requirementId);
      if (requirement) {
        required += getResumeTarget(requirement.criticality, requirement.toughness);
      }
    }
    
    const delivered = await this.getResumeSubmissionsCountByRecruiterAndDate(recruiterId, date);
    const defaulted = Math.max(0, required - delivered);
    
    return { delivered, defaulted, required, requirementCount: assignments.length };
  }

  async calculateTeamDailyMetrics(teamLeadId: string, date: string): Promise<{ delivered: number; defaulted: number; required: number; requirementCount: number }> {
    const teamMembers = Array.from(this.employees.values())
      .filter(e => e.reportingTo === teamLeadId || e.id === teamLeadId);
    
    let totalDelivered = 0;
    let totalRequired = 0;
    let totalRequirements = 0;
    
    for (const member of teamMembers) {
      const metrics = await this.calculateRecruiterDailyMetrics(member.id, date);
      totalDelivered += metrics.delivered;
      totalRequired += metrics.required;
      totalRequirements += metrics.requirementCount;
    }
    
    const totalDefaulted = Math.max(0, totalRequired - totalDelivered);
    
    return { delivered: totalDelivered, defaulted: totalDefaulted, required: totalRequired, requirementCount: totalRequirements };
  }

  async calculateOrgDailyMetrics(date: string): Promise<{ delivered: number; defaulted: number; required: number; requirementCount: number }> {
    const recruiters = Array.from(this.employees.values())
      .filter(e => e.role === "recruiter" || e.role === "team_leader");
    
    let totalDelivered = 0;
    let totalRequired = 0;
    let totalRequirements = 0;
    
    for (const recruiter of recruiters) {
      const metrics = await this.calculateRecruiterDailyMetrics(recruiter.id, date);
      totalDelivered += metrics.delivered;
      totalRequired += metrics.required;
      totalRequirements += metrics.requirementCount;
    }
    
    const totalDefaulted = Math.max(0, totalRequired - totalDelivered);
    
    return { delivered: totalDelivered, defaulted: totalDefaulted, required: totalRequired, requirementCount: totalRequirements };
  }
}

export const storage = new DatabaseStorage();
