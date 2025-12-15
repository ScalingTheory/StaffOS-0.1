import React, { useState, useRef, useEffect } from "react";
import {
  Briefcase,
  MapPin,
  GraduationCap,
  Clock,
  CheckSquare,
  Square,
  RotateCw,
  ArrowLeft,
  Download,
  Bookmark,
  BookmarkCheck,
  Phone,
  Mail,
  ChevronDown,
  Send,
  X,
  DollarSign,
  Calendar,
  Building,
  Loader2,
} from "lucide-react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ComboInputProps {
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
  placeholder: string;
  label?: string;
  icon?: React.ReactNode;
  testId?: string;
}

function ComboInput({ value, onChange, suggestions, placeholder, label, icon, testId }: ComboInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredSuggestions = suggestions.filter(s => 
    s.toLowerCase().includes(inputValue.toLowerCase())
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue);
    setIsOpen(true);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
    onChange(suggestion);
    setIsOpen(false);
  };

  const handleClear = () => {
    setInputValue("");
    onChange("");
  };

  return (
    <div className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 pr-8 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
          placeholder={placeholder}
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          data-testid={testId}
        />
        {inputValue && (
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            onClick={handleClear}
          >
            <X size={16} />
          </button>
        )}
      </div>
      {isOpen && filteredSuggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto"
        >
          {filteredSuggestions.map((suggestion, index) => (
            <button
              key={index}
              type="button"
              className="w-full text-left px-3 py-2 hover:bg-purple-50 text-sm transition-colors"
              onClick={() => handleSuggestionClick(suggestion)}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface DatabaseCandidate {
  id: string;
  candidateId: string;
  fullName: string;
  email: string;
  phone?: string;
  company?: string;
  designation?: string;
  location?: string;
  experience?: string;
  skills?: string;
  profilePicture?: string;
  education?: string;
  currentRole?: string;
  ctc?: string;
  ectc?: string;
  noticePeriod?: string;
  position?: string;
  pedigreeLevel?: string;
  companyLevel?: string;
  companySector?: string;
  productService?: string;
  productCategory?: string;
  productDomain?: string;
  employmentType?: string;
  createdAt: string;
}

interface CandidateDisplay {
  id: string;
  name: string;
  title: string;
  location: string;
  experience: number;
  education: string;
  currentCompany: string;
  lastActive: string;
  skills: string[];
  summary: string;
  resumeUrl: string;
  profilePic: string;
  noticePeriod: string;
  ctc: string;
  expectedCtc: string;
  email: string;
  phone: string;
  saved: boolean;
  pedigreeLevel: string;
  companyLevel: string;
  companySector: string;
  productService: string;
  productCategory: string;
  productDomain: string;
  employmentType: string;
  availability: string;
}

function mapDatabaseCandidateToDisplay(dbCandidate: DatabaseCandidate): CandidateDisplay {
  const skillsArray = dbCandidate.skills 
    ? dbCandidate.skills.split(',').map(s => s.trim()).filter(Boolean)
    : [];
  
  const experienceNum = dbCandidate.experience 
    ? parseFloat(dbCandidate.experience.replace(/[^\d.]/g, '')) || 0
    : 0;
  
  const createdDate = new Date(dbCandidate.createdAt);
  const now = new Date();
  const diffMs = now.getTime() - createdDate.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const lastActive = diffDays === 0 ? 'Today' : diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;

  return {
    id: dbCandidate.id,
    name: dbCandidate.fullName,
    title: dbCandidate.designation || dbCandidate.currentRole || dbCandidate.position || 'Not specified',
    location: dbCandidate.location || 'Not specified',
    experience: experienceNum,
    education: dbCandidate.education || 'Not specified',
    currentCompany: dbCandidate.company || 'Not specified',
    lastActive,
    skills: skillsArray,
    summary: `Candidate profile for ${dbCandidate.fullName}`,
    resumeUrl: '#',
    profilePic: dbCandidate.profilePicture || '',
    noticePeriod: dbCandidate.noticePeriod || 'Not specified',
    ctc: dbCandidate.ctc || 'Not specified',
    expectedCtc: dbCandidate.ectc || 'Not specified',
    email: dbCandidate.email,
    phone: dbCandidate.phone || '',
    saved: false,
    pedigreeLevel: dbCandidate.pedigreeLevel || '',
    companyLevel: dbCandidate.companyLevel || '',
    companySector: dbCandidate.companySector || '',
    productService: dbCandidate.productService || '',
    productCategory: dbCandidate.productCategory || '',
    productDomain: dbCandidate.productDomain || '',
    employmentType: dbCandidate.employmentType || '',
    availability: dbCandidate.noticePeriod || 'Not specified',
  };
}

const allSkills = [
  "React",
  "Node.js",
  "Python",
  "AWS",
  "MongoDB",
  "Express",
  "Docker",
  "Redis",
  "TypeScript",
  "Kubernetes",
];
const allRoles = [
  "Full Stack Developer",
  "Backend Developer",
  "Frontend Engineer",
  "DevOps Engineer",
];
const allCompanies = ["Tech Solutions Inc.", "Freshworks", "Google", "Amazon"];
const allLocations = ["Mumbai, Maharashtra", "Remote", "Bangalore, India", "Chennai, India"];
const allPedigreeLevels = ["Tier 1", "Tier 2", "Tier 3", "Others"];
const allCompanyLevels = ["Startup", "Mid-size", "Enterprise", "MNC"];
const allCompanySectors = ["Technology", "Finance", "Healthcare", "E-commerce", "Consulting"];
const allProductServices = ["SaaS", "Product", "Service", "Hybrid"];
const allProductCategories = ["B2B", "B2C", "B2B2C"];
const allProductDomains = ["Web Development", "Mobile Apps", "Cloud Computing", "AI/ML", "Data Analytics"];
const allEmploymentTypes = ["Full-time", "Part-time", "Contract", "Freelance", "Internship"];
const allNoticePeriods = ["Immediate", "15 days", "30 days", "60 days", "90 days"];
const allAvailability = ["Immediate", "15 days", "30 days", "60 days", "90 days"];

const initialFilters = {
  location: "",
  experience: [0, 15] as [number, number],
  skills: [] as string[],
  role: "",
  company: "",
  pedigreeLevel: "",
  companyLevel: "",
  companySector: "",
  productService: "",
  productCategory: "",
  productDomain: "",
  employmentType: "",
  noticePeriod: "",
  ctcMin: "",
  ctcMax: "",
  availability: "",
};

function exportToCSV(data: any[]) {
  const csvRows = [];
  const headers = [
    "Name",
    "Title",
    "Location",
    "Experience",
    "Education",
    "Company",
    "Skills",
    "Last Active",
  ];
  csvRows.push(headers.join(","));
  for (const c of data) {
    csvRows.push(
      [
        c.name,
        c.title,
        c.location,
        c.experience,
        c.education,
        c.currentCompany,
        c.skills.join(" | "),
        c.lastActive,
      ]
        .map((v) => '"' + v + '"')
        .join(",")
    );
  }
  const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "candidates.csv";
  a.click();
  window.URL.revokeObjectURL(url);
}

const SourceResume = () => {
  const [step, setStep] = useState(1);
  const [showDownloadDropdown, setShowDownloadDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [booleanMode, setBooleanMode] = useState(false);
  const [filters, setFilters] = useState(initialFilters);
  const [candidates, setCandidates] = useState<CandidateDisplay[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateDisplay | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [sidebarView, setSidebarView] = useState("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBulkDropdown, setShowBulkDropdown] = useState(false);
  const [showDeliverModal, setShowDeliverModal] = useState(false);
  const [selectedRequirement, setSelectedRequirement] = useState("");
  const [candidateToDeliver, setCandidateToDeliver] = useState<any>(null);
  const [isDelivering, setIsDelivering] = useState(false);
  const resultsPerPage = 6;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch candidates from the database
  const { data: dbCandidates = [], isLoading: isLoadingCandidates, isError: isErrorCandidates } = useQuery<DatabaseCandidate[]>({
    queryKey: ['/api/admin/candidates'],
  });

  // Map database candidates to display format and update state
  useEffect(() => {
    const mappedCandidates = dbCandidates.map(mapDatabaseCandidateToDisplay);
    setCandidates(mappedCandidates);
    // Reset pagination when data changes
    setCurrentPage(1);
    if (mappedCandidates.length > 0) {
      if (!selectedCandidate || !mappedCandidates.find(c => c.id === selectedCandidate.id)) {
        setSelectedCandidate(mappedCandidates[0]);
      }
    } else {
      setSelectedCandidate(null);
    }
  }, [dbCandidates]);

  // Derive unique values from candidates for filter suggestions
  const uniqueLocations = Array.from(new Set(candidates.map(c => c.location).filter(Boolean)));
  const uniqueRoles = Array.from(new Set(candidates.map(c => c.title).filter(Boolean)));
  const uniqueCompanies = Array.from(new Set(candidates.map(c => c.currentCompany).filter(Boolean)));
  const uniqueCompanyLevels = Array.from(new Set(candidates.map(c => c.companyLevel).filter(Boolean)));
  const uniqueProductDomains = Array.from(new Set(candidates.map(c => c.productDomain).filter(Boolean)));
  const uniqueEmploymentTypes = Array.from(new Set(candidates.map(c => c.employmentType).filter(Boolean)));
  const uniquePedigreeLevels = Array.from(new Set(candidates.map(c => c.pedigreeLevel).filter(Boolean)));
  const uniqueCompanySectors = Array.from(new Set(candidates.map(c => c.companySector).filter(Boolean)));
  const uniqueProductServices = Array.from(new Set(candidates.map(c => c.productService).filter(Boolean)));
  const uniqueProductCategories = Array.from(new Set(candidates.map(c => c.productCategory).filter(Boolean)));

  // Fetch only requirements assigned to this recruiter (not all admin requirements)
  const { data: requirements = [], isLoading: isLoadingRequirements, isError: isErrorRequirements } = useQuery({
    queryKey: ['/api/recruiter/requirements'],
    enabled: step === 2,
  });

  // Mutation for creating job application when delivering candidate to requirement
  const deliverToRequirementMutation = useMutation({
    mutationFn: async (data: { 
      candidateName: string;
      candidateEmail: string;
      candidatePhone: string;
      jobTitle: string;
      company: string;
      requirementId: string;
      experience: string;
      skills: string[];
      location: string;
    }) => {
      const response = await apiRequest('POST', '/api/recruiter/applications', data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/recruiter/applications'] });
      toast({
        title: "Success!",
        description: `${candidateToDeliver?.name} has been delivered to the requirement successfully.`,
        className: "bg-green-50 border-green-200 text-green-800",
      });
      setShowDeliverModal(false);
      setSelectedRequirement("");
      setCandidateToDeliver(null);
      setIsDelivering(false);
    },
    onError: (error: any) => {
      console.error("Delivery error:", error);
      const errorMessage = error?.message?.includes('401') 
        ? "Authentication required. Please log in as a recruiter."
        : "Failed to deliver candidate to requirement. Please try again.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      setIsDelivering(false);
    }
  });

  // Show error toast if requirements fetch fails
  React.useEffect(() => {
    if (isErrorRequirements && step === 2) {
      toast({
        title: "Error",
        description: "Failed to load requirements. Please try again later.",
        variant: "destructive",
      });
    }
  }, [isErrorRequirements, step, toast]);

  const resetFilters = () => {
    setFilters(initialFilters);
    setSearchQuery("");
    setBooleanMode(false);
    setCurrentPage(1);
  };

  // Reset pagination when filters, search, or sidebar view change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, searchQuery, sidebarView]);

  // Filtering logic
  const filterCandidates = () => {
    let list = candidates;
    if (sidebarView === "saved") list = list.filter((c) => c.saved);
    return list.filter((c) => {
      if (booleanMode && searchQuery.trim()) {
        const terms = searchQuery.split(/\s+(AND|OR)\s+/i);
        let match = false;
        if (terms.includes("AND")) {
          match = terms
            .filter((t) => t !== "AND")
            .every((t) =>
              [c.name, c.title, ...c.skills]
                .join(" ")
                .toLowerCase()
                .includes(t.toLowerCase())
            );
        } else if (terms.includes("OR")) {
          match = terms
            .filter((t) => t !== "OR")
            .some((t) =>
              [c.name, c.title, ...c.skills]
                .join(" ")
                .toLowerCase()
                .includes(t.toLowerCase())
            );
        } else {
          match = [c.name, c.title, ...c.skills]
            .join(" ")
            .toLowerCase()
            .includes(searchQuery.toLowerCase());
        }
        if (!match) return false;
      } else if (searchQuery.trim()) {
        if (
          !(
            c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.skills.some((s) =>
              s.toLowerCase().includes(searchQuery.toLowerCase())
            )
          )
        ) {
          return false;
        }
      }
      if (filters.location && !c.location.toLowerCase().includes(filters.location.toLowerCase())) return false;
      if (
        c.experience < filters.experience[0] ||
        c.experience > filters.experience[1]
      )
        return false;
      if (
        filters.skills.length > 0 &&
        !filters.skills.every((s) => c.skills.some(cs => cs.toLowerCase().includes(s.toLowerCase())))
      )
        return false;
      if (filters.role && !c.title.toLowerCase().includes(filters.role.toLowerCase())) return false;
      if (filters.company && !c.currentCompany.toLowerCase().includes(filters.company.toLowerCase())) return false;
      if (filters.pedigreeLevel && c.pedigreeLevel && !c.pedigreeLevel.toLowerCase().includes(filters.pedigreeLevel.toLowerCase())) return false;
      if (filters.companyLevel && !c.companyLevel.toLowerCase().includes(filters.companyLevel.toLowerCase())) return false;
      if (filters.companySector && c.companySector && !c.companySector.toLowerCase().includes(filters.companySector.toLowerCase())) return false;
      if (filters.productService && c.productService && !c.productService.toLowerCase().includes(filters.productService.toLowerCase())) return false;
      if (filters.productCategory && c.productCategory && !c.productCategory.toLowerCase().includes(filters.productCategory.toLowerCase())) return false;
      if (filters.productDomain && !c.productDomain.toLowerCase().includes(filters.productDomain.toLowerCase())) return false;
      if (filters.employmentType && !c.employmentType.toLowerCase().includes(filters.employmentType.toLowerCase())) return false;
      if (filters.noticePeriod && c.noticePeriod && !c.noticePeriod.toLowerCase().includes(filters.noticePeriod.toLowerCase())) return false;
      if (filters.availability && c.availability && !c.availability.toLowerCase().includes(filters.availability.toLowerCase())) return false;
      if (filters.ctcMin && parseInt(c.ctc.replace(/[^\d]/g, '')) < parseInt(filters.ctcMin)) return false;
      if (filters.ctcMax && parseInt(c.ctc.replace(/[^\d]/g, '')) > parseInt(filters.ctcMax)) return false;
      return true;
    });
  };

  const filteredCandidates = filterCandidates();
  const totalPages = Math.ceil(filteredCandidates.length / resultsPerPage) || 1;
  
  // Clamp currentPage to valid range whenever filtered results change
  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(filteredCandidates.length / resultsPerPage));
    if (currentPage > maxPage) {
      setCurrentPage(maxPage);
    }
  }, [filteredCandidates.length, currentPage, resultsPerPage]);
  
  const paginatedCandidates = filteredCandidates.slice(
    (currentPage - 1) * resultsPerPage,
    currentPage * resultsPerPage
  );

  // Handlers
  const handleSkillAdd = (skill: string) => {
    if (skill && !filters.skills.includes(skill)) {
      setFilters({ ...filters, skills: [...filters.skills, skill] });
    }
  };
  const handleSkillRemove = (skill: string) => {
    setFilters({
      ...filters,
      skills: filters.skills.filter((s) => s !== skill),
    });
  };
  const handleSaveCandidate = (id: string) => {
    setCandidates((prev) =>
      prev.map((c) => (c.id === id ? { ...c, saved: !c.saved } : c))
    );
    if (selectedCandidate && selectedCandidate.id === id) {
      setSelectedCandidate((prev) => prev ? { ...prev, saved: !prev.saved } : null);
    }
  };
  const handleSelectCandidate = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
    );
  };
  const handleSelectAll = () => {
    if (paginatedCandidates.every((c) => selectedIds.includes(c.id))) {
      setSelectedIds((prev) =>
        prev.filter((id) => !paginatedCandidates.some((c) => c.id === id))
      );
    } else {
      setSelectedIds((prev) => 
        Array.from(new Set([...prev, ...paginatedCandidates.map((c) => c.id)]))
      );
    }
  };
  const handleBulkAction = (action: string) => {
    if (action === "save") {
      setCandidates((prev) =>
        prev.map((c) =>
          selectedIds.includes(c.id) ? { ...c, saved: true } : c
        )
      );
    } else if (action === "unsave") {
      setCandidates((prev) =>
        prev.map((c) =>
          selectedIds.includes(c.id) ? { ...c, saved: false } : c
        )
      );
    }
    setShowBulkDropdown(false);
    setSelectedIds([]);
  };

  const handleDeliverToRequirement = (candidate: any) => {
    setCandidateToDeliver(candidate);
    setShowDeliverModal(true);
  };

  const handleConfirmDelivery = () => {
    if (selectedRequirement && candidateToDeliver) {
      setIsDelivering(true);
      
      const selectedReq = (requirements as any[]).find((req: any) => req.id === selectedRequirement);
      
      deliverToRequirementMutation.mutate({
        candidateName: candidateToDeliver.name,
        candidateEmail: candidateToDeliver.email || '',
        candidatePhone: candidateToDeliver.phone || '',
        jobTitle: selectedReq?.position || candidateToDeliver.title,
        company: selectedReq?.company || '',
        requirementId: selectedRequirement,
        experience: candidateToDeliver.experience?.toString() || '',
        skills: candidateToDeliver.skills || [],
        location: candidateToDeliver.location || '',
      });
    }
  };

  // UI
  if (step === 1) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-5xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                Source Resume
              </h2>
              <p className="text-gray-600 mt-1">
                {isLoadingCandidates 
                  ? "Loading candidates..." 
                  : `Find the perfect candidates from ${candidates.length} profiles`}
              </p>
            </div>
            <button
              onClick={resetFilters}
              className="p-2.5 rounded-full hover:bg-gray-100 transition-colors"
              data-testid="button-reset-filters"
            >
              <RotateCw className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Quick Search</label>
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <input
                  type="text"
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                  placeholder={
                    booleanMode
                      ? "Boolean search (e.g. React AND Node.js)"
                      : "Search by name, skill, company..."
                  }
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  data-testid="input-search-filter"
                />
                <button
                  className={`absolute right-3 top-3 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    booleanMode
                      ? "bg-purple-600 text-white shadow-md"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                  onClick={() => setBooleanMode((v) => !v)}
                  type="button"
                  data-testid="button-boolean-toggle"
                >
                  Boolean
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* Location */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <MapPin size={16} className="text-purple-600" />
                Location
              </label>
              <ComboInput
                value={filters.location}
                onChange={(value) => setFilters({ ...filters, location: value })}
                suggestions={[...allLocations, ...uniqueLocations]}
                placeholder="Type or select location..."
                testId="input-location"
              />
            </div>

            {/* Role */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <Briefcase size={16} className="text-purple-600" />
                Role
              </label>
              <ComboInput
                value={filters.role}
                onChange={(value) => setFilters({ ...filters, role: value })}
                suggestions={[...allRoles, ...uniqueRoles]}
                placeholder="Type or select role..."
                testId="input-role"
              />
            </div>

            {/* Notice Period */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <Calendar size={16} className="text-purple-600" />
                Notice Period
              </label>
              <ComboInput
                value={filters.noticePeriod}
                onChange={(value) => setFilters({ ...filters, noticePeriod: value })}
                suggestions={allNoticePeriods}
                placeholder="Type or select notice period..."
                testId="input-notice-period"
              />
            </div>

            {/* Experience Range */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <Briefcase size={16} className="text-purple-600" />
                Experience (years)
              </label>
              <div className="flex gap-2 items-center">
                <input
                  type="number"
                  min={0}
                  max={filters.experience[1]}
                  value={filters.experience[0]}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      experience: [
                        parseInt(e.target.value) || 0,
                        filters.experience[1],
                      ],
                    })
                  }
                  className="w-20 border-2 border-gray-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  data-testid="input-exp-min"
                />
                <span className="text-gray-500">to</span>
                <input
                  type="number"
                  min={filters.experience[0]}
                  max={15}
                  value={filters.experience[1]}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      experience: [
                        filters.experience[0],
                        parseInt(e.target.value) || 15,
                      ],
                    })
                  }
                  className="w-20 border-2 border-gray-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  data-testid="input-exp-max"
                />
              </div>
            </div>

            {/* CTC Range */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <DollarSign size={16} className="text-purple-600" />
                CTC Range (Lakhs)
              </label>
              <div className="flex gap-2 items-center">
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.ctcMin}
                  onChange={(e) =>
                    setFilters({ ...filters, ctcMin: e.target.value })
                  }
                  className="w-20 border-2 border-gray-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  data-testid="input-ctc-min"
                />
                <span className="text-gray-500">to</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.ctcMax}
                  onChange={(e) =>
                    setFilters({ ...filters, ctcMax: e.target.value })
                  }
                  className="w-20 border-2 border-gray-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  data-testid="input-ctc-max"
                />
              </div>
            </div>

            {/* Availability */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <Clock size={16} className="text-purple-600" />
                Availability
              </label>
              <ComboInput
                value={filters.availability}
                onChange={(value) => setFilters({ ...filters, availability: value })}
                suggestions={allAvailability}
                placeholder="Type or select availability..."
                testId="input-availability"
              />
            </div>

            {/* Skills */}
            <div className="md:col-span-3 space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <GraduationCap size={16} className="text-purple-600" />
                Skills
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {filters.skills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center rounded-full bg-purple-100 px-3 py-1.5 text-sm text-purple-800 font-medium"
                  >
                    {skill}
                    <button
                      type="button"
                      onClick={() => handleSkillRemove(skill)}
                      className="ml-2 rounded-full bg-purple-200 px-1.5 text-xs text-purple-800 hover:bg-purple-300 transition-colors"
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
              <input
                type="text"
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                placeholder="Type a skill and press Enter"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.target as HTMLInputElement).value) {
                    handleSkillAdd((e.target as HTMLInputElement).value);
                    (e.target as HTMLInputElement).value = "";
                  }
                }}
                data-testid="input-skill-add"
              />
              <div className="flex flex-wrap gap-2 mt-3">
                {allSkills.map((skill) => (
                  <button
                    key={skill}
                    type="button"
                    className="text-sm bg-gradient-to-r from-gray-100 to-gray-50 text-gray-800 px-3 py-1.5 rounded-lg hover:from-purple-100 hover:to-purple-50 hover:text-purple-700 transition-all font-medium border border-gray-200"
                    onClick={() => handleSkillAdd(skill)}
                    data-testid={`button-skill-${skill.toLowerCase()}`}
                  >
                    + {skill}
                  </button>
                ))}
              </div>
            </div>

            {/* Advanced Filters */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <Building size={16} className="text-purple-600" />
                Company
              </label>
              <ComboInput
                value={filters.company}
                onChange={(value) => setFilters({ ...filters, company: value })}
                suggestions={[...allCompanies, ...uniqueCompanies]}
                placeholder="Type or select company..."
                testId="input-company"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Pedigree Level</label>
              <ComboInput
                value={filters.pedigreeLevel}
                onChange={(value) => setFilters({ ...filters, pedigreeLevel: value })}
                suggestions={[...allPedigreeLevels, ...uniquePedigreeLevels]}
                placeholder="Type or select pedigree level..."
                testId="input-pedigree"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Company Level</label>
              <ComboInput
                value={filters.companyLevel}
                onChange={(value) => setFilters({ ...filters, companyLevel: value })}
                suggestions={allCompanyLevels}
                placeholder="Type or select company level..."
                testId="input-company-level"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Company Sector</label>
              <ComboInput
                value={filters.companySector}
                onChange={(value) => setFilters({ ...filters, companySector: value })}
                suggestions={[...allCompanySectors, ...uniqueCompanySectors]}
                placeholder="Type or select company sector..."
                testId="input-company-sector"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Product/Service</label>
              <ComboInput
                value={filters.productService}
                onChange={(value) => setFilters({ ...filters, productService: value })}
                suggestions={[...allProductServices, ...uniqueProductServices]}
                placeholder="Type or select product/service..."
                testId="input-product-service"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Product Category</label>
              <ComboInput
                value={filters.productCategory}
                onChange={(value) => setFilters({ ...filters, productCategory: value })}
                suggestions={[...allProductCategories, ...uniqueProductCategories]}
                placeholder="Type or select product category..."
                testId="input-product-category"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Product Domain</label>
              <ComboInput
                value={filters.productDomain}
                onChange={(value) => setFilters({ ...filters, productDomain: value })}
                suggestions={allProductDomains}
                placeholder="Type or select product domain..."
                testId="input-product-domain"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Employment Type</label>
              <ComboInput
                value={filters.employmentType}
                onChange={(value) => setFilters({ ...filters, employmentType: value })}
                suggestions={allEmploymentTypes}
                placeholder="Type or select employment type..."
                testId="input-employment-type"
              />
            </div>
          </div>
        </div>

        {/* Floating Source Resume Button */}
        <button
          className="fixed bottom-8 right-8 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-4 rounded-full font-semibold text-lg shadow-2xl hover:shadow-purple-500/50 hover:scale-105 transition-all duration-300 flex items-center gap-3 z-50"
          onClick={() => setStep(2)}
          data-testid="button-source-resume"
        >
          <span>Source Resume</span>
          <ArrowLeft className="rotate-180" size={20} />
        </button>
      </div>
    );
  }

  // Step 2: Results UI - Three section layout
  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <div className="flex flex-1 overflow-hidden">
      {/* Left Section - Filters */}
      <aside className="bg-white border-r w-80 flex-shrink-0 flex flex-col p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-purple-700">Filters</h2>
          <button
            onClick={resetFilters}
            className="p-1.5 rounded-full hover:bg-gray-100"
            data-testid="button-reset-filters-results"
          >
            <RotateCw className="w-5 h-5 text-gray-600" />
          </button>
        </div>
        
        <div className="flex items-center justify-center mb-4 bg-gray-100 rounded-lg p-1">
          <button
            className={`flex-1 text-center px-3 py-2 rounded-md text-sm font-medium transition-all ${
              sidebarView === "all"
                ? "bg-white text-blue-600 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
            onClick={() => setSidebarView("all")}
            data-testid="button-all-candidates"
          >
            All Candidates
          </button>
          <button
            className={`flex-1 text-center px-3 py-2 rounded-md text-sm font-medium transition-all ${
              sidebarView === "saved"
                ? "bg-white text-blue-600 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
            onClick={() => setSidebarView("saved")}
            data-testid="button-saved-candidates"
          >
            Saved
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4">
          <div>
            <label className="block text-base font-medium mb-1">Search</label>
            <input
              type="text"
              className="w-full border rounded-lg px-3 py-2 text-base focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              placeholder="Search by name, skill, company..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-testid="input-search-sidebar"
            />
            <button
              className={`mt-1 px-2 py-1 rounded text-sm ${
                booleanMode
                  ? "bg-purple-600 text-white"
                  : "bg-gray-200 text-gray-700"
              }`}
              onClick={() => setBooleanMode((v) => !v)}
              type="button"
              data-testid="button-boolean-sidebar"
            >
              Boolean
            </button>
          </div>

          <div>
            <label className="block text-base font-medium mb-1">Location</label>
            <ComboInput
              value={filters.location}
              onChange={(value) => setFilters({ ...filters, location: value })}
              suggestions={[...allLocations, ...uniqueLocations]}
              placeholder="Type or select location..."
              testId="input-location-sidebar"
            />
          </div>

          <div>
            <label className="block text-base font-medium mb-1">Experience (years)</label>
            <div className="flex gap-2 items-center">
              <input
                type="number"
                min={0}
                max={filters.experience[1]}
                value={filters.experience[0]}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    experience: [
                      parseInt(e.target.value) || 0,
                      filters.experience[1],
                    ],
                  })
                }
                className="w-16 border rounded-lg px-2 py-1 text-base"
              />
              <span className="text-base">-</span>
              <input
                type="number"
                min={filters.experience[0]}
                max={15}
                value={filters.experience[1]}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    experience: [
                      filters.experience[0],
                      parseInt(e.target.value) || 15,
                    ],
                  })
                }
                className="w-16 border rounded-lg px-2 py-1 text-base"
              />
            </div>
          </div>

          <div>
            <label className="block text-base font-medium mb-1">Notice Period</label>
            <select
              className="w-full border rounded-lg px-3 py-2 text-base"
              value={filters.noticePeriod}
              onChange={(e) =>
                setFilters({ ...filters, noticePeriod: e.target.value })
              }
              data-testid="select-notice-sidebar"
            >
              <option value="">Any</option>
              {allNoticePeriods.map((period) => (
                <option key={period} value={period}>
                  {period}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-base font-medium mb-1">CTC Range (₹L)</label>
            <div className="flex gap-2 items-center">
              <input
                type="number"
                placeholder="Min"
                value={filters.ctcMin}
                onChange={(e) =>
                  setFilters({ ...filters, ctcMin: e.target.value })
                }
                className="w-20 border rounded-lg px-2 py-1 text-sm"
              />
              <span>-</span>
              <input
                type="number"
                placeholder="Max"
                value={filters.ctcMax}
                onChange={(e) =>
                  setFilters({ ...filters, ctcMax: e.target.value })
                }
                className="w-20 border rounded-lg px-2 py-1 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-base font-medium mb-1">Availability</label>
            <select
              className="w-full border rounded-lg px-3 py-2 text-base"
              value={filters.availability}
              onChange={(e) =>
                setFilters({ ...filters, availability: e.target.value })
              }
              data-testid="select-availability-sidebar"
            >
              <option value="">Any</option>
              {allAvailability.map((avail) => (
                <option key={avail} value={avail}>
                  {avail}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-base font-medium mb-1">Skills</label>
            <div className="mb-2">
              {filters.skills.map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center rounded-full bg-purple-100 px-2 py-1 text-sm text-purple-800 mr-1 mb-1"
                >
                  {skill}
                  <button
                    type="button"
                    onClick={() => handleSkillRemove(skill)}
                    className="ml-1 rounded-full bg-purple-200 px-1 text-xs text-purple-800 hover:bg-purple-300"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <input
              type="text"
              className="w-full border rounded-lg px-3 py-2 text-base"
              placeholder="Add a skill and press Enter"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.target as HTMLInputElement).value) {
                  handleSkillAdd((e.target as HTMLInputElement).value);
                  (e.target as HTMLInputElement).value = "";
                }
              }}
            />
            <div className="flex flex-wrap gap-1 mt-2">
              {allSkills.map((skill) => (
                <button
                  key={skill}
                  type="button"
                  className="text-sm px-2 py-1 rounded-lg bg-gray-100 text-gray-700 hover:bg-purple-100"
                  onClick={() => handleSkillAdd(skill)}
                >
                  {skill}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-base font-medium mb-1">Role</label>
            <ComboInput
              value={filters.role}
              onChange={(value) => setFilters({ ...filters, role: value })}
              suggestions={[...allRoles, ...uniqueRoles]}
              placeholder="Type or select role..."
              testId="input-role-sidebar"
            />
          </div>

          <div>
            <label className="block text-base font-medium mb-1">Pedigree Level</label>
            <ComboInput
              value={filters.pedigreeLevel}
              onChange={(value) => setFilters({ ...filters, pedigreeLevel: value })}
              suggestions={Array.from(new Set([...allPedigreeLevels, ...uniquePedigreeLevels]))}
              placeholder="Type or select pedigree level..."
              testId="input-pedigree-sidebar"
            />
          </div>

          <div>
            <label className="block text-base font-medium mb-1">Company Level</label>
            <ComboInput
              value={filters.companyLevel}
              onChange={(value) => setFilters({ ...filters, companyLevel: value })}
              suggestions={Array.from(new Set([...allCompanyLevels, ...uniqueCompanyLevels]))}
              placeholder="Type or select company level..."
              testId="input-company-level-sidebar"
            />
          </div>

          <div>
            <label className="block text-base font-medium mb-1">Company Sector</label>
            <ComboInput
              value={filters.companySector}
              onChange={(value) => setFilters({ ...filters, companySector: value })}
              suggestions={Array.from(new Set([...allCompanySectors, ...uniqueCompanySectors]))}
              placeholder="Type or select company sector..."
              testId="input-company-sector-sidebar"
            />
          </div>

          <div>
            <label className="block text-base font-medium mb-1">Product/Service</label>
            <ComboInput
              value={filters.productService}
              onChange={(value) => setFilters({ ...filters, productService: value })}
              suggestions={Array.from(new Set([...allProductServices, ...uniqueProductServices]))}
              placeholder="Type or select product/service..."
              testId="input-product-service-sidebar"
            />
          </div>

          <div>
            <label className="block text-base font-medium mb-1">Product Category</label>
            <ComboInput
              value={filters.productCategory}
              onChange={(value) => setFilters({ ...filters, productCategory: value })}
              suggestions={Array.from(new Set([...allProductCategories, ...uniqueProductCategories]))}
              placeholder="Type or select product category..."
              testId="input-product-category-sidebar"
            />
          </div>

          <div>
            <label className="block text-base font-medium mb-1">Product Domain</label>
            <ComboInput
              value={filters.productDomain}
              onChange={(value) => setFilters({ ...filters, productDomain: value })}
              suggestions={Array.from(new Set([...allProductDomains, ...uniqueProductDomains]))}
              placeholder="Type or select product domain..."
              testId="input-product-domain-sidebar"
            />
          </div>

          <div>
            <label className="block text-base font-medium mb-1">Employment Type</label>
            <ComboInput
              value={filters.employmentType}
              onChange={(value) => setFilters({ ...filters, employmentType: value })}
              suggestions={Array.from(new Set([...allEmploymentTypes, ...uniqueEmploymentTypes]))}
              placeholder="Type or select employment type..."
              testId="input-employment-type-sidebar"
            />
          </div>
        </div>
      </aside>

      {/* Center Section - Profiles (Scrollable) */}
      <main className="flex-1 flex flex-col bg-white border-r">
        {/* Search Header - Fixed */}
        <div className="p-4 border-b bg-white">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1 relative max-w-md">
              <input
                type="text"
                className="w-full border rounded px-4 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                placeholder="Search by name, skill, company..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="input-search-main"
              />
              <button
                className={`absolute right-2 top-2 px-2 py-1 rounded text-xs ${
                  booleanMode
                    ? "bg-purple-600 text-white"
                    : "bg-gray-200 text-gray-700"
                }`}
                onClick={() => setBooleanMode((v) => !v)}
                type="button"
                data-testid="button-boolean-main"
              >
                Boolean
              </button>
            </div>
            <div className="flex items-center gap-2 ml-4">
              <button
                className="flex items-center gap-2 px-3 py-2 bg-purple-600 text-white rounded text-sm hover:bg-purple-700"
                data-testid="button-bulk-actions"
              >
                Bulk Actions
              </button>
              <button 
                onClick={() => exportToCSV(filteredCandidates)}
                className="flex items-center gap-2 px-3 py-2 border border-gray-300 text-gray-700 rounded text-sm hover:bg-gray-50"
                data-testid="button-export"
              >
                Export
              </button>
              <button
                onClick={() => {
                  if (window.history.length > 1) {
                    window.history.back();
                  } else {
                    setLocation('/recruiter-login-2');
                  }
                }}
                className="flex items-center gap-2 px-3 py-2 border border-gray-300 text-gray-700 rounded text-sm hover:bg-gray-50"
                data-testid="button-back"
              >
                <ArrowLeft size={16} />
                Back
              </button>
            </div>
          </div>
        </div>

        {/* Profiles List - Scrollable */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Loading State */}
          {isLoadingCandidates && (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <Loader2 className="w-8 h-8 animate-spin mb-4 text-purple-600" />
              <p>Loading candidates...</p>
            </div>
          )}
          
          {/* Error State */}
          {isErrorCandidates && !isLoadingCandidates && (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                <p className="text-red-600 font-medium">Failed to load candidates</p>
                <p className="text-red-500 text-sm mt-1">Please try refreshing the page</p>
              </div>
            </div>
          )}
          
          {/* Empty State */}
          {!isLoadingCandidates && !isErrorCandidates && candidates.length === 0 && (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
                <p className="font-medium">No candidates found</p>
                <p className="text-sm mt-1">Add candidates through Master Database or candidate registrations</p>
              </div>
            </div>
          )}
          
          {/* No Results State */}
          {!isLoadingCandidates && !isErrorCandidates && candidates.length > 0 && filteredCandidates.length === 0 && (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
                <p className="text-yellow-700 font-medium">No matches found</p>
                <p className="text-yellow-600 text-sm mt-1">Try adjusting your filters or search criteria</p>
                <button
                  onClick={resetFilters}
                  className="mt-3 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700"
                >
                  Reset Filters
                </button>
              </div>
            </div>
          )}
          
          {/* Candidates List - Only show when we have candidates on this page */}
          {!isLoadingCandidates && !isErrorCandidates && paginatedCandidates.length > 0 && (
          <div className="space-y-4">
            {paginatedCandidates.map((candidate) => (
              <div
                key={candidate.id}
                className={`border-2 rounded-2xl p-4 cursor-pointer transition-all ${
                  selectedCandidate?.id === candidate.id
                    ? "border-purple-500 bg-purple-50"
                    : "border-purple-200 hover:border-purple-300 bg-white"
                }`}
                onClick={() => setSelectedCandidate(candidate)}
                data-testid={`card-candidate-${candidate.id}`}
              >
                <div className="flex items-start gap-4">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(candidate.id)}
                    onChange={(e) => {
                      e.stopPropagation();
                      handleSelectCandidate(candidate.id);
                    }}
                    className="mt-2"
                    data-testid={`checkbox-candidate-${candidate.id}`}
                  />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg text-gray-900">{candidate.name}</h3>
                        <p className="text-blue-600 font-medium">{candidate.title}</p>
                        <div className="flex items-center gap-6 mt-1 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Briefcase size={16} />
                            {candidate.experience} years
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin size={16} />
                            {candidate.location}
                          </span>
                          <span className="flex items-center gap-1">
                            <GraduationCap size={16} />
                            {candidate.education}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 mt-1 text-sm text-gray-500">
                          <Briefcase size={16} />
                          {candidate.currentCompany}
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {candidate.skills.map((skill, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                        <p className="text-sm text-gray-600 mt-2 line-clamp-2">{candidate.summary}</p>
                        <div className="flex items-center gap-1 mt-1 text-sm text-gray-500">
                          <Clock size={12} />
                          Last active: {candidate.lastActive}
                        </div>

                        {/* Buttons at Bottom */}
                        <div className="flex items-center gap-2 mt-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSaveCandidate(candidate.id);
                            }}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                              candidate.saved
                                ? "bg-purple-100 text-purple-700 border border-purple-300"
                                : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                            }`}
                            data-testid={`button-save-${candidate.id}`}
                          >
                            {candidate.saved ? "Saved" : "Save"}
                          </button>
                          <button 
                            onClick={(e) => e.stopPropagation()}
                            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                            data-testid={`button-view-resume-${candidate.id}`}
                          >
                            View Resume
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeliverToRequirement(candidate);
                            }}
                            className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 flex items-center gap-1"
                            data-testid={`button-deliver-${candidate.id}`}
                          >
                            <Send size={14} />
                            Tag to Requirement
                          </button>
                        </div>
                      </div>

                      {/* Profile Pic on Right */}
                      <div className="flex-shrink-0">
                        {candidate.profilePic ? (
                          <img
                            src={candidate.profilePic}
                            alt={candidate.name}
                            className="w-20 h-20 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-400 to-blue-400 text-white flex items-center justify-center font-semibold text-xl shadow-md">
                            {candidate.name.split(' ').map(n => n[0]).join('')}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          )}
        </div>
      </main>

      {/* Right Section - Candidate Details (Larger) */}
      {selectedCandidate && (
        <aside className="w-96 bg-white p-4">
          <div className="flex flex-col items-center text-center mb-4">
            {selectedCandidate.profilePic ? (
              <img
                src={selectedCandidate.profilePic}
                alt={selectedCandidate.name}
                className="w-20 h-20 rounded-full object-cover mb-3"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-400 to-blue-400 text-white flex items-center justify-center font-semibold text-2xl mb-3 shadow-md">
                {selectedCandidate.name.split(' ').map(n => n[0]).join('')}
              </div>
            )}
            <h3 className="font-bold text-xl text-gray-900">{selectedCandidate.name}</h3>
            <p className="text-purple-600 font-medium text-lg">{selectedCandidate.title}</p>
            <p className="text-gray-500">{selectedCandidate.location}</p>
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-gray-700 text-sm leading-relaxed">{selectedCandidate.summary}</p>
            </div>

            <div>
              <p className="font-semibold text-gray-900">Current Company: <span className="font-normal">{selectedCandidate.currentCompany}</span></p>
            </div>

            <div>
              <p className="font-semibold text-gray-900">Experience: <span className="font-normal">{selectedCandidate.experience} years</span></p>
            </div>

            <div>
              <p className="font-semibold text-gray-900">Education: <span className="font-normal">{selectedCandidate.education}</span></p>
            </div>

            <div>
              <p className="font-semibold text-gray-900">Notice Period: <span className="font-normal">{selectedCandidate.noticePeriod}</span></p>
            </div>

            <div className="flex justify-between">
              <div>
                <p className="font-semibold text-gray-900">CTC: <span className="font-normal">{selectedCandidate.ctc}</span></p>
              </div>
              <div>
                <p className="font-semibold text-gray-900">Expected: <span className="font-normal">{selectedCandidate.expectedCtc}</span></p>
              </div>
            </div>

            <div>
              <p className="font-semibold text-gray-900">Email: <span className="font-normal">{selectedCandidate.email}</span></p>
            </div>

            <div>
              <p className="font-semibold text-gray-900">Phone: <span className="font-normal">{selectedCandidate.phone}</span></p>
            </div>

            <div className="flex flex-wrap gap-1">
              {selectedCandidate.skills.map((skill, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs"
                >
                  {skill}
                </span>
              ))}
            </div>

            <div className="flex gap-2 mt-4">
              <button 
                onClick={() => {
                  handleSaveCandidate(selectedCandidate.id);
                }}
                className={`p-2 border rounded-lg transition-colors ${
                  selectedCandidate.saved
                    ? "bg-blue-100 border-blue-300 text-blue-600 hover:bg-blue-200"
                    : "border-gray-300 text-gray-600 hover:bg-gray-50"
                }`}
                data-testid="button-save-candidate"
              >
                {selectedCandidate.saved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
              </button>
              <button 
                onClick={() => {
                  if (window.confirm(`Do you want to call ${selectedCandidate.name} at ${selectedCandidate.phone}?`)) {
                    // Handle phone call action
                  }
                }}
                className="p-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
                data-testid="button-call-candidate"
              >
                <Phone size={16} />
              </button>
              <button 
                onClick={() => {
                  if (window.confirm(`Do you want to send an email to ${selectedCandidate.name} at ${selectedCandidate.email}?`)) {
                    // Handle email action
                  }
                }}
                className="p-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
                data-testid="button-email-candidate"
              >
                <Mail size={16} />
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* Fixed Download Button with Dropdown - Bottom Right */}
      {selectedCandidate && (
        <div className="fixed bottom-6 right-6 z-50">
          <div className="relative">
            <button 
              onClick={() => setShowDownloadDropdown(!showDownloadDropdown)}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-lg"
              data-testid="button-download-dropdown"
            >
              <Download size={20} />
              Download
              <ChevronDown size={16} className={`transition-transform ${showDownloadDropdown ? 'rotate-180' : ''}`} />
            </button>
            
            {showDownloadDropdown && (
              <div className="absolute bottom-full right-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-xl py-2 min-w-48">
                <button 
                  onClick={() => {
                    setShowDownloadDropdown(false);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2"
                  data-testid="button-download-resume"
                >
                  <Download size={16} />
                  Resume (PDF)
                </button>
                <button 
                  onClick={() => {
                    setShowDownloadDropdown(false);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2"
                  data-testid="button-download-profile"
                >
                  <Download size={16} />
                  Profile Summary
                </button>
                <button 
                  onClick={() => {
                    setShowDownloadDropdown(false);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2"
                  data-testid="button-download-contact"
                >
                  <Download size={16} />
                  Contact Details
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      </div>

      {/* Tag to Requirement Modal */}
      <Dialog open={showDeliverModal} onOpenChange={setShowDeliverModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tag Candidate to Requirement</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <p className="text-sm text-gray-600">
                Delivering: <span className="font-semibold text-gray-900">{candidateToDeliver?.name}</span>
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Requirement</label>
              {isLoadingRequirements ? (
                <div 
                  className="flex h-10 w-full items-center justify-between rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500 cursor-not-allowed"
                  data-testid="select-requirement-loading"
                >
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Loading requirements...
                  </span>
                </div>
              ) : isErrorRequirements ? (
                <div 
                  className="flex h-10 w-full items-center justify-between rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 cursor-not-allowed"
                  data-testid="select-requirement-error"
                >
                  <span className="flex items-center gap-2">
                    <X className="h-4 w-4" />
                    Error loading requirements
                  </span>
                </div>
              ) : (
                <Select value={selectedRequirement} onValueChange={setSelectedRequirement}>
                  <SelectTrigger data-testid="select-requirement">
                    <SelectValue placeholder="Choose a requirement" />
                  </SelectTrigger>
                  <SelectContent>
                    {(requirements as any[]).length === 0 ? (
                      <div className="p-4 text-sm text-gray-500 text-center">
                        No requirements assigned to you. Requirements will appear once your Team Lead assigns them.
                      </div>
                    ) : (
                      (requirements as any[])
                        .filter((req: any) => !req.isArchived && req.status !== 'completed')
                        .map((req: any) => (
                          <SelectItem key={req.id} value={req.id} data-testid={`option-req-${req.id}`}>
                            <div className="flex flex-col">
                              <span className="font-medium">{req.position}</span>
                              <span className="text-xs text-gray-500">
                                {req.company} - {req.criticality}
                              </span>
                            </div>
                          </SelectItem>
                        ))
                    )}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeliverModal(false);
                setSelectedRequirement("");
                setCandidateToDeliver(null);
              }}
              data-testid="button-cancel-deliver"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmDelivery}
              disabled={!selectedRequirement || isDelivering}
              className="bg-green-600 hover:bg-green-700"
              data-testid="button-confirm-deliver"
            >
              {isDelivering ? "Delivering..." : "Confirm Delivery"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SourceResume;
