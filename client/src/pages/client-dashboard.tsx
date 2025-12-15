import { useState } from 'react';
import { Link } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Briefcase, FileText, Clock, CheckCircle, XCircle, Pause, User, MapPin, HandHeart, Upload, Edit3, MessageSquare, Minus, Users, Play, Trophy, ArrowLeft, Send, Calendar as CalendarIcon, MoreVertical, HelpCircle, Download } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import SimpleClientHeader from '@/components/dashboard/simple-client-header';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ChatDock } from '@/components/chat/chat-dock';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';

interface ChatUser {
  id: number;
  name: string;
  requirements: number;
  closures: number;
  avatar: string;
  status: string;
}

export default function ClientDashboard() {
  const { toast } = useToast();
  const [sidebarTab, setSidebarTab] = useState('dashboard');
  const [isRolesModalOpen, setIsRolesModalOpen] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [jdText, setJdText] = useState('');
  const [isJdModalOpen, setIsJdModalOpen] = useState(false);
  const [tempJdText, setTempJdText] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedCandidate, setSelectedCandidate] = useState<{id: string, name: string, stage: string} | null>(null);
  const [candidatePopupPosition, setCandidatePopupPosition] = useState<{x: number, y: number} | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isClosureModalOpen, setIsClosureModalOpen] = useState(false);
  const [isHelpChatOpen, setIsHelpChatOpen] = useState(false);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [selectedMetrics, setSelectedMetrics] = useState({
    speed: false,
    quality: false,
    impact: false
  });
  const [printMetrics, setPrintMetrics] = useState({
    speed: true,
    quality: true,
    impact: true
  });

  // Fetch metrics data from API - hooks must be at top level
  const { data: speedMetricsData } = useQuery({
    queryKey: ['/api/client/speed-metrics'],
    initialData: {
      timeToFirstSubmission: 0,
      timeToInterview: 0,
      timeToOffer: 0,
      timeToFill: 0
    }
  });

  const { data: qualityMetricsData } = useQuery({
    queryKey: ['/api/client/quality-metrics'],
    initialData: {
      submissionToShortList: 0,
      interviewToOffer: 0,
      offerAcceptance: 0,
      earlyAttrition: 0
    }
  });

  const { data: impactMetrics } = useQuery({
    queryKey: ['/api/admin/impact-metrics'],
    initialData: [{
      speedToHire: 0,
      revenueImpactOfDelay: 0,
      clientNps: 0,
      candidateNps: 0,
      feedbackTurnAround: 0,
      firstYearRetentionRate: 0,
      fulfillmentRate: 0,
      revenueRecovered: 0
    }]
  });

  const { data: speedChartData } = useQuery({
    queryKey: ['/api/client/speed-metrics-chart'],
    initialData: [
      { month: 'Jan', timeToFirstSubmission: 0, timeToInterview: 0, timeToOffer: 0, timeToFill: 0 },
      { month: 'Feb', timeToFirstSubmission: 0, timeToInterview: 0, timeToOffer: 0, timeToFill: 0 },
      { month: 'Mar', timeToFirstSubmission: 0, timeToInterview: 0, timeToOffer: 0, timeToFill: 0 },
      { month: 'Apr', timeToFirstSubmission: 0, timeToInterview: 0, timeToOffer: 0, timeToFill: 0 },
      { month: 'May', timeToFirstSubmission: 0, timeToInterview: 0, timeToOffer: 0, timeToFill: 0 },
      { month: 'Jun', timeToFirstSubmission: 0, timeToInterview: 0, timeToOffer: 0, timeToFill: 0 }
    ]
  });

  const { data: qualityChartData } = useQuery({
    queryKey: ['/api/client/quality-metrics-chart'],
    initialData: [
      { month: 'Jan', submissionToShortList: 0, interviewToOffer: 0, offerAcceptance: 0, earlyAttrition: 0 },
      { month: 'Feb', submissionToShortList: 0, interviewToOffer: 0, offerAcceptance: 0, earlyAttrition: 0 },
      { month: 'Mar', submissionToShortList: 0, interviewToOffer: 0, offerAcceptance: 0, earlyAttrition: 0 },
      { month: 'Apr', submissionToShortList: 0, interviewToOffer: 0, offerAcceptance: 0, earlyAttrition: 0 },
      { month: 'May', submissionToShortList: 0, interviewToOffer: 0, offerAcceptance: 0, earlyAttrition: 0 },
      { month: 'Jun', submissionToShortList: 0, interviewToOffer: 0, offerAcceptance: 0, earlyAttrition: 0 }
    ]
  });

  // Fetch dashboard stats from API
  const { data: dashboardStats } = useQuery({
    queryKey: ['/api/client/dashboard-stats'],
    initialData: {
      rolesAssigned: 0,
      totalPositions: 0,
      activeRoles: 0,
      successfulHires: 0,
      pausedRoles: 0,
      withdrawnRoles: 0
    }
  });

  // Fetch roles/requirements from API
  const { data: allRolesData, isLoading: isLoadingRoles } = useQuery({
    queryKey: ['/api/client/requirements'],
    initialData: []
  });

  // Fetch pipeline data from API
  const { data: pipelineData, isLoading: isLoadingPipeline } = useQuery({
    queryKey: ['/api/client/pipeline'],
    initialData: []
  });

  // Fetch closure reports from API
  const { data: allClosureReports, isLoading: isLoadingClosures } = useQuery({
    queryKey: ['/api/client/closures'],
    initialData: []
  });

  // Fetch client profile from API
  const { data: clientProfile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ['/api/client/profile'],
    initialData: { name: '', email: '', company: 'Loading...', phone: '', profileLinked: true, clientDetails: null }
  });

  // Mutation for rejecting a candidate
  const rejectCandidateMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const response = await apiRequest('PATCH', `/api/client/applications/${id}/status`, {
        status: 'Rejected',
        reason
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/client/pipeline'] });
      queryClient.invalidateQueries({ queryKey: ['/api/client/dashboard-stats'] });
      toast({
        title: "Candidate Rejected",
        description: "The candidate has been rejected successfully.",
      });
      setSelectedCandidate(null);
      setCandidatePopupPosition(null);
      setRejectReason('');
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to reject candidate. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Mutation for selecting/shortlisting a candidate
  const selectCandidateMutation = useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const response = await apiRequest('PATCH', `/api/client/applications/${id}/status`, {
        status: 'Selected'
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/client/pipeline'] });
      queryClient.invalidateQueries({ queryKey: ['/api/client/dashboard-stats'] });
      toast({
        title: "Candidate Selected",
        description: "The candidate has been selected successfully.",
      });
      setSelectedCandidate(null);
      setCandidatePopupPosition(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to select candidate. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Group pipeline data by stage for the column view
  const pipelineStages = ['L1', 'L2', 'L3', 'Final Round', 'HR Round', 'Offer Stage', 'Closure'];
  const groupedPipeline = pipelineStages.reduce((acc, stage) => {
    acc[stage] = (pipelineData as any[]).filter(c => c.currentStatus === stage);
    return acc;
  }, {} as Record<string, any[]>);

  // Calculate stage counts for sidebar
  const stageCounts = {
    'Sourced': (pipelineData as any[]).filter(c => c.currentStatus === 'Sourced').length,
    'Shortlisted': (pipelineData as any[]).filter(c => c.currentStatus === 'Shortlisted').length,
    'Intro Call': (pipelineData as any[]).filter(c => c.currentStatus === 'Intro Call').length,
    'Assignment': (pipelineData as any[]).filter(c => c.currentStatus === 'Assignment').length,
    'L1': groupedPipeline['L1']?.length || 0,
    'L2': groupedPipeline['L2']?.length || 0,
    'L3': groupedPipeline['L3']?.length || 0,
    'Final Round': groupedPipeline['Final Round']?.length || 0,
    'HR Round': groupedPipeline['HR Round']?.length || 0,
    'Offer Stage': groupedPipeline['Offer Stage']?.length || 0,
    'Closure': groupedPipeline['Closure']?.length || 0,
    'Rejected': (pipelineData as any[]).filter(c => c.currentStatus === 'Rejected').length,
  };

  // Stage color mapping
  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'L1': return { bg: 'bg-green-200', hover: 'hover:bg-green-300', text: 'text-gray-800' };
      case 'L2': return { bg: 'bg-green-300', hover: 'hover:bg-green-400', text: 'text-gray-800' };
      case 'L3': return { bg: 'bg-green-400', hover: 'hover:bg-green-500', text: 'text-gray-800' };
      case 'Final Round': return { bg: 'bg-green-500', hover: 'hover:bg-green-600', text: 'text-white' };
      case 'HR Round': return { bg: 'bg-green-600', hover: 'hover:bg-green-700', text: 'text-white' };
      case 'Offer Stage': return { bg: 'bg-green-700', hover: 'hover:bg-green-800', text: 'text-white' };
      case 'Closure': return { bg: 'bg-green-800', hover: 'hover:bg-green-900', text: 'text-white' };
      default: return { bg: 'bg-gray-200', hover: 'hover:bg-gray-300', text: 'text-gray-800' };
    }
  };

  const firstImpactMetrics = impactMetrics[0] || impactMetrics;

  // Only show top 2 roles in dashboard
  const rolesData = (allRolesData as any[]).slice(0, 2);

  // Recent chats data - static for now
  const recentChats: ChatUser[] = [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-green-100 text-green-800';
      case 'Paused':
        return 'bg-yellow-100 text-yellow-800';
      case 'Withdrawn':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Active':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'Paused':
        return <Pause className="h-4 w-4 text-yellow-600" />;
      case 'Withdrawn':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const renderMainContent = () => {
    switch (sidebarTab) {
      case 'dashboard':
        return (
          <div className="h-full overflow-y-auto">
            {/* Simple Client Header */}
            <SimpleClientHeader 
              companyName={(clientProfile as any)?.company || 'Loading...'}
              clientName={(clientProfile as any)?.name || undefined}
              clientEmail={(clientProfile as any)?.email || undefined}
              onHelpClick={() => setIsHelpChatOpen(true)}
            />
            
            <div className="px-6 py-6 space-y-6">
              {/* Stats Cards - Dark Blue Theme */}
              <div className="bg-slate-700 rounded-lg p-6">
                <div className="grid grid-cols-6 gap-6 text-white">
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-2">
                      <Briefcase className="h-8 w-8" />
                    </div>
                    <div className="text-sm font-medium mb-1">Roles Assigned</div>
                    <div className="text-2xl font-bold">{dashboardStats.rolesAssigned}</div>
                  </div>

                  <div className="text-center">
                    <div className="flex items-center justify-center mb-2">
                      <Users className="h-8 w-8" />
                    </div>
                    <div className="text-sm font-medium mb-1">Total Positions</div>
                    <div className="text-2xl font-bold">{dashboardStats.totalPositions}</div>
                  </div>

                  <div className="text-center">
                    <div className="flex items-center justify-center mb-2">
                      <Play className="h-8 w-8" />
                    </div>
                    <div className="text-sm font-medium mb-1">Active Roles</div>
                    <div className="text-2xl font-bold">{dashboardStats.activeRoles}</div>
                  </div>

                  <div className="text-center">
                    <div className="flex items-center justify-center mb-2">
                      <Trophy className="h-8 w-8 text-green-300" />
                    </div>
                    <div className="text-sm font-medium mb-1 text-green-300">Successful Hires</div>
                    <div className="text-2xl font-bold text-green-300">{dashboardStats.successfulHires}</div>
                  </div>

                  <div className="text-center">
                    <div className="flex items-center justify-center mb-2">
                      <Pause className="h-8 w-8" />
                    </div>
                    <div className="text-sm font-medium mb-1">Paused Roles</div>
                    <div className="text-2xl font-bold">{dashboardStats.pausedRoles}</div>
                  </div>

                  <div className="text-center">
                    <div className="flex items-center justify-center mb-2">
                      <Minus className="h-8 w-8 text-orange-300" />
                    </div>
                    <div className="text-sm font-medium mb-1 text-orange-300">Withdrawn Roles</div>
                    <div className="text-2xl font-bold text-orange-300">{dashboardStats.withdrawnRoles}</div>
                  </div>
                </div>
              </div>

              {/* Roles & Status Table */}
              <div className="bg-white rounded border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-gray-900">Roles & Status</h3>
                  <button 
                    onClick={() => setIsRolesModalOpen(true)}
                    className="text-sm text-blue-600 hover:underline cursor-pointer"
                  >
                    View All
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Role ID</th>
                        <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Roles</th>
                        <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Team</th>
                        <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Recruiter</th>
                        <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Shared on</th>
                        <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Profiles Shared</th>
                        <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Last Active</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {rolesData.map((role, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{role.roleId}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{role.role}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{role.team}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{role.recruiter}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{role.sharedOn}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge variant="secondary" className={`text-xs ${getStatusColor(role.status)}`}>
                              {role.status}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">{role.profilesShared}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{role.lastActive}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* JD Upload Section */}
              <div className="bg-white rounded border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-gray-900">JD Upload</h3>
                  <span className="text-red-500 text-sm">●</span>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    {/* Drag & Drop Upload - Minimized */}
                    <div className="relative">
                      <input
                        type="file"
                        accept=".pdf,.docx,.doc"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setUploadedFile(file);
                          }
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      />
                      <div className="border-2 border-dashed border-gray-300 rounded p-4 text-center hover:border-gray-400 transition-colors cursor-pointer h-32 flex flex-col justify-center">
                        {uploadedFile ? (
                          <>
                            <div className="mb-2">
                              <div className="mx-auto w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                                <FileText className="h-5 w-5 text-green-600" />
                              </div>
                            </div>
                            <p className="text-green-600 text-sm font-medium mb-1">{uploadedFile.name}</p>
                            <p className="text-xs text-gray-500">File uploaded successfully</p>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setUploadedFile(null);
                              }}
                              className="text-xs text-red-500 hover:underline mt-1"
                            >
                              Remove file
                            </button>
                          </>
                        ) : (
                          <>
                            <div className="mb-2">
                              <div className="mx-auto w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                                <Upload className="h-5 w-5 text-gray-400" />
                              </div>
                            </div>
                            <p className="text-gray-600 text-sm font-medium mb-1">Drag & Drop A file here or Click to Browse</p>
                            <p className="text-xs text-gray-500 mb-1">Supported PDF,Docx</p>
                            <p className="text-xs text-gray-500">Max File Size 5MB</p>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Copy & Paste - Minimized */}
                    <div className="relative">
                      <div 
                        onClick={() => {
                          setTempJdText(jdText);
                          setIsJdModalOpen(true);
                        }}
                        className="border-2 border-dashed border-gray-300 rounded p-4 text-center h-32 flex flex-col justify-center hover:border-gray-400 transition-colors cursor-pointer"
                      >
                        {jdText ? (
                          <>
                            <div className="mb-2">
                              <div className="mx-auto w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                                <Edit3 className="h-5 w-5 text-green-600" />
                              </div>
                            </div>
                            <p className="text-green-600 text-sm font-medium mb-1">JD Content Added</p>
                            <p className="text-xs text-gray-500">Click to edit content</p>
                          </>
                        ) : (
                          <>
                            <div className="mb-2">
                              <div className="mx-auto w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                                <Edit3 className="h-5 w-5 text-gray-400" />
                              </div>
                            </div>
                            <p className="text-gray-600 text-sm font-medium">Copy & Paste Or Write Your Own JD</p>
                            <p className="text-xs text-gray-500 mt-1">Click to open editor</p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Skills Section */}
                  <div className="grid grid-cols-3 gap-6 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Primary Skills</label>
                      <Input 
                        placeholder="Enter here..." 
                        className="bg-white border-gray-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Secondary Skills</label>
                      <Input 
                        placeholder="Enter here..." 
                        className="bg-white border-gray-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Knowledge Only</label>
                      <Input 
                        placeholder="Enter here..." 
                        className="bg-white border-gray-300 rounded"
                      />
                    </div>
                  </div>

                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Special Instructions</label>
                    <Input 
                      placeholder="" 
                      className="bg-white border-gray-300 rounded"
                    />
                  </div>
                  
                  {/* Preview & Submit Button */}
                  <div className="flex justify-end">
                    <Button className="bg-cyan-400 hover:bg-cyan-500 text-black font-medium px-8 py-2 rounded">
                      Preview & Submit
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      
      case 'requirements':
        return (
          <div className="flex flex-col h-full">
            {/* Simple Client Header */}
            <SimpleClientHeader 
              companyName={(clientProfile as any)?.company || 'Loading...'}
              clientName={(clientProfile as any)?.name || undefined}
              clientEmail={(clientProfile as any)?.email || undefined}
              onHelpClick={() => setIsHelpChatOpen(true)}
            />
            <div className="flex flex-1 overflow-hidden">
            {/* Main Pipeline Content */}
            <div className="flex-1 overflow-auto">
              <div className="p-6 space-y-6">
                {/* Pipeline Header */}
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">Pipeline</h2>
                  <div className="flex items-center gap-4">
                    <Select>
                      <SelectTrigger className="w-48 rounded">
                        <SelectValue placeholder="All Roles" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Roles</SelectItem>
                        <SelectItem value="active">Active Roles</SelectItem>
                        <SelectItem value="paused">Paused Roles</SelectItem>
                      </SelectContent>
                    </Select>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="rounded">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {format(selectedDate, "dd-MMM-yyyy")}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={(date) => date && setSelectedDate(date)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {/* Pipeline Stages */}
                <Card className="bg-white border border-gray-200">
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr>
                            <th className="text-center p-4 font-medium text-gray-700 bg-gray-100 min-w-[140px]">Level 1</th>
                            <th className="text-center p-4 font-medium text-gray-700 bg-gray-100 min-w-[140px]">Level 2</th>
                            <th className="text-center p-4 font-medium text-gray-700 bg-gray-100 min-w-[140px]">Level 3</th>
                            <th className="text-center p-4 font-medium text-gray-700 bg-gray-100 min-w-[140px]">Final Round</th>
                            <th className="text-center p-4 font-medium text-gray-700 bg-gray-100 min-w-[140px]">HR Round</th>
                            <th className="text-center p-4 font-medium text-gray-700 bg-gray-100 min-w-[140px]">Offer Stage</th>
                            <th className="text-center p-4 font-medium text-gray-700 bg-gray-100 min-w-[140px]">Closure</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            {pipelineStages.map((stage) => {
                              const candidates = groupedPipeline[stage] || [];
                              const colors = getStageColor(stage);
                              return (
                                <td key={stage} className="p-3 align-top">
                                  <div className="flex flex-col gap-2">
                                    {candidates.length === 0 ? (
                                      <div className="px-3 py-2 text-center text-sm text-gray-400">
                                        No candidates
                                      </div>
                                    ) : (
                                      candidates.map((candidate: any) => (
                                        <div 
                                          key={candidate.id}
                                          onClick={(e) => handleCandidateClick(e, candidate, stage)}
                                          className={`px-3 py-2 ${colors.bg} rounded text-center text-sm font-medium ${colors.text} cursor-pointer ${colors.hover} transition-colors relative`}
                                          data-testid={`candidate-card-${candidate.id}`}
                                        >
                                          {candidate.candidateName}
                                          <MoreVertical className="h-3 w-3 absolute top-1 right-1 opacity-50" />
                                        </div>
                                      ))
                                    )}
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                {/* Closure Reports Table */}
                <Card className="mt-6">
                  <CardHeader className="bg-gray-50 border-b border-gray-200">
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-lg font-semibold text-gray-900">Closure report</CardTitle>
                      <button 
                        onClick={() => setIsClosureModalOpen(true)}
                        className="text-sm text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                      >
                        View All
                      </button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-gray-100 border-b border-gray-200">
                            <th className="text-left p-3 font-medium text-gray-700 text-sm">Candidate</th>
                            <th className="text-left p-3 font-medium text-gray-700 text-sm">Positions</th>
                            <th className="text-left p-3 font-medium text-gray-700 text-sm">Talent Advisor</th>
                            <th className="text-left p-3 font-medium text-gray-700 text-sm">Offered Date</th>
                            <th className="text-left p-3 font-medium text-gray-700 text-sm">Joined Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {allClosureReports.slice(0, 5).map((row, index) => (
                            <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                              <td className="p-3 text-gray-900">{row.candidate}</td>
                              <td className="p-3 text-gray-600">{row.position}</td>
                              <td className="p-3 text-gray-600">{row.advisor}</td>
                              <td className="p-3 text-gray-600">{row.offered}</td>
                              <td className="p-3 text-gray-600">{row.joined}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Right Sidebar with Stats */}
            <div className="w-64 bg-white border-l border-gray-200">
              <div className="p-4 space-y-1">
                {[
                  { label: 'SOURCED', stageKey: 'Sourced', color: 'bg-green-100' },
                  { label: 'SHORTLISTED', stageKey: 'Shortlisted', color: 'bg-green-200' },
                  { label: 'INTRO CALL', stageKey: 'Intro Call', color: 'bg-green-300' },
                  { label: 'ASSIGNMENT', stageKey: 'Assignment', color: 'bg-green-400' },
                  { label: 'L1', stageKey: 'L1', color: 'bg-green-500 text-white' },
                  { label: 'L2', stageKey: 'L2', color: 'bg-green-600 text-white' },
                  { label: 'L3', stageKey: 'L3', color: 'bg-green-700 text-white' },
                  { label: 'FINAL ROUND', stageKey: 'Final Round', color: 'bg-green-800 text-white' },
                  { label: 'HR ROUND', stageKey: 'HR Round', color: 'bg-green-900 text-white' },
                  { label: 'OFFER STAGE', stageKey: 'Offer Stage', color: 'bg-green-900 text-white' },
                  { label: 'CLOSURE', stageKey: 'Closure', color: 'bg-green-950 text-white' }
                ].map((item, index) => (
                  <div key={index} className={`flex justify-between items-center py-3 px-4 rounded ${item.color}`}>
                    <span className={`text-sm font-medium ${item.color.includes('text-white') ? 'text-white' : 'text-gray-700'}`}>{item.label}</span>
                    <span className={`text-lg font-bold ${item.color.includes('text-white') ? 'text-white' : 'text-gray-900'}`} data-testid={`count-${item.stageKey}`}>{stageCounts[item.stageKey as keyof typeof stageCounts] || 0}</span>
                  </div>
                ))}
              </div>
            </div>
            </div>
          </div>
        );
      
      case 'reports':
        return (
          <div className="flex flex-col h-full">
            {/* Simple Client Header */}
            <div className="print:hidden">
              <SimpleClientHeader 
                companyName={(clientProfile as any)?.company || 'Loading...'}
                onHelpClick={() => setIsHelpChatOpen(true)}
              />
            </div>
            <div className="flex flex-1 overflow-hidden">
            {/* Main Content Area */}
            <div id="metrics-print-area" className="flex-1 p-6 space-y-6 overflow-y-auto bg-gray-50">
              {/* Header with controls */}
              <div className="flex justify-between items-center print:mb-8">
                <h2 className="text-xl font-semibold text-gray-900 print:text-2xl">Speed Metrics</h2>
                <div className="flex items-center space-x-4 print:hidden">
                  <Select>
                    <SelectTrigger className="w-32">
                      <SelectValue defaultValue="All Roles" placeholder="All Roles" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      <SelectItem value="active">Active Roles</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex items-center space-x-2 bg-white px-3 py-2 rounded border">
                    <CalendarIcon className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">12-Aug-2025</span>
                    <Edit3 className="h-4 w-4 text-gray-500" />
                  </div>
                  <Select>
                    <SelectTrigger className="w-24">
                      <SelectValue defaultValue="Monthly" placeholder="Monthly" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Speed Metrics Row */}
              <div className={`grid grid-cols-4 gap-4 ${!printMetrics.speed ? 'print:hidden' : ''}`} data-metric-section="speed">
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                  <h3 className="text-sm font-medium text-blue-700 mb-2">Time to 1st Submission</h3>
                  <div className="flex items-end space-x-3 mb-2">
                    <span className="text-3xl font-bold text-blue-900">{speedMetricsData.timeToFirstSubmission}</span>
                    <span className="text-sm text-blue-700 mb-1">days</span>
                    <div className="w-3 h-3 bg-cyan-400 rounded-full mb-1"></div>
                  </div>
                </div>
                
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                  <h3 className="text-sm font-medium text-blue-700 mb-2">Time to Interview</h3>
                  <div className="flex items-end space-x-3 mb-2">
                    <span className="text-3xl font-bold text-blue-900">{speedMetricsData.timeToInterview}</span>
                    <span className="text-sm text-blue-700 mb-1">days</span>
                    <div className="w-3 h-3 bg-red-400 rounded-full mb-1"></div>
                  </div>
                </div>
                
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                  <h3 className="text-sm font-medium text-blue-700 mb-2">Time to Offer</h3>
                  <div className="flex items-end space-x-3 mb-2">
                    <span className="text-3xl font-bold text-blue-900">{speedMetricsData.timeToOffer}</span>
                    <span className="text-sm text-blue-700 mb-1">days</span>
                    <div className="w-3 h-3 bg-purple-400 rounded-full mb-1"></div>
                  </div>
                </div>
                
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                  <h3 className="text-sm font-medium text-blue-700 mb-2">Time to Fill</h3>
                  <div className="flex items-end space-x-3 mb-2">
                    <span className="text-3xl font-bold text-blue-900">{speedMetricsData.timeToFill}</span>
                    <span className="text-sm text-blue-700 mb-1">days</span>
                    <div className="w-3 h-3 bg-amber-600 rounded-full mb-1"></div>
                  </div>
                </div>
              </div>

              {/* Quality Metrics */}
              <div className={`${!printMetrics.quality ? 'print:hidden' : ''}`} data-metric-section="quality">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Quality Metrics</h2>
                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-green-100 rounded-lg p-4 border border-green-200">
                    <h3 className="text-sm font-medium text-green-700 mb-2">Submission to Short List %</h3>
                    <div className="flex items-end space-x-3 mb-2">
                      <span className="text-3xl font-bold text-green-800">{qualityMetricsData.submissionToShortList}</span>
                      <span className="text-sm text-green-700 mb-1">%</span>
                      <div className="w-3 h-3 bg-cyan-400 rounded-full mb-1"></div>
                    </div>
                  </div>
                  
                  <div className="bg-green-100 rounded-lg p-4 border border-green-200">
                    <h3 className="text-sm font-medium text-green-700 mb-2">Interview to Offer %</h3>
                    <div className="flex items-end space-x-3 mb-2">
                      <span className="text-3xl font-bold text-green-800">{qualityMetricsData.interviewToOffer}</span>
                      <span className="text-sm text-green-700 mb-1">%</span>
                      <div className="w-3 h-3 bg-red-400 rounded-full mb-1"></div>
                    </div>
                  </div>
                  
                  <div className="bg-green-100 rounded-lg p-4 border border-green-200">
                    <h3 className="text-sm font-medium text-green-700 mb-2">Offer Acceptance %</h3>
                    <div className="flex items-end space-x-3 mb-2">
                      <span className="text-3xl font-bold text-green-800">{qualityMetricsData.offerAcceptance}</span>
                      <span className="text-sm text-green-700 mb-1">%</span>
                      <div className="w-3 h-3 bg-purple-400 rounded-full mb-1"></div>
                    </div>
                  </div>
                  
                  <div className="bg-green-100 rounded-lg p-4 border border-green-200">
                    <h3 className="text-sm font-medium text-green-700 mb-2">Early Attrition %</h3>
                    <div className="flex items-end space-x-3 mb-2">
                      <span className="text-3xl font-bold text-green-800">{qualityMetricsData.earlyAttrition}</span>
                      <span className="text-sm text-green-700 mb-1">%</span>
                      <div className="w-3 h-3 bg-amber-600 rounded-full mb-1"></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Impact Metrics */}
              <div className={`${!printMetrics.impact ? 'print:hidden' : ''}`} data-metric-section="impact">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Impact Metrics</h2>
                <div className="grid grid-cols-4 gap-4 mb-4">
                  <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                    <h3 className="text-sm font-medium text-red-700 mb-2">Speed to Hire value</h3>
                    <div className="text-3xl font-bold text-red-600">{firstImpactMetrics.speedToHire}</div>
                    <div className="text-sm text-gray-600 mt-1">Days faster*</div>
                  </div>
                  
                  <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                    <h3 className="text-sm font-medium text-red-700 mb-2">Revenue Impact Of Delay</h3>
                    <div className="text-3xl font-bold text-red-600">{firstImpactMetrics.revenueImpactOfDelay}</div>
                    <div className="text-sm text-gray-600 mt-1">Lost per Role*</div>
                  </div>
                  
                  <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                    <h3 className="text-sm font-medium text-purple-700 mb-2">Client NPS</h3>
                    <div className="text-3xl font-bold text-purple-600">+{firstImpactMetrics.clientNps}</div>
                    <div className="text-sm text-gray-600 mt-1">Net Promoter Score*</div>
                  </div>
                  
                  <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                    <h3 className="text-sm font-medium text-purple-700 mb-2">Candidate NPS</h3>
                    <div className="text-3xl font-bold text-purple-600">+{firstImpactMetrics.candidateNps}</div>
                    <div className="text-sm text-gray-600 mt-1">Net Promoter Score*</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                    <h3 className="text-sm font-medium text-yellow-700 mb-2">Feedback Turn Around</h3>
                    <div className="text-3xl font-bold text-yellow-600">{firstImpactMetrics.feedbackTurnAround}</div>
                    <div className="text-sm text-gray-600 mt-1">days</div>
                    <div className="text-xs text-gray-500 mt-1">Industry Avg. 5 days*</div>
                  </div>
                  
                  <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                    <h3 className="text-sm font-medium text-yellow-700 mb-2">First Year Retention Rate</h3>
                    <div className="text-3xl font-bold text-yellow-600">{firstImpactMetrics.firstYearRetentionRate}</div>
                    <div className="text-sm text-gray-600 mt-1">%</div>
                  </div>
                  
                  <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                    <h3 className="text-sm font-medium text-yellow-700 mb-2">Fulfillment Rate</h3>
                    <div className="text-3xl font-bold text-yellow-600">{firstImpactMetrics.fulfillmentRate}</div>
                    <div className="text-sm text-gray-600 mt-1">%</div>
                  </div>
                  
                  <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                    <h3 className="text-sm font-medium text-yellow-700 mb-2">Revenue Recovered</h3>
                    <div className="text-3xl font-bold text-yellow-600">{firstImpactMetrics.revenueRecovered} <span className="text-2xl">L</span></div>
                    <div className="text-sm text-gray-600 mt-1">Gained per hire*</div>
                  </div>
                </div>
              </div>

              {/* Download Button */}
              <div className="flex justify-end mt-6 print:hidden">
                <Button 
                  onClick={() => setIsDownloadModalOpen(true)}
                  className="bg-cyan-400 hover:bg-cyan-500 text-black px-6 py-2 rounded shadow-lg flex items-center gap-2"
                  data-testid="button-download-metrics"
                >
                  <Download className="h-4 w-4" />
                  Download
                </Button>
              </div>
            </div>

            {/* Right Sidebar with Charts */}
            <div className="w-80 bg-white border-l border-gray-200 p-6 space-y-6 overflow-y-auto print:hidden">
              {/* Speed Metrics Chart - 4 Lines */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-700">Speed Metrics Trend</h3>
                <div className="h-56 bg-blue-50 border border-blue-100 rounded-lg p-4">
                  <div className="h-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={speedChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                        <XAxis 
                          dataKey="month" 
                          tick={{ fontSize: 11, fill: '#6B7280' }} 
                          stroke="#9CA3AF"
                        />
                        <YAxis 
                          tick={{ fontSize: 11, fill: '#6B7280' }} 
                          stroke="#9CA3AF"
                        />
                        <Tooltip 
                          contentStyle={{ fontSize: 12, backgroundColor: '#FFF', border: '1px solid #E5E7EB' }}
                        />
                        <Legend 
                          wrapperStyle={{ fontSize: 10 }}
                          iconType="line"
                        />
                        <Line 
                          type="monotone" 
                          dataKey="timeToFirstSubmission" 
                          stroke="#06B6D4" 
                          strokeWidth={2} 
                          dot={false}
                          name="1st Submission"
                        />
                        <Line 
                          type="monotone" 
                          dataKey="timeToInterview" 
                          stroke="#EF4444" 
                          strokeWidth={2} 
                          dot={false}
                          name="Interview"
                        />
                        <Line 
                          type="monotone" 
                          dataKey="timeToOffer" 
                          stroke="#A855F7" 
                          strokeWidth={2} 
                          dot={false}
                          name="Offer"
                        />
                        <Line 
                          type="monotone" 
                          dataKey="timeToFill" 
                          stroke="#D97706" 
                          strokeWidth={2} 
                          dot={false}
                          name="Fill"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Quality Metrics Chart - 4 Lines */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-700">Quality Metrics Trend</h3>
                <div className="h-56 bg-green-50 border border-green-100 rounded-lg p-4">
                  <div className="h-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={qualityChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                        <XAxis 
                          dataKey="month" 
                          tick={{ fontSize: 11, fill: '#6B7280' }} 
                          stroke="#9CA3AF"
                        />
                        <YAxis 
                          tick={{ fontSize: 11, fill: '#6B7280' }} 
                          stroke="#9CA3AF"
                        />
                        <Tooltip 
                          contentStyle={{ fontSize: 12, backgroundColor: '#FFF', border: '1px solid #E5E7EB' }}
                        />
                        <Legend 
                          wrapperStyle={{ fontSize: 10 }}
                          iconType="line"
                        />
                        <Line 
                          type="monotone" 
                          dataKey="submissionToShortList" 
                          stroke="#06B6D4" 
                          strokeWidth={2} 
                          dot={false}
                          name="Submission Rate"
                        />
                        <Line 
                          type="monotone" 
                          dataKey="interviewToOffer" 
                          stroke="#EF4444" 
                          strokeWidth={2} 
                          dot={false}
                          name="Interview Rate"
                        />
                        <Line 
                          type="monotone" 
                          dataKey="offerAcceptance" 
                          stroke="#A855F7" 
                          strokeWidth={2} 
                          dot={false}
                          name="Offer Rate"
                        />
                        <Line 
                          type="monotone" 
                          dataKey="earlyAttrition" 
                          stroke="#D97706" 
                          strokeWidth={2} 
                          dot={false}
                          name="Attrition"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Drop Rates Section */}
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                <div className="text-center mb-4">
                  <div className="text-sm text-gray-600 mb-1">Interview Drop of Rate</div>
                  <div className="text-2xl font-bold text-gray-900">25%</div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-600 mb-1">Offer Drop of Rate</div>
                  <div className="text-2xl font-bold text-gray-900">20%</div>
                </div>
              </div>
            </div>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  const handleCandidateClick = (e: React.MouseEvent, candidate: any, stage: string) => {
    e.stopPropagation();
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setCandidatePopupPosition({
      x: rect.left + rect.width + 10,
      y: rect.top
    });
    setSelectedCandidate({ id: candidate.id, name: candidate.candidateName, stage });
  };

  const closeCandidatePopup = () => {
    setSelectedCandidate(null);
    setCandidatePopupPosition(null);
    setRejectReason('');
  };

  const handleReject = () => {
    // Handle reject logic here
    console.log('Rejecting candidate:', selectedCandidate, 'Reason:', rejectReason);
    
    // Show success toast notification
    toast({
      title: "Candidate Rejected",
      description: `${selectedCandidate?.name} has been rejected successfully.`,
      className: "bg-green-50 border-green-200 text-green-800",
    });
    
    closeCandidatePopup();
  };

  const handleMetricCheckboxChange = (metric: 'speed' | 'quality' | 'impact') => {
    setSelectedMetrics(prev => ({
      ...prev,
      [metric]: !prev[metric]
    }));
  };

  const handleSelectAll = () => {
    const allSelected = selectedMetrics.speed && selectedMetrics.quality && selectedMetrics.impact;
    setSelectedMetrics({
      speed: !allSelected,
      quality: !allSelected,
      impact: !allSelected
    });
  };

  const handleDownloadPDF = () => {
    const hasSelection = selectedMetrics.speed || selectedMetrics.quality || selectedMetrics.impact;
    
    if (!hasSelection) {
      toast({
        title: "No Metrics Selected",
        description: "Please select at least one metric to download.",
        variant: "destructive",
      });
      return;
    }

    setPrintMetrics({
      speed: selectedMetrics.speed,
      quality: selectedMetrics.quality,
      impact: selectedMetrics.impact
    });

    setIsDownloadModalOpen(false);

    toast({
      title: "Download Confirmation",
      description: "Your metrics will be downloaded as a PDF file. Use your browser's print dialog to save as PDF.",
      className: "bg-blue-50 border-blue-200 text-blue-800",
    });

    setTimeout(() => {
      window.print();
      
      setPrintMetrics({
        speed: true,
        quality: true,
        impact: true
      });

      setSelectedMetrics({
        speed: false,
        quality: false,
        impact: false
      });
    }, 500);
  };

  // Profile not linked - show access restricted message
  if (!isLoadingProfile && clientProfile && !(clientProfile as any).profileLinked) {
    return (
      <div className="flex h-screen bg-gray-100">
        <div className="flex-1 flex items-center justify-center">
          <Card className="max-w-md w-full mx-4">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center">
                <User className="w-8 h-8 text-amber-600" />
              </div>
              <CardTitle className="text-xl text-gray-900" data-testid="text-profile-not-linked-title">Profile Not Linked</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-gray-600" data-testid="text-profile-not-linked-message">
                Your client dashboard access is pending. An administrator needs to link your account to a client profile before you can access the dashboard.
              </p>
              <p className="text-sm text-gray-500">
                Please contact your administrator or wait for your account to be configured.
              </p>
              <div className="pt-4 border-t">
                <p className="text-xs text-gray-400">
                  Logged in as: {(clientProfile as any).email}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Left Sidebar - Dark Blue Theme */}
      <div className="w-16 bg-slate-700 flex flex-col items-center py-6 space-y-6 print:hidden">
        {/* Logo */}
        <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
          <span className="text-slate-700 font-bold text-lg">X</span>
        </div>
        
        {/* Navigation Icons */}
        <div className="flex flex-col space-y-4">
          <button 
            onClick={() => setSidebarTab('dashboard')}
            className={`p-3 rounded-lg transition-colors ${
              sidebarTab === 'dashboard' ? 'bg-slate-600' : 'hover:bg-slate-600'
            }`}
          >
            <User className="h-6 w-6 text-white" />
          </button>
          
          <button 
            onClick={() => setSidebarTab('requirements')}
            className={`p-3 rounded-lg transition-colors ${
              sidebarTab === 'requirements' ? 'bg-slate-600' : 'hover:bg-slate-600'
            }`}
            title="Requirements"
          >
            <MapPin className="h-6 w-6 text-white" />
          </button>
          
          <button 
            onClick={() => setSidebarTab('reports')}
            className={`p-3 rounded-lg transition-colors ${
              sidebarTab === 'reports' ? 'bg-slate-600' : 'hover:bg-slate-600'
            }`}
            title="Reports"
          >
            <HandHeart className="h-6 w-6 text-white" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex">
        {/* Middle Section */}
        <div className={`${sidebarTab === 'dashboard' ? 'flex-1' : 'w-full'} bg-white`}>
          {renderMainContent()}
        </div>
        
        {/* Right Sidebar - Chats - Only show on dashboard */}
        {sidebarTab === 'dashboard' && (
          <div className="w-80 bg-white border-l border-gray-200 flex flex-col print:hidden">
            {/* Recent Chats Header */}
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">Recent Chats</h3>
            </div>
            
            {/* Chat List */}
            <div className="flex-1 overflow-y-auto">
              {recentChats.map((chat) => (
                <Link 
                  key={chat.id}
                  href="/chat"
                  data-testid={`link-chat-${chat.id}`}
                >
                  <div 
                    className="p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                    data-testid={`chat-preview-${chat.id}`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <Avatar className="w-10 h-10" data-testid={`avatar-chat-${chat.id}`}>
                          <AvatarImage src={chat.avatar} alt={chat.name} />
                          <AvatarFallback className="bg-blue-100 text-blue-600">
                            {chat.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        {chat.status === 'online' && (
                          <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white" data-testid={`status-online-${chat.id}`}></div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-gray-900" data-testid={`text-chat-name-${chat.id}`}>{chat.name}</h4>
                          <span className="text-lg font-bold text-gray-900" data-testid={`text-closures-${chat.id}`}>{chat.closures}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-gray-500" data-testid={`text-requirements-${chat.id}`}>{chat.requirements} Requirements</p>
                          <span className="text-xs text-gray-400">Closures</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            
            {/* Chat Box Button */}
            <div className="p-4 border-t border-gray-200">
              <Link href="/chat" data-testid="link-open-chat">
                <Button 
                  className="w-full bg-cyan-400 hover:bg-cyan-500 text-black font-medium py-3 rounded"
                  data-testid="button-open-chat"
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Open Chat
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
      
      {/* Roles Modal */}
      <Dialog open={isRolesModalOpen} onOpenChange={setIsRolesModalOpen}>
        <DialogContent className="max-w-6xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>All Roles & Status</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[60vh]">
            <table className="w-full">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Role ID</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Roles</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Team</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Recruiter</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Shared on</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Profiles Shared</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Last Active</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {allRolesData.map((role, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{role.roleId}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{role.role}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{role.team}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{role.recruiter}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{role.sharedOn}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant="secondary" className={`text-xs ${getStatusColor(role.status)}`}>
                        {role.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">{role.profilesShared}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{role.lastActive}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* JD Text Modal */}
      <Dialog open={isJdModalOpen} onOpenChange={setIsJdModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Write Job Description</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Job Description Content</label>
              <textarea
                value={tempJdText}
                onChange={(e) => setTempJdText(e.target.value)}
                placeholder="Enter your job description here..."
                className="w-full h-64 border border-gray-300 rounded p-3 resize-none text-sm"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setTempJdText(jdText);
                  setIsJdModalOpen(false);
                }}
                className="rounded"
              >
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  setJdText(tempJdText);
                  setIsJdModalOpen(false);
                }}
                className="bg-cyan-400 hover:bg-cyan-500 text-black rounded"
              >
                Save JD Content
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Closure Reports Modal */}
      <Dialog open={isClosureModalOpen} onOpenChange={setIsClosureModalOpen}>
        <DialogContent className="max-w-6xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>All Closure Reports</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[60vh]">
            <table className="w-full border-collapse">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Candidate</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Position</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Talent Advisor</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Offered Date</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Joined Date</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {allClosureReports.map((report, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{report.candidate}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{report.position}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{report.advisor}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{report.offered}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{report.joined}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>

      {/* Download Metrics Modal */}
      <Dialog open={isDownloadModalOpen} onOpenChange={setIsDownloadModalOpen}>
        <DialogContent className="max-w-md print:hidden">
          <DialogHeader>
            <DialogTitle>Download Metrics as PDF</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <p className="text-sm text-gray-600">
              Select the metrics you want to include in your PDF download. Your selected metrics will be downloaded as a PDF file.
            </p>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <Checkbox 
                  id="speed-metrics"
                  checked={selectedMetrics.speed}
                  onCheckedChange={() => handleMetricCheckboxChange('speed')}
                  data-testid="checkbox-speed-metrics"
                />
                <Label 
                  htmlFor="speed-metrics" 
                  className="text-sm font-medium cursor-pointer"
                >
                  Speed Metrics (with graphs)
                </Label>
              </div>
              
              <div className="flex items-center space-x-3">
                <Checkbox 
                  id="quality-metrics"
                  checked={selectedMetrics.quality}
                  onCheckedChange={() => handleMetricCheckboxChange('quality')}
                  data-testid="checkbox-quality-metrics"
                />
                <Label 
                  htmlFor="quality-metrics" 
                  className="text-sm font-medium cursor-pointer"
                >
                  Quality Metrics (with graphs)
                </Label>
              </div>
              
              <div className="flex items-center space-x-3">
                <Checkbox 
                  id="impact-metrics"
                  checked={selectedMetrics.impact}
                  onCheckedChange={() => handleMetricCheckboxChange('impact')}
                  data-testid="checkbox-impact-metrics"
                />
                <Label 
                  htmlFor="impact-metrics" 
                  className="text-sm font-medium cursor-pointer"
                >
                  Impact Metrics (with graphs)
                </Label>
              </div>
              
              <div className="border-t pt-4">
                <div className="flex items-center space-x-3">
                  <Checkbox 
                    id="select-all"
                    checked={selectedMetrics.speed && selectedMetrics.quality && selectedMetrics.impact}
                    onCheckedChange={handleSelectAll}
                    data-testid="checkbox-select-all"
                  />
                  <Label 
                    htmlFor="select-all" 
                    className="text-sm font-semibold cursor-pointer"
                  >
                    Select All
                  </Label>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-800">
                <strong>Note:</strong> The selected metrics will be downloaded as a PDF file. You can use your browser's print-to-PDF function to save the document.
              </p>
            </div>
            
            <div className="flex justify-end space-x-3 pt-2">
              <Button 
                variant="outline" 
                onClick={() => setIsDownloadModalOpen(false)}
                className="rounded"
                data-testid="button-cancel-download"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleDownloadPDF}
                className="bg-cyan-400 hover:bg-cyan-500 text-black rounded flex items-center gap-2"
                data-testid="button-confirm-download"
              >
                <Download className="h-4 w-4" />
                Download PDF
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reject Candidate Confirmation Dialog */}
      <Dialog open={selectedCandidate !== null && !candidatePopupPosition} onOpenChange={(open) => !open && setSelectedCandidate(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Candidate</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Are you sure you want to reject <strong>{selectedCandidate?.name}</strong>?
            </p>
            <p className="text-xs text-gray-500">
              Current stage: {selectedCandidate?.stage}
            </p>
            <div>
              <Label htmlFor="reject-reason" className="text-sm font-medium">
                Reason for rejection (optional)
              </Label>
              <Textarea
                id="reject-reason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Enter reason for rejection..."
                className="mt-2"
                data-testid="textarea-reject-reason"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedCandidate(null);
                  setRejectReason('');
                }}
                data-testid="button-cancel-reject"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (selectedCandidate?.id) {
                    rejectCandidateMutation.mutate({ 
                      id: selectedCandidate.id, 
                      reason: rejectReason 
                    });
                  }
                }}
                disabled={rejectCandidateMutation.isPending}
                data-testid="button-confirm-reject"
              >
                {rejectCandidateMutation.isPending ? 'Rejecting...' : 'Reject'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Candidate Action Popup */}
      {selectedCandidate && candidatePopupPosition && (
        <>
          {/* Backdrop to close popup */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={closeCandidatePopup}
          />
          
          {/* Popup */}
          <div 
            className="fixed z-50 bg-white border border-gray-300 rounded shadow-lg p-4 w-64"
            style={{
              left: candidatePopupPosition.x,
              top: candidatePopupPosition.y
            }}
          >
            <div className="mb-3">
              <h4 className="font-medium text-gray-900">{selectedCandidate.name}</h4>
              <p className="text-sm text-gray-500">{selectedCandidate.stage}</p>
            </div>
            
            <div className="space-y-3">
              <Button
                variant="default"
                className="w-full justify-start bg-green-600 hover:bg-green-700 text-white"
                onClick={() => {
                  if (selectedCandidate?.id) {
                    selectCandidateMutation.mutate({ id: selectedCandidate.id });
                  }
                }}
                disabled={selectCandidateMutation.isPending}
                data-testid="button-select-candidate"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                {selectCandidateMutation.isPending ? 'Selecting...' : 'Select Candidate'}
              </Button>
              
              <div className="border-t border-gray-200 pt-3">
                <label className="block text-xs text-gray-600 mb-1">Reject with reason:</label>
                <Textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Enter rejection reason..."
                  className="w-full h-16 text-xs border border-gray-300 rounded p-2 resize-none"
                />
              </div>
              
              <div className="flex justify-end">
                <Button 
                  onClick={() => {
                    if (selectedCandidate?.id) {
                      rejectCandidateMutation.mutate({ 
                        id: selectedCandidate.id, 
                        reason: rejectReason 
                      });
                    }
                  }}
                  disabled={rejectCandidateMutation.isPending}
                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-1 text-sm rounded"
                  data-testid="button-reject-popup"
                >
                  {rejectCandidateMutation.isPending ? 'Rejecting...' : 'Reject'}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Floating Help Button */}
      <button
        onClick={() => setIsHelpChatOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-purple-600 hover:bg-purple-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-110 z-40"
        data-testid="button-help"
        aria-label="Help"
        title="Need help? Chat with us!"
      >
        <HelpCircle size={24} />
      </button>

      {/* Chat Support */}
      <ChatDock 
        open={isHelpChatOpen} 
        onClose={() => setIsHelpChatOpen(false)} 
        userName="Support Team"
      />
    </div>
  );
}