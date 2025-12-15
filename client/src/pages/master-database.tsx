import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Filter, Search, Trash2, X, Share2, Download, Loader2, Upload, FileText, CheckCircle, XCircle } from "lucide-react";
import { useDropzone } from 'react-dropzone';
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type ProfileType = 'resume' | 'employee' | 'client';

type ResumeStatus = 'Inbound' | 'Existed' | 'Archived' | 'Looking for Jobs' | 'In working' | 'New' | 'Active';
type EmployeeStatus = 'Active' | 'On Leave' | 'Inactive' | 'Resigned';
type ClientStatus = 'Active' | 'Inactive' | 'On Hold' | 'Terminated' | 'frozen' | 'churned';

interface ResumeData {
  id: string;
  name: string;
  position: string;
  experience: string;
  skills: string;
  source: string;
  status: ResumeStatus;
  uploadedDate: string;
  email?: string;
  phone?: string;
  location?: string;
  resumeFile?: string;
}

interface EmployeeData {
  id: string;
  name: string;
  position: string;
  experience: string;
  skills: string;
  source: string;
  status: EmployeeStatus;
  uploadedDate: string;
  email?: string;
  phone?: string;
  department?: string;
}

interface ClientData {
  id: string;
  name: string;
  position: string;
  experience: string;
  skills: string;
  source: string;
  status: ClientStatus;
  uploadedDate: string;
  email?: string;
  website?: string;
  location?: string;
}

export default function MasterDatabase() {
  const [searchQuery, setSearchQuery] = useState("");
  const [profileType, setProfileType] = useState<ProfileType>('resume');
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isAdvancedFilterOpen, setIsAdvancedFilterOpen] = useState(false);
  const [isResumeDrawerOpen, setIsResumeDrawerOpen] = useState(false);
  const [selectedResume, setSelectedResume] = useState<ResumeData | EmployeeData | ClientData | null>(null);
  const [deletedIds, setDeletedIds] = useState<{
    resume: string[];
    employee: string[];
    client: string[];
  }>({
    resume: [],
    employee: [],
    client: []
  });
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{id: string, name: string, profileType: ProfileType} | null>(null);
  
  // Import Resume modal state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isBulkUpload, setIsBulkUpload] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [bulkFiles, setBulkFiles] = useState<File[]>([]);
  const [parsedData, setParsedData] = useState<{fullName: string | null; email: string | null; phone: string | null; filePath?: string} | null>(null);
  const [bulkParsedResults, setBulkParsedResults] = useState<Array<{fileName: string; success: boolean; data?: {fullName: string | null; email: string | null; phone: string | null}; error?: string}>>([]);
  const [importStep, setImportStep] = useState<'upload' | 'confirm' | 'result'>('upload');
  const [isProcessing, setIsProcessing] = useState(false);
  const [singleCandidateForm, setSingleCandidateForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    designation: '',
    experience: '',
    skills: '',
    location: ''
  });
  const [importResults, setImportResults] = useState<{total: number; successCount: number; failedCount: number; results: Array<{fileName: string; success: boolean; error?: string}>} | null>(null);

  const { toast } = useToast();

  const BULK_UPLOAD_LIMIT = 20;
  
  // Advanced filter state
  const [advancedFilters, setAdvancedFilters] = useState({
    dateFrom: "",
    dateTo: "",
    position: "",
    experience: "",
    skills: "",
    source: ""
  });

  // Fetch candidates (resumes) from API
  const { data: candidatesRaw = [], isLoading: isLoadingCandidates } = useQuery<any[]>({
    queryKey: ['/api/admin/candidates'],
  });

  // Fetch employees from API
  const { data: employeesRaw = [], isLoading: isLoadingEmployees } = useQuery<any[]>({
    queryKey: ['/api/admin/employees'],
  });

  // Fetch clients from API
  const { data: clientsRaw = [], isLoading: isLoadingClients } = useQuery<any[]>({
    queryKey: ['/api/admin/clients'],
  });

  // Helper function to format date
  const formatDate = (dateStr: string | null | undefined): string => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = String(date.getFullYear()).slice(-2);
      return `${day}-${month}-${year}`;
    } catch {
      return dateStr;
    }
  };

  // Map candidates to ResumeData format
  const resumeData: ResumeData[] = useMemo(() => {
    return candidatesRaw.map((candidate: any) => ({
      id: candidate.id,
      name: candidate.fullName || candidate.name || '-',
      position: candidate.position || candidate.designation || candidate.currentRole || '-',
      experience: candidate.experience || '-',
      skills: candidate.skills || '-',
      source: candidate.addedBy ? `Added by ${candidate.addedBy}` : (candidate.googleId ? 'Google OAuth' : 'Self Registration'),
      status: (candidate.pipelineStatus || 'New') as ResumeStatus,
      uploadedDate: formatDate(candidate.createdAt),
      email: candidate.email,
      phone: candidate.phone,
      location: candidate.location,
      resumeFile: candidate.resumeFile,
    }));
  }, [candidatesRaw]);

  // Map employees to EmployeeData format (Employees Master)
  // Include TL, TA, and other employees but exclude admin accounts (STAFFOS*) and clients
  const employeeData: EmployeeData[] = useMemo(() => {
    return employeesRaw
      .filter((employee: any) => 
        !employee.employeeId?.startsWith('STAFFOS') && 
        employee.role !== 'client' &&
        employee.role !== 'admin'
      )
      .map((employee: any) => ({
        id: employee.id,
        name: employee.name || '-',
        position: employee.designation || employee.role || '-',
        experience: '-',
        skills: employee.department || '-',
        source: 'Admin',
        status: (employee.isActive ? 'Active' : (employee.employmentStatus === 'Resigned' ? 'Resigned' : 'Inactive')) as EmployeeStatus,
        uploadedDate: formatDate(employee.joiningDate || employee.createdAt),
        email: employee.email,
        phone: employee.phone,
        department: employee.department,
      }));
  }, [employeesRaw]);

  // Map clients to ClientData format
  const clientData: ClientData[] = useMemo(() => {
    return clientsRaw.map((client: any) => ({
      id: client.id,
      name: client.brandName || client.incorporatedName || '-',
      position: client.category || '-',
      experience: '-',
      skills: client.spoc || '-',
      source: client.source || 'Direct',
      status: (client.currentStatus === 'active' ? 'Active' : 
               client.currentStatus === 'frozen' ? 'On Hold' : 
               client.currentStatus === 'churned' ? 'Terminated' : 'Inactive') as ClientStatus,
      uploadedDate: formatDate(client.startDate || client.createdAt),
      email: client.email,
      website: client.website,
      location: client.location,
    }));
  }, [clientsRaw]);

  // Get loading state
  const isLoading = useMemo(() => {
    switch (profileType) {
      case 'resume': return isLoadingCandidates;
      case 'employee': return isLoadingEmployees;
      case 'client': return isLoadingClients;
      default: return false;
    }
  }, [profileType, isLoadingCandidates, isLoadingEmployees, isLoadingClients]);

  // Get current data based on profile type
  const getCurrentData = () => {
    switch (profileType) {
      case 'resume':
        return resumeData;
      case 'employee':
        return employeeData;
      case 'client':
        return clientData;
      default:
        return resumeData;
    }
  };

  // Get status options based on profile type
  const getStatusOptions = () => {
    switch (profileType) {
      case 'resume':
        return ['New', 'Inbound', 'Existed', 'Archived', 'Looking for Jobs', 'In working', 'L1', 'L2', 'L3', 'Final Round', 'HR Round', 'Offer Stage', 'Closure'];
      case 'employee':
        return ['Active', 'On Leave', 'Inactive', 'Resigned'];
      case 'client':
        return ['Active', 'Inactive', 'On Hold', 'Terminated'];
      default:
        return [];
    }
  };

  // Filter data based on search, status, and advanced filters
  const filteredData = getCurrentData().filter(item => {
    // Exclude deleted items for the current profile type
    if (deletedIds[profileType].includes(item.id)) {
      return false;
    }
    
    const searchMatch = searchQuery === "" || 
      Object.values(item).some(value => 
        String(value).toLowerCase().includes(searchQuery.toLowerCase())
      );
    
    const statusMatch = statusFilter === "all" || 
      item.status.toLowerCase() === statusFilter.toLowerCase();
    
    // Advanced filter matches
    const positionMatch = !advancedFilters.position || 
      item.position.toLowerCase().includes(advancedFilters.position.toLowerCase());
    
    const experienceMatch = !advancedFilters.experience || 
      item.experience.toLowerCase().includes(advancedFilters.experience.toLowerCase());
    
    const skillsMatch = !advancedFilters.skills || 
      item.skills.toLowerCase().includes(advancedFilters.skills.toLowerCase());
    
    const sourceMatch = !advancedFilters.source || 
      item.source.toLowerCase().includes(advancedFilters.source.toLowerCase());
    
    // Date range filtering
    let dateMatch = true;
    if (advancedFilters.dateFrom || advancedFilters.dateTo) {
      const parseDate = (dateStr: string) => {
        // Handle DD-MM-YY format
        const parts = dateStr.split('-');
        if (parts.length === 3) {
          const day = parseInt(parts[0]);
          const month = parseInt(parts[1]) - 1;
          const year = 2000 + parseInt(parts[2]); // Assuming 20xx
          return new Date(year, month, day);
        }
        return new Date(dateStr);
      };
      
      const itemDate = parseDate(item.uploadedDate);
      
      if (advancedFilters.dateFrom) {
        const fromDate = new Date(advancedFilters.dateFrom);
        dateMatch = dateMatch && itemDate >= fromDate;
      }
      
      if (advancedFilters.dateTo) {
        const toDate = new Date(advancedFilters.dateTo);
        dateMatch = dateMatch && itemDate <= toDate;
      }
    }
    
    return searchMatch && statusMatch && positionMatch && experienceMatch && 
           skillsMatch && sourceMatch && dateMatch;
  });
  
  // Handle apply advanced filters
  const handleApplyFilters = () => {
    setIsAdvancedFilterOpen(false);
  };
  
  // Handle clear advanced filters
  const handleClearFilters = () => {
    setAdvancedFilters({
      dateFrom: "",
      dateTo: "",
      position: "",
      experience: "",
      skills: "",
      source: ""
    });
  };

  // Get status badge color
  const getStatusBadgeColor = (status: string) => {
    const lowerStatus = status.toLowerCase();
    
    // Resume statuses
    if (lowerStatus === 'inbound') return 'bg-green-500 text-white';
    if (lowerStatus === 'existed') return 'bg-blue-500 text-white';
    if (lowerStatus === 'archived') return 'bg-gray-500 text-white';
    if (lowerStatus === 'looking for jobs') return 'bg-orange-500 text-white';
    if (lowerStatus === 'in working') return 'bg-purple-500 text-white';
    
    // Employee statuses
    if (lowerStatus === 'active') return 'bg-green-500 text-white';
    if (lowerStatus === 'on leave') return 'bg-yellow-500 text-white';
    if (lowerStatus === 'inactive') return 'bg-gray-500 text-white';
    if (lowerStatus === 'resigned') return 'bg-red-500 text-white';
    
    // Client statuses
    if (lowerStatus === 'on hold') return 'bg-orange-500 text-white';
    if (lowerStatus === 'terminated') return 'bg-red-500 text-white';
    
    return 'bg-gray-500 text-white';
  };

  // Get profile type label
  const getProfileTypeLabel = () => {
    switch (profileType) {
      case 'resume':
        return 'Resume';
      case 'employee':
        return 'Employee';
      case 'client':
        return 'Client';
      default:
        return 'Resume';
    }
  };

  // Handle row click to open resume drawer
  const handleRowClick = (item: ResumeData | EmployeeData | ClientData) => {
    // Only open drawer for resume profile type
    if (profileType === 'resume') {
      setSelectedResume(item);
      setIsResumeDrawerOpen(true);
    }
  };

  // Handle close drawer
  const handleCloseDrawer = () => {
    setIsResumeDrawerOpen(false);
    setSelectedResume(null);
  };

  // Handle delete row - Show confirmation dialog
  const handleDeleteRow = (e: React.MouseEvent, item: ResumeData | EmployeeData | ClientData) => {
    e.stopPropagation();
    setItemToDelete({ id: item.id, name: item.name, profileType });
    setIsDeleteDialogOpen(true);
  };

  // Handle confirmed delete
  const handleConfirmDelete = () => {
    if (itemToDelete) {
      setDeletedIds(prev => ({
        ...prev,
        [itemToDelete.profileType]: [...prev[itemToDelete.profileType], itemToDelete.id]
      }));
      // Close drawer if the deleted item is currently selected and from the same profile type
      if (selectedResume && selectedResume.id === itemToDelete.id && profileType === itemToDelete.profileType) {
        setIsResumeDrawerOpen(false);
        setSelectedResume(null);
      }
    }
    setIsDeleteDialogOpen(false);
    setItemToDelete(null);
  };

  // Handle cancel delete
  const handleCancelDelete = () => {
    setIsDeleteDialogOpen(false);
    setItemToDelete(null);
  };

  // Handle dialog close via backdrop or ESC
  const handleDialogOpenChange = (open: boolean) => {
    setIsDeleteDialogOpen(open);
    if (!open) {
      setItemToDelete(null);
    }
  };

  // Handle share resume
  const handleShareResume = () => {
    // Frontend only - just show a toast or alert
    alert('Share functionality - Frontend only');
  };

  // Handle download resume
  const handleDownloadResume = () => {
    // Frontend only - just show a toast or alert
    alert('Download functionality - Frontend only');
  };

  // Get initials for avatar fallback
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Reset import modal state
  const resetImportModal = () => {
    setUploadedFile(null);
    setBulkFiles([]);
    setParsedData(null);
    setBulkParsedResults([]);
    setImportStep('upload');
    setIsProcessing(false);
    setSingleCandidateForm({
      fullName: '',
      email: '',
      phone: '',
      designation: '',
      experience: '',
      skills: '',
      location: ''
    });
    setImportResults(null);
  };

  // Handle single file drop
  const onSingleDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setUploadedFile(file);
      setIsProcessing(true);
      
      try {
        const formData = new FormData();
        formData.append('resume', file);
        
        const response = await fetch('/api/admin/parse-resume', {
          method: 'POST',
          body: formData,
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error('Failed to parse resume');
        }
        
        const result = await response.json();
        setParsedData(result.data);
        setSingleCandidateForm(prev => ({
          ...prev,
          fullName: result.data.fullName || '',
          email: result.data.email || '',
          phone: result.data.phone || ''
        }));
        setImportStep('confirm');
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to parse resume. Please try again.",
          variant: "destructive"
        });
      } finally {
        setIsProcessing(false);
      }
    }
  }, [toast]);

  // Handle bulk files drop
  const onBulkDrop = useCallback(async (acceptedFiles: File[]) => {
    const limitedFiles = acceptedFiles.slice(0, BULK_UPLOAD_LIMIT);
    setBulkFiles(limitedFiles);
    setIsProcessing(true);
    
    try {
      const formData = new FormData();
      limitedFiles.forEach(file => {
        formData.append('resumes', file);
      });
      
      const response = await fetch('/api/admin/parse-resumes-bulk', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to parse resumes');
      }
      
      const result = await response.json();
      setBulkParsedResults(result.results);
      setImportStep('confirm');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to parse resumes. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  }, [toast]);

  const singleDropzone = useDropzone({
    onDrop: onSingleDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    },
    maxFiles: 1,
    disabled: isProcessing
  });

  const bulkDropzone = useDropzone({
    onDrop: onBulkDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    },
    maxFiles: BULK_UPLOAD_LIMIT,
    disabled: isProcessing
  });

  // Handle single candidate import
  const handleSingleImport = async () => {
    if (!singleCandidateForm.fullName || !singleCandidateForm.email) {
      toast({
        title: "Validation Error",
        description: "Name and email are required.",
        variant: "destructive"
      });
      return;
    }
    
    setIsProcessing(true);
    
    try {
      const response = await apiRequest('POST', '/api/admin/import-candidate', {
        ...singleCandidateForm,
        resumeFilePath: parsedData?.filePath,
        addedBy: 'Admin Import'
      });
      
      toast({
        title: "Success",
        description: "Candidate imported successfully!",
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/admin/candidates'] });
      setIsImportModalOpen(false);
      resetImportModal();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to import candidate.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle bulk import
  const handleBulkImport = async () => {
    const validCandidates = bulkParsedResults
      .filter(r => r.success && r.data?.fullName && r.data?.email)
      .map(r => ({
        fullName: r.data!.fullName,
        email: r.data!.email,
        phone: r.data!.phone,
        fileName: r.fileName
      }));
    
    if (validCandidates.length === 0) {
      toast({
        title: "No Valid Candidates",
        description: "No resumes with valid name and email found.",
        variant: "destructive"
      });
      return;
    }
    
    setIsProcessing(true);
    
    try {
      const response = await fetch('/api/admin/import-candidates-bulk', {
        method: 'POST',
        body: JSON.stringify({
          candidates: validCandidates,
          addedBy: 'Admin Bulk Import'
        }),
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to import candidates');
      }
      
      const result = await response.json();
      setImportResults(result);
      setImportStep('result');
      
      queryClient.invalidateQueries({ queryKey: ['/api/admin/candidates'] });
      
      toast({
        title: "Import Complete",
        description: `${result.successCount} candidates imported, ${result.failedCount} failed.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to import candidates.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 px-6 py-4">
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <Button
              onClick={() => window.history.back()}
              variant="ghost"
              size="icon"
              data-testid="button-back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Master Database</h1>
          </div>
          <Button
            onClick={() => {
              resetImportModal();
              setIsImportModalOpen(true);
            }}
            className="flex items-center gap-2"
            data-testid="button-import-resume"
          >
            <Upload className="h-4 w-4" />
            Import Resume
          </Button>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center gap-4 bg-gray-50 dark:bg-gray-900 p-4 rounded-md">
          <div className="flex-1 relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <Input
              type="text"
              placeholder="Search across all database......"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white dark:bg-gray-800"
              data-testid="input-search"
            />
          </div>
          
          <Select value={profileType} onValueChange={(value) => {
            setProfileType(value as ProfileType);
            setStatusFilter("all");
          }}>
            <SelectTrigger className="w-40 bg-white dark:bg-gray-800" data-testid="select-profile-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="resume">Resume</SelectItem>
              <SelectItem value="employee">Employee</SelectItem>
              <SelectItem value="client">Client</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40 bg-white dark:bg-gray-800" data-testid="select-status">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {getStatusOptions().map(status => (
                <SelectItem key={status} value={status.toLowerCase()}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button 
            variant="outline" 
            className="flex items-center gap-2 bg-white dark:bg-gray-800" 
            onClick={() => setIsAdvancedFilterOpen(true)}
            data-testid="button-advanced-filter"
          >
            <Filter size={16} />
            Advanced Filter
          </Button>
        </div>
      </div>

      {/* Main Content Area - Side by Side Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Table Section */}
        <div className={`p-6 overflow-auto ${
          isResumeDrawerOpen ? 'flex-1' : 'w-full'
        }`}>
          <div className="bg-white dark:bg-gray-800 rounded-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-blue-200 dark:bg-blue-900">
                    <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-gray-100">Name</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-gray-100">Position</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-gray-100">Experience</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-gray-100">Skills</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-gray-100">Source</th>
                    {!isResumeDrawerOpen && (
                      <>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-gray-100">Status</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-gray-100">Uploaded Date</th>
                      </>
                    )}
                    <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-gray-100">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={isResumeDrawerOpen ? 6 : 8} className="py-12 text-center">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                          <span className="text-gray-500 dark:text-gray-400">Loading {getProfileTypeLabel().toLowerCase()}s...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredData.length === 0 ? (
                    <tr>
                      <td colSpan={isResumeDrawerOpen ? 6 : 8} className="py-12 text-center">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <span className="text-gray-500 dark:text-gray-400">
                            {searchQuery || statusFilter !== 'all' 
                              ? `No ${getProfileTypeLabel().toLowerCase()}s match your filters` 
                              : `No ${getProfileTypeLabel().toLowerCase()}s found in the database`}
                          </span>
                          <span className="text-sm text-gray-400 dark:text-gray-500">
                            {profileType === 'resume' && "Candidates will appear here when added by recruiters or via individual registration"}
                            {profileType === 'employee' && "Employees will appear here when added by Admin"}
                            {profileType === 'client' && "Clients will appear here when added by Admin"}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredData.map((item, index) => (
                      <tr 
                        key={item.id} 
                        onClick={() => handleRowClick(item)}
                        className={`border-b border-gray-200 dark:border-gray-700 ${
                          index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-blue-50 dark:bg-gray-750'
                        } ${profileType === 'resume' ? 'cursor-pointer hover-elevate' : ''}`}
                        data-testid={`row-${profileType}-${item.id}`}
                      >
                        <td className="py-3 px-4 text-gray-900 dark:text-gray-100" data-testid={`text-name-${item.id}`}>
                          {item.name}
                        </td>
                        <td className="py-3 px-4 text-gray-900 dark:text-gray-100">{item.position}</td>
                        <td className="py-3 px-4 text-gray-900 dark:text-gray-100">{item.experience}</td>
                        <td className="py-3 px-4 text-gray-900 dark:text-gray-100">
                          {item.skills && item.skills !== '-' ? (item.skills.split(',')[0] + (item.skills.includes(',') ? '...' : '')) : '-'}
                        </td>
                        <td className="py-3 px-4 text-gray-900 dark:text-gray-100">{item.source}</td>
                        {!isResumeDrawerOpen && (
                          <>
                            <td className="py-3 px-4">
                              <Badge className={`${getStatusBadgeColor(item.status)} rounded-full px-3 py-1`}>
                                {item.status}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-gray-900 dark:text-gray-100">{item.uploadedDate}</td>
                          </>
                        )}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={(e) => handleDeleteRow(e, item)}
                              className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
                              data-testid={`button-delete-${item.id}`}
                            >
                              <Trash2 size={16} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Resume Display Section - Side Panel */}
        {isResumeDrawerOpen && selectedResume && (
          <div className="w-full max-w-md h-screen border-l-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 flex flex-col">
            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Candidate Profile Header - Redesigned */}
              <div className="flex items-start justify-between gap-4">
                {/* Left Side: Profile Info */}
                <div className="flex items-start gap-3 flex-1">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src="" alt={selectedResume.name} />
                    <AvatarFallback className="bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300">
                      {getInitials(selectedResume.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-2 flex-1">
                    <div>
                      <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100" data-testid="text-candidate-name">
                        {selectedResume.name}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400" data-testid="text-candidate-position">
                        {selectedResume.position}
                      </p>
                    </div>
                    {/* Status Badge */}
                    <div className="flex flex-wrap gap-2">
                      <Badge className={`${getStatusBadgeColor(selectedResume.status)} rounded-full px-3 py-1 text-xs`}>
                        {selectedResume.status}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Right Side: Close Button */}
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleCloseDrawer}
                    className="h-8 w-8 rounded-full"
                    data-testid="button-close-drawer"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Resume Display Area */}
              <div className="space-y-3">
                <div className="bg-gray-100 dark:bg-gray-900 rounded-md p-8 min-h-[400px] flex items-center justify-center relative">
                  <div className="text-center">
                    <p className="text-xl font-semibold text-gray-900 dark:text-gray-100">Resume</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">Resume Not Available</p>
                  </div>
                  
                  {/* Share and Download Buttons */}
                  <div className="absolute bottom-4 right-4 flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleShareResume}
                      className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm hover:bg-white dark:hover:bg-gray-800"
                      data-testid="button-share-resume"
                    >
                      <Share2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleDownloadResume}
                      className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm hover:bg-white dark:hover:bg-gray-800"
                      data-testid="button-download-resume"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                {/* Uploaded Date Badge - Moved Below Resume */}
                <div className="flex justify-center">
                  <Badge variant="outline" className="rounded-full px-3 py-1 text-xs">
                    Uploaded: {selectedResume.uploadedDate}
                  </Badge>
                </div>
              </div>

            </div>
          </div>
        )}
      </div>

      {/* Advanced Filter Dialog */}
      <Dialog open={isAdvancedFilterOpen} onOpenChange={setIsAdvancedFilterOpen}>
        <DialogContent className="max-w-2xl" data-testid="dialog-advanced-filter">
          <DialogHeader>
            <DialogTitle>Advanced Filter</DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-4 py-4">
            {/* Date Range */}
            <div className="space-y-2">
              <Label htmlFor="dateFrom">Date From</Label>
              <Input
                id="dateFrom"
                type="date"
                value={advancedFilters.dateFrom}
                onChange={(e) => setAdvancedFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                data-testid="input-date-from"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="dateTo">Date To</Label>
              <Input
                id="dateTo"
                type="date"
                value={advancedFilters.dateTo}
                onChange={(e) => setAdvancedFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                data-testid="input-date-to"
              />
            </div>
            
            {/* Position */}
            <div className="space-y-2">
              <Label htmlFor="position">Position/Role</Label>
              <Input
                id="position"
                type="text"
                placeholder="e.g. Software Engineer"
                value={advancedFilters.position}
                onChange={(e) => setAdvancedFilters(prev => ({ ...prev, position: e.target.value }))}
                data-testid="input-position"
              />
            </div>
            
            {/* Experience */}
            <div className="space-y-2">
              <Label htmlFor="experience">Experience</Label>
              <Input
                id="experience"
                type="text"
                placeholder="e.g. 2 years, 3-5 years"
                value={advancedFilters.experience}
                onChange={(e) => setAdvancedFilters(prev => ({ ...prev, experience: e.target.value }))}
                data-testid="input-experience"
              />
            </div>
            
            {/* Skills */}
            <div className="space-y-2">
              <Label htmlFor="skills">Skills</Label>
              <Input
                id="skills"
                type="text"
                placeholder="e.g. Python, React, SQL"
                value={advancedFilters.skills}
                onChange={(e) => setAdvancedFilters(prev => ({ ...prev, skills: e.target.value }))}
                data-testid="input-skills"
              />
            </div>
            
            {/* Source */}
            <div className="space-y-2">
              <Label htmlFor="source">Source</Label>
              <Select 
                value={advancedFilters.source} 
                onValueChange={(value) => setAdvancedFilters(prev => ({ ...prev, source: value }))}
              >
                <SelectTrigger data-testid="select-source">
                  <SelectValue placeholder="All Sources" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LinkedIn">LinkedIn</SelectItem>
                  <SelectItem value="Naukri">Naukri</SelectItem>
                  <SelectItem value="Indeed">Indeed</SelectItem>
                  <SelectItem value="Monster">Monster</SelectItem>
                  <SelectItem value="Referral">Referral</SelectItem>
                  <SelectItem value="Direct">Direct</SelectItem>
                  <SelectItem value="Behance">Behance</SelectItem>
                  <SelectItem value="Marketing">Marketing</SelectItem>
                  <SelectItem value="Partnership">Partnership</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleClearFilters}
              data-testid="button-clear-filters"
            >
              Clear Filters
            </Button>
            <Button 
              onClick={handleApplyFilters}
              data-testid="button-apply-filters"
            >
              Apply Filters
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={handleDialogOpenChange}>
        <AlertDialogContent data-testid="dialog-delete-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{itemToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelDelete} data-testid="button-cancel-delete">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700"
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Import Resume Modal */}
      <Dialog open={isImportModalOpen} onOpenChange={(open) => {
        setIsImportModalOpen(open);
        if (!open) resetImportModal();
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-import-resume">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Import Resume
            </DialogTitle>
          </DialogHeader>

          <div className="py-4">
            <div className="flex items-center justify-between gap-4 mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-md">
              <div className="flex items-center gap-2">
                <Label htmlFor="bulk-toggle" className="text-sm font-medium">Bulk Upload</Label>
                <span className="text-xs text-muted-foreground">(Max {BULK_UPLOAD_LIMIT} files)</span>
              </div>
              <Switch
                id="bulk-toggle"
                checked={isBulkUpload}
                onCheckedChange={(checked) => {
                  setIsBulkUpload(checked);
                  resetImportModal();
                }}
                disabled={importStep !== 'upload'}
                data-testid="switch-bulk-upload"
              />
            </div>

            {/* Single Upload Mode */}
            {!isBulkUpload && (
              <>
                {importStep === 'upload' && (
                  <div
                    {...singleDropzone.getRootProps()}
                    className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                      singleDropzone.isDragActive 
                        ? 'border-primary bg-primary/5' 
                        : 'border-gray-300 dark:border-gray-600 hover:border-primary/50'
                    }`}
                    data-testid="dropzone-single"
                  >
                    <input {...singleDropzone.getInputProps()} data-testid="input-resume-file" />
                    {isProcessing ? (
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-sm text-muted-foreground">Parsing resume...</p>
                      </div>
                    ) : (
                      <>
                        <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                        <p className="text-sm text-muted-foreground mb-2">
                          Drag and drop a resume here, or click to browse
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Supported formats: PDF, DOC, DOCX
                        </p>
                      </>
                    )}
                  </div>
                )}

                {importStep === 'confirm' && parsedData && (
                  <div className="space-y-4">
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-md border border-green-200 dark:border-green-800">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <span className="font-medium text-green-800 dark:text-green-200">Resume Parsed Successfully</span>
                      </div>
                      <p className="text-sm text-green-700 dark:text-green-300">
                        {uploadedFile?.name}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="fullName">Full Name *</Label>
                        <Input
                          id="fullName"
                          value={singleCandidateForm.fullName}
                          onChange={(e) => setSingleCandidateForm(prev => ({ ...prev, fullName: e.target.value }))}
                          placeholder="Enter full name"
                          data-testid="input-fullName"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email *</Label>
                        <Input
                          id="email"
                          type="email"
                          value={singleCandidateForm.email}
                          onChange={(e) => setSingleCandidateForm(prev => ({ ...prev, email: e.target.value }))}
                          placeholder="Enter email"
                          data-testid="input-email"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone</Label>
                        <Input
                          id="phone"
                          value={singleCandidateForm.phone}
                          onChange={(e) => setSingleCandidateForm(prev => ({ ...prev, phone: e.target.value }))}
                          placeholder="Enter phone number"
                          data-testid="input-phone"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="designation">Designation</Label>
                        <Input
                          id="designation"
                          value={singleCandidateForm.designation}
                          onChange={(e) => setSingleCandidateForm(prev => ({ ...prev, designation: e.target.value }))}
                          placeholder="e.g. Software Engineer"
                          data-testid="input-designation"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="experience">Experience</Label>
                        <Input
                          id="experience"
                          value={singleCandidateForm.experience}
                          onChange={(e) => setSingleCandidateForm(prev => ({ ...prev, experience: e.target.value }))}
                          placeholder="e.g. 5 years"
                          data-testid="input-experience"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="location">Location</Label>
                        <Input
                          id="location"
                          value={singleCandidateForm.location}
                          onChange={(e) => setSingleCandidateForm(prev => ({ ...prev, location: e.target.value }))}
                          placeholder="e.g. New York, USA"
                          data-testid="input-location"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="skills">Skills</Label>
                      <Input
                        id="skills"
                        value={singleCandidateForm.skills}
                        onChange={(e) => setSingleCandidateForm(prev => ({ ...prev, skills: e.target.value }))}
                        placeholder="e.g. JavaScript, React, Node.js"
                        data-testid="input-skills-import"
                      />
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Bulk Upload Mode */}
            {isBulkUpload && (
              <>
                {importStep === 'upload' && (
                  <div
                    {...bulkDropzone.getRootProps()}
                    className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                      bulkDropzone.isDragActive 
                        ? 'border-primary bg-primary/5' 
                        : 'border-gray-300 dark:border-gray-600 hover:border-primary/50'
                    }`}
                    data-testid="dropzone-bulk"
                  >
                    <input {...bulkDropzone.getInputProps()} data-testid="input-resume-files-bulk" />
                    {isProcessing ? (
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-sm text-muted-foreground">Parsing {bulkFiles.length} resumes...</p>
                      </div>
                    ) : (
                      <>
                        <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                        <p className="text-sm text-muted-foreground mb-2">
                          Drag and drop multiple resumes here, or click to browse
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Supported formats: PDF, DOC, DOCX (Max {BULK_UPLOAD_LIMIT} files)
                        </p>
                      </>
                    )}
                  </div>
                )}

                {importStep === 'confirm' && bulkParsedResults.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-md">
                      <span className="font-medium">Parsed Resumes</span>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="flex items-center gap-1 text-green-600">
                          <CheckCircle className="h-4 w-4" />
                          {bulkParsedResults.filter(r => r.success && r.data?.fullName && r.data?.email).length} valid
                        </span>
                        <span className="flex items-center gap-1 text-red-600">
                          <XCircle className="h-4 w-4" />
                          {bulkParsedResults.filter(r => !r.success || !r.data?.fullName || !r.data?.email).length} invalid
                        </span>
                      </div>
                    </div>

                    <div className="max-h-64 overflow-y-auto space-y-2">
                      {bulkParsedResults.map((result, index) => (
                        <div 
                          key={index}
                          className={`p-3 rounded-md border ${
                            result.success && result.data?.fullName && result.data?.email
                              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                              : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                          }`}
                          data-testid={`bulk-result-${index}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                {result.success && result.data?.fullName && result.data?.email ? (
                                  <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                                )}
                                <span className="text-sm font-medium truncate">{result.fileName}</span>
                              </div>
                              {result.success && result.data ? (
                                <div className="mt-1 text-xs text-muted-foreground ml-6">
                                  <span>{result.data.fullName || 'No name'}</span>
                                  <span className="mx-2">|</span>
                                  <span>{result.data.email || 'No email'}</span>
                                </div>
                              ) : (
                                <div className="mt-1 text-xs text-red-600 ml-6">
                                  {result.error || 'Missing name or email'}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {importStep === 'result' && importResults && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-md text-center">
                        <div className="text-2xl font-bold">{importResults.total}</div>
                        <div className="text-sm text-muted-foreground">Total</div>
                      </div>
                      <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-md text-center">
                        <div className="text-2xl font-bold text-green-600">{importResults.successCount}</div>
                        <div className="text-sm text-green-600">Imported</div>
                      </div>
                      <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-md text-center">
                        <div className="text-2xl font-bold text-red-600">{importResults.failedCount}</div>
                        <div className="text-sm text-red-600">Failed</div>
                      </div>
                    </div>

                    {importResults.results.filter(r => !r.success).length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-red-600">Failed Imports:</p>
                        <div className="max-h-32 overflow-y-auto space-y-1">
                          {importResults.results.filter(r => !r.success).map((result, index) => (
                            <div key={index} className="text-xs text-red-600 flex items-center gap-2">
                              <XCircle className="h-3 w-3" />
                              <span>{result.fileName}: {result.error}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          <DialogFooter className="flex gap-2">
            {importStep === 'upload' && (
              <Button 
                variant="outline" 
                onClick={() => setIsImportModalOpen(false)}
                data-testid="button-cancel-import"
              >
                Cancel
              </Button>
            )}
            
            {importStep === 'confirm' && !isBulkUpload && (
              <>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setImportStep('upload');
                    setUploadedFile(null);
                    setParsedData(null);
                  }}
                  data-testid="button-back-import"
                >
                  Back
                </Button>
                <Button 
                  onClick={handleSingleImport}
                  disabled={isProcessing || !singleCandidateForm.fullName || !singleCandidateForm.email}
                  data-testid="button-confirm-import"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    'Import Candidate'
                  )}
                </Button>
              </>
            )}

            {importStep === 'confirm' && isBulkUpload && (
              <>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setImportStep('upload');
                    setBulkFiles([]);
                    setBulkParsedResults([]);
                  }}
                  data-testid="button-back-bulk-import"
                >
                  Back
                </Button>
                <Button 
                  onClick={handleBulkImport}
                  disabled={isProcessing || bulkParsedResults.filter(r => r.success && r.data?.fullName && r.data?.email).length === 0}
                  data-testid="button-confirm-bulk-import"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    `Import ${bulkParsedResults.filter(r => r.success && r.data?.fullName && r.data?.email).length} Candidates`
                  )}
                </Button>
              </>
            )}

            {importStep === 'result' && (
              <Button 
                onClick={() => {
                  setIsImportModalOpen(false);
                  resetImportModal();
                }}
                data-testid="button-close-import"
              >
                Close
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
