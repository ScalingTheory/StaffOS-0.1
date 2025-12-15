import { useState, useEffect, useMemo } from 'react';
import { type Employee, type TargetMappings } from '@shared/schema';
import AdminSidebar from '@/components/dashboard/admin-sidebar';
import AdminProfileHeader from '@/components/dashboard/admin-profile-header';
import AdminTopHeader from '@/components/dashboard/admin-top-header';
import TeamBoxes from '@/components/dashboard/team-boxes';
import TeamMembersSidebar from '@/components/dashboard/team-members-sidebar';
import AddRequirementModal from '@/components/dashboard/modals/add-requirement-modal';
import TargetMappingModal from '@/components/dashboard/modals/target-mapping-modal';
import RevenueMappingModal from '@/components/dashboard/modals/revenue-mapping-modal';
import TeamPerformanceTableModal from '@/components/dashboard/modals/team-performance-modal';
import PerformanceChartModal from '@/components/dashboard/modals/performance-chart-modal';
import ClosureModal from '@/components/dashboard/modals/closure-modal';
import AddTeamLeaderModal from '@/components/dashboard/modals/add-team-leader-modal';
import AddTalentAdvisorModal from '@/components/dashboard/modals/add-talent-advisor-modal';
import AddRecruiterModal from '@/components/dashboard/modals/add-recruiter-modal';
import AddTeamLeaderModalNew from '@/components/dashboard/modals/add-team-leader-modal-new';
import AddClientCredentialsModal from '@/components/dashboard/modals/add-client-credentials-modal';
import DailyDeliveryModal from '@/components/dashboard/modals/daily-delivery-modal';
import BulkResumeUpload from '@/components/dashboard/bulk-resume-upload';
import { SearchBar } from '@/components/ui/search-bar';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { CalendarIcon, EditIcon, Mail, Phone, Send, CalendarCheck, Search, UserPlus, Users, ExternalLink, HelpCircle, MoreVertical, Download, Edit2 } from "lucide-react";
import { format } from "date-fns";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, ComposedChart, BarChart, Bar, Cell, AreaChart, Area } from 'recharts';
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import GaugeComponent from 'react-gauge-component';
import PerformanceGauge from '@/components/dashboard/performance-gauge';
import { ChatDock } from '@/components/chat/chat-dock';
// TypeScript interfaces
interface Requirement {
  id: number;
  position: string;
  criticality: string;
  toughness?: string;
  company: string;
  spoc: string;
  talentAdvisor: string;
  teamLead: string;
}

// Requirements data for pagination
const requirementsData = [
  { id: 1, position: "Mobile App Developer", criticality: "HIGH", company: "Tesco", spoc: "Mel Gibson", talentAdvisor: "Mel Gibson", teamLead: "Arun" },
  { id: 2, position: "Backend Developer", criticality: "LOW", company: "CodeLabs", spoc: "Robert Kim", talentAdvisor: "Robert Kim", teamLead: "Arun" },
  { id: 3, position: "Frontend Developer", criticality: "MEDIUM", company: "TechCorp", spoc: "David Wilson", talentAdvisor: "Unassigned", teamLead: "Arun" },
  { id: 4, position: "QA Tester", criticality: "HIGH", company: "AppLogic", spoc: "Kevin Brown", talentAdvisor: "Unassigned", teamLead: "Unassigned" },
  { id: 5, position: "Mobile App Developer", criticality: "MEDIUM", company: "Tesco", spoc: "Mel Gibson", talentAdvisor: "Mel Gibson", teamLead: "Arun" },
  { id: 6, position: "Backend Developer", criticality: "LOW", company: "CodeLabs", spoc: "Robert Kim", talentAdvisor: "Robert Kim", teamLead: "Arun" },
  { id: 7, position: "UI/UX Designer", criticality: "MEDIUM", company: "Designify", spoc: "Tom Anderson", talentAdvisor: "Unassigned", teamLead: "Anusha" },
  { id: 8, position: "Frontend Developer", criticality: "HIGH", company: "TechCorp", spoc: "David Wilson", talentAdvisor: "Unassigned", teamLead: "Arun" },
  { id: 9, position: "UI/UX Designer", criticality: "MEDIUM", company: "Designify", spoc: "Tom Anderson", talentAdvisor: "Unassigned", teamLead: "Anusha" },
  { id: 10, position: "QA Tester", criticality: "MEDIUM", company: "AppLogic", spoc: "Kevin Brown", talentAdvisor: "Unassigned", teamLead: "Unassigned" },
  { id: 11, position: "Mobile App Developer", criticality: "HIGH", company: "Designify", spoc: "Mel Gibson", talentAdvisor: "Mel Gibson", teamLead: "Arun" },
  { id: 12, position: "Backend Developer", criticality: "LOW", company: "Tesco", spoc: "Robert Kim", talentAdvisor: "Robert Kim", teamLead: "Unassigned" },
  { id: 13, position: "Frontend Developer", criticality: "HIGH", company: "CodeLabs", spoc: "David Wilson", talentAdvisor: "Unassigned", teamLead: "Anusha" },
  { id: 14, position: "QA Tester", criticality: "LOW", company: "TechCorp", spoc: "Kevin Brown", talentAdvisor: "Unassigned", teamLead: "Arun" },
  { id: 15, position: "DevOps Engineer", criticality: "HIGH", company: "Netflix", spoc: "Sarah Connor", talentAdvisor: "John Smith", teamLead: "Arun" }
];

// Admin profile will be fetched from API - fallback data matching server
const initialAdminProfile = {
  name: "John Mathew",
  role: "CEO",
  email: "john@scalingtheory.com",
  phone: "90347 59099",
  bannerImage: null as string | null,
  profilePicture: null as string | null
};

const teamsData = [
  {
    name: "Arun KS",
    teamName: "Arun's Team",
    teamMembers: 4,
    tenure: "4y3m",
    quartersAchieved: 6,
    nextMilestone: "+3",
    members: [
      { 
        name: "Sudharshan", 
        salary: "3,50,000 INR", 
        year: "2024-2025", 
        count: 10,
        id: "STTA001",
        role: "Recruitment Executive",
        email: "sudharshan@scaling.com",
        mobile: "9876543210",
        joined: "1/4/2023",
        closures: "3 this month"
      },
      { 
        name: "Deepika", 
        salary: "4,50,000 INR", 
        year: "2024-2025", 
        count: 5,
        id: "STTA002",
        role: "Senior Recruiter",
        email: "deepika@scaling.com",
        mobile: "9876543211",
        joined: "15/2/2023",
        closures: "2 this month"
      },
      { 
        name: "Dharshan", 
        salary: "1,00,000 INR", 
        year: "2024-2025", 
        count: 4,
        id: "STTA003",
        role: "Junior Recruiter",
        email: "dharshan@scaling.com",
        mobile: "9876543212",
        joined: "10/3/2023",
        closures: "1 this month"
      },
      { 
        name: "Kavya", 
        salary: "2,20,000 INR", 
        year: "2024-2025", 
        count: 2,
        id: "STTA004",
        role: "Recruitment Executive",
        email: "kavya@scaling.com",
        mobile: "9876543213",
        joined: "5/1/2023",
        closures: "4 this month"
      },
      { 
        name: "Thamarai Selvi", 
        salary: "7,50,000 INR", 
        year: "2024-2025", 
        count: 3,
        id: "STTA005",
        role: "Lead Recruiter",
        email: "thamarai@scaling.com",
        mobile: "9876543214",
        joined: "20/6/2022",
        closures: "5 this month"
      },
      { 
        name: "Karthikayan", 
        salary: "2,90,000 INR", 
        year: "2024-2025", 
        count: 2,
        id: "STTA006",
        role: "Recruitment Executive",
        email: "karthik@scaling.com",
        mobile: "9876543215",
        joined: "12/5/2023",
        closures: "2 this month"
      }
    ]
  },
  {
    name: "Anusha",
    teamName: "Anusha's Team", 
    teamMembers: 4,
    tenure: "4y3m",
    quartersAchieved: 6,
    nextMilestone: "+3",
    members: [
      { 
        name: "Sudharshan", 
        salary: "3,50,000 INR", 
        year: "2024-2025", 
        count: 10,
        id: "STTA007",
        role: "Recruitment Executive",
        email: "sudharshan2@scaling.com",
        mobile: "9876543216",
        joined: "1/4/2023",
        closures: "3 this month"
      },
      { 
        name: "Deepika", 
        salary: "4,50,000 INR", 
        year: "2024-2025", 
        count: 5,
        id: "STTA008",
        role: "Senior Recruiter",
        email: "deepika2@scaling.com",
        mobile: "9876543217",
        joined: "15/2/2023",
        closures: "2 this month"
      },
      { 
        name: "Dharshan", 
        salary: "1,00,000 INR", 
        year: "2024-2025", 
        count: 4,
        id: "STTA009",
        role: "Junior Recruiter",
        email: "dharshan2@scaling.com",
        mobile: "9876543218",
        joined: "10/3/2023",
        closures: "1 this month"
      },
      { 
        name: "Kavya", 
        salary: "2,20,000 INR", 
        year: "2024-2025", 
        count: 2,
        id: "STTA010",
        role: "Recruitment Executive",
        email: "kavya2@scaling.com",
        mobile: "9876543219",
        joined: "5/1/2023",
        closures: "4 this month"
      },
      { 
        name: "Thamarai Selvi", 
        salary: "7,50,000 INR", 
        year: "2024-2025", 
        count: 3,
        id: "STTA011",
        role: "Lead Recruiter",
        email: "thamarai2@scaling.com",
        mobile: "9876543220",
        joined: "20/6/2022",
        closures: "5 this month"
      },
      { 
        name: "Karthikayan", 
        salary: "2,90,000 INR", 
        year: "2024-2025", 
        count: 2,
        id: "STTA012",
        role: "Recruitment Executive",
        email: "karthik2@scaling.com",
        mobile: "9876543221",
        joined: "12/5/2023",
        closures: "2 this month"
      }
    ]
  }
];

// Removed sample pipeline data - now using real data from API

// All employees list from teams data
const allEmployees = [
  ...teamsData[0].members.map(member => ({ name: member.name, role: member.role, id: member.id })),
  ...teamsData[1].members.map(member => ({ name: member.name, role: member.role, id: member.id })),
  { name: "Arun KS", role: "TL", id: "TL001" },
  { name: "Anusha", role: "TL", id: "TL002" }
];

const tlList = allEmployees.filter(emp => emp.role === 'TL' || emp.role === 'Lead Recruiter').map(emp => ({ ...emp, displayRole: emp.role === 'TL' ? 'TL - Team Leader' : 'TL' }));
const taList = allEmployees.filter(emp => emp.role === 'Senior Recruiter' || emp.role === 'Recruitment Executive' || emp.role === 'Junior Recruiter').map(emp => ({ ...emp, displayRole: 'TA' }));

// Removed sample data for modal - now using real data from API

const initialMessagesData: Array<{ name: string; message: string; date: string; status: string; timestamp: Date }> = [];

const deliveredData: Array<{ requirement: string; candidate: string; client: string; deliveredDate: string; status: string }> = [];

const defaultedData: Array<{ requirement: string; candidate: string; client: string; expectedDate: string; status: string }> = [];

const initialTlMeetingsData = [
  { meetingType: "Performance Review", date: "05-Sep-2025", time: "10:00 AM", person: "Arun KS", agenda: "Quarterly performance discussion", status: "Scheduled" },
  { meetingType: "Team Planning", date: "06-Sep-2025", time: "02:30 PM", person: "Anusha", agenda: "Q4 strategy and targets", status: "Scheduled" },
  { meetingType: "One-on-One", date: "07-Sep-2025", time: "11:15 AM", person: "Umar", agenda: "Career development discussion", status: "Pending" }
];

const initialCeoMeetingsData = [
  { meetingType: "Board Review", date: "10-Sep-2025", time: "09:00 AM", person: "John Mathew", agenda: "Company strategy and vision", status: "Scheduled" }
];

// Performance Chart Component
interface PerformanceChartProps {
  data: Array<{ member: string; requirements?: number; resumesA?: number; resumesB?: number; memberIndex?: number }>;
  height?: string;
  benchmarkValue?: number;
  showDualLines?: boolean;
}

function PerformanceChart({ data, height = "100%", benchmarkValue = 10, showDualLines = false }: PerformanceChartProps) {
  const maxResumes = showDualLines 
    ? Math.max(...data.map(d => Math.max(d.resumesA || 0, d.resumesB || 0)))
    : 15;
  const roundedMax = Math.ceil(maxResumes / 2) * 2 + 2;
  const ticks = showDualLines 
    ? Array.from({ length: Math.ceil(roundedMax / 2) + 1 }, (_, i) => i * 2)
    : [3, 6, 9, 12, 15];

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="colorRequirementsMain" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8}/>
            <stop offset="95%" stopColor="#22c55e" stopOpacity={0.1}/>
          </linearGradient>
          <linearGradient id="colorResumesAMain" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
            <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1}/>
          </linearGradient>
          <linearGradient id="colorResumesBMain" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8}/>
            <stop offset="95%" stopColor="#22c55e" stopOpacity={0.1}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.3} />
        <XAxis 
          dataKey="member"
          stroke="#6b7280" 
          style={{ fontSize: '11px' }}
          tick={{ fill: '#6b7280' }}
          tickFormatter={(value, index) => {
            if (showDualLines && data[index]?.memberIndex !== undefined) {
              return `${data[index].memberIndex}. ${value}`;
            }
            return value;
          }}
        />
        <YAxis 
          stroke="#6b7280" 
          style={{ fontSize: '12px' }}
          tick={{ fill: '#6b7280' }}
          ticks={ticks}
          domain={[0, showDualLines ? roundedMax : 15]}
        />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: '#ffffff', 
            border: '1px solid #e5e7eb',
            borderRadius: '8px'
          }}
        />
        <Legend />
        {!showDualLines && (
          <>
            <ReferenceLine 
              y={benchmarkValue} 
              stroke="#ef4444" 
              strokeWidth={2}
              strokeDasharray="5 5"
              label={{ value: `Avg: ${benchmarkValue}`, position: 'right', fill: '#ef4444', fontSize: 12 }}
            />
            <Area 
              type="monotone" 
              dataKey="requirements" 
              stroke="#22c55e" 
              strokeWidth={2} 
              fill="url(#colorRequirementsMain)"
              dot={{ fill: '#22c55e', r: 4 }}
              activeDot={{ r: 6 }}
              name="Requirements"
            />
          </>
        )}
        {showDualLines && (
          <>
            <Area 
              type="monotone" 
              dataKey="resumesA" 
              stroke="#ef4444" 
              strokeWidth={2} 
              fill="url(#colorResumesAMain)"
              dot={{ fill: '#ef4444', r: 4 }}
              activeDot={{ r: 6 }}
              name="Resume Count A"
            />
            <Area 
              type="monotone" 
              dataKey="resumesB" 
              stroke="#22c55e" 
              strokeWidth={2} 
              fill="url(#colorResumesBMain)"
              fillOpacity={0.6}
              dot={{ fill: '#22c55e', r: 4 }}
              activeDot={{ r: 6 }}
              name="Resume Count B"
            />
          </>
        )}
      </AreaChart>
    </ResponsiveContainer>
  );
}

// Revenue Chart Component
interface RevenueChartProps {
  data: Array<{ member: string; revenue: number }>;
  height?: string;
  benchmarkValue?: number;
}

function RevenueChart({ data, height = "100%", benchmarkValue = 230000 }: RevenueChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis 
          dataKey="member" 
          stroke="#6b7280" 
          style={{ fontSize: '11px' }}
          tick={{ fill: '#6b7280' }}
        />
        <YAxis 
          stroke="#6b7280" 
          style={{ fontSize: '12px' }}
          tick={{ fill: '#6b7280' }}
          tickFormatter={(value) => value != null ? `${value / 1000}K` : '0K'}
        />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: '#ffffff', 
            border: '1px solid #e5e7eb',
            borderRadius: '8px'
          }}
          formatter={(value: any) => {
            const numValue = value != null ? Number(value) : 0;
            return `₹${numValue.toLocaleString()}`;
          }}
        />
        <ReferenceLine 
          y={benchmarkValue} 
          stroke="#10b981" 
          strokeWidth={2}
          strokeDasharray="5 5"
          label={{ 
            value: benchmarkValue != null ? `Avg: ₹${(benchmarkValue / 1000).toFixed(0)}K` : 'Avg: ₹0K', 
            position: 'right', 
            fill: '#10b981', 
            fontSize: 12 
          }}
        />
        <Line 
          type="monotone" 
          dataKey="revenue" 
          stroke="#8b5cf6" 
          strokeWidth={3} 
          dot={{ fill: '#8b5cf6', r: 5 }}
          activeDot={{ r: 7 }}
          name="Revenue"
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

// Impact Metrics Editor Component
function ImpactMetricsEditor() {
  const queryClient = useQueryClient();
  const [editingMetric, setEditingMetric] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");

  // Fetch impact metrics
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['/api/admin/impact-metrics'],
  });

  // Create mutation for initial metrics
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/admin/impact-metrics', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/impact-metrics'] });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, field, value }: { id: string; field: string; value: number }) => {
      const response = await apiRequest('PUT', `/api/admin/impact-metrics/${id}`, { [field]: value });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/impact-metrics'] });
      toast({ title: "Success", description: "Metric updated successfully" });
      setEditingMetric(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update metric", variant: "destructive" });
    },
  });

  const handleEdit = (metricKey: string, currentValue: number) => {
    setEditingMetric(metricKey);
    setEditValue(currentValue.toString());
  };

  const handleSave = async (field: string) => {
    const value = parseFloat(editValue);
    if (isNaN(value)) {
      toast({ title: "Error", description: "Please enter a valid number", variant: "destructive" });
      return;
    }

    // If no metrics exist, create one first
    if (!metrics || metrics.length === 0) {
      const defaultMetrics = {
        speedToHire: 0,
        revenueImpactOfDelay: 0,
        clientNps: 0,
        candidateNps: 0,
        feedbackTurnAround: 0,
        firstYearRetentionRate: 0,
        fulfillmentRate: 0,
        revenueRecovered: 0,
        [field]: value, // Set the edited field
      };
      await createMutation.mutateAsync(defaultMetrics);
      setEditingMetric(null);
      return;
    }

    updateMutation.mutate({ id: metrics[0].id, field, value });
  };

  const handleKeyDown = (e: React.KeyboardEvent, field: string) => {
    if (e.key === 'Enter') {
      handleSave(field);
    } else if (e.key === 'Escape') {
      setEditingMetric(null);
    }
  };

  if (isLoading) {
    return <div className="text-center py-8 text-gray-500">Loading metrics...</div>;
  }

  const currentMetrics = metrics?.[0] || {
    speedToHire: 0,
    revenueImpactOfDelay: 0,
    clientNps: 0,
    candidateNps: 0,
    feedbackTurnAround: 0,
    firstYearRetentionRate: 0,
    fulfillmentRate: 0,
    revenueRecovered: 0,
  };

  const MetricCard = ({ title, value, unit, subtitle, bgColor, borderColor, textColor, field, testId }: any) => {
    const isEditing = editingMetric === field;
    
    return (
      <div className={`${bgColor} rounded-lg p-4 border ${borderColor} cursor-pointer hover:shadow-md transition-shadow overflow-hidden`} data-testid={testId}>
        <h3 className={`text-sm font-medium ${textColor} mb-2`}>{title}</h3>
        {isEditing ? (
          <div className="flex flex-col space-y-2">
            <Input
              type="number"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, field)}
              className="text-2xl font-bold w-full h-12"
              autoFocus
              data-testid={`input-${field}`}
            />
            <div className="flex space-x-2">
              <Button size="sm" onClick={() => handleSave(field)} className="flex-1" data-testid={`button-save-${field}`}>Save</Button>
              <Button size="sm" variant="outline" onClick={() => setEditingMetric(null)} className="flex-1" data-testid={`button-cancel-${field}`}>Cancel</Button>
            </div>
          </div>
        ) : (
          <div onClick={() => handleEdit(field, value)} data-testid={`value-${field}`}>
            <div className={`text-3xl font-bold ${textColor.replace('700', '600')}`}>{value}{unit}</div>
            <div className="text-sm text-gray-600 mt-1">{subtitle}</div>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <div className="grid grid-cols-4 gap-4 mb-4">
        <MetricCard
          title="Speed to Hire value"
          value={currentMetrics.speedToHire}
          unit=""
          subtitle="Days faster*"
          bgColor="bg-red-50"
          borderColor="border-red-200"
          textColor="text-red-700"
          field="speedToHire"
          testId="card-speedToHire"
        />
        <MetricCard
          title="Revenue Impact Of Delay"
          value={currentMetrics.revenueImpactOfDelay}
          unit=""
          subtitle="Lost per Role*"
          bgColor="bg-red-50"
          borderColor="border-red-200"
          textColor="text-red-700"
          field="revenueImpactOfDelay"
          testId="card-revenueImpactOfDelay"
        />
        <MetricCard
          title="Client NPS"
          value={currentMetrics.clientNps}
          unit=""
          subtitle="Net Promoter Score*"
          bgColor="bg-purple-50"
          borderColor="border-purple-200"
          textColor="text-purple-700"
          field="clientNps"
          testId="card-clientNps"
        />
        <MetricCard
          title="Candidate NPS"
          value={currentMetrics.candidateNps}
          unit=""
          subtitle="Net Promoter Score*"
          bgColor="bg-purple-50"
          borderColor="border-purple-200"
          textColor="text-purple-700"
          field="candidateNps"
          testId="card-candidateNps"
        />
      </div>
      <div className="grid grid-cols-4 gap-4">
        <MetricCard
          title="Feedback Turn Around"
          value={currentMetrics.feedbackTurnAround}
          unit=""
          subtitle="days (Avg. 5 days)*"
          bgColor="bg-yellow-50"
          borderColor="border-yellow-200"
          textColor="text-yellow-700"
          field="feedbackTurnAround"
          testId="card-feedbackTurnAround"
        />
        <MetricCard
          title="First Year Retention Rate"
          value={currentMetrics.firstYearRetentionRate}
          unit="%"
          subtitle=""
          bgColor="bg-yellow-50"
          borderColor="border-yellow-200"
          textColor="text-yellow-700"
          field="firstYearRetentionRate"
          testId="card-firstYearRetentionRate"
        />
        <MetricCard
          title="Fulfillment Rate"
          value={currentMetrics.fulfillmentRate}
          unit="%"
          subtitle=""
          bgColor="bg-yellow-50"
          borderColor="border-yellow-200"
          textColor="text-yellow-700"
          field="fulfillmentRate"
          testId="card-fulfillmentRate"
        />
        <MetricCard
          title="Revenue Recovered"
          value={currentMetrics.revenueRecovered}
          unit=" L"
          subtitle="Gained per hire*"
          bgColor="bg-yellow-50"
          borderColor="border-yellow-200"
          textColor="text-yellow-700"
          field="revenueRecovered"
          testId="card-revenueRecovered"
        />
      </div>
    </>
  );
}

// Client Settings Section Component
function ClientSettingsSection() {
  const queryClient = useQueryClient();
  const [isEditingFeedback, setIsEditingFeedback] = useState(false);
  const [avgDaysValue, setAvgDaysValue] = useState<string>("");

  // Fetch impact metrics
  const { data: metrics, isLoading } = useQuery<any[]>({
    queryKey: ['/api/admin/impact-metrics'],
  });

  // Create mutation for initial metrics
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/admin/impact-metrics', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/impact-metrics'] });
      toast({ title: "Success", description: "Feedback Turn Around Avg Days updated successfully" });
      setIsEditingFeedback(false);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create impact metrics", variant: "destructive" });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, value }: { id: string; value: number }) => {
      const response = await apiRequest('PUT', `/api/admin/impact-metrics/${id}`, { feedbackTurnAroundAvgDays: value });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/impact-metrics'] });
      toast({ title: "Success", description: "Feedback Turn Around Avg Days updated successfully" });
      setIsEditingFeedback(false);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update Feedback Turn Around Avg Days", variant: "destructive" });
    },
  });

  const currentMetrics = (metrics && metrics.length > 0 && metrics[0]) || {
    speedToHire: 0,
    revenueImpactOfDelay: 0,
    clientNps: 0,
    candidateNps: 0,
    feedbackTurnAround: 0,
    feedbackTurnAroundAvgDays: 5,
    firstYearRetentionRate: 0,
    fulfillmentRate: 0,
    revenueRecovered: 0,
  };

  const handleEditClick = () => {
    setAvgDaysValue(currentMetrics.feedbackTurnAroundAvgDays.toString());
    setIsEditingFeedback(true);
  };

  const handleSave = async () => {
    const value = parseFloat(avgDaysValue);
    if (isNaN(value)) {
      toast({ title: "Error", description: "Please enter a valid number", variant: "destructive" });
      return;
    }

    // If no metrics exist, create one first
    if (!metrics || metrics.length === 0) {
      const defaultMetrics = {
        speedToHire: 15,
        revenueImpactOfDelay: 75000,
        clientNps: 60,
        candidateNps: 70,
        feedbackTurnAround: 2,
        feedbackTurnAroundAvgDays: value,
        firstYearRetentionRate: 90,
        fulfillmentRate: 20,
        revenueRecovered: 1.5,
      };
      await createMutation.mutateAsync(defaultMetrics);
      return;
    }

    // Otherwise, update existing metrics
    if (metrics[0]) {
      updateMutation.mutate({ id: metrics[0].id, value });
    }
  };

  const handleCancel = () => {
    setIsEditingFeedback(false);
    setAvgDaysValue("");
  };

  if (isLoading) {
    return (
      <div className="px-6 py-6 flex items-center justify-center h-full">
        <div className="text-center text-gray-500">Loading client settings...</div>
      </div>
    );
  }

  return (
    <div className="px-6 py-6 space-y-4 overflow-auto">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Client Settings</h2>
      
      {/* Impact Metrics Section */}
      <Card className="bg-white dark:bg-gray-800">
        <CardHeader className="pb-2 pt-3">
          <CardTitle className="text-lg text-gray-900 dark:text-white">Impact Metrics</CardTitle>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Only Feedback Turn Around's Avg Days can be edited</p>
        </CardHeader>
        <CardContent className="p-3">
          <div className="grid grid-cols-4 gap-4">
            {/* Speed to Hire - Read Only */}
            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 border border-red-200 dark:border-red-800">
              <div className="text-sm font-medium text-red-700 dark:text-red-400 mb-2">Speed to Hire value</div>
              <div className="text-3xl font-bold text-red-900 dark:text-red-300 mb-1">{currentMetrics.speedToHire}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Days faster*</div>
            </div>

            {/* Revenue Impact of Delay - Read Only */}
            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 border border-red-200 dark:border-red-800">
              <div className="text-sm font-medium text-red-700 dark:text-red-400 mb-2">Revenue Impact Of Delay</div>
              <div className="text-3xl font-bold text-red-900 dark:text-red-300 mb-1">{currentMetrics.revenueImpactOfDelay}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Lost per Role*</div>
            </div>

            {/* Client NPS - Read Only */}
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
              <div className="text-sm font-medium text-purple-700 dark:text-purple-400 mb-2">Client NPS</div>
              <div className="text-3xl font-bold text-purple-900 dark:text-purple-300 mb-1">{currentMetrics.clientNps}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Net Promoter Score*</div>
            </div>

            {/* Candidate NPS - Read Only */}
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
              <div className="text-sm font-medium text-purple-700 dark:text-purple-400 mb-2">Candidate NPS</div>
              <div className="text-3xl font-bold text-purple-900 dark:text-purple-300 mb-1">{currentMetrics.candidateNps}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Net Promoter Score*</div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4 mt-4">
            {/* Feedback Turn Around - Avg Days Editable */}
            <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800 relative">
              <div className="text-sm font-medium text-yellow-700 dark:text-yellow-400 mb-2">Feedback Turn Around</div>
              <div className="text-3xl font-bold text-yellow-900 dark:text-yellow-300 mb-1">{currentMetrics.feedbackTurnAround}</div>
              {isEditingFeedback ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-600 dark:text-gray-400">days (Avg.</span>
                    <Input
                      type="number"
                      value={avgDaysValue}
                      onChange={(e) => setAvgDaysValue(e.target.value)}
                      className="h-7 w-16 text-sm"
                      data-testid="input-feedback-turnaround-avg"
                      autoFocus
                    />
                    <span className="text-xs text-gray-600 dark:text-gray-400">days)*</span>
                  </div>
                  <div className="flex gap-1">
                    <Button 
                      size="sm" 
                      onClick={handleSave}
                      disabled={updateMutation.isPending}
                      className="text-xs h-7"
                      data-testid="button-save-feedback"
                    >
                      {updateMutation.isPending ? "Saving..." : "Save"}
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={handleCancel}
                      className="text-xs h-7"
                      data-testid="button-cancel-feedback"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="text-xs text-gray-600 dark:text-gray-400">days (Avg. {currentMetrics.feedbackTurnAroundAvgDays} days)*</div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={handleEditClick}
                    className="absolute top-2 right-2 h-6 w-6 hover-elevate"
                    data-testid="button-edit-feedback"
                  >
                    <EditIcon className="h-3 w-3" />
                  </Button>
                </>
              )}
            </div>

            {/* First Year Retention Rate - Read Only */}
            <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800">
              <div className="text-sm font-medium text-yellow-700 dark:text-yellow-400 mb-2">First Year Retention Rate</div>
              <div className="text-3xl font-bold text-yellow-900 dark:text-yellow-300 mb-1">{currentMetrics.firstYearRetentionRate}%</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">&nbsp;</div>
            </div>

            {/* Fulfillment Rate - Read Only */}
            <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800">
              <div className="text-sm font-medium text-yellow-700 dark:text-yellow-400 mb-2">Fulfillment Rate</div>
              <div className="text-3xl font-bold text-yellow-900 dark:text-yellow-300 mb-1">{currentMetrics.fulfillmentRate}%</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">&nbsp;</div>
            </div>

            {/* Revenue Recovered - Read Only */}
            <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800">
              <div className="text-sm font-medium text-yellow-700 dark:text-yellow-400 mb-2">Revenue Recovered</div>
              <div className="text-3xl font-bold text-yellow-900 dark:text-yellow-300 mb-1">{currentMetrics.revenueRecovered} L</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Gained per hire*</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminDashboard() {
  const [sidebarTab, setSidebarTab] = useState('dashboard');
  const [activeTab, setActiveTab] = useState('team');
  const [adminProfile, setAdminProfile] = useState(initialAdminProfile);
  const [requirementsVisible, setRequirementsVisible] = useState(10);
  const [isAddRequirementModalOpen, setIsAddRequirementModalOpen] = useState(false);
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
  const [isMetricsModalOpen, setIsMetricsModalOpen] = useState(false);
  const [isClientMetricsModalOpen, setIsClientMetricsModalOpen] = useState(false);
  const [isPipelineModalOpen, setIsPipelineModalOpen] = useState(false);
  const [isCashoutModalOpen, setIsCashoutModalOpen] = useState(false);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [isDatabaseModalOpen, setIsDatabaseModalOpen] = useState(false);
  const [isClientMasterModalOpen, setIsClientMasterModalOpen] = useState(false);
  const [isEmployeeMasterModalOpen, setIsEmployeeMasterModalOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [cashoutData, setCashoutData] = useState<Array<{ month: string; year: string; employees: number; salary: number; incentive: number; tools: number; rent: number; others: number }>>([]);
  const [cashoutForm, setCashoutForm] = useState({
    month: '', year: '', employees: '', salary: '', incentive: '', tools: '', rent: '', others: ''
  });
  const [selectedRequirement, setSelectedRequirement] = useState<any>(null);
  const queryClient = useQueryClient();
  
  // Check if all cashout form fields are filled
  const isCashoutFormComplete = useMemo(() => {
    return !!(
      cashoutForm.month && 
      cashoutForm.year && 
      cashoutForm.employees && 
      cashoutForm.salary && 
      cashoutForm.incentive && 
      cashoutForm.tools && 
      cashoutForm.rent && 
      cashoutForm.others
    );
  }, [cashoutForm]);
  
  // Fetch target mappings from API
  const { data: targetMappings = [], isLoading: isLoadingTargets } = useQuery<TargetMappings[]>({
    queryKey: ["/api/admin/target-mappings"],
  });
  
  // Fetch revenue mappings from API
  const { data: revenueMappings = [], isLoading: isLoadingRevenue } = useQuery<any[]>({
    queryKey: ["/api/admin/revenue-mappings"],
  });
  
  // Fetch pipeline data from API (all applications from all recruiters)
  const { data: pipelineApplications = [], isLoading: isLoadingPipeline } = useQuery<any[]>({
    queryKey: ["/api/admin/pipeline"],
  });
  
  // Transform pipeline applications to candidate data with status stages
  const pipelineApplicantData = useMemo(() => {
    if (!pipelineApplications || pipelineApplications.length === 0) return [];
    
    return pipelineApplications.map((app: any, index: number) => {
      let parsedSkills: string[] = [];
      if (app.skills) {
        try {
          parsedSkills = typeof app.skills === 'string' ? JSON.parse(app.skills) : app.skills;
        } catch {
          parsedSkills = [];
        }
      }

      const statusMap: Record<string, string> = {
        'In Process': 'In-Process',
        'In-Process': 'In-Process',
        'Shortlisted': 'Shortlisted',
        'Rejected': 'Rejected',
        'Reviewed': 'Reviewed',
        'Screened Out': 'Screened Out',
        'L1': 'L1',
        'L2': 'L2',
        'L3': 'L3',
        'Final Round': 'Final Round',
        'HR Round': 'HR Round',
        'Selected': 'Selected',
        'Interview Scheduled': 'L1',
        'Applied': 'In-Process',
        'Intro Call': 'Intro Call',
        'Assignment': 'Assignment',
        'Offer Stage': 'Offer Stage',
        'Closure': 'Closure',
        'Joined': 'Joined',
        'Offer Drop': 'Offer Drop',
        'Declined': 'Declined'
      };

      return {
        id: app.id || `app-${index + 1}`,
        appliedOn: app.appliedDate ? new Date(app.appliedDate).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-') : 'N/A',
        candidateName: app.candidateName || 'Unknown Candidate',
        company: app.company || 'N/A',
        roleApplied: app.jobTitle || 'N/A',
        currentStatus: statusMap[app.status] || app.status || 'In-Process',
        email: app.candidateEmail || 'N/A',
        phone: app.candidatePhone || 'N/A',
        location: app.location || 'N/A',
        experience: app.experience || 'N/A',
        skills: parsedSkills,
        resumeUrl: app.resumeUrl || null,
        rating: 4.0
      };
    });
  }, [pipelineApplications]);

  // Map applicant statuses to pipeline stages (each status maps to exactly one stage)
  const getPipelineCandidatesByStage = useMemo(() => {
    const effectiveApplicants = pipelineApplicantData.filter((a: any) => 
      a.currentStatus !== 'Archived' && 
      a.currentStatus !== 'Screened Out'
    );

    const stageMapping: Record<string, string[]> = {
      'Sourced': ['In-Process', 'Sourced'],
      'Shortlisted': ['Shortlisted'],
      'Intro Call': ['Intro Call'],
      'Assignment': ['Assignment'],
      'L1': ['L1'],
      'L2': ['L2'],
      'L3': ['L3'],
      'Final Round': ['Final Round'],
      'HR Round': ['HR Round'],
      'Offer Stage': ['Offer Stage', 'Selected'],
      'Closure': ['Closure', 'Joined'],
      'Offer Drop': ['Offer Drop', 'Declined'],
      'Rejected': ['Rejected']
    };

    const getCandidatesForStage = (stage: string) => {
      const statusesToMatch = stageMapping[stage] || [];
      return effectiveApplicants.filter((a: any) => statusesToMatch.includes(a.currentStatus));
    };

    return {
      sourced: getCandidatesForStage('Sourced'),
      shortlisted: getCandidatesForStage('Shortlisted'),
      introCall: getCandidatesForStage('Intro Call'),
      assignment: getCandidatesForStage('Assignment'),
      level1: getCandidatesForStage('L1'),
      level2: getCandidatesForStage('L2'),
      level3: getCandidatesForStage('L3'),
      finalRound: getCandidatesForStage('Final Round'),
      hrRound: getCandidatesForStage('HR Round'),
      offerStage: getCandidatesForStage('Offer Stage'),
      closure: getCandidatesForStage('Closure'),
      offerDrop: getCandidatesForStage('Offer Drop'),
      rejected: getCandidatesForStage('Rejected')
    };
  }, [pipelineApplicantData]);
  
  // Revenue mapping state for editing
  const [editingRevenueMapping, setEditingRevenueMapping] = useState<any>(null);
  
  // Delete revenue mapping mutation
  const deleteRevenueMappingMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/admin/revenue-mappings/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/revenue-mappings"] });
      toast({
        title: "Success",
        description: "Revenue mapping deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete revenue mapping",
        variant: "destructive",
      });
    },
  });
  
  // Pipeline modal state
  const [, navigate] = useLocation();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedDailyMetricsTeam, setSelectedDailyMetricsTeam] = useState<'overall' | 'team1' | 'team2'>('overall');
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [selectedPipelineTeam, setSelectedPipelineTeam] = useState<string>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTargetModalOpen, setIsTargetModalOpen] = useState(false);
  const [isDeliveredModalOpen, setIsDeliveredModalOpen] = useState(false);
  const [isDefaultedModalOpen, setIsDefaultedModalOpen] = useState(false);
  const [isTlMeetingsModalOpen, setIsTlMeetingsModalOpen] = useState(false);
  const [isCeoMeetingsModalOpen, setIsCeoMeetingsModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createModalSession, setCreateModalSession] = useState<'message' | 'meeting'>('message');
  const [selectedRecipient, setSelectedRecipient] = useState('');
  const [messageContent, setMessageContent] = useState('');
  const [meetingFor, setMeetingFor] = useState('');
  const [meetingWith, setMeetingWith] = useState('');
  const [meetingType, setMeetingType] = useState('');
  const [meetingDate, setMeetingDate] = useState<Date | undefined>();
  const [meetingTime, setMeetingTime] = useState('');
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [isEditingMeeting, setIsEditingMeeting] = useState(false);
  const [editingMeetingId, setEditingMeetingId] = useState<string | null>(null);
  const [isAllRequirementsModalOpen, setIsAllRequirementsModalOpen] = useState(false);
  const [isTargetMappingModalOpen, setIsTargetMappingModalOpen] = useState(false);
  const [isRevenueMappingModalOpen, setIsRevenueMappingModalOpen] = useState(false);
  const [isPerformanceChartModalOpen, setIsPerformanceChartModalOpen] = useState(false);
  const [isTeamPerformanceTableModalOpen, setIsTeamPerformanceTableModalOpen] = useState(false);
  const [isClosureModalOpen, setIsClosureModalOpen] = useState(false);
  const [isClosureReportsModalOpen, setIsClosureReportsModalOpen] = useState(false);
  const [isAddTeamLeaderModalOpen, setIsAddTeamLeaderModalOpen] = useState(false);
  const [isAddTalentAdvisorModalOpen, setIsAddTalentAdvisorModalOpen] = useState(false);
  const [isAddRecruiterModalOpen, setIsAddRecruiterModalOpen] = useState(false);
  const [isAddTeamLeaderModalNewOpen, setIsAddTeamLeaderModalNewOpen] = useState(false);
  const [isAddClientCredentialsModalOpen, setIsAddClientCredentialsModalOpen] = useState(false);
  const [isPerformanceGraphModalOpen, setIsPerformanceGraphModalOpen] = useState(false);
  const [isRevenueGraphModalOpen, setIsRevenueGraphModalOpen] = useState(false);
  const [revenueTeam, setRevenueTeam] = useState<string>("all");
  const [revenueDateFrom, setRevenueDateFrom] = useState<Date | undefined>(undefined);
  const [revenueDateTo, setRevenueDateTo] = useState<Date | undefined>(undefined);
  const [revenuePeriod, setRevenuePeriod] = useState<string>("monthly");
  const [userList, setUserList] = useState<any[]>([]);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [editingUser, setEditingUser] = useState<any>(null);
  const [messagesData, setMessagesData] = useState(initialMessagesData);
  const [tlMeetingsData, setTlMeetingsData] = useState(initialTlMeetingsData);
  const [ceoMeetingsData, setCeoMeetingsData] = useState(initialCeoMeetingsData);
  const [isAllMessagesModalOpen, setIsAllMessagesModalOpen] = useState(false);
  const [selectedPerformanceTeam, setSelectedPerformanceTeam] = useState<string>("all");
  const [isResumeDatabaseModalOpen, setIsResumeDatabaseModalOpen] = useState(false);
  const [isPerformanceDataModalOpen, setIsPerformanceDataModalOpen] = useState(false);
  const [isEditingFeedbackModal, setIsEditingFeedbackModal] = useState(false);
  const [avgDaysValueModal, setAvgDaysValueModal] = useState<string>("");
  const [isResetPerformanceConfirmOpen, setIsResetPerformanceConfirmOpen] = useState(false);
  const [isResetMasterDataConfirmOpen, setIsResetMasterDataConfirmOpen] = useState(false);
  
  // Search term states for modals and tables
  const [targetSearch, setTargetSearch] = useState('');
  const [messagesSearch, setMessagesSearch] = useState('');
  const [closureReportsSearch, setClosureReportsSearch] = useState('');
  const [cashoutSearch, setCashoutSearch] = useState('');
  const [resumeDatabaseSearch, setResumeDatabaseSearch] = useState('');
  const [employeeMasterSearch, setEmployeeMasterSearch] = useState('');
  const [clientMasterSearch, setClientMasterSearch] = useState('');
  const [teamPerformanceSearch, setTeamPerformanceSearch] = useState('');
  const [closureListSearch, setClosureListSearch] = useState('');
  const [requirementsSearch, setRequirementsSearch] = useState('');
  
  const [clientForm, setClientForm] = useState({
    brandName: '', incorporatedName: '', gstin: '',
    address: '', location: '', spoc: '', email: '', password: '',
    website: '', linkedin: '', agreement: '', percentage: '',
    category: '', paymentTerms: '', source: '', startDate: '',
    currentStatus: 'active'
  });
  const [clientStartDate, setClientStartDate] = useState<Date | undefined>();
  const [employeeForm, setEmployeeForm] = useState({
    employeeId: '', 
    name: '', 
    address: '',
    designation: '',
    email: '',
    phone: '',
    joiningDate: '',
    employmentStatus: '',
    esic: '',
    epfo: '',
    esicNo: '',
    epfoNo: '',
    fatherName: '',
    motherName: '',
    fatherNumber: '',
    motherNumber: '',
    offeredCtc: '',
    currentStatus: '',
    incrementCount: '',
    appraisedQuarter: '',
    appraisedAmount: '',
    appraisedYear: '',
    yearlyCTC: '',
    currentMonthlyCTC: '',
    department: '',
    role: '',
    nameAsPerBank: '',
    accountNumber: '',
    ifscCode: '',
    bankName: '',
    branch: '',
    city: ''
  });

  // Report tab state
  const [teamsReportType, setTeamsReportType] = useState('');
  const [teamsPeriod, setTeamsPeriod] = useState('');
  const [teamsCustomDate, setTeamsCustomDate] = useState<Date | undefined>();
  const [teamsFileFormat, setTeamsFileFormat] = useState('');
  
  const [reportsCheckboxes, setReportsCheckboxes] = useState({
    requirements: true,
    pipeline: true,
    closureReports: true,
    teamPerformance: true
  });
  const [reportsTeam, setReportsTeam] = useState('');
  const [reportsPriority, setReportsPriority] = useState('');
  const [reportsType, setReportsType] = useState('');
  const [reportsFileFormat, setReportsFileFormat] = useState('');
  
  const [generalReportType, setGeneralReportType] = useState('');
  const [generalFileFormat, setGeneralFileFormat] = useState('');
  
  const [showDownloadConfirm, setShowDownloadConfirm] = useState(false);
  const [downloadSection, setDownloadSection] = useState<'teams' | 'reports' | 'general'>('teams');

  // Requirements API queries
  const { data: requirements = [], isLoading: isLoadingRequirements } = useQuery({
    queryKey: ['/api/admin/requirements']
  });

  // Fetch employees from database
  const { data: employees = [], isLoading: isLoadingEmployees } = useQuery<Employee[]>({
    queryKey: ['/api/admin/employees']
  });

  // Filter employees for HR-related tables (Employees Master)
  // Only include employee_record role, exclude TL/TA (they belong in User Management), admin, and clients
  const hrEmployees = useMemo(() => {
    return employees.filter((emp: any) => 
      !emp.employeeId?.startsWith('STAFFOS') &&
      emp.role !== 'client' &&
      emp.role !== 'admin' &&
      emp.role !== 'team_leader' &&
      emp.role !== 'recruiter'
    );
  }, [employees]);

  // Fetch clients from database
  const { data: clients = [], isLoading: isLoadingClients } = useQuery({
    queryKey: ['/api/admin/clients']
  });

  // Fetch impact metrics for Client Metrics modal
  const impactMetricsQuery = useQuery<any[]>({
    queryKey: ['/api/admin/impact-metrics']
  });

  // Filtered data using useMemo for search functionality
  const filteredTargetMappings = useMemo(() => {
    if (!targetSearch.trim()) return targetMappings;
    const search = targetSearch.toLowerCase();
    return targetMappings.filter((mapping: any) => 
      mapping.resource?.toLowerCase().includes(search) ||
      mapping.role?.toLowerCase().includes(search) ||
      mapping.quarter?.toLowerCase().includes(search)
    );
  }, [targetMappings, targetSearch]);

  const filteredMessages = useMemo(() => {
    if (!messagesSearch.trim()) return messagesData;
    const search = messagesSearch.toLowerCase();
    return messagesData.filter(msg => 
      msg.name?.toLowerCase().includes(search) ||
      msg.message?.toLowerCase().includes(search) ||
      msg.date?.toLowerCase().includes(search) ||
      msg.status?.toLowerCase().includes(search)
    );
  }, [messagesData, messagesSearch]);

  const filteredCashoutData = useMemo(() => {
    if (!cashoutSearch.trim()) return cashoutData;
    const search = cashoutSearch.toLowerCase();
    return cashoutData.filter(row => 
      row.month?.toLowerCase().includes(search) ||
      row.year?.toString().includes(search)
    );
  }, [cashoutData, cashoutSearch]);

  // Filter clients for Master Data - exclude login-only clients (those belong in User Management)
  const masterDataClients = useMemo(() => {
    return clients.filter((client: any) => !client.isLoginOnly);
  }, [clients]);

  const filteredClients = useMemo(() => {
    if (!clientMasterSearch.trim()) return masterDataClients;
    const search = clientMasterSearch.toLowerCase();
    return masterDataClients.filter((client: any) => 
      client.brandName?.toLowerCase().includes(search) ||
      client.location?.toLowerCase().includes(search) ||
      client.spoc?.toLowerCase().includes(search) ||
      client.website?.toLowerCase().includes(search) ||
      client.currentStatus?.toLowerCase().includes(search)
    );
  }, [masterDataClients, clientMasterSearch]);

  const filteredHrEmployees = useMemo(() => {
    if (!employeeMasterSearch.trim()) return hrEmployees;
    const search = employeeMasterSearch.toLowerCase();
    return hrEmployees.filter((emp: any) => 
      emp.name?.toLowerCase().includes(search) ||
      emp.email?.toLowerCase().includes(search) ||
      emp.designation?.toLowerCase().includes(search) ||
      emp.employmentStatus?.toLowerCase().includes(search)
    );
  }, [hrEmployees, employeeMasterSearch]);

  const filteredRequirements = useMemo(() => {
    if (!requirementsSearch.trim()) return requirements;
    const search = requirementsSearch.toLowerCase();
    return requirements.filter((req: any) => 
      req.position?.toLowerCase().includes(search) ||
      req.criticality?.toLowerCase().includes(search) ||
      req.company?.toLowerCase().includes(search) ||
      req.spoc?.toLowerCase().includes(search) ||
      req.talentAdvisor?.toLowerCase().includes(search) ||
      req.teamLead?.toLowerCase().includes(search)
    );
  }, [requirements, requirementsSearch]);

  // Fetch daily metrics from API
  const { data: dailyMetricsData = {
    totalRequirements: 0,
    completedRequirements: 0,
    avgResumesPerRequirement: "0.00",
    requirementsPerRecruiter: "0.00",
    totalResumes: 0,
    dailyDeliveryDelivered: 0,
    dailyDeliveryDefaulted: 0,
    overallPerformance: "G"
  }, isLoading: isLoadingMetrics } = useQuery({
    queryKey: ['/api/admin/daily-metrics'],
  });

  // Fetch key aspects data from API for metrics chart
  const { data: keyAspectsApiData } = useQuery<{
    growthMoM: number;
    growthYoY: number;
    burnRate: number;
    churnRate: number;
    attrition: number;
    netProfit: number;
    revenuePerEmployee: number;
    clientAcquisitionCost: number;
    chartData: Array<{ name: string; growthMoM: number; burnRate: number; churnRate: number; attrition: number }>;
  }>({
    queryKey: ['/api/admin/key-aspects'],
  });

  // Key Aspects data with defaults (connected to Key Metrics chart)
  const keyAspectsData = useMemo(() => ({
    growthMoM: keyAspectsApiData?.growthMoM ?? 0,
    growthYoY: keyAspectsApiData?.growthYoY ?? 0,
    burnRate: keyAspectsApiData?.burnRate ?? 0,
    churnRate: keyAspectsApiData?.churnRate ?? 0,
    attrition: keyAspectsApiData?.attrition ?? 0,
    netProfit: keyAspectsApiData?.netProfit ?? 0,
    revenuePerEmployee: keyAspectsApiData?.revenuePerEmployee ?? 0,
    clientAcquisitionCost: keyAspectsApiData?.clientAcquisitionCost ?? 0,
    chartData: keyAspectsApiData?.chartData ?? []
  }), [keyAspectsApiData]);

  // Fetch master data totals from API
  const { data: masterDataTotals } = useQuery<{
    directUploads: number;
    recruiterUploads: number;
    resumes: number;
    headCount: number;
    salaryPaid: number;
    otherExpenses: number;
    toolsAndDatabases: number;
    rentPaid: number;
  }>({
    queryKey: ['/api/admin/master-data-totals'],
  });

  // Master Data totals with defaults
  const masterTotals = useMemo(() => ({
    directUploads: masterDataTotals?.directUploads ?? 0,
    recruiterUploads: masterDataTotals?.recruiterUploads ?? 0,
    resumes: masterDataTotals?.resumes ?? 0,
    headCount: masterDataTotals?.headCount ?? 0,
    salaryPaid: masterDataTotals?.salaryPaid ?? 0,
    otherExpenses: masterDataTotals?.otherExpenses ?? 0,
    toolsAndDatabases: masterDataTotals?.toolsAndDatabases ?? 0,
    rentPaid: masterDataTotals?.rentPaid ?? 0
  }), [masterDataTotals]);

  // Fetch performance metrics from API
  const { data: performanceMetrics = {
    currentQuarter: "Q4 2025",
    minimumTarget: 0,
    targetAchieved: 0,
    incentiveEarned: 0,
    totalRevenue: 0,
    closuresCount: 0,
    performancePercentage: 0
  } } = useQuery<{
    currentQuarter: string;
    minimumTarget: number;
    targetAchieved: number;
    incentiveEarned: number;
    totalRevenue: number;
    closuresCount: number;
    performancePercentage: number;
  }>({
    queryKey: ['/api/admin/performance-metrics'],
  });

  // Fetch team performance data from API
  const { data: teamPerformanceData = [], isLoading: isLoadingTeamPerformance } = useQuery<Array<{
    id: string;
    talentAdvisor: string;
    joiningDate: string;
    tenure: string;
    closures: number;
    lastClosure: string;
    qtrsAchieved: number;
  }>>({
    queryKey: ['/api/admin/team-performance'],
  });

  // Fetch closures list from API
  const { data: closuresListData = [], isLoading: isLoadingClosures } = useQuery<Array<{
    id: string;
    candidate: string;
    position: string;
    client: string;
    quarter: string;
    talentAdvisor: string;
    ctc: string;
    revenue: string;
  }>>({
    queryKey: ['/api/admin/closures-list'],
  });

  // Fetch revenue analysis data from API
  const { data: revenueAnalysis } = useQuery<{
    data: Array<{ member: string; revenue: number }>;
    benchmark: number;
  }>({
    queryKey: ['/api/admin/revenue-analysis'],
  });

  // Fetch monthly performance data from API for the Performance LineChart
  const { data: monthlyPerformanceData } = useQuery<{
    data: Array<Record<string, any>>;
    teams: string[];
    members: Array<{ key: string; name: string; teamLeader: string }>;
  }>({
    queryKey: ['/api/admin/monthly-performance'],
  });

  // Monthly Performance chart data - uses backend data or fallback data
  const monthlyChartData = useMemo(() => {
    if (monthlyPerformanceData?.data && monthlyPerformanceData.data.length > 0) {
      return monthlyPerformanceData.data;
    }
    // Fallback data when no data from API
    return [
      { month: 'Jan', arunTeam: 0, anushaTeam: 0 },
      { month: 'Feb', arunTeam: 0, anushaTeam: 0 },
      { month: 'Mar', arunTeam: 0, anushaTeam: 0 },
      { month: 'Apr', arunTeam: 0, anushaTeam: 0 },
      { month: 'May', arunTeam: 0, anushaTeam: 0 },
      { month: 'Jun', arunTeam: 0, anushaTeam: 0 }
    ];
  }, [monthlyPerformanceData]);

  // Performance chart data - uses backend data or empty array
  const performanceData = useMemo(() => {
    return teamPerformanceData.slice(0, 6).map((member) => ({
      member: member.talentAdvisor,
      requirements: member.closures
    }));
  }, [teamPerformanceData]);

  // Revenue chart data - uses backend data or defaults
  const revenueData = useMemo(() => {
    return revenueAnalysis?.data ?? [
      { member: 'Member 1', revenue: 0 },
      { member: 'Member 2', revenue: 0 }
    ];
  }, [revenueAnalysis]);

  // Reset Performance Data mutation
  const resetPerformanceDataMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('DELETE', '/api/admin/reset-performance-data');
      return response.json();
    },
    onSuccess: () => {
      // Invalidate all performance-related queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['/api/admin/target-mappings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/revenue-mappings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/team-performance'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/closures-list'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/revenue-analysis'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/performance-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/monthly-performance'] });
      toast({
        title: "Success",
        description: "Performance data has been reset. All charts and tables have been refreshed.",
        className: "bg-green-50 border-green-200 text-green-800",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to reset performance data. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Reset Master Data mutation
  const resetMasterDataMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('DELETE', '/api/admin/reset-master-data');
      return response.json();
    },
    onSuccess: () => {
      // Invalidate all master data-related queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['/api/admin/candidates'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/deliveries'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/daily-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/master-data-totals'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/requirements'] });
      toast({
        title: "Success",
        description: "Master data has been reset. All resume and candidate records have been cleared.",
        className: "bg-green-50 border-green-200 text-green-800",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to reset master data. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Archive requirement mutation
  const archiveRequirementMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('POST', `/api/admin/requirements/${id}/archive`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/requirements'] });
      toast({
        title: "Success",
        description: "Requirement archived successfully!",
        className: "bg-green-50 border-green-200 text-green-800",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to archive requirement. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Update requirement mutation
  const updateRequirementMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const response = await apiRequest('PATCH', `/api/admin/requirements/${id}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/requirements'] });
      toast({
        title: "Success",
        description: "Requirement updated successfully!",
        className: "bg-green-50 border-green-200 text-green-800",
      });
      setIsReassignModalOpen(false);
      setSelectedRequirement(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update requirement. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Create client credentials (simplified) mutation
  const createClientCredentialsMutation = useMutation({
    mutationFn: async (clientData: any) => {
      // Send simplified client credentials to the API
      // Note: role is always set to "client" on the server-side for security
      const response = await apiRequest('POST', '/api/admin/clients/credentials', {
        firstName: clientData.firstName,
        lastName: clientData.lastName,
        name: clientData.name,
        phoneNumber: clientData.phoneNumber,
        email: clientData.email,
        password: clientData.password,
        joiningDate: clientData.joiningDate,
        linkedinProfile: clientData.linkedinProfile,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/clients'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/employees'] });
      toast({
        title: "Success",
        description: "Client credentials created successfully!",
        className: "bg-green-50 border-green-200 text-green-800",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create client credentials. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Create client mutation (comprehensive - for Master Data page)
  const createClientMutation = useMutation({
    mutationFn: async (clientData: any) => {
      const response = await apiRequest('POST', '/api/admin/clients', clientData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/clients'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/employees'] });
      toast({
        title: "Success",
        description: "Client profile created successfully!",
        className: "bg-green-50 border-green-200 text-green-800",
      });
      setIsClientModalOpen(false);
      setClientForm({
        brandName: '', incorporatedName: '', gstin: '',
        address: '', location: '', spoc: '', email: '', password: '',
        website: '', linkedin: '', agreement: '', percentage: '',
        category: '', paymentTerms: '', source: '', startDate: '',
        currentStatus: 'active'
      });
      setClientStartDate(undefined);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create client. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Create employee mutation
  const createEmployeeMutation = useMutation({
    mutationFn: async (employeeData: any) => {
      const response = await apiRequest('POST', '/api/admin/employees', employeeData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/employees'] });
      toast({
        title: "Success",
        description: "Employee created successfully!",
        className: "bg-green-50 border-green-200 text-green-800",
      });
      setIsEmployeeModalOpen(false);
      setEmployeeForm({
        employeeId: '', 
        name: '', 
        address: '',
        designation: '',
        email: '',
        phone: '',
        joiningDate: '',
        employmentStatus: '',
        esic: '',
        epfo: '',
        esicNo: '',
        epfoNo: '',
        fatherName: '',
        motherName: '',
        fatherNumber: '',
        motherNumber: '',
        offeredCtc: '',
        currentStatus: '',
        incrementCount: '',
        appraisedQuarter: '',
        appraisedAmount: '',
        appraisedYear: '',
        yearlyCTC: '',
        currentMonthlyCTC: '',
        department: '',
        role: '',
        nameAsPerBank: '',
        accountNumber: '',
        ifscCode: '',
        bankName: '',
        branch: '',
        city: ''
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create employee. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Delete employee mutation
  const updateEmployeeMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await apiRequest('PUT', `/api/admin/employees/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/employees'] });
      toast({
        title: "Success",
        description: "Employee updated successfully!",
        className: "bg-green-50 border-green-200 text-green-800",
      });
      setIsAddRecruiterModalOpen(false);
      setIsAddTeamLeaderModalNewOpen(false);
      setEditingUser(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update employee.",
        variant: "destructive",
      });
    }
  });

  const deleteEmployeeMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('DELETE', `/api/admin/employees/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/employees'] });
      toast({
        title: "Success",
        description: "Employee deleted successfully!",
        className: "bg-green-50 border-green-200 text-green-800",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete employee.",
        variant: "destructive",
      });
    }
  });

  // Delete client mutation
  const deleteClientMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('DELETE', `/api/admin/clients/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/clients'] });
      toast({
        title: "Success",
        description: "Client deleted successfully!",
        className: "bg-green-50 border-green-200 text-green-800",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete client.",
        variant: "destructive",
      });
    }
  });

  // Meetings mutations
  const createMeetingMutation = useMutation({
    mutationFn: async (meetingData: any) => {
      const response = await apiRequest('POST', '/api/admin/meetings', meetingData);
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to create meeting' }));
        throw new Error(error.message || 'Failed to create meeting');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/meetings'] });
      toast({
        title: "Success",
        description: "Meeting created successfully!",
        className: "bg-green-50 border-green-200 text-green-800",
      });
      resetForm();
      setIsCreateModalOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create meeting.",
        variant: "destructive",
      });
    }
  });

  const updateMeetingMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await apiRequest('PATCH', `/api/admin/meetings/${id}`, data);
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to update meeting' }));
        throw new Error(error.message || 'Failed to update meeting');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/meetings'] });
      toast({
        title: "Success",
        description: "Meeting updated successfully!",
        className: "bg-green-50 border-green-200 text-green-800",
      });
      resetForm();
      setIsCreateModalOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update meeting.",
        variant: "destructive",
      });
    }
  });

  const deleteMeetingMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('DELETE', `/api/admin/meetings/${id}`);
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to delete meeting' }));
        throw new Error(error.message || 'Failed to delete meeting');
      }
      return response.json().catch(() => ({}));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/meetings'] });
      toast({
        title: "Success",
        description: "Meeting deleted successfully!",
        className: "bg-green-50 border-green-200 text-green-800",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete meeting.",
        variant: "destructive",
      });
    }
  });

  // Fetch meetings from API
  const { data: allMeetings = [], isLoading: meetingsLoading } = useQuery({
    queryKey: ['/api/admin/meetings'],
    staleTime: 1000 * 60,
  });

  // Derive TL and CEO meetings from query data
  const tlMeetings = useMemo(() => {
    return allMeetings.filter((m: any) => m.meetingCategory === 'tl' && m.status === 'pending');
  }, [allMeetings]);

  const ceoMeetings = useMemo(() => {
    return allMeetings.filter((m: any) => m.meetingCategory === 'ceo_ta' && m.status === 'pending');
  }, [allMeetings]);

  // Meeting action handlers
  const handleRescheduleMeeting = (meeting: any) => {
    setMeetingFor(meeting.meetingCategory === 'tl' ? 'TL' : 'TA');
    setMeetingWith(meeting.personId || '');
    setMeetingType(meeting.meetingType);
    setMeetingDate(new Date(meeting.meetingDate));
    setMeetingTime(meeting.meetingTime);
    setEditingMeetingId(meeting.id);
    setIsCreateModalOpen(true);
  };

  const handleDeleteMeeting = (meetingId: string, personName: string) => {
    if (window.confirm(`Are you sure you want to delete the meeting with ${personName}?`)) {
      deleteMeetingMutation.mutate(meetingId);
    }
  };

  // Static priority distribution - fixed counts that never change
  // These represent the expected number of resumes to be delivered based on priority/criticality
  const priorityDistribution = {
    HIGH: { Easy: 6, Medium: 4, Tough: 2 },
    MEDIUM: { Easy: 5, Medium: 3, Tough: 2 },
    LOW: { Easy: 4, Medium: 3, Tough: 2 },
  };

  const handleMemberClick = (member: any) => {
    setSelectedMember(member);
    setIsModalOpen(true);
  };

  const handleEmailClick = (email: string) => {
    window.open(`mailto:${email}`, '_blank');
  };

  const handleCallClick = (phone: string) => {
    window.open(`tel:${phone}`, '_blank');
  };

  const resetForm = () => {
    setSelectedRecipient('');
    setMessageContent('');
    setMeetingFor('');
    setMeetingWith('');
    setMeetingType('');
    setMeetingDate(undefined);
    setMeetingTime('');
    setEditingMeetingId(null);
  };

  const showSuccessAlert = (message: string) => {
    setAlertMessage(message);
    setShowAlert(true);
    setTimeout(() => {
      setShowAlert(false);
    }, 3000);
  };

  const handleSendMessage = () => {
    if (!selectedRecipient || !messageContent.trim()) {
      return;
    }
    const recipientName = allEmployees.find(emp => emp.id === selectedRecipient)?.name || selectedRecipient;
    
    // Add new message to Message Status table
    const today = new Date();
    const dateStr = today.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    const newMessage = {
      name: recipientName,
      message: messageContent.substring(0, 20) + (messageContent.length > 20 ? '...' : ''),
      date: dateStr,
      status: 'active',
      timestamp: today
    };
    setMessagesData(prev => [newMessage, ...prev]);
    
    showSuccessAlert(`Message sent to ${recipientName} successfully`);
    resetForm();
    setIsCreateModalOpen(false);
  };

  const handleSetMeeting = () => {
    if (!meetingFor || !meetingWith || !meetingType || !meetingDate || !meetingTime) {
      return;
    }
    
    const personName = (meetingFor === 'TL' ? tlList : taList).find(emp => emp.id === meetingWith)?.name || meetingWith;
    const meetingCategory = meetingFor === 'TL' ? 'tl' : 'ceo_ta';
    
    const meetingData = {
      meetingType,
      meetingDate: format(meetingDate, 'yyyy-MM-dd'),
      meetingTime,
      person: personName,
      personId: meetingWith,
      agenda: "Meeting agenda",
      status: 'pending' as const,
      meetingCategory,
    };
    
    if (editingMeetingId) {
      updateMeetingMutation.mutate({ id: editingMeetingId, data: meetingData });
    } else {
      createMeetingMutation.mutate(meetingData);
    }
  };

  // Requirements handlers
  const handleReassign = (requirement: Requirement) => {
    setSelectedRequirement(requirement);
    setIsReassignModalOpen(true);
  };

  const handleArchive = (requirement: Requirement) => {
    if (window.confirm(`Are you sure you want to archive "${requirement.position}" requirement?`)) {
      archiveRequirementMutation.mutate(String(requirement.id));
    }
  };

  const handleRequirementsViewMore = () => {
    if (requirements.length > 10) {
      setIsAllRequirementsModalOpen(true);
    }
  };

  // User management functions
  const handleAddUser = (userData: any) => {
    // Convert modal data to employee form format
    const employeeData = {
      employeeId: userData.id || `STU${Date.now()}`,
      name: userData.name,
      email: userData.email,
      password: userData.password,
      role: userData.role === 'Team Leader' ? 'team_leader' : 'recruiter',
      phone: userData.phoneNumber || '',
      department: '',
      joiningDate: userData.joiningDate || '',
      age: '',
      reportingTo: userData.reportingTo || ''
    };
    
    // Save to database using the employee mutation
    createEmployeeMutation.mutate(employeeData);
    setUserList(prev => [...prev, userData]);
  };

  const handleAddClientCredentials = (userData: any) => {
    // Use the dedicated client credentials mutation
    createClientCredentialsMutation.mutate({
      firstName: userData.firstName,
      lastName: userData.lastName,
      name: userData.name,
      phoneNumber: userData.phoneNumber || '',
      email: userData.email,
      password: userData.password,
      joiningDate: userData.joiningDate || '',
      linkedinProfile: userData.linkedinProfile || '',
    });
    setUserList(prev => [...prev, userData]);
    setIsAddClientCredentialsModalOpen(false);
  };

  const handleEditUser = (user: any) => {
    setEditingUser(user);
    if (user.role === 'Team Leader') {
      setIsAddTeamLeaderModalNewOpen(true);
    } else if (user.role === 'Recruiter') {
      setIsAddRecruiterModalOpen(true);
    }
  };

  const handleUpdateUser = (userData: any) => {
    const employeeData = {
      employeeId: userData.id || `STU${Date.now()}`,
      name: userData.name,
      email: userData.email,
      password: userData.password,
      role: userData.role === 'Team Leader' ? 'team_leader' : 'recruiter',
      phone: userData.phoneNumber || '',
      department: '',
      joiningDate: userData.joiningDate || '',
      age: '',
      reportingTo: userData.reportingTo || ''
    };
    
    updateEmployeeMutation.mutate({ 
      id: userData.dbId, 
      data: employeeData 
    });
  };

  const handleArchivesClick = () => {
    navigate('/archives');
  };

  const handleDeleteUser = (userId: string, userName: string) => {
    if (window.confirm(`Are you sure you want to delete ${userName}?`)) {
      deleteEmployeeMutation.mutate(userId);
    }
  };

  const displayedRequirements = requirements.slice(0, Math.min(requirementsVisible, 10));
  const isShowingAllRequirements = requirementsVisible >= requirements.length;

  const getCriticalityColor = (criticality: string) => {
    switch (criticality) {
      case 'HIGH':
        return 'bg-red-100 text-red-800';
      case 'MEDIUM':
        return 'bg-blue-100 text-blue-800';
      case 'LOW':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleDateChange = (value: string) => {
    setMeetingDate(value);
    setIsCustomDate(value === 'custom');
  };

  const handleAddCashoutData = () => {
    if (cashoutForm.month && cashoutForm.year && cashoutForm.employees && cashoutForm.salary) {
      const newEntry = {
        month: cashoutForm.month,
        year: cashoutForm.year,
        employees: parseInt(cashoutForm.employees) || 0,
        salary: parseInt(cashoutForm.salary) || 0,
        incentive: parseInt(cashoutForm.incentive) || 0,
        tools: parseInt(cashoutForm.tools) || 0,
        rent: parseInt(cashoutForm.rent) || 0,
        others: parseInt(cashoutForm.others) || 0,
      };
      setCashoutData(prev => [newEntry, ...prev]);
      setCashoutForm({
        month: '', year: '', employees: '', salary: '', incentive: '', tools: '', rent: '', others: ''
      });
      toast({
        title: "Success",
        description: "Cash outflow added",
      });
    }
  };

  const getMeetingWithOptions = () => {
    return meetingFor === 'TL' ? tlList : meetingFor === 'TA' ? taList : [];
  };

  // Feedback Turn Around editing handlers for Client Metrics Modal
  const handleEditClickModal = () => {
    const metrics = impactMetricsQuery.data;
    const currentMetrics = (metrics && metrics.length > 0 && metrics[0]) || { feedbackTurnAroundAvgDays: 5 };
    setAvgDaysValueModal(currentMetrics.feedbackTurnAroundAvgDays.toString());
    setIsEditingFeedbackModal(true);
  };

  const handleSaveModal = async () => {
    const value = parseFloat(avgDaysValueModal);
    if (isNaN(value)) {
      toast({ title: "Error", description: "Please enter a valid number", variant: "destructive" });
      return;
    }

    const metrics = impactMetricsQuery.data;
    
    // If no metrics exist, create one first
    if (!metrics || metrics.length === 0) {
      const defaultMetrics = {
        speedToHire: 15,
        revenueImpactOfDelay: 75000,
        clientNps: 60,
        candidateNps: 70,
        feedbackTurnAround: 2,
        feedbackTurnAroundAvgDays: value,
        firstYearRetentionRate: 90,
        fulfillmentRate: 20,
        revenueRecovered: 1.5,
      };
      
      try {
        const response = await apiRequest('POST', '/api/admin/impact-metrics', defaultMetrics);
        await response.json();
        impactMetricsQuery.refetch();
        toast({ title: "Success", description: "Feedback Turn Around Avg Days updated successfully" });
        setIsEditingFeedbackModal(false);
      } catch (error) {
        toast({ title: "Error", description: "Failed to create impact metrics", variant: "destructive" });
      }
      return;
    }

    // Otherwise, update existing metrics
    if (metrics[0]) {
      try {
        const response = await apiRequest('PUT', `/api/admin/impact-metrics/${metrics[0].id}`, { feedbackTurnAroundAvgDays: value });
        await response.json();
        impactMetricsQuery.refetch();
        toast({ title: "Success", description: "Feedback Turn Around Avg Days updated successfully" });
        setIsEditingFeedbackModal(false);
      } catch (error) {
        toast({ title: "Error", description: "Failed to update Feedback Turn Around Avg Days", variant: "destructive" });
      }
    }
  };

  const handleCancelModal = () => {
    setIsEditingFeedbackModal(false);
    setAvgDaysValueModal("");
  };

  // Download report handlers
  const handleDownloadClick = (section: 'teams' | 'reports' | 'general') => {
    setDownloadSection(section);
    setShowDownloadConfirm(true);
  };

  const handleConfirmDownload = () => {
    let fileFormat = '';
    let reportDetails = '';

    if (downloadSection === 'teams') {
      fileFormat = teamsFileFormat;
      reportDetails = `Teams Report - ${teamsReportType || 'N/A'} - ${teamsPeriod || 'N/A'}`;
    } else if (downloadSection === 'reports') {
      fileFormat = reportsFileFormat;
      const selectedReports = Object.entries(reportsCheckboxes)
        .filter(([_, checked]) => checked)
        .map(([key, _]) => key)
        .join(', ');
      reportDetails = `Reports - ${selectedReports} - Team: ${reportsTeam || 'All'} - Priority: ${reportsPriority || 'All'}`;
    } else {
      fileFormat = generalFileFormat;
      reportDetails = `General Report - ${generalReportType || 'N/A'}`;
    }

    if (!fileFormat) {
      toast({
        title: "Error",
        description: "Please select a file format before downloading.",
        variant: "destructive",
      });
      setShowDownloadConfirm(false);
      return;
    }

    // Simulate download
    toast({
      title: "Download Started",
      description: `Downloading ${reportDetails} as ${fileFormat.toUpperCase()}`,
      className: "bg-green-50 border-green-200 text-green-800",
    });

    setShowDownloadConfirm(false);
  };

  const toggleReportCheckbox = (key: keyof typeof reportsCheckboxes) => {
    setReportsCheckboxes(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Fetch admin profile on component mount
  useEffect(() => {
    const fetchAdminProfile = async () => {
      try {
        const response = await apiRequest('GET', '/api/admin/profile');
        if (response.ok) {
          const profile = await response.json();
          setAdminProfile(profile);
        }
      } catch (error) {
        console.error('Failed to fetch admin profile:', error);
      }
    };

    fetchAdminProfile();
  }, []);

  const renderTeamSection = () => (
    <div className="px-3 py-2 space-y-2 flex-1 overflow-y-auto admin-scrollbar">
      {/* Use the new TeamBoxes component - this replaces all the old team display logic */}
      <TeamBoxes />

      {/* Target & Incentives Section */}
      <Card className="bg-gray-50 dark:bg-gray-800">
        <CardHeader className="pb-1 pt-1 flex flex-row items-center justify-between">
          <CardTitle className="text-lg text-gray-900 dark:text-white">Target & Incentives</CardTitle>
          <Button 
            className="bg-cyan-400 hover:bg-cyan-500 text-slate-900 px-4 py-2 rounded font-medium text-sm"
            onClick={() => setIsTargetModalOpen(true)}
            data-testid="button-view-all-targets"
          >
            View All
          </Button>
        </CardHeader>
        <CardContent className="p-1">
          <div className="overflow-x-auto admin-scrollbar">
            <table className="w-full border-collapse bg-white dark:bg-gray-900 rounded">
              <thead>
                <tr className="bg-gray-200 dark:bg-gray-700">
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-700 dark:text-gray-300">Resource</th>
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-700 dark:text-gray-300">Role</th>
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-700 dark:text-gray-300">Quarter</th>
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-700 dark:text-gray-300">Minimum Target</th>
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-700 dark:text-gray-300">Target Achieved</th>
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-700 dark:text-gray-300">Closures</th>
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-700 dark:text-gray-300">Incentives</th>
                </tr>
              </thead>
              <tbody>
                {isLoadingTargets ? (
                  <tr>
                    <td colSpan={7} className="py-4 px-3 text-sm text-gray-600 dark:text-gray-400 text-center">
                      Loading...
                    </td>
                  </tr>
                ) : targetMappings.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-4 px-3 text-sm text-gray-600 dark:text-gray-400 text-center">
                      No target mappings found
                    </td>
                  </tr>
                ) : (
                  targetMappings.slice(0, 5).map((target, index) => (
                    <tr key={target.id} className={index % 2 === 0 ? "bg-blue-50 dark:bg-blue-900/20" : "bg-white dark:bg-gray-800"}>
                      <td className="py-2 px-3 text-sm text-gray-900 dark:text-white font-medium">{target.teamMemberName}</td>
                      <td className="py-2 px-3 text-sm text-gray-600 dark:text-gray-400">{target.teamMemberRole}</td>
                      <td className="py-2 px-3 text-sm text-gray-600 dark:text-gray-400">{target.quarter} {target.year}</td>
                      <td className="py-2 px-3 text-sm text-gray-600 dark:text-gray-400">{target.minimumTarget}</td>
                      <td className="py-2 px-3 text-sm text-gray-600 dark:text-gray-400">{target.targetAchieved || "-"}</td>
                      <td className="py-2 px-3 text-sm text-gray-600 dark:text-gray-400">{target.closures || "-"}</td>
                      <td className="py-2 px-3 text-sm text-gray-600 dark:text-gray-400">{target.incentives || "-"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Daily Metrics Section */}
      <Card className="bg-teal-50 dark:bg-teal-900/30">
        <CardHeader className="pb-1 pt-2 flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-lg text-gray-900 dark:text-white">Daily Metrics</CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={selectedDailyMetricsTeam} onValueChange={(value) => setSelectedDailyMetricsTeam(value as 'overall' | 'team1' | 'team2')}>
              <SelectTrigger className="w-24 h-7 text-sm" data-testid="select-daily-metrics-team">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="overall">Overall</SelectItem>
                <SelectItem value="team1">Team 1</SelectItem>
                <SelectItem value="team2">Team 2</SelectItem>
              </SelectContent>
            </Select>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center space-x-1 h-7 px-2" data-testid="button-daily-metrics-date">
                  <CalendarIcon className="h-3 w-3" />
                  <span className="text-sm">{format(selectedDate, "dd-MMM-yyyy")}</span>
                  <EditIcon className="h-3 w-3" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </CardHeader>
        
        <CardContent className="p-3">
          <div className="grid grid-cols-3 gap-4">
            {/* Left side - Metrics with simplified design matching image 2 */}
            <div className="bg-white rounded p-4 space-y-3">
              <div className="flex justify-between items-center py-2">
                <span className="text-sm font-medium text-gray-700">Total Requirements</span>
                <span className="text-2xl font-bold text-blue-600">{dailyMetricsData.totalRequirements}</span>
              </div>
              <div className="border-t border-gray-200"></div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm font-medium text-gray-700">Total Resumes</span>
                <span className="text-2xl font-bold" data-testid="text-total-resumes">
                  {dailyMetricsData.totalResumesDelivered === dailyMetricsData.totalResumesRequired ? (
                    <span className="text-green-600">
                      {dailyMetricsData.totalResumesDelivered}/{dailyMetricsData.totalResumesRequired}
                    </span>
                  ) : (
                    <>
                      <span className="text-red-600">{dailyMetricsData.totalResumesDelivered}</span>
                      <span className="text-green-600">/{dailyMetricsData.totalResumesRequired}</span>
                    </>
                  )}
                </span>
              </div>
              <div className="border-t border-gray-200"></div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm font-medium text-gray-700">Avg. Resumes per Requirement</span>
                <span className="text-2xl font-bold text-blue-600">{Number(dailyMetricsData.avgResumesPerRequirement).toFixed(2)}</span>
              </div>
              <div className="border-t border-gray-200"></div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm font-medium text-gray-700">Requirements per Recruiter</span>
                <span className="text-2xl font-bold text-blue-600">{Number(dailyMetricsData.requirementsPerRecruiter).toFixed(2)}</span>
              </div>
              <div className="border-t border-gray-200"></div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm font-medium text-gray-700">Completed Requirements</span>
                <span className="text-2xl font-bold text-blue-600">{dailyMetricsData.completedRequirements}</span>
              </div>
            </div>
            
            {/* Center - Daily Delivery */}
            <div className="bg-slate-800 dark:bg-slate-900 rounded p-4 text-white relative">
              <h3 className="text-lg font-semibold text-center mb-4 text-white">Daily Delivery</h3>
              <div className="grid grid-cols-2 gap-3 mb-4 relative">
                <div className="text-center">
                  <p className="text-sm text-cyan-300 mb-2">Delivered</p>
                  <p className="text-4xl font-bold mb-3 text-white">
                    {dailyMetricsData.dailyDeliveryDelivered}
                  </p>
                  <Button 
                    size="sm" 
                    className="bg-cyan-400 hover:bg-cyan-500 text-slate-900 px-4 text-sm rounded"
                    onClick={() => setIsDeliveredModalOpen(true)}
                    data-testid="button-view-delivered"
                  >
                    View
                  </Button>
                </div>
                {/* Center vertical divider */}
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-cyan-300 transform -translate-x-0.5"></div>
                <div className="text-center">
                  <p className="text-sm text-cyan-300 mb-2">Defaulted</p>
                  <p className="text-4xl font-bold mb-3 text-white">
                    {dailyMetricsData.dailyDeliveryDefaulted}
                  </p>
                  <Button 
                    size="sm" 
                    className="bg-cyan-400 hover:bg-cyan-500 text-slate-900 px-4 text-sm rounded"
                    onClick={() => setIsDefaultedModalOpen(true)}
                    data-testid="button-view-defaulted"
                  >
                    View
                  </Button>
                </div>
              </div>
            </div>
            
            {/* Right side - Overall Performance */}
            <div className="bg-white dark:bg-gray-900 rounded p-4">
              <div className="text-left">
                <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Overall Performance</h3>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={() => setIsPerformanceGraphModalOpen(true)}
                      data-testid="button-expand-performance-graph"
                    >
                      <ExternalLink className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                    </Button>
                  </div>
                  <div className={`text-4xl font-bold ${dailyMetricsData.overallPerformance === 'G' ? 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900' : 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900'} w-16 h-16 rounded-sm flex items-center justify-center`} data-testid="indicator-performance">
                    {dailyMetricsData.overallPerformance}
                  </div>
                </div>
                <div className="flex justify-start space-x-2 mb-2">
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">Team Performance</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-0.5 bg-red-500"></div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">Average Benchmark (10)</span>
                  </div>
                </div>
                <div className="h-48 mt-2">
                  <PerformanceChart
                    data={performanceData}
                    height="100%"
                    benchmarkValue={10}
                  />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>


      {/* Messages and Meetings Section */}
      <div className="grid grid-cols-10 gap-3 h-fit">
        {/* Pending Meetings - 4/10 width */}
        <Card className="bg-gray-100 dark:bg-gray-700 col-span-3">
          <CardHeader className="pb-2 pt-3">
            <CardTitle className="text-lg text-gray-900 dark:text-white">Pending Meetings</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="bg-white dark:bg-gray-800  p-4 relative">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">TL's Meeting</h3>
                  <div className="text-4xl font-bold text-gray-900 dark:text-white mb-3">{tlMeetings.length}</div>
                  <Button 
                    size="sm" 
                    className="bg-cyan-400 hover:bg-cyan-500 text-slate-900 px-4 text-sm rounded"
                    onClick={() => setIsTlMeetingsModalOpen(true)}
                    data-testid="button-view-tl-meetings"
                  >
                    View
                  </Button>
                </div>
                {/* Center vertical divider */}
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gray-300 dark:bg-gray-600 transform -translate-x-0.5"></div>
                <div className="text-center">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">CEO's Meeting</h3>
                  <div className="text-4xl font-bold text-gray-900 dark:text-white mb-3">{ceoMeetings.length}</div>
                  <Button 
                    size="sm" 
                    className="bg-cyan-400 hover:bg-cyan-500 text-slate-900 px-4 text-sm rounded"
                    onClick={() => setIsCeoMeetingsModalOpen(true)}
                    data-testid="button-view-ceo-meetings"
                  >
                    View
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Message Status - 5/10 width */}
        <Card className="bg-gray-50 dark:bg-gray-800 col-span-5">
          <CardHeader className="pb-1 pt-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-gray-900 dark:text-white">Message Status</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setIsAllMessagesModalOpen(true)}
                data-testid="button-view-all-messages"
              >
                <ExternalLink className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto admin-scrollbar">
              <table className="w-full text-sm bg-white dark:bg-gray-900 rounded">
                <thead>
                  <tr className="bg-slate-800 text-white">
                    <th className="text-left py-2 px-3 text-sm font-medium">Name</th>
                    <th className="text-left py-2 px-3 text-sm font-medium">Message</th>
                    <th className="text-left py-2 px-3 text-sm font-medium">Date</th>
                    <th className="text-left py-2 px-3 text-sm font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {messagesData.slice(0, 4).map((message, index) => (
                    <tr key={index} className="border-b border-gray-100 dark:border-gray-700">
                      <td className="py-2 px-3 text-gray-900 dark:text-white font-medium">{message.name}</td>
                      <td className="py-2 px-3 text-gray-600 dark:text-gray-400">{message.message}</td>
                      <td className="py-2 px-3 text-gray-600 dark:text-gray-400">{message.date}</td>
                      <td className="py-2 px-3">
                        <span className={`w-3 h-3 rounded-full inline-block ${
                          message.status === 'active' ? 'bg-green-500' : 'bg-red-500'
                        }`}></span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
        
        {/* Create Section - 1/10 width */}
        <Card className="bg-slate-800 dark:bg-slate-900 col-span-2">
          <CardContent className="flex flex-col items-center justify-center h-full p-3">
            <div className="p-4 mb-3">
              <Mail className="w-10 h-10 text-white" />
            </div>
            <Button 
              className="bg-cyan-400 hover:bg-cyan-500 text-slate-900 px-4 py-2 rounded font-medium text-sm"
              onClick={() => setIsCreateModalOpen(true)}
              data-testid="button-create"
            >
              Create
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'team':
        return renderTeamSection();
      case 'requirements':
        return (
          <div className="px-6 py-6 space-y-6 h-full overflow-y-auto admin-scrollbar">
            {/* Header with Requirements title and Add button */}
            <div className="mb-6 flex items-center justify-between gap-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Requirements</h2>
              <div className="flex items-center gap-4">
                <SearchBar
                  value={requirementsSearch}
                  onChange={setRequirementsSearch}
                  placeholder="Search requirements..."
                  testId="input-search-requirements"
                />
                <Button 
                  className="bg-cyan-400 hover:bg-cyan-500 text-black font-medium px-4 py-2 rounded text-sm whitespace-nowrap"
                  onClick={() => setIsAddRequirementModalOpen(true)}
                  data-testid="button-add-requirements"
                >
                  + Add Requirements
                </Button>
              </div>
            </div>
            
            <div className="flex gap-6 h-full">
              {/* Middle Section - Requirements Table */}
              <div className="flex-1 overflow-y-auto admin-scrollbar">
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div className="overflow-x-auto admin-scrollbar">
                    <table className="w-full border-collapse rounded-lg">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                          <th className="text-left p-2 font-medium text-gray-700 dark:text-gray-300 text-sm">Req ID</th>
                          <th className="text-left p-2 font-medium text-gray-700 dark:text-gray-300 text-sm">Positions</th>
                          <th className="text-left p-2 font-medium text-gray-700 dark:text-gray-300 text-sm">Criticality</th>
                          <th className="text-left p-2 font-medium text-gray-700 dark:text-gray-300 text-sm">Company</th>
                          <th className="text-left p-2 font-medium text-gray-700 dark:text-gray-300 text-sm">SPOC</th>
                          <th className="text-left p-2 font-medium text-gray-700 dark:text-gray-300 text-sm">Talent Advisor</th>
                          <th className="text-left p-2 font-medium text-gray-700 dark:text-gray-300 text-sm">Team Lead</th>
                          <th className="text-left p-2 font-medium text-gray-700 dark:text-gray-300 text-sm">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRequirements.map((requirement: Requirement) => (
                          <tr key={requirement.id} className="border-b border-gray-100 dark:border-gray-800">
                            <td className="py-2 px-2 text-gray-900 dark:text-white font-medium text-sm">REQ-{String(requirement.id).padStart(3, '0')}</td>
                            <td className="py-2 px-2 text-gray-900 dark:text-white font-medium text-sm">{requirement.position}</td>
                            <td className="py-2 px-2">
                              <span className={`text-sm font-medium px-2 py-1 rounded ${getCriticalityColor(requirement.criticality)}`}>
                                {requirement.criticality}-{requirement.toughness || 'Medium'}
                              </span>
                            </td>
                            <td className="py-2 px-2 text-gray-600 dark:text-gray-400 text-sm">{requirement.company}</td>
                            <td className="py-2 px-2 text-gray-600 dark:text-gray-400 text-sm">{requirement.spoc}</td>
                            <td className="py-2 px-2 text-gray-600 dark:text-gray-400 text-sm">
                              {requirement.talentAdvisor === "Unassigned" ? (
                                <span className="text-cyan-500 dark:text-cyan-400">{requirement.talentAdvisor}</span>
                              ) : (
                                requirement.talentAdvisor
                              )}
                            </td>
                            <td className="py-2 px-2 text-gray-600 dark:text-gray-400 text-sm">
                              {requirement.teamLead === "Unassigned" ? (
                                <span className="text-cyan-500 dark:text-cyan-400">{requirement.teamLead}</span>
                              ) : (
                                requirement.teamLead
                              )}
                            </td>
                            <td className="py-2 px-2">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                                    </svg>
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-32">
                                  <DropdownMenuItem onClick={() => handleReassign(requirement)}>
                                    Reassign
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleArchive(requirement)}>
                                    Archive
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </tr>
                        ))}









                      </tbody>
                    </table>
                  </div>
                  
                  <div className="flex justify-center gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
                    <Button 
                      variant="outline" 
                      className="px-6 py-2 rounded bg-red-100 hover:bg-red-200 text-red-800 border-red-200"
                      onClick={handleArchivesClick}
                    >
                      Archives
                    </Button>
                    <Button 
                      className="bg-cyan-400 hover:bg-cyan-500 text-slate-900 px-4 py-2 rounded font-medium text-sm"
                      onClick={handleRequirementsViewMore}
                      disabled={requirements.length <= 10}
                    >
                      View More
                    </Button>
                  </div>
                </div>
              </div>

              {/* Right Section - Priority Distribution */}
              <div className="w-80 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 px-6 py-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Priority Distribution</h3>
                  
                  <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        {/* HIGH Priority Group */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded">
                            <span className="text-sm font-semibold text-red-800 dark:text-red-400">HIGH</span>
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between px-3 py-1.5 hover-elevate rounded">
                              <span className="text-xs text-gray-600 dark:text-gray-400">Easy</span>
                              <span className="text-sm font-semibold text-red-600 dark:text-red-400">{priorityDistribution.HIGH.Easy}</span>
                            </div>
                            <div className="flex items-center justify-between px-3 py-1.5 hover-elevate rounded">
                              <span className="text-xs text-gray-600 dark:text-gray-400">Med</span>
                              <span className="text-sm font-semibold text-red-600 dark:text-red-400">{priorityDistribution.HIGH.Medium}</span>
                            </div>
                            <div className="flex items-center justify-between px-3 py-1.5 hover-elevate rounded">
                              <span className="text-xs text-gray-600 dark:text-gray-400">Tough</span>
                              <span className="text-sm font-semibold text-red-600 dark:text-red-400">{priorityDistribution.HIGH.Tough}</span>
                            </div>
                          </div>
                        </div>
                        
                        {/* MED Priority Group */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between bg-yellow-50 dark:bg-yellow-900/20 px-3 py-2 rounded">
                            <span className="text-sm font-semibold text-yellow-800 dark:text-yellow-400">MED</span>
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between px-3 py-1.5 hover-elevate rounded">
                              <span className="text-xs text-gray-600 dark:text-gray-400">Easy</span>
                              <span className="text-sm font-semibold text-yellow-600 dark:text-yellow-400">{priorityDistribution.MEDIUM.Easy}</span>
                            </div>
                            <div className="flex items-center justify-between px-3 py-1.5 hover-elevate rounded">
                              <span className="text-xs text-gray-600 dark:text-gray-400">Med</span>
                              <span className="text-sm font-semibold text-yellow-600 dark:text-yellow-400">{priorityDistribution.MEDIUM.Medium}</span>
                            </div>
                            <div className="flex items-center justify-between px-3 py-1.5 hover-elevate rounded">
                              <span className="text-xs text-gray-600 dark:text-gray-400">Tough</span>
                              <span className="text-sm font-semibold text-yellow-600 dark:text-yellow-400">{priorityDistribution.MEDIUM.Tough}</span>
                            </div>
                          </div>
                        </div>
                        
                        {/* LOW Priority Group */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between bg-green-50 dark:bg-green-900/20 px-3 py-2 rounded">
                            <span className="text-sm font-semibold text-green-800 dark:text-green-400">LOW</span>
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between px-3 py-1.5 hover-elevate rounded">
                              <span className="text-xs text-gray-600 dark:text-gray-400">Easy</span>
                              <span className="text-sm font-semibold text-green-600 dark:text-green-400">{priorityDistribution.LOW.Easy}</span>
                            </div>
                            <div className="flex items-center justify-between px-3 py-1.5 hover-elevate rounded">
                              <span className="text-xs text-gray-600 dark:text-gray-400">Med</span>
                              <span className="text-sm font-semibold text-green-600 dark:text-green-400">{priorityDistribution.LOW.Medium}</span>
                            </div>
                            <div className="flex items-center justify-between px-3 py-1.5 hover-elevate rounded">
                              <span className="text-xs text-gray-600 dark:text-gray-400">Tough</span>
                              <span className="text-sm font-semibold text-green-600 dark:text-green-400">{priorityDistribution.LOW.Tough}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        );
      case 'pipeline':
        return (
          <div className="px-6 py-6 space-y-6 h-full overflow-y-auto admin-scrollbar">
            {/* Pipeline Header */}
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white" data-testid="text-pipeline-header">Pipeline (View Only)</h2>
              <div className="flex items-center gap-4">
                <div className="flex items-center text-gray-600 dark:text-gray-400">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(new Date(), 'dd-MMM-yyyy')}
                </div>
              </div>
            </div>

            {/* Loading State */}
            {isLoadingPipeline && (
              <div className="flex items-center justify-center py-12">
                <div className="text-gray-500">Loading pipeline data...</div>
              </div>
            )}

            {/* Empty State */}
            {!isLoadingPipeline && pipelineApplicantData.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12">
                <Users className="h-16 w-16 text-gray-300 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Pipeline Data</h3>
                <p className="text-gray-500 text-center max-w-md">
                  When recruiters tag candidates to requirements and update their statuses, they will appear here automatically.
                </p>
              </div>
            )}

            {/* Pipeline Data Display */}
            {!isLoadingPipeline && pipelineApplicantData.length > 0 && (
              <div className="flex gap-6">
                {/* Left Side - Pipeline Stages */}
                <div className="flex-1">
                  <Card>
                    <CardContent className="p-6">
                      <div className="overflow-x-auto admin-scrollbar">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="border-b border-gray-200 dark:border-gray-700">
                              <th className="text-center p-3 font-semibold text-gray-700 dark:text-gray-300 min-w-[120px]" data-testid="header-pipeline-level1">Level 1</th>
                              <th className="text-center p-3 font-semibold text-gray-700 dark:text-gray-300 min-w-[120px]" data-testid="header-pipeline-level2">Level 2</th>
                              <th className="text-center p-3 font-semibold text-gray-700 dark:text-gray-300 min-w-[120px]" data-testid="header-pipeline-level3">Level 3</th>
                              <th className="text-center p-3 font-semibold text-gray-700 dark:text-gray-300 min-w-[120px]" data-testid="header-pipeline-finalround">Final Round</th>
                              <th className="text-center p-3 font-semibold text-gray-700 dark:text-gray-300 min-w-[120px]" data-testid="header-pipeline-hrround">HR Round</th>
                              <th className="text-center p-3 font-semibold text-gray-700 dark:text-gray-300 min-w-[120px]" data-testid="header-pipeline-offerstage">Offer Stage</th>
                              <th className="text-center p-3 font-semibold text-gray-700 dark:text-gray-300 min-w-[120px]" data-testid="header-pipeline-closure">Closure</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td className="p-3 align-top" data-testid="column-pipeline-level1">
                                <div className="space-y-2">
                                  {getPipelineCandidatesByStage.level1.map((candidate: any, index: number) => (
                                    <div key={candidate.id || index} className="px-3 py-2 rounded text-sm text-black text-center cursor-default" style={{backgroundColor: '#E6F4EA'}} title={`${candidate.candidateName} - ${candidate.roleApplied}`} data-testid={`pipeline-l1-candidate-${index}`}>
                                      {candidate.candidateName}
                                    </div>
                                  ))}
                                  {getPipelineCandidatesByStage.level1.length === 0 && (
                                    <div className="text-xs text-gray-400 text-center py-2">No candidates</div>
                                  )}
                                </div>
                              </td>
                              <td className="p-3 align-top" data-testid="column-pipeline-level2">
                                <div className="space-y-2">
                                  {getPipelineCandidatesByStage.level2.map((candidate: any, index: number) => (
                                    <div key={candidate.id || index} className="px-3 py-2 rounded text-sm text-black text-center cursor-default" style={{backgroundColor: '#D9F0E1'}} title={`${candidate.candidateName} - ${candidate.roleApplied}`} data-testid={`pipeline-l2-candidate-${index}`}>
                                      {candidate.candidateName}
                                    </div>
                                  ))}
                                  {getPipelineCandidatesByStage.level2.length === 0 && (
                                    <div className="text-xs text-gray-400 text-center py-2">No candidates</div>
                                  )}
                                </div>
                              </td>
                              <td className="p-3 align-top" data-testid="column-pipeline-level3">
                                <div className="space-y-2">
                                  {getPipelineCandidatesByStage.level3.map((candidate: any, index: number) => (
                                    <div key={candidate.id || index} className="px-3 py-2 rounded text-sm text-black text-center cursor-default" style={{backgroundColor: '#C2EED0'}} title={`${candidate.candidateName} - ${candidate.roleApplied}`} data-testid={`pipeline-l3-candidate-${index}`}>
                                      {candidate.candidateName}
                                    </div>
                                  ))}
                                  {getPipelineCandidatesByStage.level3.length === 0 && (
                                    <div className="text-xs text-gray-400 text-center py-2">No candidates</div>
                                  )}
                                </div>
                              </td>
                              <td className="p-3 align-top" data-testid="column-pipeline-finalround">
                                <div className="space-y-2">
                                  {getPipelineCandidatesByStage.finalRound.map((candidate: any, index: number) => (
                                    <div key={candidate.id || index} className="px-3 py-2 rounded text-sm text-black text-center cursor-default" style={{backgroundColor: '#B5E1C1'}} title={`${candidate.candidateName} - ${candidate.roleApplied}`} data-testid={`pipeline-finalround-candidate-${index}`}>
                                      {candidate.candidateName}
                                    </div>
                                  ))}
                                  {getPipelineCandidatesByStage.finalRound.length === 0 && (
                                    <div className="text-xs text-gray-400 text-center py-2">No candidates</div>
                                  )}
                                </div>
                              </td>
                              <td className="p-3 align-top" data-testid="column-pipeline-hrround">
                                <div className="space-y-2">
                                  {getPipelineCandidatesByStage.hrRound.map((candidate: any, index: number) => (
                                    <div key={candidate.id || index} className="px-3 py-2 rounded text-sm text-white text-center cursor-default" style={{backgroundColor: '#99D9AE'}} title={`${candidate.candidateName} - ${candidate.roleApplied}`} data-testid={`pipeline-hrround-candidate-${index}`}>
                                      {candidate.candidateName}
                                    </div>
                                  ))}
                                  {getPipelineCandidatesByStage.hrRound.length === 0 && (
                                    <div className="text-xs text-gray-400 text-center py-2">No candidates</div>
                                  )}
                                </div>
                              </td>
                              <td className="p-3 align-top" data-testid="column-pipeline-offerstage">
                                <div className="space-y-2">
                                  {getPipelineCandidatesByStage.offerStage.map((candidate: any, index: number) => (
                                    <div key={candidate.id || index} className="px-3 py-2 rounded text-sm text-white text-center cursor-default" style={{backgroundColor: '#7CCBA0'}} title={`${candidate.candidateName} - ${candidate.roleApplied}`} data-testid={`pipeline-offerstage-candidate-${index}`}>
                                      {candidate.candidateName}
                                    </div>
                                  ))}
                                  {getPipelineCandidatesByStage.offerStage.length === 0 && (
                                    <div className="text-xs text-gray-400 text-center py-2">No candidates</div>
                                  )}
                                </div>
                              </td>
                              <td className="p-3 align-top" data-testid="column-pipeline-closure">
                                <div className="space-y-2">
                                  {getPipelineCandidatesByStage.closure.map((candidate: any, index: number) => (
                                    <div key={candidate.id || index} className="px-3 py-2 rounded text-sm text-white text-center cursor-default" style={{backgroundColor: '#2F6F52'}} title={`${candidate.candidateName} - ${candidate.roleApplied}`} data-testid={`pipeline-closure-candidate-${index}`}>
                                      {candidate.candidateName}
                                    </div>
                                  ))}
                                  {getPipelineCandidatesByStage.closure.length === 0 && (
                                    <div className="text-xs text-gray-400 text-center py-2">No candidates</div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Right Side - Statistics Panel */}
                <div className="w-64">
                  <Card>
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        {/* REJECTED */}
                        <div className="flex items-center justify-between p-3 rounded" style={{backgroundColor: '#FEE2E2'}}>
                          <span className="font-semibold text-black">R</span>
                          <span className="text-sm text-black">EJECTED</span>
                          <span className="font-bold text-lg text-black" data-testid="count-rejected">{getPipelineCandidatesByStage.rejected.length}</span>
                        </div>
                        
                        {/* SHORTLISTED */}
                        <div className="flex items-center justify-between p-3 rounded" style={{backgroundColor: '#D9F0E1'}}>
                          <span className="font-semibold text-black">S</span>
                          <span className="text-sm text-black">HORTLISTED</span>
                          <span className="font-bold text-lg text-black" data-testid="count-shortlisted">{getPipelineCandidatesByStage.shortlisted.length}</span>
                        </div>
                        
                        {/* INTRO CALL */}
                        <div className="flex items-center justify-between p-3 rounded" style={{backgroundColor: '#C2EED0'}}>
                          <span className="font-semibold text-black">I</span>
                          <span className="text-sm text-black">NTRO CALL</span>
                          <span className="font-bold text-lg text-black" data-testid="count-introcall">{getPipelineCandidatesByStage.introCall.length}</span>
                        </div>
                        
                        {/* ASSIGNMENT */}
                        <div className="flex items-center justify-between p-3 rounded" style={{backgroundColor: '#B5E1C1'}}>
                          <span className="font-semibold text-black">A</span>
                          <span className="text-sm text-black">SSIGNMENT</span>
                          <span className="font-bold text-lg text-black" data-testid="count-assignment">{getPipelineCandidatesByStage.assignment.length}</span>
                        </div>
                        
                        {/* L1 */}
                        <div className="flex items-center justify-between p-3 rounded" style={{backgroundColor: '#99D9AE'}}>
                          <span className="font-semibold text-white">L1</span>
                          <span className="text-sm text-white"></span>
                          <span className="font-bold text-lg text-white" data-testid="count-l1">{getPipelineCandidatesByStage.level1.length}</span>
                        </div>
                        
                        {/* L2 */}
                        <div className="flex items-center justify-between p-3 rounded" style={{backgroundColor: '#7CCBA0'}}>
                          <span className="font-semibold text-white">L2</span>
                          <span className="text-sm text-white"></span>
                          <span className="font-bold text-lg text-white" data-testid="count-l2">{getPipelineCandidatesByStage.level2.length}</span>
                        </div>
                        
                        {/* L3 */}
                        <div className="flex items-center justify-between p-3 rounded" style={{backgroundColor: '#6BB68C'}}>
                          <span className="font-semibold text-white">L3</span>
                          <span className="text-sm text-white"></span>
                          <span className="font-bold text-lg text-white" data-testid="count-l3">{getPipelineCandidatesByStage.level3.length}</span>
                        </div>
                        
                        {/* FINAL ROUND */}
                        <div className="flex items-center justify-between p-3 rounded" style={{backgroundColor: '#56A87D'}}>
                          <span className="font-semibold text-white">F</span>
                          <span className="text-sm text-white">INAL ROUND</span>
                          <span className="font-bold text-lg text-white" data-testid="count-finalround">{getPipelineCandidatesByStage.finalRound.length}</span>
                        </div>
                        
                        {/* HR ROUND */}
                        <div className="flex items-center justify-between p-3 rounded" style={{backgroundColor: '#479E72'}}>
                          <span className="font-semibold text-white">H</span>
                          <span className="text-sm text-white">R ROUND</span>
                          <span className="font-bold text-lg text-white" data-testid="count-hrround">{getPipelineCandidatesByStage.hrRound.length}</span>
                        </div>
                        
                        {/* OFFER STAGE */}
                        <div className="flex items-center justify-between p-3 rounded" style={{backgroundColor: '#3F8E66'}}>
                          <span className="font-semibold text-white">O</span>
                          <span className="text-sm text-white">FFER STAGE</span>
                          <span className="font-bold text-lg text-white" data-testid="count-offerstage">{getPipelineCandidatesByStage.offerStage.length}</span>
                        </div>
                        
                        {/* CLOSURE */}
                        <div className="flex items-center justify-between p-3 rounded" style={{backgroundColor: '#2F6F52'}}>
                          <span className="font-semibold text-white">C</span>
                          <span className="text-sm text-white">LOSURE</span>
                          <span className="font-bold text-lg text-white" data-testid="count-closure">{getPipelineCandidatesByStage.closure.length}</span>
                        </div>
                        
                        {/* OFFER DROP */}
                        <div className="flex items-center justify-between p-3 rounded" style={{backgroundColor: '#C59445'}}>
                          <span className="font-semibold text-white">O</span>
                          <span className="text-sm text-white">FFER DROP</span>
                          <span className="font-bold text-lg text-white" data-testid="count-offerdrop">{getPipelineCandidatesByStage.offerDrop.length}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {/* Closure Reports */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle 
                  className="text-lg font-semibold text-gray-900 dark:text-white cursor-pointer hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors flex items-center gap-2"
                  onClick={() => setIsPipelineModalOpen(true)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setIsPipelineModalOpen(true);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  data-testid="button-see-more-pipeline"
                >
                  Closure Reports
                  <span className="text-sm font-normal text-cyan-600 dark:text-cyan-400">(See More)</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto admin-scrollbar">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-800">
                        <th className="text-left p-2 font-medium text-gray-700 dark:text-gray-300 text-sm">Candidate</th>
                        <th className="text-left p-2 font-medium text-gray-700 dark:text-gray-300 text-sm">Positions</th>
                        <th className="text-left p-2 font-medium text-gray-700 dark:text-gray-300 text-sm">Client</th>
                        <th className="text-left p-2 font-medium text-gray-700 dark:text-gray-300 text-sm">Location</th>
                        <th className="text-left p-2 font-medium text-gray-700 dark:text-gray-300 text-sm">Experience</th>
                        <th className="text-left p-2 font-medium text-gray-700 dark:text-gray-300 text-sm">Applied Date</th>
                        <th className="text-left p-2 font-medium text-gray-700 dark:text-gray-300 text-sm">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getPipelineCandidatesByStage.closure.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-gray-500 dark:text-gray-400">
                            No closures yet. Candidates with 'Closure' or 'Joined' status will appear here automatically.
                          </td>
                        </tr>
                      ) : (
                        getPipelineCandidatesByStage.closure.slice(0, 5).map((candidate: any, index: number) => (
                          <tr 
                            key={candidate.id || index} 
                            className={`border-b border-gray-100 dark:border-gray-800 ${index % 2 === 1 ? 'bg-gray-50 dark:bg-gray-800/50' : ''}`}
                            data-testid={`closure-row-${index}`}
                          >
                            <td className="py-3 px-3 text-gray-900 dark:text-white font-medium">{candidate.candidateName}</td>
                            <td className="py-3 px-3 text-gray-600 dark:text-gray-400">{candidate.roleApplied}</td>
                            <td className="py-3 px-3 text-gray-600 dark:text-gray-400">{candidate.company}</td>
                            <td className="py-3 px-3 text-gray-600 dark:text-gray-400">{candidate.location}</td>
                            <td className="py-3 px-3 text-gray-600 dark:text-gray-400">{candidate.experience}</td>
                            <td className="py-3 px-3 text-gray-600 dark:text-gray-400">{candidate.appliedOn}</td>
                            <td className="py-3 px-3">
                              <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                {candidate.currentStatus}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      case 'metrics':
        return (
          <div className="flex items-center justify-center h-full min-h-[500px]">
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Metrics</h1>
          </div>
        );
      case 'master-data':
        return (
          <div className="px-6 py-6 space-y-8 h-full overflow-y-auto admin-scrollbar">
            {/* Resume Database */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Resume Database</CardTitle>
                <Button 
                  className="btn-rounded bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => navigate('/master-database')}
                >
                  View Full Database
                </Button>
              </CardHeader>
              <CardContent>
                {/* Summary Cards */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <Card className="text-center p-4">
                    <CardContent className="p-0">
                      <div className="text-sm text-red-600 dark:text-red-400 mb-2 font-semibold">TOTAL RESUMES</div>
                      <div className="text-3xl font-bold text-red-600 dark:text-red-400">50,000</div>
                    </CardContent>
                  </Card>
                  
                  <Card className="text-center p-4">
                    <CardContent className="p-0">
                      <div className="text-sm text-blue-600 dark:text-blue-400 mb-2 font-semibold">DIRECT UPLOADS</div>
                      <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">5,000</div>
                    </CardContent>
                  </Card>
                  
                  <Card className="text-center p-4">
                    <CardContent className="p-0">
                      <div className="text-sm text-blue-600 dark:text-blue-400 mb-2 font-semibold">RECRUITER UPLOAD</div>
                      <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">50,000</div>
                    </CardContent>
                  </Card>
                </div>

                {/* Resume Database Table */}
                <div className="overflow-x-auto admin-scrollbar">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left p-2 font-medium text-gray-700 dark:text-gray-300 text-sm">Resume ID</th>
                        <th className="text-left p-2 font-medium text-gray-700 dark:text-gray-300 text-sm">Candidate Name</th>
                        <th className="text-left p-2 font-medium text-gray-700 dark:text-gray-300 text-sm">Position</th>
                        <th className="text-left p-2 font-medium text-gray-700 dark:text-gray-300 text-sm">Experience</th>
                        <th className="text-left p-2 font-medium text-gray-700 dark:text-gray-300 text-sm">Skills</th>
                        <th className="text-left p-2 font-medium text-gray-700 dark:text-gray-300 text-sm">Upload Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-gray-100 dark:border-gray-800">
                        <td className="py-3 px-3 text-gray-900 dark:text-white">RES001</td>
                        <td className="py-3 px-3 text-gray-600 dark:text-gray-400">Rajesh Kumar</td>
                        <td className="py-3 px-3 text-gray-600 dark:text-gray-400">Software Engineer</td>
                        <td className="py-3 px-3 text-gray-600 dark:text-gray-400">5 Years</td>
                        <td className="py-3 px-3 text-gray-600 dark:text-gray-400">React, Node.js, Python</td>
                        <td className="py-3 px-3 text-gray-600 dark:text-gray-400">15-01-2025</td>
                      </tr>
                      <tr className="border-b border-gray-100 dark:border-gray-800">
                        <td className="py-3 px-3 text-gray-900 dark:text-white">RES002</td>
                        <td className="py-3 px-3 text-gray-600 dark:text-gray-400">Priya Sharma</td>
                        <td className="py-3 px-3 text-gray-600 dark:text-gray-400">Data Analyst</td>
                        <td className="py-3 px-3 text-gray-600 dark:text-gray-400">3 Years</td>
                        <td className="py-3 px-3 text-gray-600 dark:text-gray-400">SQL, Excel, Power BI</td>
                        <td className="py-3 px-3 text-gray-600 dark:text-gray-400">18-01-2025</td>
                      </tr>
                      <tr className="border-b border-gray-100 dark:border-gray-800">
                        <td className="py-3 px-3 text-gray-900 dark:text-white">RES003</td>
                        <td className="py-3 px-3 text-gray-600 dark:text-gray-400">Arun Patel</td>
                        <td className="py-3 px-3 text-gray-600 dark:text-gray-400">DevOps Engineer</td>
                        <td className="py-3 px-3 text-gray-600 dark:text-gray-400">7 Years</td>
                        <td className="py-3 px-3 text-gray-600 dark:text-gray-400">AWS, Docker, Kubernetes</td>
                        <td className="py-3 px-3 text-gray-600 dark:text-gray-400">20-01-2025</td>
                      </tr>
                      <tr className="border-b border-gray-100 dark:border-gray-800">
                        <td className="py-3 px-3 text-gray-900 dark:text-white">RES004</td>
                        <td className="py-3 px-3 text-gray-600 dark:text-gray-400">Sneha Reddy</td>
                        <td className="py-3 px-3 text-gray-600 dark:text-gray-400">UI/UX Designer</td>
                        <td className="py-3 px-3 text-gray-600 dark:text-gray-400">4 Years</td>
                        <td className="py-3 px-3 text-gray-600 dark:text-gray-400">Figma, Adobe XD, HTML/CSS</td>
                        <td className="py-3 px-3 text-gray-600 dark:text-gray-400">22-01-2025</td>
                      </tr>
                      <tr className="border-b border-gray-100 dark:border-gray-800">
                        <td className="py-3 px-3 text-gray-900 dark:text-white">RES005</td>
                        <td className="py-3 px-3 text-gray-600 dark:text-gray-400">Vikram Singh</td>
                        <td className="py-3 px-3 text-gray-600 dark:text-gray-400">Project Manager</td>
                        <td className="py-3 px-3 text-gray-600 dark:text-gray-400">8 Years</td>
                        <td className="py-3 px-3 text-gray-600 dark:text-gray-400">Agile, Scrum, JIRA</td>
                        <td className="py-3 px-3 text-gray-600 dark:text-gray-400">25-01-2025</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                
                <div className="mt-4 text-center">
                  <p className="text-sm text-gray-600 dark:text-gray-400 italic">
                    Click on "View Full Database" button above to see the complete master database
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Employees Master */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Employees Master</CardTitle>
                <Button className="btn-rounded bg-blue-600 hover:bg-blue-700 text-white">+ Add Employee</Button>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto admin-scrollbar">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left p-2 font-medium text-gray-700 dark:text-gray-300 text-sm">Employee ID</th>
                        <th className="text-left p-2 font-medium text-gray-700 dark:text-gray-300 text-sm">Name</th>
                        <th className="text-left p-2 font-medium text-gray-700 dark:text-gray-300 text-sm">Father's Name</th>
                        <th className="text-left p-2 font-medium text-gray-700 dark:text-gray-300 text-sm">Employee Status</th>
                        <th className="text-left p-2 font-medium text-gray-700 dark:text-gray-300 text-sm">Date of Joining</th>
                        <th className="text-left p-2 font-medium text-gray-700 dark:text-gray-300 text-sm">Current CTC</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-gray-100 dark:border-gray-800">
                        <td className="py-3 px-3 text-gray-900 dark:text-white">STTA001</td>
                        <td className="py-3 px-3 text-gray-600 dark:text-gray-400">Sundhar Raj</td>
                        <td className="py-3 px-3 text-gray-600 dark:text-gray-400">David Wilson</td>
                        <td className="py-3 px-3 text-gray-600 dark:text-gray-400">Intern</td>
                        <td className="py-3 px-3 text-gray-600 dark:text-gray-400">12-08-2025</td>
                        <td className="py-3 px-3 text-gray-600 dark:text-gray-400">10,000</td>
                      </tr>
                      <tr className="border-b border-gray-100 dark:border-gray-800">
                        <td className="py-3 px-3 text-gray-900 dark:text-white">STTA002</td>
                        <td className="py-3 px-3 text-gray-600 dark:text-gray-400">kavitha</td>
                        <td className="py-3 px-3 text-gray-600 dark:text-gray-400">Tom Anderson</td>
                        <td className="py-3 px-3 text-gray-600 dark:text-gray-400">Permanent</td>
                        <td className="py-3 px-3 text-gray-600 dark:text-gray-400">10-07-2025</td>
                        <td className="py-3 px-3 text-gray-600 dark:text-gray-400">15,000</td>
                      </tr>
                      <tr className="border-b border-gray-100 dark:border-gray-800">
                        <td className="py-3 px-3 text-gray-900 dark:text-white">STTA003</td>
                        <td className="py-3 px-3 text-gray-600 dark:text-gray-400">Vignesh</td>
                        <td className="py-3 px-3 text-gray-600 dark:text-gray-400">Robert Kim</td>
                        <td className="py-3 px-3 text-gray-600 dark:text-gray-400">Probation</td>
                        <td className="py-3 px-3 text-gray-600 dark:text-gray-400">22-10-2025</td>
                        <td className="py-3 px-3 text-gray-600 dark:text-gray-400">12,000</td>
                      </tr>
                      <tr className="border-b border-gray-100 dark:border-gray-800">
                        <td className="py-3 px-3 text-gray-900 dark:text-white">STTA004</td>
                        <td className="py-3 px-3 text-gray-600 dark:text-gray-400">Saran</td>
                        <td className="py-3 px-3 text-gray-600 dark:text-gray-400">Kevin Brown</td>
                        <td className="py-3 px-3 text-gray-600 dark:text-gray-400">Probation</td>
                        <td className="py-3 px-3 text-gray-600 dark:text-gray-400">02-11-2025</td>
                        <td className="py-3 px-3 text-gray-600 dark:text-gray-400">9,500</td>
                      </tr>
                      <tr className="border-b border-gray-100 dark:border-gray-800">
                        <td className="py-3 px-3 text-gray-900 dark:text-white">STTL005</td>
                        <td className="py-3 px-3 text-gray-600 dark:text-gray-400">Helen</td>
                        <td className="py-3 px-3 text-gray-600 dark:text-gray-400">Mel Gibson</td>
                        <td className="py-3 px-3 text-gray-600 dark:text-gray-400">Permanent</td>
                        <td className="py-3 px-3 text-gray-600 dark:text-gray-400">12-12-2025</td>
                        <td className="py-3 px-3 text-gray-600 dark:text-gray-400">14,000</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                
                <div className="flex justify-end mt-4">
                  <Button className="bg-cyan-400 hover:bg-cyan-500 text-slate-900 px-4 py-2 rounded font-medium text-sm">View More</Button>
                </div>
              </CardContent>
            </Card>

            {/* Client Master */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Client Master</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto admin-scrollbar">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left p-2 font-medium text-gray-700 dark:text-gray-300 text-sm">Client Code</th>
                        <th className="text-left p-2 font-medium text-gray-700 dark:text-gray-300 text-sm">Brand Name</th>
                        <th className="text-left p-2 font-medium text-gray-700 dark:text-gray-300 text-sm">Location</th>
                        <th className="text-left p-2 font-medium text-gray-700 dark:text-gray-300 text-sm">SPOC</th>
                        <th className="text-left p-2 font-medium text-gray-700 dark:text-gray-300 text-sm">Website</th>
                        <th className="text-left p-2 font-medium text-gray-700 dark:text-gray-300 text-sm">Current Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-gray-100 dark:border-gray-800">
                        <td className="py-3 px-3 text-gray-900 dark:text-white">STCL001</td>
                        <td className="py-3 px-3 text-gray-600 dark:text-gray-400">Whatfix</td>
                        <td className="py-3 px-3 text-gray-600 dark:text-gray-400">Bangalore</td>
                        <td className="py-3 px-3 text-gray-600 dark:text-gray-400">David Wilson</td>
                        <td className="py-3 px-3 text-gray-600 dark:text-gray-400">www.whatfix.com</td>
                        <td className="py-3 px-3">
                          <span className="bg-green-100 text-green-800 text-sm font-semibold px-3 py-1 rounded-full">• ACTIVE</span>
                        </td>
                      </tr>
                      <tr className="border-b border-gray-100 dark:border-gray-800">
                        <td className="py-3 px-3 text-gray-900 dark:text-white">STCL002</td>
                        <td className="py-3 px-3 text-gray-600 dark:text-gray-400">Kombal</td>
                        <td className="py-3 px-3 text-gray-600 dark:text-gray-400">Chennai</td>
                        <td className="py-3 px-3 text-gray-600 dark:text-gray-400">Tom Anderson</td>
                        <td className="py-3 px-3 text-gray-600 dark:text-gray-400">www.kombal.com</td>
                        <td className="py-3 px-3">
                          <span className="bg-green-100 text-green-800 text-sm font-semibold px-3 py-1 rounded-full">• ACTIVE</span>
                        </td>
                      </tr>
                      <tr className="border-b border-gray-100 dark:border-gray-800">
                        <td className="py-3 px-3 text-gray-900 dark:text-white">STCL003</td>
                        <td className="py-3 px-3 text-gray-600 dark:text-gray-400">Vertas</td>
                        <td className="py-3 px-3 text-gray-600 dark:text-gray-400">Gurgaon</td>
                        <td className="py-3 px-3 text-gray-600 dark:text-gray-400">Robert Kim</td>
                        <td className="py-3 px-3 text-gray-600 dark:text-gray-400">www.vertas.com</td>
                        <td className="py-3 px-3">
                          <span className="bg-green-100 text-green-800 text-sm font-semibold px-3 py-1 rounded-full">• ACTIVE</span>
                        </td>
                      </tr>
                      <tr className="border-b border-gray-100 dark:border-gray-800">
                        <td className="py-3 px-3 text-gray-900 dark:text-white">STCL004</td>
                        <td className="py-3 px-3 text-gray-600 dark:text-gray-400">SuperHire</td>
                        <td className="py-3 px-3 text-gray-600 dark:text-gray-400">Pune</td>
                        <td className="py-3 px-3 text-gray-600 dark:text-gray-400">Kevin Brown</td>
                        <td className="py-3 px-3 text-gray-600 dark:text-gray-400">www.superhire.com</td>
                        <td className="py-3 px-3">
                          <span className="bg-blue-100 text-blue-800 text-sm font-semibold px-3 py-1 rounded-full">• FROZEN</span>
                        </td>
                      </tr>
                      <tr className="border-b border-gray-100 dark:border-gray-800">
                        <td className="py-3 px-3 text-gray-900 dark:text-white">STCL005</td>
                        <td className="py-3 px-3 text-gray-600 dark:text-gray-400">Hitchcock</td>
                        <td className="py-3 px-3 text-gray-600 dark:text-gray-400">Mumbai</td>
                        <td className="py-3 px-3 text-gray-600 dark:text-gray-400">Mel Gibson</td>
                        <td className="py-3 px-3 text-gray-600 dark:text-gray-400">www.hitchcock.com</td>
                        <td className="py-3 px-3">
                          <span className="bg-red-100 text-red-800 text-sm font-semibold px-3 py-1 rounded-full">• CHURNED</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                
                <div className="flex justify-end mt-4">
                  <Button className="bg-cyan-400 hover:bg-cyan-500 text-slate-900 px-4 py-2 rounded font-medium text-sm">View More</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      case 'performance':
        return (
          <div className="flex h-full">
            {/* Middle Column - Scrollable Content */}
            <div className="flex-1 px-6 py-6 overflow-y-auto admin-scrollbar">
              {/* Performance Header with Tabs */}
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Performance</h2>
                <div className="flex gap-2">
                  <Button 
                    className="bg-purple-800 hover:bg-purple-900 text-white px-4 py-2 rounded text-sm"
                    onClick={() => setIsTargetMappingModalOpen(true)}
                  >
                    Target Mapping
                  </Button>
                  <Button 
                    className="bg-purple-800 hover:bg-purple-900 text-white px-4 py-2 rounded text-sm"
                    onClick={() => setIsRevenueMappingModalOpen(true)}
                  >
                    Revenue Mapping
                  </Button>
                </div>
              </div>

              {/* Filter Dropdowns */}
              <div className="flex gap-4 mb-4">
                <Select value={selectedPerformanceTeam} onValueChange={setSelectedPerformanceTeam} data-testid="select-performance-team">
                  <SelectTrigger className="bg-cyan-400 hover:bg-cyan-500 text-slate-900 px-4 py-2 rounded font-medium text-sm w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="arun">Arun</SelectItem>
                    <SelectItem value="anusha">Anusha</SelectItem>
                    <SelectItem value="all">All</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select defaultValue="monthly">
                  <SelectTrigger className="bg-cyan-400 hover:bg-cyan-500 text-slate-900 px-4 py-2 rounded font-medium text-sm w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Chart Area - Grid Layout */}
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 bg-white dark:bg-gray-900 px-6 pb-6">
                  {/* Performance Chart */}
                  <div className="xl:col-span-5">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-300">Performance</h3>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={() => setIsPerformanceChartModalOpen(true)}
                        data-testid="button-expand-performance-chart"
                      >
                        <HelpCircle className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                      </Button>
                    </div>
                    <div className="h-[260px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={monthlyChartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis />
                          <Tooltip formatter={(value: number) => `₹${value.toLocaleString()}`} />
                          <Legend />
                          {selectedPerformanceTeam === 'all' && (
                            <>
                              {monthlyPerformanceData?.teams?.map((team, index) => {
                                const colors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6'];
                                return (
                                  <Line 
                                    key={team} 
                                    type="monotone" 
                                    dataKey={team} 
                                    name={team.replace(/Team$/, "'s Team")} 
                                    stroke={colors[index % colors.length]} 
                                    strokeWidth={2} 
                                    dot={{ fill: colors[index % colors.length] }} 
                                  />
                                );
                              }) || (
                                <>
                                  <Line type="monotone" dataKey="arunTeam" name="Arun's Team" stroke="#3B82F6" strokeWidth={2} dot={{ fill: '#3B82F6' }} />
                                  <Line type="monotone" dataKey="anushaTeam" name="Anusha's Team" stroke="#EF4444" strokeWidth={2} dot={{ fill: '#EF4444' }} />
                                </>
                              )}
                            </>
                          )}
                          {selectedPerformanceTeam === 'arun' && (
                            <>
                              {monthlyPerformanceData?.members
                                ?.filter(m => m.teamLeader?.toLowerCase().includes('arun') || m.teamLeader === 'STTL001')
                                ?.slice(0, 4)
                                .map((member, index) => {
                                  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'];
                                  return (
                                    <Line 
                                      key={member.key} 
                                      type="monotone" 
                                      dataKey={member.key} 
                                      name={member.name} 
                                      stroke={colors[index % colors.length]} 
                                      strokeWidth={2} 
                                      dot={{ fill: colors[index % colors.length] }} 
                                    />
                                  );
                                }) || null}
                            </>
                          )}
                          {selectedPerformanceTeam === 'anusha' && (
                            <>
                              {monthlyPerformanceData?.members
                                ?.filter(m => m.teamLeader?.toLowerCase().includes('anusha'))
                                ?.slice(0, 4)
                                .map((member, index) => {
                                  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'];
                                  return (
                                    <Line 
                                      key={member.key} 
                                      type="monotone" 
                                      dataKey={member.key} 
                                      name={member.name} 
                                      stroke={colors[index % colors.length]} 
                                      strokeWidth={2} 
                                      dot={{ fill: colors[index % colors.length] }} 
                                    />
                                  );
                                }) || null}
                            </>
                          )}
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Revenue Analysis Chart */}
                  <div className="xl:col-span-4">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-300">Revenue Analysis</h3>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={() => setIsRevenueGraphModalOpen(true)}
                        data-testid="button-expand-revenue-graph"
                      >
                        <ExternalLink className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                      </Button>
                    </div>
                    <div className="flex justify-start space-x-4 mb-2">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                        <span className="text-sm text-gray-600 dark:text-gray-400">Team Revenue</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-0.5 bg-green-500"></div>
                        <span className="text-sm text-gray-600 dark:text-gray-400">Avg (₹230K)</span>
                      </div>
                    </div>
                    <div className="h-[200px]">
                      <RevenueChart
                        data={revenueData}
                        height="100%"
                        benchmarkValue={230000}
                      />
                    </div>
                  </div>

                  {/* Performance Gauge */}
                  <div className="xl:col-span-3 flex flex-col items-center justify-center">
                    <div className="w-full max-w-sm mx-auto">
                      <PerformanceGauge value={performanceMetrics.performancePercentage} />
                    </div>
                    
                    <Button 
                      className="bg-cyan-400 hover:bg-cyan-500 text-black mt-4 px-6 py-2 rounded"
                      onClick={() => setIsPerformanceDataModalOpen(true)}
                      data-testid="button-show-performance-data"
                    >
                      Show Data
                    </Button>
                  </div>
                </div>

              {/* Team Performance Table */}
              <Card className="bg-gray-50 dark:bg-gray-800 mt-6">
                <CardHeader className="pb-2 pt-3 flex flex-row flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-lg text-gray-900 dark:text-white">Team Performance</CardTitle>
                  <Button 
                    className="bg-cyan-400 hover:bg-cyan-500 text-black px-6 py-2 rounded"
                    onClick={() => setIsTeamPerformanceTableModalOpen(true)}
                    data-testid="button-view-team-performance-table"
                  >
                    View List
                  </Button>
                </CardHeader>
                <CardContent className="p-3">
                  <div className="overflow-x-auto admin-scrollbar">
                    <table className="w-full border-collapse bg-white dark:bg-gray-900 rounded">
                      <thead>
                        <tr className="bg-gray-200 dark:bg-gray-700">
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Talent Advisor</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Joining Date</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Tenure</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Closures</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Last Closure</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Qtrs Achieved</th>
                        </tr>
                      </thead>
                      <tbody>
                        {isLoadingTeamPerformance ? (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-gray-500 dark:text-gray-400">
                              Loading team performance data...
                            </td>
                          </tr>
                        ) : teamPerformanceData.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-gray-500 dark:text-gray-400">
                              No team performance data available
                            </td>
                          </tr>
                        ) : (
                          teamPerformanceData.slice(0, 4).map((member, index) => (
                            <tr key={member.id || index} className="border-b border-gray-100 dark:border-gray-700">
                              <td className="py-3 px-4 text-gray-900 dark:text-white font-medium">{member.talentAdvisor}</td>
                              <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{member.joiningDate}</td>
                              <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{member.tenure}</td>
                              <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{member.closures}</td>
                              <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{member.lastClosure}</td>
                              <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{member.qtrsAchieved}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* List of Closures Table */}
              <Card className="bg-gray-50 dark:bg-gray-800 mt-6">
                <CardHeader className="pb-2 pt-3 flex flex-row flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-lg text-gray-900 dark:text-white">List Of Closures</CardTitle>
                  <Button 
                    className="bg-cyan-400 hover:bg-cyan-500 text-black px-6 py-2 rounded"
                    onClick={() => setIsClosureModalOpen(true)}
                    data-testid="button-view-list-closures"
                  >
                    View List
                  </Button>
                </CardHeader>
                <CardContent className="p-3">
                  <div className="overflow-x-auto admin-scrollbar">
                    <table className="w-full border-collapse bg-white dark:bg-gray-900 rounded">
                      <thead>
                        <tr className="bg-gray-200 dark:bg-gray-700">
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Candidate</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Positions</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Client</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Quarter</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Talent Advisor</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">CTC</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Revenue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {isLoadingClosures ? (
                          <tr>
                            <td colSpan={7} className="py-8 text-center text-gray-500 dark:text-gray-400">
                              Loading closures data...
                            </td>
                          </tr>
                        ) : closuresListData.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-8 text-center text-gray-500 dark:text-gray-400">
                              No closures data available
                            </td>
                          </tr>
                        ) : (
                          closuresListData.slice(0, 4).map((closure, index) => (
                            <tr key={closure.id || index} className="border-b border-gray-100 dark:border-gray-700">
                              <td className="py-3 px-4 text-gray-900 dark:text-white font-medium">{closure.candidate}</td>
                              <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{closure.position}</td>
                              <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{closure.client}</td>
                              <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{closure.quarter}</td>
                              <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{closure.talentAdvisor}</td>
                              <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{closure.ctc}</td>
                              <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{closure.revenue}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Revenue Data Table */}
              <Card className="bg-gray-50 dark:bg-gray-800 mt-6">
                <CardHeader className="pb-2 pt-3 flex flex-row flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-lg text-gray-900 dark:text-white">Revenue Data</CardTitle>
                  <Button 
                    className="bg-cyan-400 hover:bg-cyan-500 text-black px-6 py-2 rounded"
                    onClick={() => {
                      setEditingRevenueMapping(null);
                      setIsRevenueMappingModalOpen(true);
                    }}
                    data-testid="button-add-revenue-mapping"
                  >
                    + Add Revenue
                  </Button>
                </CardHeader>
                <CardContent className="p-3">
                  <div className="overflow-x-auto admin-scrollbar">
                    {isLoadingRevenue ? (
                      <div className="text-center py-8 text-gray-600 dark:text-gray-400">
                        Loading revenue data...
                      </div>
                    ) : revenueMappings.length === 0 ? (
                      <div className="text-center py-8 text-gray-600 dark:text-gray-400">
                        No revenue data available
                      </div>
                    ) : (
                      <table className="w-full border-collapse bg-white dark:bg-gray-900 rounded">
                        <thead>
                          <tr className="bg-gray-200 dark:bg-gray-700">
                            <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Talent Advisor</th>
                            <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Team Lead</th>
                            <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Position</th>
                            <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Client</th>
                            <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Quarter</th>
                            <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Year</th>
                            <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Revenue</th>
                            <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Payment Status</th>
                            <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {revenueMappings.map((mapping: any) => (
                            <tr key={mapping.id} className="border-b border-gray-100 dark:border-gray-700" data-testid={`row-revenue-${mapping.id}`}>
                              <td className="py-3 px-4 text-gray-900 dark:text-white font-medium">{mapping.talentAdvisorName || 'N/A'}</td>
                              <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{mapping.teamLeadName || 'N/A'}</td>
                              <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{mapping.position || 'N/A'}</td>
                              <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{mapping.clientName || 'N/A'}</td>
                              <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{mapping.quarter || 'N/A'}</td>
                              <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{mapping.year || 'N/A'}</td>
                              <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                                {mapping.revenue ? `₹${Number(mapping.revenue).toLocaleString('en-IN')}` : 'N/A'}
                              </td>
                              <td className="py-3 px-4">
                                <span className={`px-2 py-1 text-xs rounded ${
                                  mapping.receivedPayment 
                                    ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' 
                                    : 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
                                }`}>
                                  {mapping.receivedPayment ? 'Received' : 'Pending'}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex gap-2">
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => {
                                      setEditingRevenueMapping(mapping);
                                      setIsRevenueMappingModalOpen(true);
                                    }}
                                    data-testid={`button-edit-revenue-${mapping.id}`}
                                  >
                                    <EditIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => {
                                      if (confirm('Are you sure you want to delete this revenue mapping?')) {
                                        deleteRevenueMappingMutation.mutate(mapping.id);
                                      }
                                    }}
                                    data-testid={`button-delete-revenue-${mapping.id}`}
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Sidebar - Quarterly/Yearly Metrics */}
            <div className="w-64 bg-gray-100 dark:bg-gray-800 p-4 flex flex-col space-y-3 overflow-y-auto">
              {/* Quarterly/Yearly Selector */}
              <div>
                <Select defaultValue="quarterly">
                  <SelectTrigger className="w-full bg-teal-400 text-black font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Current Quarter Section */}
              <div className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 p-4 rounded-md">
                <div className="text-xs font-bold uppercase text-gray-700 dark:text-gray-300">CURRENT</div>
                <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase">QUARTER</div>
                <div className="text-right text-2xl font-bold mt-2" data-testid="text-current-quarter">{performanceMetrics.currentQuarter}</div>
              </div>

              {/* Minimum Target */}
              <div className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 p-4 rounded-md">
                <div className="text-xs font-bold uppercase text-gray-700 dark:text-gray-300">MINIMUM</div>
                <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase">TARGET</div>
                <div className="text-right text-2xl font-bold mt-2" data-testid="text-minimum-target">{performanceMetrics.minimumTarget.toLocaleString('en-IN')}</div>
              </div>

              {/* Target Achieved */}
              <div className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 p-4 rounded-md">
                <div className="text-xs font-bold uppercase text-gray-700 dark:text-gray-300">TARGET</div>
                <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase">ACHIEVED</div>
                <div className="text-right text-2xl font-bold mt-2" data-testid="text-target-achieved">{performanceMetrics.targetAchieved.toLocaleString('en-IN')}</div>
              </div>

              {/* Closures Made */}
              <div className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 p-4 rounded-md">
                <div className="text-xs font-bold uppercase text-gray-700 dark:text-gray-300">CLOSURES</div>
                <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase">MADE</div>
                <div className="text-right text-3xl font-bold mt-2" data-testid="text-closures-count">{performanceMetrics.closuresCount}</div>
              </div>

              {/* Incentives Made */}
              <div className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 p-4 rounded-md">
                <div className="text-xs font-bold uppercase text-gray-700 dark:text-gray-300">INCENTIVES</div>
                <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase">MADE</div>
                <div className="text-right text-2xl font-bold mt-2" data-testid="text-incentives-earned">{performanceMetrics.incentiveEarned.toLocaleString('en-IN')}</div>
              </div>
            </div>
          </div>
        );
      case 'user-management':
        return (
          <div className="px-6 py-6 space-y-6 h-full overflow-y-auto admin-scrollbar">
            {/* User Management Header */}
            <div className="flex gap-4 mb-6">
              <Button 
                className="btn-rounded bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => setIsAddTalentAdvisorModalOpen(true)}
                data-testid="button-add-recruiter"
              >
                + Add Recruiter
              </Button>
              <Button 
                className="btn-rounded bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => setIsAddTeamLeaderModalOpen(true)}
                data-testid="button-add-team-leader"
              >
                + Add Team Leader
              </Button>
              <Button 
                className="btn-rounded bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => setIsAddClientCredentialsModalOpen(true)}
                data-testid="button-add-client"
              >
                + Add Client
              </Button>
            </div>

            {/* User Management Table */}
            <Card>
              <CardContent className="p-6">
                <div className="overflow-x-auto admin-scrollbar">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left p-2 font-medium text-gray-700 dark:text-gray-300 text-sm">ID</th>
                        <th className="text-left p-2 font-medium text-gray-700 dark:text-gray-300 text-sm">Name</th>
                        <th className="text-left p-2 font-medium text-gray-700 dark:text-gray-300 text-sm">Email</th>
                        <th className="text-left p-2 font-medium text-gray-700 dark:text-gray-300 text-sm">Role</th>
                        <th className="text-left p-2 font-medium text-gray-700 dark:text-gray-300 text-sm">Status</th>
                        <th className="text-left p-2 font-medium text-gray-700 dark:text-gray-300 text-sm">Last Login</th>
                        <th className="text-left p-2 font-medium text-gray-700 dark:text-gray-300 text-sm">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-gray-100 dark:border-gray-800">
                        <td className="py-3 px-3 text-gray-900 dark:text-white">STTA001</td>
                        <td className="py-3 px-3 text-gray-600 dark:text-gray-400">Sundhar Raj</td>
                        <td className="py-3 px-3 text-gray-600 dark:text-gray-400">raj@gmail.com</td>
                        <td className="py-3 px-3 text-gray-600 dark:text-gray-400">Team Leader</td>
                        <td className="py-3 px-3 text-gray-600 dark:text-gray-400">Active</td>
                        <td className="py-3 px-3 text-gray-600 dark:text-gray-400">N/A</td>
                        <td className="py-3 px-3">
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700">Edit</Button>
                            <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">Delete</Button>
                          </div>
                        </td>
                      </tr>
                      <tr className="border-b border-gray-100 dark:border-gray-800">
                        <td className="py-3 px-3 text-gray-900 dark:text-white">STTA002</td>
                        <td className="py-3 px-3 text-gray-600 dark:text-gray-400">kavitha</td>
                        <td className="py-3 px-3 text-gray-600 dark:text-gray-400">kavi@gmail.com</td>
                        <td className="py-3 px-3 text-gray-600 dark:text-gray-400">Team Leader</td>
                        <td className="py-3 px-3 text-gray-600 dark:text-gray-400">Active</td>
                        <td className="py-3 px-3 text-gray-600 dark:text-gray-400">N/A</td>
                        <td className="py-3 px-3">
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700">Edit</Button>
                            <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">Delete</Button>
                          </div>
                        </td>
                      </tr>
                      <tr className="border-b border-gray-100 dark:border-gray-800">
                        <td className="py-3 px-3 text-gray-900 dark:text-white">STTA003</td>
                        <td className="py-3 px-3 text-gray-600 dark:text-gray-400">Vignesh</td>
                        <td className="py-3 px-3 text-gray-600 dark:text-gray-400">vignesh@gmail.com</td>
                        <td className="py-3 px-3 text-gray-600 dark:text-gray-400">Team Leader</td>
                        <td className="py-3 px-3 text-gray-600 dark:text-gray-400">Active</td>
                        <td className="py-3 px-3 text-gray-600 dark:text-gray-400">N/A</td>
                        <td className="py-3 px-3">
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700">Edit</Button>
                            <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">Delete</Button>
                          </div>
                        </td>
                      </tr>
                      <tr className="border-b border-gray-100 dark:border-gray-800">
                        <td className="py-3 px-3 text-gray-900 dark:text-white">STTA004</td>
                        <td className="py-3 px-3 text-gray-600 dark:text-gray-400">Saran</td>
                        <td className="py-3 px-3 text-gray-600 dark:text-gray-400">saran@gmail.com</td>
                        <td className="py-3 px-3 text-gray-600 dark:text-gray-400">Team Leader</td>
                        <td className="py-3 px-3 text-gray-600 dark:text-gray-400">Active</td>
                        <td className="py-3 px-3 text-gray-600 dark:text-gray-400">N/A</td>
                        <td className="py-3 px-3">
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700">Edit</Button>
                            <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">Delete</Button>
                          </div>
                        </td>
                      </tr>
                      <tr className="border-b border-gray-100 dark:border-gray-800">
                        <td className="py-3 px-3 text-gray-900 dark:text-white">STTL005</td>
                        <td className="py-3 px-3 text-gray-600 dark:text-gray-400">Helen</td>
                        <td className="py-3 px-3 text-gray-600 dark:text-gray-400">helen@gmail.com</td>
                        <td className="py-3 px-3 text-gray-600 dark:text-gray-400">Team Leader</td>
                        <td className="py-3 px-3 text-gray-600 dark:text-gray-400">Active</td>
                        <td className="py-3 px-3 text-gray-600 dark:text-gray-400">N/A</td>
                        <td className="py-3 px-3">
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700">Edit</Button>
                            <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">Delete</Button>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Online Activity Section */}
            <div className="grid grid-cols-2 gap-6 max-w-md">
              <Card className="bg-yellow-50 dark:bg-yellow-900/20 text-center">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Online Activity</h3>
                  <div className="space-y-4">
                    <div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Online</div>
                      <div className="text-4xl font-bold text-gray-900 dark:text-white">3</div>
                      <Button className="btn-rounded bg-blue-600 hover:bg-blue-700 text-white text-sm mt-2">View</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-yellow-50 dark:bg-yellow-900/20 text-center">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Offline</div>
                      <div className="text-4xl font-bold text-gray-900 dark:text-white">1</div>
                      <Button className="btn-rounded bg-blue-600 hover:bg-blue-700 text-white text-sm mt-2">View</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        );
      default:
        return renderTeamSection();
    }
  };

  const renderSidebarContent = () => {
    switch (sidebarTab) {
      case 'dashboard':
        return (
          <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto admin-scrollbar">
              {renderTabContent()}
            </div>
          </div>
        );
      case 'requirements':
        return (
          <div className="px-6 py-6 space-y-6 h-full overflow-y-auto admin-scrollbar">
            {/* Header with Requirements title */}
            
            <div className="flex gap-6 h-full">
              {/* Middle Section - Requirements Table */}
              <div className="flex-1 overflow-y-auto admin-scrollbar">
                
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg">
                  {/* Table Header with Add Button */}
                  <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">Requirements</h3>
                    <Button 
                      className="bg-cyan-400 hover:bg-cyan-500 text-black font-medium px-4 py-2 rounded text-sm"
                      onClick={() => setIsAddRequirementModalOpen(true)}
                      data-testid="button-add-requirements"
                    >
                      + Add Requirements
                    </Button>
                  </div>
                  <div className="overflow-x-auto admin-scrollbar">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                          <th className="text-left p-2 font-medium text-gray-700 dark:text-gray-300 text-sm">Positions</th>
                          <th className="text-left p-2 font-medium text-gray-700 dark:text-gray-300 text-sm">Criticality</th>
                          <th className="text-left p-2 font-medium text-gray-700 dark:text-gray-300 text-sm">Company</th>
                          <th className="text-left p-2 font-medium text-gray-700 dark:text-gray-300 text-sm">SPOC</th>
                          <th className="text-left p-2 font-medium text-gray-700 dark:text-gray-300 text-sm">Talent Advisor</th>
                          <th className="text-left p-2 font-medium text-gray-700 dark:text-gray-300 text-sm">Team Lead</th>
                          <th className="text-left p-2 font-medium text-gray-700 dark:text-gray-300 text-sm">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {displayedRequirements.map((requirement: Requirement) => (
                          <tr key={requirement.id} className="border-b border-gray-100 dark:border-gray-800">
                            <td className="py-2 px-2 text-gray-900 dark:text-white font-medium text-sm">{requirement.position}</td>
                            <td className="py-2 px-2">
                              <span className={`text-sm font-medium px-2 py-1 rounded ${getCriticalityColor(requirement.criticality)}`}>
                                {requirement.criticality}-{requirement.toughness || 'Medium'}
                              </span>
                            </td>
                            <td className="py-2 px-2 text-gray-600 dark:text-gray-400 text-sm">{requirement.company}</td>
                            <td className="py-2 px-2 text-gray-600 dark:text-gray-400 text-sm">{requirement.spoc}</td>
                            <td className="py-2 px-2 text-gray-600 dark:text-gray-400 text-sm">
                              {requirement.talentAdvisor === "Unassigned" ? (
                                <span className="text-cyan-500 dark:text-cyan-400">{requirement.talentAdvisor}</span>
                              ) : (
                                requirement.talentAdvisor
                              )}
                            </td>
                            <td className="py-2 px-2 text-gray-600 dark:text-gray-400 text-sm">
                              {requirement.teamLead === "Unassigned" ? (
                                <span className="text-cyan-500 dark:text-cyan-400">{requirement.teamLead}</span>
                              ) : (
                                requirement.teamLead
                              )}
                            </td>
                            <td className="py-2 px-2">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                                    </svg>
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-32">
                                  <DropdownMenuItem onClick={() => handleReassign(requirement)}>
                                    Reassign
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleArchive(requirement)}>
                                    Archive
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </tr>
                        ))}









                      </tbody>
                    </table>
                  </div>
                  
                  <div className="flex justify-center gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
                    <Button 
                      variant="outline" 
                      className="px-6 py-2 rounded bg-red-100 hover:bg-red-200 text-red-800 border-red-200"
                      onClick={handleArchivesClick}
                    >
                      Archives
                    </Button>
                    <Button 
                      className="bg-cyan-400 hover:bg-cyan-500 text-slate-900 px-4 py-2 rounded font-medium text-sm"
                      onClick={handleRequirementsViewMore}
                      disabled={requirements.length <= 10}
                    >
                      View More
                    </Button>
                  </div>
                </div>
              </div>

              {/* Right Section - Priority Distribution */}
              <div className="w-80 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 px-6 py-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Priority Distribution</h3>
                  
                  <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        {/* HIGH Priority Group */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded">
                            <span className="text-sm font-semibold text-red-800 dark:text-red-400">HIGH</span>
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between px-3 py-1.5 hover-elevate rounded">
                              <span className="text-xs text-gray-600 dark:text-gray-400">Easy</span>
                              <span className="text-sm font-semibold text-red-600 dark:text-red-400">{priorityDistribution.HIGH.Easy}</span>
                            </div>
                            <div className="flex items-center justify-between px-3 py-1.5 hover-elevate rounded">
                              <span className="text-xs text-gray-600 dark:text-gray-400">Med</span>
                              <span className="text-sm font-semibold text-red-600 dark:text-red-400">{priorityDistribution.HIGH.Medium}</span>
                            </div>
                            <div className="flex items-center justify-between px-3 py-1.5 hover-elevate rounded">
                              <span className="text-xs text-gray-600 dark:text-gray-400">Tough</span>
                              <span className="text-sm font-semibold text-red-600 dark:text-red-400">{priorityDistribution.HIGH.Tough}</span>
                            </div>
                          </div>
                        </div>
                        
                        {/* MED Priority Group */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between bg-yellow-50 dark:bg-yellow-900/20 px-3 py-2 rounded">
                            <span className="text-sm font-semibold text-yellow-800 dark:text-yellow-400">MED</span>
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between px-3 py-1.5 hover-elevate rounded">
                              <span className="text-xs text-gray-600 dark:text-gray-400">Easy</span>
                              <span className="text-sm font-semibold text-yellow-600 dark:text-yellow-400">{priorityDistribution.MEDIUM.Easy}</span>
                            </div>
                            <div className="flex items-center justify-between px-3 py-1.5 hover-elevate rounded">
                              <span className="text-xs text-gray-600 dark:text-gray-400">Med</span>
                              <span className="text-sm font-semibold text-yellow-600 dark:text-yellow-400">{priorityDistribution.MEDIUM.Medium}</span>
                            </div>
                            <div className="flex items-center justify-between px-3 py-1.5 hover-elevate rounded">
                              <span className="text-xs text-gray-600 dark:text-gray-400">Tough</span>
                              <span className="text-sm font-semibold text-yellow-600 dark:text-yellow-400">{priorityDistribution.MEDIUM.Tough}</span>
                            </div>
                          </div>
                        </div>
                        
                        {/* LOW Priority Group */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between bg-green-50 dark:bg-green-900/20 px-3 py-2 rounded">
                            <span className="text-sm font-semibold text-green-800 dark:text-green-400">LOW</span>
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between px-3 py-1.5 hover-elevate rounded">
                              <span className="text-xs text-gray-600 dark:text-gray-400">Easy</span>
                              <span className="text-sm font-semibold text-green-600 dark:text-green-400">{priorityDistribution.LOW.Easy}</span>
                            </div>
                            <div className="flex items-center justify-between px-3 py-1.5 hover-elevate rounded">
                              <span className="text-xs text-gray-600 dark:text-gray-400">Med</span>
                              <span className="text-sm font-semibold text-green-600 dark:text-green-400">{priorityDistribution.LOW.Medium}</span>
                            </div>
                            <div className="flex items-center justify-between px-3 py-1.5 hover-elevate rounded">
                              <span className="text-xs text-gray-600 dark:text-gray-400">Tough</span>
                              <span className="text-sm font-semibold text-green-600 dark:text-green-400">{priorityDistribution.LOW.Tough}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        );
      case 'pipeline':
        return (
          <div className="flex h-full">
            {/* Main Pipeline Content */}
            <div className="flex-1 overflow-auto admin-scrollbar">
              <div className="p-6 space-y-6">
                {/* Pipeline Header */}
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Pipeline</h2>
                  <div className="flex items-center gap-4">
                    <Select value={selectedPipelineTeam} onValueChange={setSelectedPipelineTeam}>
                      <SelectTrigger className="w-48 input-styled btn-rounded">
                        <SelectValue placeholder="Arun/Anusha/All" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="arun">Arun</SelectItem>
                        <SelectItem value="anusha">Anusha</SelectItem>
                      </SelectContent>
                    </Select>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="btn-rounded input-styled">
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

                {/* Pipeline Stages - Live Data */}
                <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                  <CardContent className="p-0">
                    <div className="overflow-x-auto admin-scrollbar">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr>
                            <th className="text-center p-4 font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 min-w-[140px]">Level 1</th>
                            <th className="text-center p-4 font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 min-w-[140px]">Level 2</th>
                            <th className="text-center p-4 font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 min-w-[140px]">Level 3</th>
                            <th className="text-center p-4 font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 min-w-[140px]">Final Round</th>
                            <th className="text-center p-4 font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 min-w-[140px]">HR Round</th>
                            <th className="text-center p-4 font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 min-w-[140px]">Offer Stage</th>
                            <th className="text-center p-4 font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 min-w-[140px]">Closure</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="p-3 align-top">
                              <div className="space-y-2">
                                {getPipelineCandidatesByStage.level1.map((candidate: any, index: number) => (
                                  <div key={candidate.id || index} className="px-3 py-2 rounded text-sm text-black text-center cursor-default" style={{backgroundColor: '#E6F4EA'}} title={`${candidate.candidateName} - ${candidate.roleApplied}`}>
                                    {candidate.candidateName}
                                  </div>
                                ))}
                                {getPipelineCandidatesByStage.level1.length === 0 && (
                                  <div className="text-xs text-gray-400 text-center py-2">No candidates</div>
                                )}
                              </div>
                            </td>
                            <td className="p-3 align-top">
                              <div className="space-y-2">
                                {getPipelineCandidatesByStage.level2.map((candidate: any, index: number) => (
                                  <div key={candidate.id || index} className="px-3 py-2 rounded text-sm text-black text-center cursor-default" style={{backgroundColor: '#D9F0E1'}} title={`${candidate.candidateName} - ${candidate.roleApplied}`}>
                                    {candidate.candidateName}
                                  </div>
                                ))}
                                {getPipelineCandidatesByStage.level2.length === 0 && (
                                  <div className="text-xs text-gray-400 text-center py-2">No candidates</div>
                                )}
                              </div>
                            </td>
                            <td className="p-3 align-top">
                              <div className="space-y-2">
                                {getPipelineCandidatesByStage.level3.map((candidate: any, index: number) => (
                                  <div key={candidate.id || index} className="px-3 py-2 rounded text-sm text-black text-center cursor-default" style={{backgroundColor: '#C2EED0'}} title={`${candidate.candidateName} - ${candidate.roleApplied}`}>
                                    {candidate.candidateName}
                                  </div>
                                ))}
                                {getPipelineCandidatesByStage.level3.length === 0 && (
                                  <div className="text-xs text-gray-400 text-center py-2">No candidates</div>
                                )}
                              </div>
                            </td>
                            <td className="p-3 align-top">
                              <div className="space-y-2">
                                {getPipelineCandidatesByStage.finalRound.map((candidate: any, index: number) => (
                                  <div key={candidate.id || index} className="px-3 py-2 rounded text-sm text-black text-center cursor-default" style={{backgroundColor: '#B5E1C1'}} title={`${candidate.candidateName} - ${candidate.roleApplied}`}>
                                    {candidate.candidateName}
                                  </div>
                                ))}
                                {getPipelineCandidatesByStage.finalRound.length === 0 && (
                                  <div className="text-xs text-gray-400 text-center py-2">No candidates</div>
                                )}
                              </div>
                            </td>
                            <td className="p-3 align-top">
                              <div className="space-y-2">
                                {getPipelineCandidatesByStage.hrRound.map((candidate: any, index: number) => (
                                  <div key={candidate.id || index} className="px-3 py-2 rounded text-sm text-white text-center cursor-default" style={{backgroundColor: '#99D9AE'}} title={`${candidate.candidateName} - ${candidate.roleApplied}`}>
                                    {candidate.candidateName}
                                  </div>
                                ))}
                                {getPipelineCandidatesByStage.hrRound.length === 0 && (
                                  <div className="text-xs text-gray-400 text-center py-2">No candidates</div>
                                )}
                              </div>
                            </td>
                            <td className="p-3 align-top">
                              <div className="space-y-2">
                                {getPipelineCandidatesByStage.offerStage.map((candidate: any, index: number) => (
                                  <div key={candidate.id || index} className="px-3 py-2 rounded text-sm text-white text-center cursor-default" style={{backgroundColor: '#7CCBA0'}} title={`${candidate.candidateName} - ${candidate.roleApplied}`}>
                                    {candidate.candidateName}
                                  </div>
                                ))}
                                {getPipelineCandidatesByStage.offerStage.length === 0 && (
                                  <div className="text-xs text-gray-400 text-center py-2">No candidates</div>
                                )}
                              </div>
                            </td>
                            <td className="p-3 align-top">
                              <div className="space-y-2">
                                {getPipelineCandidatesByStage.closure.map((candidate: any, index: number) => (
                                  <div key={candidate.id || index} className="px-3 py-2 rounded text-sm text-white text-center cursor-default" style={{backgroundColor: '#2F6F52'}} title={`${candidate.candidateName} - ${candidate.roleApplied}`}>
                                    {candidate.candidateName}
                                  </div>
                                ))}
                                {getPipelineCandidatesByStage.closure.length === 0 && (
                                  <div className="text-xs text-gray-400 text-center py-2">No candidates</div>
                                )}
                              </div>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                {/* Closure Reports Table - Live Data */}
                <Card className="mt-6">
                  <CardHeader className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                    <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">Closure Reports</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto admin-scrollbar">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                            <th className="text-left p-2 font-medium text-gray-700 dark:text-gray-300 text-sm">Candidate</th>
                            <th className="text-left p-2 font-medium text-gray-700 dark:text-gray-300 text-sm">Positions</th>
                            <th className="text-left p-2 font-medium text-gray-700 dark:text-gray-300 text-sm">Client</th>
                            <th className="text-left p-2 font-medium text-gray-700 dark:text-gray-300 text-sm">Location</th>
                            <th className="text-left p-2 font-medium text-gray-700 dark:text-gray-300 text-sm">Experience</th>
                            <th className="text-left p-2 font-medium text-gray-700 dark:text-gray-300 text-sm">Applied Date</th>
                            <th className="text-left p-2 font-medium text-gray-700 dark:text-gray-300 text-sm">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {getPipelineCandidatesByStage.closure.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="py-8 text-center text-gray-500 dark:text-gray-400">
                                No closures yet. Candidates with 'Closure' or 'Joined' status will appear here automatically.
                              </td>
                            </tr>
                          ) : (
                            getPipelineCandidatesByStage.closure.slice(0, 5).map((candidate: any, index: number) => (
                              <tr 
                                key={candidate.id || index} 
                                className={`border-b border-gray-200 dark:border-gray-700 ${index % 2 === 1 ? 'bg-gray-50 dark:bg-gray-800/50' : ''}`}
                              >
                                <td className="p-3 text-gray-900 dark:text-white">{candidate.candidateName}</td>
                                <td className="p-3 text-gray-600 dark:text-gray-400">{candidate.roleApplied}</td>
                                <td className="p-3 text-gray-600 dark:text-gray-400">{candidate.company}</td>
                                <td className="p-3 text-gray-600 dark:text-gray-400">{candidate.location}</td>
                                <td className="p-3 text-gray-600 dark:text-gray-400">{candidate.experience}</td>
                                <td className="p-3 text-gray-600 dark:text-gray-400">{candidate.appliedOn}</td>
                                <td className="p-3">
                                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                    {candidate.currentStatus}
                                  </span>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                    <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                      <div className="flex justify-end">
                        <Button 
                          className="bg-cyan-400 hover:bg-cyan-500 text-slate-900 px-4 py-2 rounded font-medium text-sm"
                          onClick={() => setIsClosureReportsModalOpen(true)}
                          data-testid="button-see-more-closure-admin"
                        >
                          See More
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Right Sidebar with Live Stats */}
            <div className="w-64 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700">
              <div className="p-4 space-y-1">
                <div className="flex justify-between items-center py-3 px-4 bg-green-100 dark:bg-green-900 rounded">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">SOURCED</span>
                  <span className="text-lg font-bold text-gray-900 dark:text-white">{getPipelineCandidatesByStage.sourced.length}</span>
                </div>
                <div className="flex justify-between items-center py-3 px-4 bg-green-200 dark:bg-green-800 rounded">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">SHORTLISTED</span>
                  <span className="text-lg font-bold text-gray-900 dark:text-white">{getPipelineCandidatesByStage.shortlisted.length}</span>
                </div>
                <div className="flex justify-between items-center py-3 px-4 bg-green-300 dark:bg-green-700 rounded">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">INTRO CALL</span>
                  <span className="text-lg font-bold text-gray-900 dark:text-white">{getPipelineCandidatesByStage.introCall.length}</span>
                </div>
                <div className="flex justify-between items-center py-3 px-4 bg-green-400 dark:bg-green-600 rounded">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">ASSIGNMENT</span>
                  <span className="text-lg font-bold text-gray-800 dark:text-white">{getPipelineCandidatesByStage.assignment.length}</span>
                </div>
                <div className="flex justify-between items-center py-3 px-4 bg-green-500 dark:bg-green-600 rounded">
                  <span className="text-sm font-medium text-white">L1</span>
                  <span className="text-lg font-bold text-white">{getPipelineCandidatesByStage.level1.length}</span>
                </div>
                <div className="flex justify-between items-center py-3 px-4 bg-green-600 dark:bg-green-500 rounded">
                  <span className="text-sm font-medium text-white">L2</span>
                  <span className="text-lg font-bold text-white">{getPipelineCandidatesByStage.level2.length}</span>
                </div>
                <div className="flex justify-between items-center py-3 px-4 bg-green-700 dark:bg-green-500 rounded">
                  <span className="text-sm font-medium text-white">L3</span>
                  <span className="text-lg font-bold text-white">{getPipelineCandidatesByStage.level3.length}</span>
                </div>
                <div className="flex justify-between items-center py-3 px-4 bg-green-800 dark:bg-green-400 rounded">
                  <span className="text-sm font-medium text-white">FINAL ROUND</span>
                  <span className="text-lg font-bold text-white">{getPipelineCandidatesByStage.finalRound.length}</span>
                </div>
                <div className="flex justify-between items-center py-3 px-4 bg-green-900 dark:bg-green-400 rounded">
                  <span className="text-sm font-medium text-white">HR ROUND</span>
                  <span className="text-lg font-bold text-white">{getPipelineCandidatesByStage.hrRound.length}</span>
                </div>
                <div className="flex justify-between items-center py-3 px-4 bg-green-900 dark:bg-green-300 rounded">
                  <span className="text-sm font-medium text-white">OFFER STAGE</span>
                  <span className="text-lg font-bold text-white">{getPipelineCandidatesByStage.offerStage.length}</span>
                </div>
                <div className="flex justify-between items-center py-3 px-4 bg-green-950 dark:bg-green-300 rounded">
                  <span className="text-sm font-medium text-white">CLOSURE</span>
                  <span className="text-lg font-bold text-white">{getPipelineCandidatesByStage.closure.length}</span>
                </div>
                <div className="flex justify-between items-center py-3 px-4 bg-amber-500 dark:bg-amber-600 rounded">
                  <span className="text-sm font-medium text-white">OFFER DROP</span>
                  <span className="text-lg font-bold text-white">{getPipelineCandidatesByStage.offerDrop.length}</span>
                </div>
                
                {/* See More button moved to bottom right */}
                <div className="flex justify-end mt-4">
                  <Button 
                    className="bg-cyan-400 hover:bg-cyan-500 text-black px-6 py-2 rounded text-sm"
                    onClick={() => setIsPipelineModalOpen(true)}
                  >
                    See More
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );
      case 'master-data':
        return (
          <div className="flex h-full">
            {/* Main Content */}
            <div className="flex-1 px-6 py-6 space-y-6 overflow-y-auto admin-scrollbar">
              {/* Resume Database */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg text-gray-900 dark:text-white">Resume Database</CardTitle>
                  <div className="flex gap-2">
                    <Button 
                      className="btn-rounded bg-purple-600 hover:bg-purple-700 text-white text-sm px-4"
                      onClick={() => navigate('/master-database')}
                    >
                      View Full Database
                    </Button>
                    <Button 
                      className="btn-rounded bg-blue-600 hover:bg-blue-700 text-white text-sm px-4"
                      onClick={() => setIsClientModalOpen(true)}
                      data-testid="button-add-new-client"
                    >
                      + Add New Client
                    </Button>
                    <Button 
                      className="btn-rounded bg-green-600 hover:bg-green-700 text-white text-sm px-4"
                      onClick={() => setIsEmployeeModalOpen(true)}
                      data-testid="button-add-employee"
                    >
                      + Add Employee
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto admin-scrollbar">
                    <table className="w-full border-collapse bg-white dark:bg-gray-900 rounded">
                      <thead>
                        <tr className="bg-gray-100 dark:bg-gray-700">
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Employee ID</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Name</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Team</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Total Applicants</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Uploads</th>
                        </tr>
                      </thead>
                      <tbody>
                        {isLoadingEmployees ? (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-gray-500 dark:text-gray-400">Loading employees...</td>
                          </tr>
                        ) : hrEmployees.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-gray-500 dark:text-gray-400">No employees found. Click "+ Add Employee" to add one.</td>
                          </tr>
                        ) : (
                          hrEmployees.slice(0, 5).map((row: any, index: number) => (
                            <tr key={row.id || index} className={`border-b border-gray-100 dark:border-gray-800 ${index % 2 === 0 ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                              <td className="py-3 px-4 text-gray-900 dark:text-white font-medium">{row.employeeId}</td>
                              <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{row.name}</td>
                              <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{row.department || 'N/A'}</td>
                              <td className="py-3 px-4 text-gray-600 dark:text-gray-400">-</td>
                              <td className="py-3 px-4 text-gray-600 dark:text-gray-400">-</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                  {/* View More button */}
                  <div className="flex justify-end mt-4">
                    <Button 
                      className="bg-cyan-400 hover:bg-cyan-500 text-slate-900 px-6 py-2 rounded text-sm"
                      onClick={() => setIsResumeDatabaseModalOpen(true)}
                      data-testid="button-view-more-resume-database"
                    >
                      View More
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Employees Master */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg text-gray-900 dark:text-white">Employees Master</CardTitle>
                  <Button 
                    className="btn-rounded bg-cyan-400 hover:bg-cyan-500 text-slate-900 text-sm px-4"
                    onClick={() => setIsEmployeeMasterModalOpen(true)}
                  >
                    View More
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto admin-scrollbar">
                    <table className="w-full border-collapse bg-white dark:bg-gray-900 rounded">
                      <thead>
                        <tr className="bg-gray-100 dark:bg-gray-700">
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Employee ID</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Name</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Father's Name</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Employee Status</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Date of Joining</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Current CTC</th>
                        </tr>
                      </thead>
                      <tbody>
                        {isLoadingEmployees ? (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-gray-500 dark:text-gray-400">Loading employees...</td>
                          </tr>
                        ) : hrEmployees.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-gray-500 dark:text-gray-400">No employees found. Click "+ Add Employee" to add one.</td>
                          </tr>
                        ) : (
                          hrEmployees.slice(0, 5).map((row: any, index: number) => (
                            <tr key={row.id || index} className={`border-b border-gray-100 dark:border-gray-800 ${index % 2 === 0 ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                              <td className="py-3 px-4 text-gray-900 dark:text-white font-medium">{row.employeeId}</td>
                              <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{row.name}</td>
                              <td className="py-3 px-4 text-gray-600 dark:text-gray-400">-</td>
                              <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{row.role || 'N/A'}</td>
                              <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{row.joiningDate || 'N/A'}</td>
                              <td className="py-3 px-4 text-gray-600 dark:text-gray-400">-</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Client Master */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg text-gray-900 dark:text-white">Client Master</CardTitle>
                  <Button 
                    className="btn-rounded bg-cyan-400 hover:bg-cyan-500 text-slate-900 text-sm px-4"
                    onClick={() => setIsClientMasterModalOpen(true)}
                  >
                    View More
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto admin-scrollbar">
                    <table className="w-full border-collapse bg-white dark:bg-gray-900 rounded">
                      <thead>
                        <tr className="bg-gray-100 dark:bg-gray-700">
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Client Code</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Brand Name</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Location</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">SPOC</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Website</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Current Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {isLoadingClients ? (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-gray-500 dark:text-gray-400">Loading clients...</td>
                          </tr>
                        ) : clients.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-gray-500 dark:text-gray-400">No clients found. Click "+ Add Client" to add one.</td>
                          </tr>
                        ) : (
                          clients.slice(0, 5).map((row: any, index: number) => {
                            const statusClass = row.currentStatus === 'active' ? 'bg-green-100 text-green-800' : 
                                              row.currentStatus === 'frozen' ? 'bg-orange-100 text-orange-800' : 
                                              'bg-red-100 text-red-800';
                            return (
                              <tr key={row.id || index} className={`border-b border-gray-100 dark:border-gray-800 ${index % 2 === 0 ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                                <td className="py-3 px-4 text-gray-900 dark:text-white font-medium">{row.clientCode}</td>
                                <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{row.brandName}</td>
                                <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{row.location || 'N/A'}</td>
                                <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{row.spoc || 'N/A'}</td>
                                <td className="py-3 px-4 text-blue-600 dark:text-blue-400">{row.website || 'N/A'}</td>
                                <td className="py-3 px-4">
                                  <span className={`${statusClass} text-sm font-semibold px-3 py-1 rounded-full`}>• {(row.currentStatus || 'active').toUpperCase()}</span>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Statistics Panel */}
            <div className="w-80 bg-blue-50 dark:bg-blue-900/20 border-l border-gray-200 dark:border-gray-700 px-6 pb-6 space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Totals</h3>
              
              <div className="space-y-4">
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">DIRECT UPLOADS</div>
                  <div className="text-3xl font-bold text-gray-900 dark:text-white" data-testid="text-direct-uploads">{masterTotals.directUploads.toLocaleString()}</div>
                </div>
                
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">RECRUITER UPLOADS</div>
                  <div className="text-3xl font-bold text-gray-900 dark:text-white" data-testid="text-recruiter-uploads">{masterTotals.recruiterUploads.toLocaleString()}</div>
                </div>
                
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">RESUMES</div>
                  <div className="text-3xl font-bold text-gray-900 dark:text-white" data-testid="text-resumes">{masterTotals.resumes.toLocaleString()}</div>
                </div>
                
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">HEAD COUNT</div>
                  <div className="text-3xl font-bold text-gray-900 dark:text-white" data-testid="text-head-count">{masterTotals.headCount.toLocaleString()}</div>
                </div>
                
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">SALARY PAID</div>
                  <div className="text-3xl font-bold text-gray-900 dark:text-white" data-testid="text-salary-paid">{masterTotals.salaryPaid.toLocaleString()}</div>
                </div>
                
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">OTHER EXPENSES</div>
                  <div className="text-3xl font-bold text-gray-900 dark:text-white" data-testid="text-other-expenses">{masterTotals.otherExpenses.toLocaleString()}</div>
                </div>
                
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">TOOLS & DATABASES</div>
                  <div className="text-3xl font-bold text-gray-900 dark:text-white" data-testid="text-tools-databases">{masterTotals.toolsAndDatabases.toLocaleString()}</div>
                </div>
                
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">RENT PAID</div>
                  <div className="text-3xl font-bold text-gray-900 dark:text-white" data-testid="text-rent-paid">{masterTotals.rentPaid.toLocaleString()}</div>
                </div>
              </div>
            </div>
          </div>
        );
      case 'performance':
        return (
          <div className="flex h-full">
            {/* Middle Column - Scrollable Content */}
            <div className="flex-1 px-6 py-6 overflow-y-auto admin-scrollbar space-y-6">
              {/* Performance Header with Tabs */}
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Performance</h2>
                <div className="flex gap-2">
                  <Button 
                    className="bg-purple-800 hover:bg-purple-900 text-white px-4 py-2 rounded text-sm"
                    onClick={() => setIsTargetMappingModalOpen(true)}
                  >
                    Target Mapping
                  </Button>
                  <Button 
                    className="bg-purple-800 hover:bg-purple-900 text-white px-4 py-2 rounded text-sm"
                    onClick={() => setIsRevenueMappingModalOpen(true)}
                  >
                    Revenue Mapping
                  </Button>
                </div>
              </div>

              {/* Filters and Main Content */}
              <div className="flex gap-6">
                {/* Left Section with Chart */}
                <div className="flex-1">
                {/* Filter Dropdowns */}
                <div className="flex gap-4 mb-4">
                  <Select value={selectedPerformanceTeam} onValueChange={setSelectedPerformanceTeam} data-testid="select-performance-team">
                    <SelectTrigger className="w-48 bg-cyan-400 text-black">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="arun">Arun</SelectItem>
                      <SelectItem value="anusha">Anusha</SelectItem>
                      <SelectItem value="all">All</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select defaultValue="monthly">
                    <SelectTrigger className="w-32 bg-cyan-400 text-black">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Chart Area - Grid Layout */}
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 bg-white dark:bg-gray-900 px-6 pb-6">
                  {/* Performance Chart */}
                  <div className="xl:col-span-5">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-300">Performance</h3>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={() => setIsPerformanceChartModalOpen(true)}
                        data-testid="button-expand-performance-chart-alt"
                      >
                        <HelpCircle className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                      </Button>
                    </div>
                    <div className="h-[260px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={[
                          { month: 'Jan', arunTeam: 0, anushaTeam: 0, sudharshan: 0, deepika: 0, dharshan: 0, kavya: 0 },
                          { month: 'Feb', arunTeam: 0, anushaTeam: 0, sudharshan: 0, deepika: 0, dharshan: 0, kavya: 0 },
                          { month: 'Mar', arunTeam: 0, anushaTeam: 0, sudharshan: 0, deepika: 0, dharshan: 0, kavya: 0 },
                          { month: 'Apr', arunTeam: 0, anushaTeam: 0, sudharshan: 0, deepika: 0, dharshan: 0, kavya: 0 },
                          { month: 'May', arunTeam: 0, anushaTeam: 0, sudharshan: 0, deepika: 0, dharshan: 0, kavya: 0 },
                          { month: 'Jun', arunTeam: 0, anushaTeam: 0, sudharshan: 0, deepika: 0, dharshan: 0, kavya: 0 }
                        ]}>
                          <defs>
                            <linearGradient id="colorArunTeam" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                              <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1}/>
                            </linearGradient>
                            <linearGradient id="colorAnushaTeam" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#EF4444" stopOpacity={0.8}/>
                              <stop offset="95%" stopColor="#EF4444" stopOpacity={0.1}/>
                            </linearGradient>
                            <linearGradient id="colorSudharshan" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                              <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1}/>
                            </linearGradient>
                            <linearGradient id="colorDeepika" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                              <stop offset="95%" stopColor="#10B981" stopOpacity={0.1}/>
                            </linearGradient>
                            <linearGradient id="colorDharshan" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.8}/>
                              <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.1}/>
                            </linearGradient>
                            <linearGradient id="colorKavya" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.8}/>
                              <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.1}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.3} />
                          <XAxis dataKey="month" stroke="#6b7280" style={{ fontSize: '11px' }} tick={{ fill: '#6b7280' }} />
                          <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} tick={{ fill: '#6b7280' }} />
                          <Tooltip />
                          <Legend />
                          {selectedPerformanceTeam === 'all' && (
                            <>
                              <Area type="monotone" dataKey="arunTeam" name="Arun's Team" stroke="#3B82F6" strokeWidth={2} fill="url(#colorArunTeam)" dot={{ fill: '#3B82F6', r: 4 }} activeDot={{ r: 6 }} />
                              <Area type="monotone" dataKey="anushaTeam" name="Anusha's Team" stroke="#EF4444" strokeWidth={2} fill="url(#colorAnushaTeam)" fillOpacity={0.6} dot={{ fill: '#EF4444', r: 4 }} activeDot={{ r: 6 }} />
                            </>
                          )}
                          {selectedPerformanceTeam === 'arun' && (
                            <>
                              <Area type="monotone" dataKey="sudharshan" name="Sudharshan" stroke="#3B82F6" strokeWidth={2} fill="url(#colorSudharshan)" dot={{ fill: '#3B82F6', r: 4 }} activeDot={{ r: 6 }} />
                              <Area type="monotone" dataKey="deepika" name="Deepika" stroke="#10B981" strokeWidth={2} fill="url(#colorDeepika)" fillOpacity={0.6} dot={{ fill: '#10B981', r: 4 }} activeDot={{ r: 6 }} />
                              <Area type="monotone" dataKey="dharshan" name="Dharshan" stroke="#F59E0B" strokeWidth={2} fill="url(#colorDharshan)" fillOpacity={0.6} dot={{ fill: '#F59E0B', r: 4 }} activeDot={{ r: 6 }} />
                              <Area type="monotone" dataKey="kavya" name="Kavya" stroke="#8B5CF6" strokeWidth={2} fill="url(#colorKavya)" fillOpacity={0.6} dot={{ fill: '#8B5CF6', r: 4 }} activeDot={{ r: 6 }} />
                            </>
                          )}
                          {selectedPerformanceTeam === 'anusha' && (
                            <>
                              <Area type="monotone" dataKey="sudharshan" name="Sudharshan" stroke="#3B82F6" strokeWidth={2} fill="url(#colorSudharshan)" dot={{ fill: '#3B82F6', r: 4 }} activeDot={{ r: 6 }} />
                              <Area type="monotone" dataKey="deepika" name="Deepika" stroke="#10B981" strokeWidth={2} fill="url(#colorDeepika)" fillOpacity={0.6} dot={{ fill: '#10B981', r: 4 }} activeDot={{ r: 6 }} />
                              <Area type="monotone" dataKey="dharshan" name="Dharshan" stroke="#F59E0B" strokeWidth={2} fill="url(#colorDharshan)" fillOpacity={0.6} dot={{ fill: '#F59E0B', r: 4 }} activeDot={{ r: 6 }} />
                              <Area type="monotone" dataKey="kavya" name="Kavya" stroke="#8B5CF6" strokeWidth={2} fill="url(#colorKavya)" fillOpacity={0.6} dot={{ fill: '#8B5CF6', r: 4 }} activeDot={{ r: 6 }} />
                            </>
                          )}
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Revenue Analysis Chart */}
                  <div className="xl:col-span-4">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-300">Revenue Analysis</h3>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={() => setIsRevenueGraphModalOpen(true)}
                        data-testid="button-expand-revenue-graph"
                      >
                        <ExternalLink className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                      </Button>
                    </div>
                    <div className="flex justify-start space-x-4 mb-2">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                        <span className="text-sm text-gray-600 dark:text-gray-400">Team Revenue</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-0.5 bg-green-500"></div>
                        <span className="text-sm text-gray-600 dark:text-gray-400">Avg (₹230K)</span>
                      </div>
                    </div>
                    <div className="h-[200px]">
                      <RevenueChart
                        data={revenueData}
                        height="100%"
                        benchmarkValue={230000}
                      />
                    </div>
                  </div>

                  {/* Performance Gauge */}
                  <div className="xl:col-span-3 flex flex-col items-center justify-center">
                    <div className="w-full max-w-sm mx-auto">
                      <PerformanceGauge value={performanceMetrics.performancePercentage} />
                    </div>
                    
                    <Button 
                      className="bg-cyan-400 hover:bg-cyan-500 text-black mt-4 px-6 py-2 rounded"
                      onClick={() => setIsPerformanceDataModalOpen(true)}
                      data-testid="button-show-performance-data"
                    >
                      Show Data
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Team Performance Table */}
            <Card className="bg-gray-50 dark:bg-gray-800 mt-6">
              <CardHeader className="pb-2 pt-3 flex flex-row flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-lg text-gray-900 dark:text-white">Team Performance</CardTitle>
                <Button 
                  className="bg-cyan-400 hover:bg-cyan-500 text-black px-6 py-2 rounded"
                  onClick={() => setIsTeamPerformanceTableModalOpen(true)}
                  data-testid="button-view-team-performance-table-alt"
                >
                  View List
                </Button>
              </CardHeader>
              <CardContent className="p-3">
                <div className="overflow-x-auto admin-scrollbar">
                  <table className="w-full border-collapse bg-white dark:bg-gray-900 rounded">
                    <thead>
                      <tr className="bg-gray-200 dark:bg-gray-700">
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Talent Advisor</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Joining Date</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Tenure</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Closures</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Last Closure</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Qtrs Achieved</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teamPerformanceData.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-gray-500 dark:text-gray-400">
                            No team performance data available
                          </td>
                        </tr>
                      ) : (
                        teamPerformanceData.slice(0, 4).map((member, index) => (
                          <tr key={member.id || index} className="border-b border-gray-100 dark:border-gray-700">
                            <td className="py-3 px-4 text-gray-900 dark:text-white font-medium">{member.talentAdvisor}</td>
                            <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{member.joiningDate}</td>
                            <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{member.tenure}</td>
                            <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{member.closures}</td>
                            <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{member.lastClosure}</td>
                            <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{member.qtrsAchieved}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* List of Closures Table */}
            <Card className="bg-gray-50 dark:bg-gray-800 mt-6">
              <CardHeader className="pb-2 pt-3 flex flex-row flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-lg text-gray-900 dark:text-white">List Of Closures</CardTitle>
                <Button 
                  className="bg-cyan-400 hover:bg-cyan-500 text-black px-6 py-2 rounded"
                  onClick={() => setIsClosureModalOpen(true)}
                  data-testid="button-view-closures-list"
                >
                  View List
                </Button>
              </CardHeader>
              <CardContent className="p-3">
                <div className="overflow-x-auto admin-scrollbar">
                  <table className="w-full border-collapse bg-white dark:bg-gray-900 rounded">
                    <thead>
                      <tr className="bg-gray-200 dark:bg-gray-700">
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Candidate</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Positions</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Client</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Quarter</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Talent Advisor</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">CTC</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {closuresListData.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-gray-500 dark:text-gray-400">
                            No closures data available
                          </td>
                        </tr>
                      ) : (
                        closuresListData.slice(0, 4).map((closure, index) => (
                          <tr key={closure.id || index} className="border-b border-gray-100 dark:border-gray-700">
                            <td className="py-3 px-4 text-gray-900 dark:text-white font-medium">{closure.candidate}</td>
                            <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{closure.position}</td>
                            <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{closure.client}</td>
                            <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{closure.quarter}</td>
                            <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{closure.talentAdvisor}</td>
                            <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{closure.ctc}</td>
                            <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{closure.revenue}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Revenue Data Table */}
            <Card className="bg-gray-50 dark:bg-gray-800 mt-6">
              <CardHeader className="pb-2 pt-3 flex flex-row flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-lg text-gray-900 dark:text-white">Revenue Data</CardTitle>
                <Button 
                  className="bg-cyan-400 hover:bg-cyan-500 text-black px-6 py-2 rounded"
                  onClick={() => {
                    setEditingRevenueMapping(null);
                    setIsRevenueMappingModalOpen(true);
                  }}
                  data-testid="button-add-revenue-mapping-2"
                >
                  + Add Revenue
                </Button>
              </CardHeader>
              <CardContent className="p-3">
                <div className="overflow-x-auto admin-scrollbar">
                  {isLoadingRevenue ? (
                    <div className="text-center py-8 text-gray-600 dark:text-gray-400">
                      Loading revenue data...
                    </div>
                  ) : revenueMappings.length === 0 ? (
                    <div className="text-center py-8 text-gray-600 dark:text-gray-400">
                      No revenue data available
                    </div>
                  ) : (
                    <table className="w-full border-collapse bg-white dark:bg-gray-900 rounded">
                      <thead>
                        <tr className="bg-gray-200 dark:bg-gray-700">
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Talent Advisor</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Team Lead</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Position</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Client</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Quarter</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Year</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Revenue</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Payment Status</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {revenueMappings.map((mapping: any) => (
                          <tr key={mapping.id} className="border-b border-gray-100 dark:border-gray-700" data-testid={`row-revenue-2-${mapping.id}`}>
                            <td className="py-3 px-4 text-gray-900 dark:text-white font-medium">{mapping.talentAdvisorName || 'N/A'}</td>
                            <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{mapping.teamLeadName || 'N/A'}</td>
                            <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{mapping.position || 'N/A'}</td>
                            <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{mapping.clientName || 'N/A'}</td>
                            <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{mapping.quarter || 'N/A'}</td>
                            <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{mapping.year || 'N/A'}</td>
                            <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                              {mapping.revenue ? `₹${Number(mapping.revenue).toLocaleString('en-IN')}` : 'N/A'}
                            </td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-1 text-xs rounded ${
                                mapping.receivedPayment 
                                  ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' 
                                  : 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
                              }`}>
                                {mapping.receivedPayment ? 'Received' : 'Pending'}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex gap-2">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => {
                                    setEditingRevenueMapping(mapping);
                                    setIsRevenueMappingModalOpen(true);
                                  }}
                                  data-testid={`button-edit-revenue-2-${mapping.id}`}
                                >
                                  <EditIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => {
                                    if (confirm('Are you sure you want to delete this revenue mapping?')) {
                                      deleteRevenueMappingMutation.mutate(mapping.id);
                                    }
                                  }}
                                  data-testid={`button-delete-revenue-2-${mapping.id}`}
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </CardContent>
            </Card>
            </div>

            {/* Right Sidebar - Quarterly/Yearly Metrics */}
            <div className="w-64 bg-gray-100 dark:bg-gray-800 p-4 flex flex-col space-y-3 overflow-y-auto">
              {/* Quarterly/Yearly Selector */}
              <div>
                <Select defaultValue="quarterly">
                  <SelectTrigger className="w-full bg-teal-400 text-black font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Current Quarter Section */}
              <div className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 p-4 rounded-md">
                <div className="text-xs font-bold uppercase text-gray-700 dark:text-gray-300">CURRENT</div>
                <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase">QUARTER</div>
                <div className="text-right text-2xl font-bold mt-2" data-testid="text-current-quarter">{performanceMetrics.currentQuarter}</div>
              </div>

              {/* Minimum Target */}
              <div className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 p-4 rounded-md">
                <div className="text-xs font-bold uppercase text-gray-700 dark:text-gray-300">MINIMUM</div>
                <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase">TARGET</div>
                <div className="text-right text-2xl font-bold mt-2" data-testid="text-minimum-target">{performanceMetrics.minimumTarget.toLocaleString('en-IN')}</div>
              </div>

              {/* Target Achieved */}
              <div className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 p-4 rounded-md">
                <div className="text-xs font-bold uppercase text-gray-700 dark:text-gray-300">TARGET</div>
                <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase">ACHIEVED</div>
                <div className="text-right text-2xl font-bold mt-2" data-testid="text-target-achieved">{performanceMetrics.targetAchieved.toLocaleString('en-IN')}</div>
              </div>

              {/* Closures Made */}
              <div className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 p-4 rounded-md">
                <div className="text-xs font-bold uppercase text-gray-700 dark:text-gray-300">CLOSURES</div>
                <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase">MADE</div>
                <div className="text-right text-3xl font-bold mt-2" data-testid="text-closures-count">{performanceMetrics.closuresCount}</div>
              </div>

              {/* Incentives Made */}
              <div className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 p-4 rounded-md">
                <div className="text-xs font-bold uppercase text-gray-700 dark:text-gray-300">INCENTIVES</div>
                <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase">MADE</div>
                <div className="text-right text-2xl font-bold mt-2" data-testid="text-incentives-earned">{performanceMetrics.incentiveEarned.toLocaleString('en-IN')}</div>
              </div>
            </div>
          </div>
        );
      case 'user-management':
        // Map employees from database to user table format (TL, TA, and Client login profiles)
        // Exclude admin accounts (STAFFOS* IDs) from the list
        const userData = employees
          .filter(emp => (emp.role === 'recruiter' || emp.role === 'team_leader' || emp.role === 'client') && !emp.employeeId?.startsWith('STAFFOS'))
          .map(emp => ({
            id: emp.employeeId,
            dbId: emp.id,
            name: emp.name,
            email: emp.email,
            role: emp.role === 'team_leader' ? 'Team Leader' : emp.role === 'client' ? 'Client' : 'Recruiter',
            status: emp.isActive ? 'Active' : 'Inactive',
            lastLogin: "N/A",
            phoneNumber: emp.phone || '',
            joiningDate: emp.joiningDate || '',
            password: emp.password,
            reportingTo: emp.reportingTo || ''
          }));

        // Filter users based on search term
        const filteredUsers = userData.filter(user =>
          user.id.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
          user.name.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
          user.email.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
          user.role.toLowerCase().includes(userSearchTerm.toLowerCase())
        );

        // Calculate online/offline counts
        const activeCount = userData.filter(user => user.status === 'Active').length;
        const offlineCount = userData.filter(user => user.status !== 'Active').length;

        return (
          <div className="flex h-full">
            {/* Main Content */}
            <div className="flex-1 px-6 py-6 space-y-6 overflow-y-auto admin-scrollbar">
              {/* Header with Search and Action Buttons */}
              <div className="flex items-center justify-between gap-4">
                {/* Search Input */}
                <div className="flex-1 max-w-sm relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search user..."
                    value={userSearchTerm}
                    onChange={(e) => setUserSearchTerm(e.target.value)}
                    className="w-full bg-gray-50 border-gray-200 text-sm pl-10"
                    data-testid="input-search-user"
                  />
                </div>
                
                {/* Action Buttons */}
                <div className="flex gap-3">
                  <Button 
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm flex items-center gap-2"
                    onClick={() => setIsAddClientCredentialsModalOpen(true)}
                    data-testid="button-add-client"
                  >
                    <UserPlus className="h-4 w-4" />
                    Add Client
                  </Button>
                  <Button 
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm flex items-center gap-2"
                    onClick={() => setIsAddTeamLeaderModalNewOpen(true)}
                    data-testid="button-add-team-leader"
                  >
                    <Users className="h-4 w-4" />
                    Add Team Leader
                  </Button>
                  <Button 
                    className="bg-gray-800 hover:bg-gray-900 text-white px-4 py-2 rounded text-sm flex items-center gap-2"
                    onClick={() => setIsAddRecruiterModalOpen(true)}
                    data-testid="button-add-recruiter"
                  >
                    <UserPlus className="h-4 w-4" />
                    Add Recruiter
                  </Button>
                </div>
              </div>

              {/* User Management Table */}
              <div className="bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-600">
                        <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300 text-sm">ID</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300 text-sm">Name</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300 text-sm">Email</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300 text-sm">Role</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300 text-sm">Status</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300 text-sm">Last Login</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300 text-sm">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {isLoadingEmployees ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-gray-500 dark:text-gray-400">
                            Loading employees...
                          </td>
                        </tr>
                      ) : filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-gray-500 dark:text-gray-400">
                            No employees found
                          </td>
                        </tr>
                      ) : (
                        filteredUsers.map((user, index) => (
                          <tr key={user.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800">
                            <td className="py-3 px-4 text-gray-900 dark:text-white font-medium text-sm">{user.id}</td>
                            <td className="py-3 px-4 text-gray-600 dark:text-gray-400 text-sm">{user.name}</td>
                            <td className="py-3 px-4 text-gray-600 dark:text-gray-400 text-sm">{user.email}</td>
                            <td className="py-3 px-4 text-gray-600 dark:text-gray-400 text-sm">{user.role}</td>
                            <td className="py-3 px-4 text-sm">
                              <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${
                                  user.status === 'Active' ? 'bg-green-500' : 'bg-red-500'
                                }`}></div>
                                <span className="text-gray-600 dark:text-gray-400">{user.status}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-gray-600 dark:text-gray-400 text-sm">{user.lastLogin}</td>
                            <td className="py-3 px-4">
                              <div className="flex gap-3 text-sm">
                                <button 
                                  className="text-blue-600 hover:text-blue-700 font-medium"
                                  onClick={() => handleEditUser(user)}
                                  data-testid={`button-edit-${user.id}`}
                                >
                                  Edit
                                </button>
                                <button 
                                  className="text-red-600 hover:text-red-700 font-medium"
                                  onClick={() => handleDeleteUser(user.dbId, user.name)}
                                  data-testid={`button-delete-${user.id}`}
                                >
                                  Delete
                                </button>
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

            {/* Right Sidebar - Online Activity */}
            <div className="w-64 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Online Activity</h3>
              
              <div className="space-y-1">
                {/* Online Section */}
                <div className="bg-cyan-400 dark:bg-cyan-500 px-6 py-8 text-center">
                  <div className="text-sm font-medium text-gray-700 mb-2">Online</div>
                  <div className="text-4xl font-bold text-black">{activeCount}</div>
                </div>
                
                {/* Offline Section */}
                <div className="bg-pink-400 dark:bg-pink-500 px-6 py-8 text-center">
                  <div className="text-sm font-medium text-gray-700 mb-2">Offline</div>
                  <div className="text-4xl font-bold text-black">{offlineCount}</div>
                </div>
              </div>
            </div>
          </div>
        );
      case 'report':
        return (
          <div className="px-6 py-6 h-full flex flex-col">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 flex-1 min-h-0">
              {/* Teams Section */}
              <Card className="flex flex-col min-h-0">
                <CardHeader className="pb-3 flex-shrink-0">
                  <CardTitle className="text-base text-gray-900 dark:text-white">Teams</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto admin-scrollbar space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Report Type</label>
                    <Select value={teamsReportType} onValueChange={setTeamsReportType}>
                      <SelectTrigger className="w-full h-8 text-sm" data-testid="select-teams-report-type">
                        <SelectValue placeholder="Select Report Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="target-incentives">Target & Incentives</SelectItem>
                        <SelectItem value="productive-metrics">Productive Metrics</SelectItem>
                        <SelectItem value="cash-outflows">Cash Outflows</SelectItem>
                        <SelectItem value="key-aspects">Key Aspects</SelectItem>
                        <SelectItem value="resume-database">Resume Database</SelectItem>
                        <SelectItem value="key-totals">Key Totals</SelectItem>
                        <SelectItem value="list-of-users">List of Users</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Period</label>
                    <Select value={teamsPeriod} onValueChange={setTeamsPeriod}>
                      <SelectTrigger className="w-full h-8 text-sm" data-testid="select-teams-period">
                        <SelectValue placeholder="Select Period" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                        <SelectItem value="yearly">Yearly</SelectItem>
                        <SelectItem value="custom">Custom Date</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {teamsPeriod === 'custom' && (
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Custom Date</label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full h-8 justify-start text-left text-sm" data-testid="button-teams-custom-date">
                            <CalendarIcon className="h-3 w-3 mr-2" />
                            {teamsCustomDate ? format(teamsCustomDate, 'PPP') : 'Pick date'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar mode="single" selected={teamsCustomDate} onSelect={setTeamsCustomDate} />
                        </PopoverContent>
                      </Popover>
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300">File Format</label>
                    <Select value={teamsFileFormat} onValueChange={setTeamsFileFormat}>
                      <SelectTrigger className="w-full h-8 text-sm" data-testid="select-teams-file-format">
                        <SelectValue placeholder="File Format" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="excel">Excel</SelectItem>
                        <SelectItem value="docx">DOCX</SelectItem>
                        <SelectItem value="pdf">PDF</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="pt-2">
                    <Button 
                      className="bg-cyan-400 hover:bg-cyan-500 text-black w-full h-8 text-sm"
                      onClick={() => handleDownloadClick('teams')}
                      data-testid="button-download-teams"
                    >
                      Download
                    </Button>
                  </div>
                </CardContent>
              </Card>
              
              {/* Reports Section */}
              <Card className="flex flex-col min-h-0">
                <CardHeader className="pb-3 flex-shrink-0">
                  <CardTitle className="text-base text-gray-900 dark:text-white">Reports</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto admin-scrollbar space-y-3">
                  <div>
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300 block mb-2">Select Reports</label>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="flex items-center space-x-1 cursor-pointer" data-testid="checkbox-requirements">
                        <Checkbox 
                          checked={reportsCheckboxes.requirements}
                          onCheckedChange={() => toggleReportCheckbox('requirements')}
                        />
                        <span className={`text-xs ${reportsCheckboxes.requirements ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-600'}`}>
                          Requirements
                        </span>
                      </label>
                      <label className="flex items-center space-x-1 cursor-pointer" data-testid="checkbox-pipeline">
                        <Checkbox 
                          checked={reportsCheckboxes.pipeline}
                          onCheckedChange={() => toggleReportCheckbox('pipeline')}
                        />
                        <span className={`text-xs ${reportsCheckboxes.pipeline ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-600'}`}>
                          Pipeline
                        </span>
                      </label>
                      <label className="flex items-center space-x-1 cursor-pointer" data-testid="checkbox-closure-reports">
                        <Checkbox 
                          checked={reportsCheckboxes.closureReports}
                          onCheckedChange={() => toggleReportCheckbox('closureReports')}
                        />
                        <span className={`text-xs ${reportsCheckboxes.closureReports ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-600'}`}>
                          Closure
                        </span>
                      </label>
                      <label className="flex items-center space-x-1 cursor-pointer" data-testid="checkbox-team-performance">
                        <Checkbox 
                          checked={reportsCheckboxes.teamPerformance}
                          onCheckedChange={() => toggleReportCheckbox('teamPerformance')}
                        />
                        <span className={`text-xs ${reportsCheckboxes.teamPerformance ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-600'}`}>
                          Performance
                        </span>
                      </label>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Team</label>
                    <Select value={reportsTeam} onValueChange={setReportsTeam}>
                      <SelectTrigger className="w-full h-8 text-sm" data-testid="select-reports-team">
                        <SelectValue placeholder="Team" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="arun">Arun</SelectItem>
                        <SelectItem value="anusha">Anusha</SelectItem>
                        <SelectItem value="all">All</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Priority</label>
                    <Select value={reportsPriority} onValueChange={setReportsPriority}>
                      <SelectTrigger className="w-full h-8 text-sm" data-testid="select-reports-priority">
                        <SelectValue placeholder="Priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="all">All</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Type</label>
                    <Select value={reportsType} onValueChange={setReportsType}>
                      <SelectTrigger className="w-full h-8 text-sm" data-testid="select-reports-type">
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="opened">Opened</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                        <SelectItem value="all">All</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300">File Format</label>
                    <Select value={reportsFileFormat} onValueChange={setReportsFileFormat}>
                      <SelectTrigger className="w-full h-8 text-sm" data-testid="select-reports-file-format">
                        <SelectValue placeholder="File Format" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="excel">Excel</SelectItem>
                        <SelectItem value="docx">DOCX</SelectItem>
                        <SelectItem value="pdf">PDF</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="pt-2">
                    <Button 
                      className="bg-cyan-400 hover:bg-cyan-500 text-black w-full h-8 text-sm"
                      onClick={() => handleDownloadClick('reports')}
                      data-testid="button-download-reports"
                    >
                      Download
                    </Button>
                  </div>
                </CardContent>
              </Card>
              
              {/* General Section */}
              <Card className="flex flex-col min-h-0">
                <CardHeader className="pb-3 flex-shrink-0">
                  <CardTitle className="text-base text-gray-900 dark:text-white">General</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto admin-scrollbar space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Report Type</label>
                    <Select value={generalReportType} onValueChange={setGeneralReportType}>
                      <SelectTrigger className="w-full h-8 text-sm" data-testid="select-general-report-type">
                        <SelectValue placeholder="Select Report Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="employee-master">Employee Master</SelectItem>
                        <SelectItem value="client-master">Client Master</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300">File Format</label>
                    <Select value={generalFileFormat} onValueChange={setGeneralFileFormat}>
                      <SelectTrigger className="w-full h-8 text-sm" data-testid="select-general-file-format">
                        <SelectValue placeholder="File Format" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="excel">Excel</SelectItem>
                        <SelectItem value="docx">DOCX</SelectItem>
                        <SelectItem value="pdf">PDF</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="pt-2">
                    <Button 
                      className="bg-cyan-400 hover:bg-cyan-500 text-black w-full h-8 text-sm"
                      onClick={() => handleDownloadClick('general')}
                      data-testid="button-download-general"
                    >
                      Download
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        );
      case 'metrics':
        return (
          <div className="flex h-full gap-6 px-6 py-6">
            {/* Middle Section - Key Metrics and Cash Outflow - Scrollable */}
            <div className="flex-1 overflow-y-auto space-y-6 admin-scrollbar pr-4">
                {/* Split Section - Key Metrics and Client Metrics */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
                  {/* Key Metrics Section (Half Size) */}
                  <Card>
                    <CardHeader className="p-4 lg:p-6">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                        <CardTitle className="text-base lg:text-lg font-semibold text-gray-900 dark:text-white">Key Metrics</CardTitle>
                        <div className="flex gap-2 flex-wrap">
                          <Select>
                            <SelectTrigger className="w-28 sm:w-32 input-styled rounded text-xs sm:text-sm" data-testid="select-key-metrics-client">
                              <SelectValue placeholder="Client" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="client1">Client 1</SelectItem>
                              <SelectItem value="client2">Client 2</SelectItem>
                              <SelectItem value="all">All Clients</SelectItem>
                            </SelectContent>
                          </Select>
                          
                          <Select>
                            <SelectTrigger className="w-28 sm:w-32 input-styled rounded text-xs sm:text-sm" data-testid="select-key-metrics-period">
                              <SelectValue placeholder="Monthly" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="monthly">Monthly</SelectItem>
                              <SelectItem value="quarterly">Quarterly</SelectItem>
                              <SelectItem value="yearly">Yearly</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 lg:p-6">
                      <div className="h-48 sm:h-64 mb-4">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart
                            data={keyAspectsData.chartData}
                            margin={{
                              top: 5,
                              right: 15,
                              left: 10,
                              bottom: 5,
                            }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" style={{ fontSize: '10px' }} />
                            <YAxis style={{ fontSize: '10px' }} />
                            <Tooltip />
                            <Legend wrapperStyle={{ fontSize: '10px' }} />
                            <Line type="monotone" dataKey="growthMoM" name="Growth MoM (%)" stroke="#82ca9d" strokeWidth={2} />
                            <Line type="monotone" dataKey="burnRate" name="Burn Rate (%)" stroke="#ff7c7c" strokeWidth={2} />
                            <Line type="monotone" dataKey="churnRate" name="Churn Rate (%)" stroke="#ffc658" strokeWidth={2} />
                            <Line type="monotone" dataKey="attrition" name="Attrition (%)" stroke="#8884d8" strokeWidth={2} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                      
                      <div className="flex justify-end mt-4">
                        <Button 
                          className="bg-cyan-400 hover:bg-cyan-500 text-black px-3 sm:px-4 py-2 rounded text-xs sm:text-sm"
                          onClick={() => setIsMetricsModalOpen(true)}
                          data-testid="button-show-more-key-metrics"
                        >
                          Show More
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Client Metrics Summary Section (Half Size) */}
                  <Card>
                    <CardHeader className="p-4 lg:p-6">
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-base lg:text-lg font-semibold text-gray-900 dark:text-white">Client Metrics</CardTitle>
                        <div className="flex gap-2">
                          <Button 
                            variant="ghost"
                            size="icon"
                            onClick={() => setIsClientMetricsModalOpen(true)}
                            className="h-8 w-8"
                            data-testid="button-open-client-metrics-modal"
                          >
                            <ExternalLink className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 lg:p-6">
                      <div className="space-y-3 sm:space-y-4">
                        {/* Speed Metrics Summary */}
                        <div>
                          <h3 className="text-xs sm:text-sm font-semibold text-blue-700 dark:text-blue-400 mb-2">Speed Metrics</h3>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="bg-blue-50 dark:bg-blue-900/20 rounded p-2 border border-blue-100 dark:border-blue-800">
                              <div className="text-xs font-medium text-blue-700 dark:text-blue-400">1st Submission</div>
                              <div className="text-base sm:text-lg font-bold text-blue-900 dark:text-blue-300">0 <span className="text-xs">days</span></div>
                            </div>
                            <div className="bg-blue-50 dark:bg-blue-900/20 rounded p-2 border border-blue-100 dark:border-blue-800">
                              <div className="text-xs font-medium text-blue-700 dark:text-blue-400">Time to Fill</div>
                              <div className="text-base sm:text-lg font-bold text-blue-900 dark:text-blue-300">0 <span className="text-xs">days</span></div>
                            </div>
                          </div>
                        </div>

                        {/* Quality Metrics Summary */}
                        <div>
                          <h3 className="text-xs sm:text-sm font-semibold text-green-700 dark:text-green-400 mb-2">Quality Metrics</h3>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="bg-green-50 dark:bg-green-900/20 rounded p-2 border border-green-100 dark:border-green-800">
                              <div className="text-xs font-medium text-green-700 dark:text-green-400">Submission Rate</div>
                              <div className="text-base sm:text-lg font-bold text-green-900 dark:text-green-300">0<span className="text-xs">%</span></div>
                            </div>
                            <div className="bg-green-50 dark:bg-green-900/20 rounded p-2 border border-green-100 dark:border-green-800">
                              <div className="text-xs font-medium text-green-700 dark:text-green-400">Offer Rate</div>
                              <div className="text-base sm:text-lg font-bold text-green-900 dark:text-green-300">0<span className="text-xs">%</span></div>
                            </div>
                          </div>
                        </div>

                        {/* Impact Metrics Summary */}
                        <div>
                          <h3 className="text-xs sm:text-sm font-semibold text-red-700 dark:text-red-400 mb-2">Impact Metrics</h3>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="bg-red-50 dark:bg-red-900/20 rounded p-2 border border-red-100 dark:border-red-800">
                              <div className="text-xs font-medium text-red-700 dark:text-red-400">Client NPS</div>
                              <div className="text-base sm:text-lg font-bold text-red-900 dark:text-red-300">+0</div>
                            </div>
                            <div className="bg-red-50 dark:bg-red-900/20 rounded p-2 border border-red-100 dark:border-red-800">
                              <div className="text-xs font-medium text-red-700 dark:text-red-400">Retention Rate</div>
                              <div className="text-base sm:text-lg font-bold text-red-900 dark:text-red-300">0<span className="text-xs">%</span></div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end mt-4">
                        <Button 
                          className="bg-cyan-400 hover:bg-cyan-500 text-black px-3 sm:px-4 py-2 rounded text-xs sm:text-sm flex items-center gap-2"
                          onClick={() => {
                            setIsClientMetricsModalOpen(true);
                            setTimeout(() => window.print(), 300);
                          }}
                          data-testid="button-download-client-metrics-summary"
                        >
                          <Download className="h-4 w-4" />
                          Download
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Cash Outflow Section */}
                <Card>
                  <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-3">
                    <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">Cash Outflow</CardTitle>
                    {cashoutData.length > 5 && (
                      <Button 
                        className="bg-cyan-400 hover:bg-cyan-500 text-black px-6 py-2 rounded"
                        onClick={() => setIsCashoutModalOpen(true)}
                        size="sm"
                        data-testid="button-view-more-cashout"
                      >
                        View More
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent>
                    {/* Input Form */}
                    <div className="grid grid-cols-3 gap-4 mb-6">
                      <div>
                        <Select 
                          value={cashoutForm.month}
                          onValueChange={(value) => setCashoutForm({...cashoutForm, month: value})}
                        >
                          <SelectTrigger className="input-styled rounded bg-white dark:bg-gray-800 border-2 border-cyan-300 dark:border-cyan-600 focus:border-cyan-500 shadow-sm" data-testid="select-cashout-month">
                            <SelectValue placeholder="Month" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="January">January</SelectItem>
                            <SelectItem value="February">February</SelectItem>
                            <SelectItem value="March">March</SelectItem>
                            <SelectItem value="April">April</SelectItem>
                            <SelectItem value="May">May</SelectItem>
                            <SelectItem value="June">June</SelectItem>
                            <SelectItem value="July">July</SelectItem>
                            <SelectItem value="August">August</SelectItem>
                            <SelectItem value="September">September</SelectItem>
                            <SelectItem value="October">October</SelectItem>
                            <SelectItem value="November">November</SelectItem>
                            <SelectItem value="December">December</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Input 
                          type="number"
                          placeholder="Year" 
                          className="input-styled rounded bg-white dark:bg-gray-800 border-2 border-cyan-300 dark:border-cyan-600 focus:border-cyan-500 shadow-sm" 
                          value={cashoutForm.year}
                          onChange={(e) => setCashoutForm({...cashoutForm, year: e.target.value})}
                          data-testid="input-cashout-year"
                        />
                      </div>
                      <div>
                        <Input 
                          type="number"
                          placeholder="Number of Employees" 
                          className="input-styled rounded bg-white dark:bg-gray-800 border-2 border-cyan-300 dark:border-cyan-600 focus:border-cyan-500 shadow-sm" 
                          value={cashoutForm.employees}
                          onChange={(e) => setCashoutForm({...cashoutForm, employees: e.target.value})}
                          data-testid="input-cashout-employees"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 mb-6">
                      <div>
                        <Input 
                          type="number"
                          placeholder="Total Salary" 
                          className="input-styled rounded bg-white dark:bg-gray-800 border-2 border-cyan-300 dark:border-cyan-600 focus:border-cyan-500 shadow-sm" 
                          value={cashoutForm.salary}
                          onChange={(e) => setCashoutForm({...cashoutForm, salary: e.target.value})}
                          data-testid="input-cashout-salary"
                        />
                      </div>
                      <div>
                        <Input 
                          type="number"
                          placeholder="Incentive" 
                          className="input-styled rounded bg-white dark:bg-gray-800 border-2 border-cyan-300 dark:border-cyan-600 focus:border-cyan-500 shadow-sm" 
                          value={cashoutForm.incentive}
                          onChange={(e) => setCashoutForm({...cashoutForm, incentive: e.target.value})}
                          data-testid="input-cashout-incentive"
                        />
                      </div>
                      <div>
                        <Input 
                          type="number"
                          placeholder="Database & Tools cost" 
                          className="input-styled rounded bg-white dark:bg-gray-800 border-2 border-cyan-300 dark:border-cyan-600 focus:border-cyan-500 shadow-sm" 
                          value={cashoutForm.tools}
                          onChange={(e) => setCashoutForm({...cashoutForm, tools: e.target.value})}
                          data-testid="input-cashout-tools"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 mb-6">
                      <div>
                        <Input 
                          type="number"
                          placeholder="Rent" 
                          className="input-styled rounded bg-white dark:bg-gray-800 border-2 border-cyan-300 dark:border-cyan-600 focus:border-cyan-500 shadow-sm" 
                          value={cashoutForm.rent}
                          onChange={(e) => setCashoutForm({...cashoutForm, rent: e.target.value})}
                          data-testid="input-cashout-rent"
                        />
                      </div>
                      <div>
                        <Input 
                          type="number"
                          placeholder="Other Expenses" 
                          className="input-styled rounded bg-white dark:bg-gray-800 border-2 border-cyan-300 dark:border-cyan-600 focus:border-cyan-500 shadow-sm" 
                          value={cashoutForm.others}
                          onChange={(e) => setCashoutForm({...cashoutForm, others: e.target.value})}
                          data-testid="input-cashout-others"
                        />
                      </div>
                      <div className="flex items-end">
                        <Button 
                          className="bg-cyan-400 hover:bg-cyan-500 text-black px-4 py-2 rounded w-20 disabled:opacity-50 disabled:cursor-not-allowed"
                          onClick={handleAddCashoutData}
                          disabled={!isCashoutFormComplete}
                          data-testid="button-add-cashout"
                        >
                          Add
                        </Button>
                      </div>
                    </div>

                    {/* Data Table */}
                    <div className="overflow-x-auto admin-scrollbar">
                      <table className="w-full border-collapse bg-white dark:bg-gray-900 rounded">
                        <thead>
                          <tr className="bg-gray-100 dark:bg-gray-700">
                            <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Month</th>
                            <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Year</th>
                            <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Employees Count</th>
                            <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Total Salary</th>
                            <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Incentives</th>
                            <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Tools Cost</th>
                            <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Rent</th>
                            <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Others Cost</th>
                          </tr>
                        </thead>
                        <tbody>
                          {cashoutData.slice(0, 5).map((row, index) => (
                            <tr key={index} className="border-b border-gray-100 dark:border-gray-800">
                              <td className="py-3 px-4 text-gray-900 dark:text-white">{row.month}</td>
                              <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{row.year}</td>
                              <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{row.employees}</td>
                              <td className="py-3 px-4 text-gray-600 dark:text-gray-400">₹{row.salary.toLocaleString()}</td>
                              <td className="py-3 px-4 text-gray-600 dark:text-gray-400">₹{row.incentive.toLocaleString()}</td>
                              <td className="py-3 px-4 text-gray-600 dark:text-gray-400">₹{row.tools.toLocaleString()}</td>
                              <td className="py-3 px-4 text-gray-600 dark:text-gray-400">₹{row.rent.toLocaleString()}</td>
                              <td className="py-3 px-4 text-gray-600 dark:text-gray-400">₹{row.others.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
            </div>

            {/* Right Side - Key Aspects - Separately Scrollable */}
            <div className="w-80 border-l-2 border-gray-300 dark:border-gray-600 pl-6 overflow-y-auto admin-scrollbar">
              <Card className="bg-gray-100 dark:bg-gray-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold text-gray-700 dark:text-gray-300">Key Aspects</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-0">
                      {/* Growth MoM */}
                      <div className="flex items-center justify-between py-4 border-b border-gray-200 dark:border-gray-700">
                        <div className="text-sm font-bold text-gray-700 dark:text-gray-300">
                          GROWTH<span className="text-xs align-super ml-0.5">MoM</span>
                        </div>
                        <div className="text-2xl font-bold text-gray-900 dark:text-white" data-testid="text-growth-mom">{keyAspectsData.growthMoM}%</div>
                      </div>
                      
                      {/* Growth YoY */}
                      <div className="flex items-center justify-between py-4 border-b border-gray-200 dark:border-gray-700">
                        <div className="text-sm font-bold text-gray-700 dark:text-gray-300">
                          GROWTH<span className="text-xs align-super ml-0.5">YoY</span>
                        </div>
                        <div className="text-2xl font-bold text-gray-900 dark:text-white" data-testid="text-growth-yoy">{keyAspectsData.growthYoY}%</div>
                      </div>
                      
                      {/* Burn Rate */}
                      <div className="flex items-center justify-between py-4 border-b border-gray-200 dark:border-gray-700">
                        <div className="text-sm font-bold text-gray-700 dark:text-gray-300">
                          BURN<span className="text-xs align-super ml-0.5">RATE</span>
                        </div>
                        <div className="text-2xl font-bold text-gray-900 dark:text-white" data-testid="text-burn-rate">{keyAspectsData.burnRate}%</div>
                      </div>
                      
                      {/* Churn Rate */}
                      <div className="flex items-center justify-between py-4 border-b border-gray-200 dark:border-gray-700">
                        <div className="text-sm font-bold text-gray-700 dark:text-gray-300">
                          CHURN<span className="text-xs align-super ml-0.5">RATE</span>
                        </div>
                        <div className="text-2xl font-bold text-gray-900 dark:text-white" data-testid="text-churn-rate">{keyAspectsData.churnRate}%</div>
                      </div>
                      
                      {/* Attrition */}
                      <div className="flex items-center justify-between py-4 border-b border-gray-200 dark:border-gray-700">
                        <div className="text-sm font-bold text-gray-700 dark:text-gray-300">ATTRITION</div>
                        <div className="text-2xl font-bold text-gray-900 dark:text-white" data-testid="text-attrition">{keyAspectsData.attrition}%</div>
                      </div>
                      
                      {/* Net Profit */}
                      <div className="flex items-center justify-between py-4 border-b border-gray-200 dark:border-gray-700">
                        <div className="text-sm font-bold text-gray-700 dark:text-gray-300">NET PROFIT</div>
                        <div className="text-xl font-bold text-gray-900 dark:text-white" data-testid="text-net-profit">{keyAspectsData.netProfit.toLocaleString()}</div>
                      </div>
                      
                      {/* Revenue */}
                      <div className="flex items-center justify-between py-4 border-b border-gray-200 dark:border-gray-700">
                        <div className="text-sm font-bold text-gray-700 dark:text-gray-300">
                          REVENUE<span className="text-xs align-super ml-0.5">PER EMPLOYEE</span>
                        </div>
                        <div className="text-xl font-bold text-gray-900 dark:text-white" data-testid="text-revenue-per-employee">{keyAspectsData.revenuePerEmployee.toLocaleString()}</div>
                      </div>
                      
                      {/* Client Acquisition Cost */}
                      <div className="flex items-center justify-between py-4">
                        <div className="text-sm font-bold text-gray-700 dark:text-gray-300">
                          CLIENT<span className="text-xs align-super ml-0.5">ACQUISITION COST</span>
                        </div>
                        <div className="text-xl font-bold text-gray-900 dark:text-white" data-testid="text-client-acquisition-cost">{keyAspectsData.clientAcquisitionCost.toLocaleString()}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
          </div>
        );
      default:
        return renderTeamSection();
    }
  };

  return (
    <div className="flex flex-col bg-gray-50 dark:bg-gray-900 min-h-screen">
      <AdminTopHeader 
        companyName="Scaling Theory" 
        onHelpClick={() => setIsChatOpen(true)}
      />
      <div className="flex flex-1">
        <AdminSidebar activeTab={sidebarTab} onTabChange={setSidebarTab} />
        <div className="flex-1 ml-16 flex flex-col overflow-hidden" style={{height: 'calc(100vh - 4rem)'}}>
          {renderSidebarContent()}
        </div>
        {sidebarTab === 'dashboard' && <TeamMembersSidebar />}
      </div>

      {/* Recruiter Details Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle className="sr-only">Recruiter Details</DialogTitle>
          </DialogHeader>
          {selectedMember && (
            <div className="p-6 space-y-4">
              {/* Header with name and ID */}
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    R. {selectedMember.name}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    {selectedMember.role}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    ID: {selectedMember.id}
                  </p>
                </div>
              </div>

              {/* Details */}
              <div className="space-y-3">
                <div className="flex">
                  <span className="text-gray-700 dark:text-gray-300 font-medium w-20">Email:</span>
                  <span className="text-gray-600 dark:text-gray-400">{selectedMember.email}</span>
                </div>
                
                <div className="flex">
                  <span className="text-gray-700 dark:text-gray-300 font-medium w-20">Mobile:</span>
                  <span className="text-gray-600 dark:text-gray-400">{selectedMember.mobile}</span>
                </div>
                
                <div className="flex">
                  <span className="text-gray-700 dark:text-gray-300 font-medium w-20">Joined:</span>
                  <span className="text-gray-600 dark:text-gray-400">{selectedMember.joined}</span>
                </div>
                
                <div className="flex">
                  <span className="text-gray-700 dark:text-gray-300 font-medium w-20">Closures:</span>
                  <span className="text-green-600 dark:text-green-400 font-medium">{selectedMember.closures}</span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 mt-6">
                <Button
                  onClick={() => handleEmailClick(selectedMember.email)}
                  className="btn-rounded bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 flex-1"
                >
                  <Mail size={16} />
                  Email
                </Button>
                <Button
                  onClick={() => handleCallClick(selectedMember.mobile)}
                  className="btn-rounded bg-green-600 hover:bg-green-700 text-white flex items-center gap-2 flex-1"
                >
                  <Phone size={16} />
                  Call
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Target & Incentives View All Modal */}
      <Dialog open={isTargetModalOpen} onOpenChange={setIsTargetModalOpen}>
        <DialogContent className="max-w-5xl mx-auto max-h-[80vh]" style={{scrollbarWidth: 'none', msOverflowStyle: 'none'}}>
          <DialogHeader>
            <div className="flex items-center justify-between gap-4">
              <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-white">
                All Target & Incentives Data
              </DialogTitle>
              <SearchBar
                value={targetSearch}
                onChange={setTargetSearch}
                placeholder="Search targets..."
                testId="input-search-targets"
              />
            </div>
          </DialogHeader>
          <div className="p-4 overflow-y-auto admin-scrollbar" style={{maxHeight: '60vh'}}>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700">
                <thead>
                  <tr className="bg-gray-200 dark:bg-gray-700">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300 border-b border-gray-300 dark:border-gray-600">Resource</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300 border-b border-gray-300 dark:border-gray-600">Role</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300 border-b border-gray-300 dark:border-gray-600">Quarter</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300 border-b border-gray-300 dark:border-gray-600">Minimum Target</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300 border-b border-gray-300 dark:border-gray-600">Target Achieved</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300 border-b border-gray-300 dark:border-gray-600">Closures</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300 border-b border-gray-300 dark:border-gray-600">Incentives</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoadingTargets ? (
                    <tr>
                      <td colSpan={7} className="py-4 px-4 text-sm text-gray-600 dark:text-gray-400 text-center">
                        Loading...
                      </td>
                    </tr>
                  ) : filteredTargetMappings.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-4 px-4 text-sm text-gray-600 dark:text-gray-400 text-center">
                        {targetSearch ? 'No matching target mappings found' : 'No target mappings found'}
                      </td>
                    </tr>
                  ) : (
                    filteredTargetMappings.map((target, index) => (
                      <tr key={target.id} className={index % 2 === 0 ? "bg-blue-50 dark:bg-blue-900/20" : "bg-white dark:bg-gray-800"}>
                        <td className="py-3 px-4 text-sm text-gray-900 dark:text-white font-medium border-b border-gray-100 dark:border-gray-700">{target.teamMemberName}</td>
                        <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">{target.teamMemberRole}</td>
                        <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">{target.quarter} {target.year}</td>
                        <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">{target.minimumTarget}</td>
                        <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">{target.targetAchieved || "-"}</td>
                        <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">{target.closures || "-"}</td>
                        <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">{target.incentives || "-"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex justify-end">
              <Button 
                onClick={() => setIsTargetModalOpen(false)}
                className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded"
                data-testid="button-close-targets-modal"
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delivered View Modal */}
      <DailyDeliveryModal
        open={isDeliveredModalOpen}
        onOpenChange={setIsDeliveredModalOpen}
        title="Delivered Items"
        rows={deliveredData}
        columns={[
          { key: 'requirement', label: 'Requirement' },
          { key: 'candidate', label: 'Candidate' },
          { key: 'client', label: 'Client' },
          { key: 'deliveredDate', label: 'Delivered Date' },
          { key: 'status', label: 'Status' }
        ]}
        emptyMessage="No delivered items today"
        statusClassName={(status) => "px-2 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"}
        testIdPrefix="delivered"
      />

      {/* Defaulted View Modal */}
      <DailyDeliveryModal
        open={isDefaultedModalOpen}
        onOpenChange={setIsDefaultedModalOpen}
        title="Defaulted Items"
        rows={defaultedData}
        columns={[
          { key: 'requirement', label: 'Requirement' },
          { key: 'candidate', label: 'Candidate' },
          { key: 'client', label: 'Client' },
          { key: 'expectedDate', label: 'Expected Date' },
          { key: 'status', label: 'Status' }
        ]}
        emptyMessage="No defaulted items today"
        statusClassName={(status) => "px-2 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"}
        testIdPrefix="defaulted"
      />

      {/* TL Meetings Modal */}
      <Dialog open={isTlMeetingsModalOpen} onOpenChange={setIsTlMeetingsModalOpen}>
        <DialogContent className="max-w-5xl mx-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-white">
              TL's Pending Meetings
            </DialogTitle>
          </DialogHeader>
          <div className="p-4">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700">
                <thead>
                  <tr className="bg-gray-200 dark:bg-gray-700">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300 border-b border-gray-300 dark:border-gray-600">Meeting Type</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300 border-b border-gray-300 dark:border-gray-600">Date</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300 border-b border-gray-300 dark:border-gray-600">Time</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300 border-b border-gray-300 dark:border-gray-600">Person</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300 border-b border-gray-300 dark:border-gray-600">Agenda</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300 border-b border-gray-300 dark:border-gray-600">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300 border-b border-gray-300 dark:border-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {meetingsLoading ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-gray-500 dark:text-gray-400">Loading meetings...</td>
                    </tr>
                  ) : tlMeetings.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-gray-500 dark:text-gray-400">No pending meetings</td>
                    </tr>
                  ) : (
                    tlMeetings.map((meeting: any, index: number) => (
                      <tr key={meeting.id || index} className={index % 2 === 0 ? "bg-blue-50 dark:bg-blue-900/20" : "bg-white dark:bg-gray-800"}>
                        <td className="py-3 px-4 text-sm text-gray-900 dark:text-white font-medium border-b border-gray-100 dark:border-gray-700">{meeting.meetingType}</td>
                        <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">{format(new Date(meeting.meetingDate), 'dd-MMM-yyyy')}</td>
                        <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">{meeting.meetingTime}</td>
                        <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">{meeting.person}</td>
                        <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">{meeting.agenda}</td>
                        <td className="py-3 px-4 text-sm border-b border-gray-100 dark:border-gray-700">
                          <span className={`px-2 py-1 rounded-full text-sm font-medium ${
                            meeting.status === 'scheduled' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                          }`}>
                            {meeting.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm border-b border-gray-100 dark:border-gray-700">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                data-testid={`button-meeting-actions-${meeting.id}`}
                              >
                                <EditIcon className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                              <DropdownMenuItem
                                onClick={() => handleRescheduleMeeting(meeting)}
                                data-testid={`menuitem-reschedule-${meeting.id}`}
                                className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                              >
                                Reschedule
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDeleteMeeting(meeting.id, meeting.person)}
                                data-testid={`menuitem-delete-${meeting.id}`}
                                className="text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                              >
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex justify-end">
              <Button 
                onClick={() => setIsTlMeetingsModalOpen(false)}
                className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded"
                data-testid="button-close-tl-meetings-modal"
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* All Messages Modal */}
      <Dialog open={isAllMessagesModalOpen} onOpenChange={setIsAllMessagesModalOpen}>
        <DialogContent className="max-w-5xl mx-auto">
          <DialogHeader>
            <div className="flex items-center justify-between gap-4">
              <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-white">
                All Messages (Last 3 Days)
              </DialogTitle>
              <SearchBar
                value={messagesSearch}
                onChange={setMessagesSearch}
                placeholder="Search messages..."
                testId="input-search-messages"
              />
            </div>
          </DialogHeader>
          <div className="p-4">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700">
                <thead>
                  <tr className="bg-gray-200 dark:bg-gray-700">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300 border-b border-gray-300 dark:border-gray-600">Name</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300 border-b border-gray-300 dark:border-gray-600">Message</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300 border-b border-gray-300 dark:border-gray-600">Date</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300 border-b border-gray-300 dark:border-gray-600">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMessages
                    .filter(message => {
                      const threeDaysAgo = new Date();
                      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
                      return message.timestamp >= threeDaysAgo;
                    })
                    .map((message, index) => (
                      <tr key={index} className={index % 2 === 0 ? "bg-blue-50 dark:bg-blue-900/20" : "bg-white dark:bg-gray-800"}>
                        <td className="py-3 px-4 text-sm text-gray-900 dark:text-white font-medium border-b border-gray-100 dark:border-gray-700">{message.name}</td>
                        <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">{message.message}</td>
                        <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">{message.date}</td>
                        <td className="py-3 px-4 text-sm border-b border-gray-100 dark:border-gray-700">
                          <span className={`w-3 h-3 rounded-full inline-block ${
                            message.status === 'active' ? 'bg-green-500' : 'bg-red-500'
                          }`}></span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex justify-end">
              <Button 
                onClick={() => setIsAllMessagesModalOpen(false)}
                className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded"
                data-testid="button-close-all-messages-modal"
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* CEO Meetings Modal */}
      <Dialog open={isCeoMeetingsModalOpen} onOpenChange={setIsCeoMeetingsModalOpen}>
        <DialogContent className="max-w-5xl mx-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-white">
              CEO's Pending Meetings
            </DialogTitle>
          </DialogHeader>
          <div className="p-4">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700">
                <thead>
                  <tr className="bg-gray-200 dark:bg-gray-700">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300 border-b border-gray-300 dark:border-gray-600">Meeting Type</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300 border-b border-gray-300 dark:border-gray-600">Date</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300 border-b border-gray-300 dark:border-gray-600">Time</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300 border-b border-gray-300 dark:border-gray-600">Person</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300 border-b border-gray-300 dark:border-gray-600">Agenda</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300 border-b border-gray-300 dark:border-gray-600">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300 border-b border-gray-300 dark:border-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {meetingsLoading ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-gray-500 dark:text-gray-400">Loading meetings...</td>
                    </tr>
                  ) : ceoMeetings.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-gray-500 dark:text-gray-400">No pending meetings</td>
                    </tr>
                  ) : (
                    ceoMeetings.map((meeting: any, index: number) => (
                      <tr key={meeting.id || index} className={index % 2 === 0 ? "bg-blue-50 dark:bg-blue-900/20" : "bg-white dark:bg-gray-800"}>
                        <td className="py-3 px-4 text-sm text-gray-900 dark:text-white font-medium border-b border-gray-100 dark:border-gray-700">{meeting.meetingType}</td>
                        <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">{format(new Date(meeting.meetingDate), 'dd-MMM-yyyy')}</td>
                        <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">{meeting.meetingTime}</td>
                        <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">{meeting.person}</td>
                        <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">{meeting.agenda}</td>
                        <td className="py-3 px-4 text-sm border-b border-gray-100 dark:border-gray-700">
                          <span className={`px-2 py-1 rounded-full text-sm font-medium ${
                            meeting.status === 'scheduled' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                          }`}>
                            {meeting.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm border-b border-gray-100 dark:border-gray-700">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                data-testid={`button-meeting-actions-${meeting.id}`}
                              >
                                <EditIcon className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                              <DropdownMenuItem
                                onClick={() => handleRescheduleMeeting(meeting)}
                                data-testid={`menuitem-reschedule-${meeting.id}`}
                                className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                              >
                                Reschedule
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDeleteMeeting(meeting.id, meeting.person)}
                                data-testid={`menuitem-delete-${meeting.id}`}
                                className="text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                              >
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex justify-end">
              <Button 
                onClick={() => setIsCeoMeetingsModalOpen(false)}
                className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded"
                data-testid="button-close-ceo-meetings-modal"
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Modal (Message/Meeting) */}
      <Dialog open={isCreateModalOpen} onOpenChange={(open) => { setIsCreateModalOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-md mx-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle className="sr-only">Create</DialogTitle>
          </DialogHeader>
          <div className="p-3 pt-2">
            {/* Toggle Tabs */}
            <div className="flex border-b border-gray-200 dark:border-gray-700 mb-3">
              <button
                onClick={() => setCreateModalSession('message')}
                className={`px-4 py-2 text-sm font-medium border-b-2 ${
                  createModalSession === 'message'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
                data-testid="button-message-tab"
              >
                Message
              </button>
              <button
                onClick={() => setCreateModalSession('meeting')}
                className={`px-4 py-2 text-sm font-medium border-b-2 ${
                  createModalSession === 'meeting'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
                data-testid="button-meeting-tab"
              >
                Meeting
              </button>
            </div>

            {/* Message Form */}
            {createModalSession === 'message' && (
              <div className="space-y-3">
                <Select value={selectedRecipient} onValueChange={setSelectedRecipient} data-testid="select-message-recipient" required>
                  <SelectTrigger className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded">
                    <SelectValue placeholder="Select recipient" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                    {allEmployees.map((employee) => (
                      <SelectItem key={employee.id} value={employee.id} className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700">
                        {employee.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Textarea
                  placeholder="Enter here!"
                  rows={4}
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  className="w-full resize-none bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 rounded"
                  data-testid="textarea-message-content"
                  required
                />
                
                <div className="flex justify-end">
                  <Button 
                    onClick={handleSendMessage}
                    disabled={!selectedRecipient || !messageContent.trim()}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-6 py-2 rounded flex items-center gap-2"
                    data-testid="button-send-message"
                  >
                    Send 
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Meeting Form */}
            {createModalSession === 'meeting' && (
              <div className="space-y-3">
                <Select value={meetingFor} onValueChange={(value) => { setMeetingFor(value); setMeetingWith(''); }} data-testid="select-meeting-for" required>
                  <SelectTrigger className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded">
                    <SelectValue placeholder="Meeting for" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                    <SelectItem value="TL" className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700">TL - Team Leader</SelectItem>
                    <SelectItem value="TA" className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700">TA - Talent Advisor</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={meetingWith} onValueChange={setMeetingWith} data-testid="select-meeting-with" required disabled={!meetingFor}>
                  <SelectTrigger className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white disabled:opacity-50 rounded">
                    <SelectValue placeholder="Meeting with" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                    {getMeetingWithOptions().map((employee) => (
                      <SelectItem key={employee.id} value={employee.id} className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700">
                        {employee.name} {employee.displayRole && employee.displayRole.includes('Team Leader') ? `(${employee.displayRole})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select value={meetingType} onValueChange={setMeetingType} data-testid="select-meeting-type" required>
                  <SelectTrigger className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded">
                    <SelectValue placeholder="Meeting type" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                    <SelectItem value="Performance Review" className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700">Performance Review</SelectItem>
                    <SelectItem value="Team Planning" className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700">Team Planning</SelectItem>
                    <SelectItem value="One-on-One" className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700">One-on-One</SelectItem>
                  </SelectContent>
                </Select>
                
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded"
                      data-testid="button-meeting-date"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {meetingDate ? format(meetingDate, "PPP") : <span className="text-gray-500 dark:text-gray-400">Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700" align="start">
                    <Calendar
                      mode="single"
                      selected={meetingDate}
                      onSelect={setMeetingDate}
                      initialFocus
                      className="dark:text-white"
                    />
                  </PopoverContent>
                </Popover>
                
                <div className="relative">
                  <Input
                    type="time"
                    value={meetingTime}
                    onChange={(e) => setMeetingTime(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded pl-10"
                    data-testid="input-meeting-time"
                    required
                  />
                  <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-gray-400" />
                </div>
                
                <div className="flex justify-end">
                  <Button 
                    onClick={handleSetMeeting}
                    disabled={!meetingFor || !meetingWith || !meetingType || !meetingDate || !meetingTime}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-6 py-2 rounded flex items-center gap-2"
                    data-testid="button-set-meeting"
                  >
                    Set
                    <CalendarCheck className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Closure Reports Modal */}
      <Dialog open={isClosureReportsModalOpen} onOpenChange={setIsClosureReportsModalOpen}>
        <DialogContent className="max-w-5xl mx-auto max-h-[80vh]">
          <DialogHeader>
            <div className="flex items-center justify-between gap-4">
              <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-white">
                All Closure Reports
              </DialogTitle>
              <SearchBar
                value={closureReportsSearch}
                onChange={setClosureReportsSearch}
                placeholder="Search closures..."
                testId="input-search-closure-reports"
              />
            </div>
          </DialogHeader>
          <div className="p-4 overflow-y-auto admin-scrollbar" style={{maxHeight: '60vh'}}>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                    <th className="text-left p-2 font-medium text-gray-700 dark:text-gray-300 text-sm">Candidate</th>
                    <th className="text-left p-2 font-medium text-gray-700 dark:text-gray-300 text-sm">Position</th>
                    <th className="text-left p-2 font-medium text-gray-700 dark:text-gray-300 text-sm">Client</th>
                    <th className="text-left p-2 font-medium text-gray-700 dark:text-gray-300 text-sm">Talent Advisor</th>
                    <th className="text-left p-2 font-medium text-gray-700 dark:text-gray-300 text-sm">Fixed CTC</th>
                    <th className="text-left p-2 font-medium text-gray-700 dark:text-gray-300 text-sm">Offered Date</th>
                    <th className="text-left p-2 font-medium text-gray-700 dark:text-gray-300 text-sm">Joined Date</th>
                    <th className="text-left p-2 font-medium text-gray-700 dark:text-gray-300 text-sm">Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="p-3 text-gray-900 dark:text-white">David Johnson</td>
                    <td className="p-3 text-gray-600 dark:text-gray-400">Frontend Developer</td>
                    <td className="p-3 text-gray-600 dark:text-gray-400">TechCorp</td>
                    <td className="p-3 text-gray-600 dark:text-gray-400">Kavitha</td>
                    <td className="p-3 text-gray-600 dark:text-gray-400">₹12,00,000</td>
                    <td className="p-3 text-gray-600 dark:text-gray-400">12-06-2025</td>
                    <td className="p-3 text-gray-600 dark:text-gray-400">12-04-2025</td>
                    <td className="p-3"><span className="bg-green-100 text-green-800 text-sm px-2 py-1 rounded">Joined</span></td>
                  </tr>
                  <tr className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="p-3 text-gray-900 dark:text-white">Tom Anderson</td>
                    <td className="p-3 text-gray-600 dark:text-gray-400">UI/UX Designer</td>
                    <td className="p-3 text-gray-600 dark:text-gray-400">Designify</td>
                    <td className="p-3 text-gray-600 dark:text-gray-400">Rajesh</td>
                    <td className="p-3 text-gray-600 dark:text-gray-400">₹15,00,000</td>
                    <td className="p-3 text-gray-600 dark:text-gray-400">18-06-2025</td>
                    <td className="p-3 text-gray-600 dark:text-gray-400">05-05-2025</td>
                    <td className="p-3"><span className="bg-green-100 text-green-800 text-sm px-2 py-1 rounded">Joined</span></td>
                  </tr>
                  <tr className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="p-3 text-gray-900 dark:text-white">Robert Kim</td>
                    <td className="p-3 text-gray-600 dark:text-gray-400">Backend Developer</td>
                    <td className="p-3 text-gray-600 dark:text-gray-400">CodeLabs</td>
                    <td className="p-3 text-gray-600 dark:text-gray-400">Sowmiya</td>
                    <td className="p-3 text-gray-600 dark:text-gray-400">₹18,00,000</td>
                    <td className="p-3 text-gray-600 dark:text-gray-400">28-06-2025</td>
                    <td className="p-3 text-gray-600 dark:text-gray-400">19-08-2025</td>
                    <td className="p-3"><span className="bg-green-100 text-green-800 text-sm px-2 py-1 rounded">Joined</span></td>
                  </tr>
                  <tr className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="p-3 text-gray-900 dark:text-white">Kevin Brown</td>
                    <td className="p-3 text-gray-600 dark:text-gray-400">QA Tester</td>
                    <td className="p-3 text-gray-600 dark:text-gray-400">AppLogic</td>
                    <td className="p-3 text-gray-600 dark:text-gray-400">Kalaiselvi</td>
                    <td className="p-3 text-gray-600 dark:text-gray-400">₹10,00,000</td>
                    <td className="p-3 text-gray-600 dark:text-gray-400">03-07-2025</td>
                    <td className="p-3 text-gray-600 dark:text-gray-400">03-09-2025</td>
                    <td className="p-3"><span className="bg-green-100 text-green-800 text-sm px-2 py-1 rounded">Joined</span></td>
                  </tr>
                  <tr className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="p-3 text-gray-900 dark:text-white">Mel Gibson</td>
                    <td className="p-3 text-gray-600 dark:text-gray-400">Mobile App Developer</td>
                    <td className="p-3 text-gray-600 dark:text-gray-400">Tesco</td>
                    <td className="p-3 text-gray-600 dark:text-gray-400">Malathi</td>
                    <td className="p-3 text-gray-600 dark:text-gray-400">₹16,00,000</td>
                    <td className="p-3 text-gray-600 dark:text-gray-400">18-07-2025</td>
                    <td className="p-3 text-gray-600 dark:text-gray-400">10-10-2025</td>
                    <td className="p-3"><span className="bg-green-100 text-green-800 text-sm px-2 py-1 rounded">Joined</span></td>
                  </tr>
                  <tr className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="p-3 text-gray-900 dark:text-white">Sarah Williams</td>
                    <td className="p-3 text-gray-600 dark:text-gray-400">Product Manager</td>
                    <td className="p-3 text-gray-600 dark:text-gray-400">InnovateTech</td>
                    <td className="p-3 text-gray-600 dark:text-gray-400">Priya</td>
                    <td className="p-3 text-gray-600 dark:text-gray-400">₹25,00,000</td>
                    <td className="p-3 text-gray-600 dark:text-gray-400">15-08-2025</td>
                    <td className="p-3 text-gray-600 dark:text-gray-400">01-11-2025</td>
                    <td className="p-3"><span className="bg-yellow-100 text-yellow-800 text-sm px-2 py-1 rounded">Pending</span></td>
                  </tr>
                  <tr className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="p-3 text-gray-900 dark:text-white">Michael Chen</td>
                    <td className="p-3 text-gray-600 dark:text-gray-400">Data Scientist</td>
                    <td className="p-3 text-gray-600 dark:text-gray-400">DataFlow</td>
                    <td className="p-3 text-gray-600 dark:text-gray-400">Arun</td>
                    <td className="p-3 text-gray-600 dark:text-gray-400">₹22,00,000</td>
                    <td className="p-3 text-gray-600 dark:text-gray-400">25-08-2025</td>
                    <td className="p-3 text-gray-600 dark:text-gray-400">15-11-2025</td>
                    <td className="p-3"><span className="bg-green-100 text-green-800 text-sm px-2 py-1 rounded">Joined</span></td>
                  </tr>
                  <tr className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="p-3 text-gray-900 dark:text-white">Lisa Rodriguez</td>
                    <td className="p-3 text-gray-600 dark:text-gray-400">DevOps Engineer</td>
                    <td className="p-3 text-gray-600 dark:text-gray-400">CloudTech</td>
                    <td className="p-3 text-gray-600 dark:text-gray-400">Anusha</td>
                    <td className="p-3 text-gray-600 dark:text-gray-400">₹20,00,000</td>
                    <td className="p-3 text-gray-600 dark:text-gray-400">10-09-2025</td>
                    <td className="p-3 text-gray-600 dark:text-gray-400">25-11-2025</td>
                    <td className="p-3"><span className="bg-green-100 text-green-800 text-sm px-2 py-1 rounded">Joined</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Requirement Modal */}
      <AddRequirementModal
        isOpen={isAddRequirementModalOpen}
        onClose={() => setIsAddRequirementModalOpen(false)}
      />

      {/* Target Mapping Modal */}
      <TargetMappingModal
        isOpen={isTargetMappingModalOpen}
        onClose={() => setIsTargetMappingModalOpen(false)}
      />

      {/* Revenue Mapping Modal */}
      <RevenueMappingModal
        isOpen={isRevenueMappingModalOpen}
        onClose={() => {
          setIsRevenueMappingModalOpen(false);
          setEditingRevenueMapping(null);
        }}
        editingRevenueMapping={editingRevenueMapping}
      />

      {/* Performance Chart Modal */}
      <PerformanceChartModal
        isOpen={isPerformanceChartModalOpen}
        onClose={() => setIsPerformanceChartModalOpen(false)}
      />

      {/* Team Performance Table Modal */}
      <TeamPerformanceTableModal
        isOpen={isTeamPerformanceTableModalOpen}
        onClose={() => setIsTeamPerformanceTableModalOpen(false)}
      />

      {/* Closure Modal */}
      <ClosureModal
        isOpen={isClosureModalOpen}
        onClose={() => setIsClosureModalOpen(false)}
      />

      {/* Add Team Leader Modal */}
      <AddTeamLeaderModal
        isOpen={isAddTeamLeaderModalOpen}
        onClose={() => setIsAddTeamLeaderModalOpen(false)}
        onSubmit={handleAddUser}
      />

      {/* Add Talent Advisor Modal */}
      <AddTalentAdvisorModal
        isOpen={isAddTalentAdvisorModalOpen}
        onClose={() => setIsAddTalentAdvisorModalOpen(false)}
        onSubmit={handleAddUser}
      />

      {/* Add Recruiter Modal */}
      <AddRecruiterModal
        isOpen={isAddRecruiterModalOpen}
        onClose={() => { setIsAddRecruiterModalOpen(false); setEditingUser(null); }}
        editData={editingUser && editingUser.role === 'Recruiter' ? editingUser : null}
        onSubmit={editingUser ? handleUpdateUser : handleAddUser}
      />

      {/* Add Team Leader Modal New */}
      <AddTeamLeaderModalNew
        isOpen={isAddTeamLeaderModalNewOpen}
        onClose={() => { setIsAddTeamLeaderModalNewOpen(false); setEditingUser(null); }}
        editData={editingUser && editingUser.role === 'Team Leader' ? editingUser : null}
        onSubmit={editingUser ? handleUpdateUser : handleAddUser}
      />

      {/* Add Client Credentials Modal */}
      <AddClientCredentialsModal
        isOpen={isAddClientCredentialsModalOpen}
        onClose={() => setIsAddClientCredentialsModalOpen(false)}
        onSubmit={handleAddClientCredentials}
      />

      {/* Reassign Requirement Modal */}
      <Dialog open={isReassignModalOpen} onOpenChange={setIsReassignModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reassign Requirement</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Position: {selectedRequirement?.position}
              </label>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Company: {selectedRequirement?.company}
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Reassign to Team Lead
              </label>
              <Select>
                <SelectTrigger className="input-styled">
                  <SelectValue placeholder="Select Team Lead" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="arun">Arun KS</SelectItem>
                  <SelectItem value="anusha">Anusha</SelectItem>
                  <SelectItem value="umar">Umar</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsReassignModalOpen(false)}
                className="btn-rounded"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  // Update the requirement with new assignments
                  if (selectedRequirement) {
                    updateRequirementMutation.mutate({
                      id: selectedRequirement.id,
                      updates: {
                        talentAdvisor: "Updated TA", // This would be from form state
                        teamLead: "Updated TL"       // This would be from form state  
                      }
                    });
                  }
                }}
                className="bg-cyan-400 hover:bg-cyan-500 text-black btn-rounded"
                disabled={updateRequirementMutation.isPending}
              >
                {updateRequirementMutation.isPending ? 'Updating...' : 'Update Details'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* All Requirements Modal */}
      <Dialog open={isAllRequirementsModalOpen} onOpenChange={setIsAllRequirementsModalOpen}>
        <DialogContent className="max-w-6xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>All Requirements ({requirements.length})</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[60vh]">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800">
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left p-2 font-medium text-gray-700 dark:text-gray-300 text-sm">Positions</th>
                    <th className="text-left p-2 font-medium text-gray-700 dark:text-gray-300 text-sm">Criticality</th>
                    <th className="text-left p-2 font-medium text-gray-700 dark:text-gray-300 text-sm">Company</th>
                    <th className="text-left p-2 font-medium text-gray-700 dark:text-gray-300 text-sm">SPOC</th>
                    <th className="text-left p-2 font-medium text-gray-700 dark:text-gray-300 text-sm">Talent Advisor</th>
                    <th className="text-left p-2 font-medium text-gray-700 dark:text-gray-300 text-sm">Team Lead</th>
                    <th className="text-left p-2 font-medium text-gray-700 dark:text-gray-300 text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {requirements.map((requirement: Requirement) => (
                    <tr key={requirement.id} className="border-b border-gray-100 dark:border-gray-800">
                      <td className="py-3 px-3 text-gray-900 dark:text-white font-medium">{requirement.position}</td>
                      <td className="py-3 px-3">
                        <span className={`text-sm font-semibold px-3 py-1 rounded ${getCriticalityColor(requirement.criticality)}`}>
                          {requirement.criticality}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-gray-600 dark:text-gray-400">{requirement.company}</td>
                      <td className="py-3 px-3 text-gray-600 dark:text-gray-400">{requirement.spoc}</td>
                      <td className="py-3 px-3 text-gray-600 dark:text-gray-400">
                        {requirement.talentAdvisor === "Unassigned" ? (
                          <span className="text-cyan-500 dark:text-cyan-400">{requirement.talentAdvisor}</span>
                        ) : (
                          requirement.talentAdvisor
                        )}
                      </td>
                      <td className="py-3 px-3 text-gray-600 dark:text-gray-400">
                        {requirement.teamLead === "Unassigned" ? (
                          <span className="text-cyan-500 dark:text-cyan-400">{requirement.teamLead}</span>
                        ) : (
                          requirement.teamLead
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                              </svg>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-32">
                            <DropdownMenuItem onClick={() => handleReassign(requirement)}>
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleArchive(requirement)}>
                              Archive
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Metrics Modal */}
      <Dialog open={isMetricsModalOpen} onOpenChange={setIsMetricsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Metrics Data</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse bg-white dark:bg-gray-900">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left p-2 font-medium text-gray-700 dark:text-gray-300 text-sm">Month</th>
                    <th className="text-left p-2 font-medium text-gray-700 dark:text-gray-300 text-sm">Revenue</th>
                    <th className="text-left p-2 font-medium text-gray-700 dark:text-gray-300 text-sm">Growth</th>
                    <th className="text-left p-2 font-medium text-gray-700 dark:text-gray-300 text-sm">Profit</th>
                    <th className="text-left p-2 font-medium text-gray-700 dark:text-gray-300 text-sm">Clients</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan={5} className="py-8 px-3 text-center text-gray-500 dark:text-gray-400">
                      No data available
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Pipeline Modal */}
      <Dialog open={isPipelineModalOpen} onOpenChange={setIsPipelineModalOpen}>
        <DialogContent className="max-w-4xl w-[90vw] max-h-[85vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Pipeline Details</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto pr-2">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left p-2 font-medium text-gray-700 dark:text-gray-300 text-sm">Stage</th>
                    <th className="text-left p-2 font-medium text-gray-700 dark:text-gray-300 text-sm">Count</th>
                    <th className="text-left p-2 font-medium text-gray-700 dark:text-gray-300 text-sm">Candidates</th>
                    <th className="text-left p-2 font-medium text-gray-700 dark:text-gray-300 text-sm">Progress</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { stage: 'SOURCED', count: 15, candidates: 'John Smith, Alice Johnson, Bob Wilson', progress: '100%' },
                    { stage: 'SHORTLISTED', count: 9, candidates: 'John Smith, Alice Johnson, Bob Wilson', progress: '60%' },
                    { stage: 'INTRO CALL', count: 7, candidates: 'John Smith, Alice Johnson', progress: '47%' },
                    { stage: 'ASSIGNMENT', count: 9, candidates: 'John Smith, Alice Johnson, Carol Brown', progress: '60%' },
                    { stage: 'L1', count: 15, candidates: 'John Smith, Alice Johnson, Carol Brown', progress: '100%' },
                    { stage: 'L2', count: 9, candidates: 'John Smith, Alice Johnson', progress: '60%' },
                    { stage: 'L3', count: 3, candidates: 'John Smith', progress: '20%' },
                    { stage: 'FINAL ROUND', count: 9, candidates: 'John Smith, Alice Johnson, Carol Brown', progress: '60%' },
                    { stage: 'HR ROUND', count: 9, candidates: 'John Smith, Alice Johnson', progress: '60%' },
                    { stage: 'OFFER STAGE', count: 9, candidates: 'John Smith, Alice Johnson', progress: '60%' },
                    { stage: 'CLOSURE', count: 3, candidates: 'John Smith', progress: '20%' },
                    { stage: 'OFFER DROP', count: 3, candidates: 'Alice Johnson', progress: '20%' },
                  ].map((row, index) => (
                    <tr key={index} className="border-b border-gray-100 dark:border-gray-800">
                      <td className="py-3 px-3 text-gray-900 dark:text-white font-medium">{row.stage}</td>
                      <td className="py-3 px-3 text-gray-600 dark:text-gray-400">{row.count}</td>
                      <td className="py-3 px-3 text-gray-600 dark:text-gray-400">{row.candidates}</td>
                      <td className="py-3 px-3 text-gray-600 dark:text-gray-400">{row.progress}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cashout Modal */}
      <Dialog open={isCashoutModalOpen} onOpenChange={setIsCashoutModalOpen}>
        <DialogContent className="max-w-6xl max-h-[80vh]">
          <DialogHeader>
            <div className="flex items-center justify-between gap-4">
              <DialogTitle>All Cash Outflow Data</DialogTitle>
              <SearchBar
                value={cashoutSearch}
                onChange={setCashoutSearch}
                placeholder="Search cash outflow..."
                testId="input-search-cash-outflow"
              />
            </div>
          </DialogHeader>
          <div className="overflow-y-auto">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse bg-white dark:bg-gray-900">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left p-2 font-medium text-gray-700 dark:text-gray-300 text-sm">Month</th>
                    <th className="text-left p-2 font-medium text-gray-700 dark:text-gray-300 text-sm">Year</th>
                    <th className="text-left p-2 font-medium text-gray-700 dark:text-gray-300 text-sm">Employees Count</th>
                    <th className="text-left p-2 font-medium text-gray-700 dark:text-gray-300 text-sm">Total Salary</th>
                    <th className="text-left p-2 font-medium text-gray-700 dark:text-gray-300 text-sm">Incentives</th>
                    <th className="text-left p-2 font-medium text-gray-700 dark:text-gray-300 text-sm">Tools Cost</th>
                    <th className="text-left p-2 font-medium text-gray-700 dark:text-gray-300 text-sm">Rent</th>
                    <th className="text-left p-2 font-medium text-gray-700 dark:text-gray-300 text-sm">Others Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCashoutData.map((row, index) => (
                    <tr key={index} className="border-b border-gray-100 dark:border-gray-800">
                      <td className="py-3 px-3 text-gray-900 dark:text-white font-medium">{row.month}</td>
                      <td className="py-3 px-3 text-gray-600 dark:text-gray-400">{row.year}</td>
                      <td className="py-3 px-3 text-gray-600 dark:text-gray-400">{row.employees}</td>
                      <td className="py-3 px-3 text-gray-600 dark:text-gray-400">₹{row.salary.toLocaleString()}</td>
                      <td className="py-3 px-3 text-gray-600 dark:text-gray-400">₹{row.incentive.toLocaleString()}</td>
                      <td className="py-3 px-3 text-gray-600 dark:text-gray-400">₹{row.tools.toLocaleString()}</td>
                      <td className="py-3 px-3 text-gray-600 dark:text-gray-400">₹{row.rent.toLocaleString()}</td>
                      <td className="py-3 px-3 text-gray-600 dark:text-gray-400">₹{row.others.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Database View Modal */}
      <Dialog open={isDatabaseModalOpen} onOpenChange={setIsDatabaseModalOpen}>
        <DialogContent className="max-w-5xl w-[95vw] max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Full Database View</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto pr-2">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left p-2 font-medium text-gray-700 dark:text-gray-300 text-sm">Employee ID</th>
                    <th className="text-left p-2 font-medium text-gray-700 dark:text-gray-300 text-sm">Name</th>
                    <th className="text-left p-2 font-medium text-gray-700 dark:text-gray-300 text-sm">Team</th>
                    <th className="text-left p-2 font-medium text-gray-700 dark:text-gray-300 text-sm">Total Applicants</th>
                    <th className="text-left p-2 font-medium text-gray-700 dark:text-gray-300 text-sm">Uploads</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan={5} className="py-8 px-3 text-center text-gray-500 dark:text-gray-400">
                      No database records available
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add New Client Modal - Comprehensive Form */}
      <Dialog open={isClientModalOpen} onOpenChange={setIsClientModalOpen}>
        <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Client Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Row 1 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Input 
                  placeholder="Brand Name *" 
                  className="input-styled rounded" 
                  value={clientForm.brandName}
                  onChange={(e) => setClientForm({...clientForm, brandName: e.target.value})}
                  data-testid="input-brand-name"
                />
              </div>
              <div>
                <Input 
                  placeholder="Incorporated Name" 
                  className="input-styled rounded" 
                  value={clientForm.incorporatedName}
                  onChange={(e) => setClientForm({...clientForm, incorporatedName: e.target.value})}
                  data-testid="input-incorporated-name"
                />
              </div>
            </div>

            {/* Row 2 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Input 
                  placeholder="GSTIN" 
                  className="input-styled rounded" 
                  value={clientForm.gstin}
                  onChange={(e) => setClientForm({...clientForm, gstin: e.target.value})}
                  data-testid="input-gstin"
                />
              </div>
              <div>
                <Input 
                  placeholder="Address" 
                  className="input-styled rounded" 
                  value={clientForm.address}
                  onChange={(e) => setClientForm({...clientForm, address: e.target.value})}
                  data-testid="input-address"
                />
              </div>
            </div>

            {/* Row 3 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Input 
                  placeholder="Location" 
                  className="input-styled rounded" 
                  value={clientForm.location}
                  onChange={(e) => setClientForm({...clientForm, location: e.target.value})}
                  data-testid="input-location"
                />
              </div>
              <div>
                <Input 
                  placeholder="SPOC" 
                  className="input-styled rounded" 
                  value={clientForm.spoc}
                  onChange={(e) => setClientForm({...clientForm, spoc: e.target.value})}
                  data-testid="input-spoc"
                />
              </div>
            </div>

            {/* Row 4 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Input 
                  placeholder="Email *" 
                  type="email" 
                  className="input-styled rounded" 
                  value={clientForm.email}
                  onChange={(e) => setClientForm({...clientForm, email: e.target.value})}
                  data-testid="input-email"
                />
              </div>
              <div>
                <Input 
                  placeholder="Website" 
                  className="input-styled rounded" 
                  value={clientForm.website}
                  onChange={(e) => setClientForm({...clientForm, website: e.target.value})}
                  data-testid="input-website"
                />
              </div>
            </div>

            {/* Row 5 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Input 
                  placeholder="LinkedIn" 
                  className="input-styled rounded" 
                  value={clientForm.linkedin}
                  onChange={(e) => setClientForm({...clientForm, linkedin: e.target.value})}
                  data-testid="input-linkedin"
                />
              </div>
              <div>
                <Select 
                  value={clientForm.agreement}
                  onValueChange={(value) => setClientForm({...clientForm, agreement: value})}
                >
                  <SelectTrigger className="input-styled rounded" data-testid="select-agreement">
                    <SelectValue placeholder="Agreement" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Signup Pending">Signup Pending</SelectItem>
                    <SelectItem value="Signup Completed">Signup Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 6 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="relative">
                <Input 
                  placeholder="Percentage" 
                  type="number"
                  min="0"
                  max="100"
                  className="input-styled rounded pr-8" 
                  value={clientForm.percentage}
                  onChange={(e) => setClientForm({...clientForm, percentage: e.target.value})}
                  data-testid="input-percentage"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">%</span>
              </div>
            </div>

            {/* Row 7 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Select 
                  value={clientForm.category}
                  onValueChange={(value) => setClientForm({...clientForm, category: value})}
                >
                  <SelectTrigger className="input-styled rounded" data-testid="select-category">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Product">Product</SelectItem>
                    <SelectItem value="Services">Services</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Input 
                  placeholder="Payment terms" 
                  className="input-styled rounded" 
                  value={clientForm.paymentTerms}
                  onChange={(e) => setClientForm({...clientForm, paymentTerms: e.target.value})}
                  data-testid="input-payment-terms"
                />
              </div>
            </div>

            {/* Row 8 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Select 
                  value={clientForm.source}
                  onValueChange={(value) => setClientForm({...clientForm, source: value})}
                >
                  <SelectTrigger className="input-styled rounded" data-testid="select-source">
                    <SelectValue placeholder="Source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Outbound Lead (Sales)">Outbound Lead (Sales)</SelectItem>
                    <SelectItem value="Client Referral">Client Referral</SelectItem>
                    <SelectItem value="VC Referral">VC Referral</SelectItem>
                    <SelectItem value="Inbound Lead">Inbound Lead</SelectItem>
                    <SelectItem value="Other Referral">Other Referral</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal input-styled rounded"
                      data-testid="button-start-date"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {clientStartDate ? format(clientStartDate, "PPP") : <span className="text-gray-500">Start Date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={clientStartDate}
                      onSelect={(date) => {
                        setClientStartDate(date);
                        setClientForm({...clientForm, startDate: date ? format(date, "yyyy-MM-dd") : ''});
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Row 9 */}
            <div>
              <Select 
                value={clientForm.currentStatus}
                onValueChange={(value) => setClientForm({...clientForm, currentStatus: value})}
              >
                <SelectTrigger className="input-styled rounded" data-testid="select-current-status">
                  <SelectValue placeholder="Active" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="frozen">Frozen</SelectItem>
                  <SelectItem value="churned">Churned</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-center pt-6">
              <Button 
                className="bg-cyan-400 hover:bg-cyan-500 text-white px-8 py-2 rounded"
                onClick={() => {
                  if (!clientForm.brandName || !clientForm.email) {
                    toast({
                      title: "Validation Error",
                      description: "Please fill in Brand Name and Email (required fields)",
                      variant: "destructive",
                    });
                    return;
                  }
                  createClientMutation.mutate(clientForm);
                }}
                disabled={createClientMutation.isPending}
                data-testid="button-submit-client"
              >
                {createClientMutation.isPending ? 'Submitting...' : 'Submit'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Employee Modal */}
      <Dialog open={isEmployeeModalOpen} onOpenChange={setIsEmployeeModalOpen}>
        <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Employee Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Row 1 - Employee ID (read-only/auto-generated) and Employee Name */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Input 
                  placeholder="Employee ID" 
                  className="input-styled rounded bg-gray-50 dark:bg-gray-800" 
                  value={employeeForm.employeeId || 'Auto-generated'}
                  readOnly
                  data-testid="input-employee-id"
                />
              </div>
              <div>
                <Input 
                  placeholder="Employee Name *" 
                  className="input-styled rounded" 
                  value={employeeForm.name}
                  onChange={(e) => setEmployeeForm({...employeeForm, name: e.target.value})}
                  data-testid="input-employee-name"
                />
              </div>
            </div>

            {/* Row 2 - Address and Designation */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Input 
                  placeholder="Address" 
                  className="input-styled rounded" 
                  value={employeeForm.address}
                  onChange={(e) => setEmployeeForm({...employeeForm, address: e.target.value})}
                  data-testid="input-address"
                />
              </div>
              <div>
                <Input 
                  placeholder="Designation" 
                  className="input-styled rounded" 
                  value={employeeForm.designation}
                  onChange={(e) => setEmployeeForm({...employeeForm, designation: e.target.value})}
                  data-testid="input-designation"
                />
              </div>
            </div>

            {/* Row 3 - Email and Mobile Number */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Input 
                  placeholder="Email *" 
                  type="email" 
                  className="input-styled rounded" 
                  value={employeeForm.email}
                  onChange={(e) => setEmployeeForm({...employeeForm, email: e.target.value})}
                  data-testid="input-employee-email"
                />
              </div>
              <div>
                <Input 
                  placeholder="Mobile Number" 
                  className="input-styled rounded" 
                  value={employeeForm.phone}
                  onChange={(e) => setEmployeeForm({...employeeForm, phone: e.target.value})}
                  data-testid="input-phone"
                />
              </div>
            </div>

            {/* Row 4 - Date of Joining and Employment Status */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Input 
                  placeholder="Date of Joining" 
                  type="date"
                  className="input-styled rounded" 
                  value={employeeForm.joiningDate}
                  onChange={(e) => setEmployeeForm({...employeeForm, joiningDate: e.target.value})}
                  data-testid="input-joining-date"
                />
              </div>
              <div>
                <Select 
                  value={employeeForm.employmentStatus}
                  onValueChange={(value) => setEmployeeForm({...employeeForm, employmentStatus: value})}
                >
                  <SelectTrigger className="input-styled rounded" data-testid="select-employment-status">
                    <SelectValue placeholder="Employment Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                    <SelectItem value="On Leave">On Leave</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 5 - ESIC and EPFO */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Select 
                  value={employeeForm.esic}
                  onValueChange={(value) => setEmployeeForm({...employeeForm, esic: value})}
                >
                  <SelectTrigger className="input-styled rounded" data-testid="select-esic">
                    <SelectValue placeholder="ESIC" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Yes">Yes</SelectItem>
                    <SelectItem value="No">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Select 
                  value={employeeForm.epfo}
                  onValueChange={(value) => setEmployeeForm({...employeeForm, epfo: value})}
                >
                  <SelectTrigger className="input-styled rounded" data-testid="select-epfo">
                    <SelectValue placeholder="EPFO" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Yes">Yes</SelectItem>
                    <SelectItem value="No">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 6 - ESIC.No and EPFO.No */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Input 
                  placeholder="ESIC.No" 
                  className="input-styled rounded" 
                  value={employeeForm.esicNo}
                  onChange={(e) => setEmployeeForm({...employeeForm, esicNo: e.target.value})}
                  data-testid="input-esic-no"
                />
              </div>
              <div>
                <Input 
                  placeholder="EPFO.No" 
                  className="input-styled rounded" 
                  value={employeeForm.epfoNo}
                  onChange={(e) => setEmployeeForm({...employeeForm, epfoNo: e.target.value})}
                  data-testid="input-epfo-no"
                />
              </div>
            </div>

            {/* Row 7 - Father Name and Mother Name */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Input 
                  placeholder="Father Name" 
                  className="input-styled rounded" 
                  value={employeeForm.fatherName}
                  onChange={(e) => setEmployeeForm({...employeeForm, fatherName: e.target.value})}
                  data-testid="input-father-name"
                />
              </div>
              <div>
                <Input 
                  placeholder="Mother Name" 
                  className="input-styled rounded" 
                  value={employeeForm.motherName}
                  onChange={(e) => setEmployeeForm({...employeeForm, motherName: e.target.value})}
                  data-testid="input-mother-name"
                />
              </div>
            </div>

            {/* Row 8 - Father's Number and Mother's Number */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Input 
                  placeholder="Father's Number" 
                  className="input-styled rounded" 
                  value={employeeForm.fatherNumber}
                  onChange={(e) => setEmployeeForm({...employeeForm, fatherNumber: e.target.value})}
                  data-testid="input-father-number"
                />
              </div>
              <div>
                <Input 
                  placeholder="Mother's Number" 
                  className="input-styled rounded" 
                  value={employeeForm.motherNumber}
                  onChange={(e) => setEmployeeForm({...employeeForm, motherNumber: e.target.value})}
                  data-testid="input-mother-number"
                />
              </div>
            </div>

            {/* Row 9 - Offered CTC and Current Status */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Input 
                  placeholder="Offered CTC" 
                  className="input-styled rounded" 
                  value={employeeForm.offeredCtc}
                  onChange={(e) => setEmployeeForm({...employeeForm, offeredCtc: e.target.value})}
                  data-testid="input-offered-ctc"
                />
              </div>
              <div>
                <Select 
                  value={employeeForm.currentStatus}
                  onValueChange={(value) => setEmployeeForm({...employeeForm, currentStatus: value})}
                >
                  <SelectTrigger className="input-styled rounded" data-testid="select-current-status">
                    <SelectValue placeholder="Current Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Probation">Probation</SelectItem>
                    <SelectItem value="Notice Period">Notice Period</SelectItem>
                    <SelectItem value="Resigned">Resigned</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 10 - Increment Count and Appraised Quarter */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Select 
                  value={employeeForm.incrementCount}
                  onValueChange={(value) => setEmployeeForm({...employeeForm, incrementCount: value})}
                >
                  <SelectTrigger className="input-styled rounded" data-testid="select-increment-count">
                    <SelectValue placeholder="Increment Count" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0</SelectItem>
                    <SelectItem value="1">1</SelectItem>
                    <SelectItem value="2">2</SelectItem>
                    <SelectItem value="3">3</SelectItem>
                    <SelectItem value="4">4</SelectItem>
                    <SelectItem value="5+">5+</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Select 
                  value={employeeForm.appraisedQuarter}
                  onValueChange={(value) => setEmployeeForm({...employeeForm, appraisedQuarter: value})}
                >
                  <SelectTrigger className="input-styled rounded" data-testid="select-appraised-quarter">
                    <SelectValue placeholder="Appraised Quarter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Q1">Q1</SelectItem>
                    <SelectItem value="Q2">Q2</SelectItem>
                    <SelectItem value="Q3">Q3</SelectItem>
                    <SelectItem value="Q4">Q4</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 11 - Appraised Amount and Appraised Year */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Input 
                  placeholder="Appraised Amount" 
                  className="input-styled rounded" 
                  value={employeeForm.appraisedAmount}
                  onChange={(e) => setEmployeeForm({...employeeForm, appraisedAmount: e.target.value})}
                  data-testid="input-appraised-amount"
                />
              </div>
              <div>
                <Select 
                  value={employeeForm.appraisedYear}
                  onValueChange={(value) => setEmployeeForm({...employeeForm, appraisedYear: value})}
                >
                  <SelectTrigger className="input-styled rounded" data-testid="select-appraised-year">
                    <SelectValue placeholder="Appraised Year" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2025">2025</SelectItem>
                    <SelectItem value="2024">2024</SelectItem>
                    <SelectItem value="2023">2023</SelectItem>
                    <SelectItem value="2022">2022</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 12 - Yearly CTC and Current Monthly CTC */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Input 
                  placeholder="Yearly CTC" 
                  className="input-styled rounded" 
                  value={employeeForm.yearlyCTC}
                  onChange={(e) => setEmployeeForm({...employeeForm, yearlyCTC: e.target.value})}
                  data-testid="input-yearly-ctc"
                />
              </div>
              <div>
                <Input 
                  placeholder="Current Monthly CTC" 
                  className="input-styled rounded" 
                  value={employeeForm.currentMonthlyCTC}
                  onChange={(e) => setEmployeeForm({...employeeForm, currentMonthlyCTC: e.target.value})}
                  data-testid="input-current-monthly-ctc"
                />
              </div>
            </div>

            {/* Bank Details Section */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Bank Details</h3>
              
              {/* Row 13 - Name as per Bank and Account Number */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Input 
                    placeholder="Name as per Bank" 
                    className="input-styled rounded" 
                    value={employeeForm.nameAsPerBank}
                    onChange={(e) => setEmployeeForm({...employeeForm, nameAsPerBank: e.target.value})}
                    data-testid="input-name-as-per-bank"
                  />
                </div>
                <div>
                  <Input 
                    placeholder="Account Number" 
                    className="input-styled rounded" 
                    value={employeeForm.accountNumber}
                    onChange={(e) => setEmployeeForm({...employeeForm, accountNumber: e.target.value})}
                    data-testid="input-account-number"
                  />
                </div>
              </div>

              {/* Row 14 - IFSC Code and Bank Name */}
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <Input 
                    placeholder="IFSC Code" 
                    className="input-styled rounded" 
                    value={employeeForm.ifscCode}
                    onChange={(e) => setEmployeeForm({...employeeForm, ifscCode: e.target.value})}
                    data-testid="input-ifsc-code"
                  />
                </div>
                <div>
                  <Input 
                    placeholder="Bank Name" 
                    className="input-styled rounded" 
                    value={employeeForm.bankName}
                    onChange={(e) => setEmployeeForm({...employeeForm, bankName: e.target.value})}
                    data-testid="input-bank-name"
                  />
                </div>
              </div>

              {/* Row 15 - Branch and City */}
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <Input 
                    placeholder="Branch" 
                    className="input-styled rounded" 
                    value={employeeForm.branch}
                    onChange={(e) => setEmployeeForm({...employeeForm, branch: e.target.value})}
                    data-testid="input-branch"
                  />
                </div>
                <div>
                  <Input 
                    placeholder="City" 
                    className="input-styled rounded" 
                    value={employeeForm.city}
                    onChange={(e) => setEmployeeForm({...employeeForm, city: e.target.value})}
                    data-testid="input-city"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-center pt-6">
              <Button 
                className="bg-cyan-400 hover:bg-cyan-500 text-white px-8 py-2 rounded"
                onClick={() => {
                  if (!employeeForm.name || !employeeForm.email) {
                    toast({
                      title: "Validation Error",
                      description: "Please fill in all required fields (Name, Email)",
                      variant: "destructive",
                    });
                    return;
                  }
                  createEmployeeMutation.mutate(employeeForm);
                }}
                disabled={createEmployeeMutation.isPending}
                data-testid="button-submit-employee"
              >
                {createEmployeeMutation.isPending ? 'Submitting...' : 'Submit'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Client Master View More Modal */}
      <Dialog open={isClientMasterModalOpen} onOpenChange={setIsClientMasterModalOpen}>
        <DialogContent className="max-w-6xl w-[95vw] max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <div className="flex items-center justify-between gap-4">
              <DialogTitle>Client Master - Full Table</DialogTitle>
              <SearchBar
                value={clientMasterSearch}
                onChange={setClientMasterSearch}
                placeholder="Search clients..."
                testId="input-search-clients"
              />
            </div>
          </DialogHeader>
          <div className="overflow-y-auto pr-2">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left p-2 font-medium text-gray-700 dark:text-gray-300 text-sm">Client Code</th>
                    <th className="text-left p-2 font-medium text-gray-700 dark:text-gray-300 text-sm">Brand Name</th>
                    <th className="text-left p-2 font-medium text-gray-700 dark:text-gray-300 text-sm">Location</th>
                    <th className="text-left p-2 font-medium text-gray-700 dark:text-gray-300 text-sm">SPOC</th>
                    <th className="text-left p-2 font-medium text-gray-700 dark:text-gray-300 text-sm">Website</th>
                    <th className="text-left p-2 font-medium text-gray-700 dark:text-gray-300 text-sm">Current Status</th>
                    <th className="text-left p-2 font-medium text-gray-700 dark:text-gray-300 text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoadingClients ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-gray-500 dark:text-gray-400">Loading clients...</td>
                    </tr>
                  ) : filteredClients.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-gray-500 dark:text-gray-400">{clientMasterSearch ? 'No matching clients found' : 'No clients found. Click "+ Add Client" to add one.'}</td>
                    </tr>
                  ) : (
                    filteredClients.map((row: any, index: number) => {
                      const statusClass = row.currentStatus === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 
                                        row.currentStatus === 'frozen' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' : 
                                        'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
                      return (
                        <tr key={row.id || index} className={`border-b border-gray-100 dark:border-gray-800 ${index % 2 === 0 ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                          <td className="py-3 px-3 text-gray-900 dark:text-white font-medium">{row.clientCode}</td>
                          <td className="py-3 px-3 text-gray-600 dark:text-gray-400">{row.brandName}</td>
                          <td className="py-3 px-3 text-gray-600 dark:text-gray-400">{row.location || 'N/A'}</td>
                          <td className="py-3 px-3 text-gray-600 dark:text-gray-400">{row.spoc || 'N/A'}</td>
                          <td className="py-3 px-3 text-blue-600 dark:text-blue-400">{row.website || 'N/A'}</td>
                          <td className="py-3 px-3">
                            <span className={`${statusClass} text-sm font-semibold px-3 py-1 rounded-full`}>• {(row.currentStatus || 'active').toUpperCase()}</span>
                          </td>
                          <td className="py-3 px-3">
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                if (confirm(`Are you sure you want to delete client "${row.brandName}"?`)) {
                                  deleteClientMutation.mutate(row.id);
                                }
                              }}
                              disabled={deleteClientMutation.isPending}
                              data-testid={`button-delete-client-${row.id}`}
                            >
                              Delete
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Employee Master View More Modal */}
      <Dialog open={isEmployeeMasterModalOpen} onOpenChange={setIsEmployeeMasterModalOpen}>
        <DialogContent className="max-w-6xl w-[95vw] max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <div className="flex items-center justify-between gap-4">
              <DialogTitle>Employee Master - Full Table</DialogTitle>
              <SearchBar
                value={employeeMasterSearch}
                onChange={setEmployeeMasterSearch}
                placeholder="Search employees..."
                testId="input-search-employees"
              />
            </div>
          </DialogHeader>
          <div className="overflow-y-auto pr-2">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left p-2 font-medium text-gray-700 dark:text-gray-300 text-sm">Employee ID</th>
                    <th className="text-left p-2 font-medium text-gray-700 dark:text-gray-300 text-sm">Name</th>
                    <th className="text-left p-2 font-medium text-gray-700 dark:text-gray-300 text-sm">Father's Name</th>
                    <th className="text-left p-2 font-medium text-gray-700 dark:text-gray-300 text-sm">Employee Status</th>
                    <th className="text-left p-2 font-medium text-gray-700 dark:text-gray-300 text-sm">Date of Joining</th>
                    <th className="text-left p-2 font-medium text-gray-700 dark:text-gray-300 text-sm">Current CTC</th>
                    <th className="text-left p-2 font-medium text-gray-700 dark:text-gray-300 text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoadingEmployees ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-gray-500 dark:text-gray-400">Loading employees...</td>
                    </tr>
                  ) : filteredHrEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-gray-500 dark:text-gray-400">{employeeMasterSearch ? 'No matching employees found' : 'No employees found. Click "+ Add Employee" to add one.'}</td>
                    </tr>
                  ) : (
                    filteredHrEmployees.map((row: any, index: number) => (
                      <tr key={row.id || index} className={`border-b border-gray-100 dark:border-gray-800 ${index % 2 === 0 ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                        <td className="py-3 px-3 text-gray-900 dark:text-white font-medium">{row.employeeId}</td>
                        <td className="py-3 px-3 text-gray-600 dark:text-gray-400">{row.name}</td>
                        <td className="py-3 px-3 text-gray-600 dark:text-gray-400">-</td>
                        <td className="py-3 px-3 text-gray-600 dark:text-gray-400">{row.role || 'N/A'}</td>
                        <td className="py-3 px-3 text-gray-600 dark:text-gray-400">{row.joiningDate || 'N/A'}</td>
                        <td className="py-3 px-3 text-gray-600 dark:text-gray-400">-</td>
                        <td className="py-3 px-3">
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              if (confirm(`Are you sure you want to delete employee "${row.name}"?`)) {
                                deleteEmployeeMutation.mutate(row.id);
                              }
                            }}
                            disabled={deleteEmployeeMutation.isPending}
                            data-testid={`button-delete-employee-${row.id}`}
                          >
                            Delete
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Resume Database View More Modal */}
      <Dialog open={isResumeDatabaseModalOpen} onOpenChange={setIsResumeDatabaseModalOpen}>
        <DialogContent className="max-w-6xl w-[95vw] max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <div className="flex items-center justify-between gap-4">
              <DialogTitle>Resume Database - Full Table</DialogTitle>
              <SearchBar
                value={resumeDatabaseSearch}
                onChange={setResumeDatabaseSearch}
                placeholder="Search database..."
                testId="input-search-resume-database"
              />
            </div>
          </DialogHeader>
          <div className="overflow-y-auto pr-2 flex-1">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left p-2 font-medium text-gray-700 dark:text-gray-300 text-sm">Employee ID</th>
                    <th className="text-left p-2 font-medium text-gray-700 dark:text-gray-300 text-sm">Name</th>
                    <th className="text-left p-2 font-medium text-gray-700 dark:text-gray-300 text-sm">Total Applicants</th>
                    <th className="text-left p-2 font-medium text-gray-700 dark:text-gray-300 text-sm">Uploads</th>
                    <th className="text-left p-2 font-medium text-gray-700 dark:text-gray-300 text-sm">Email</th>
                    <th className="text-left p-2 font-medium text-gray-700 dark:text-gray-300 text-sm">Department</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoadingEmployees ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-500 dark:text-gray-400">Loading employees...</td>
                    </tr>
                  ) : filteredHrEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-500 dark:text-gray-400">{resumeDatabaseSearch ? 'No matching employees found' : 'No employees found. Click "+ Add Employee" to add one.'}</td>
                    </tr>
                  ) : (
                    filteredHrEmployees.map((row: any, index: number) => (
                      <tr key={row.id || index} className={`border-b border-gray-100 dark:border-gray-800 ${index % 2 === 0 ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                        <td className="py-3 px-3 text-gray-900 dark:text-white font-medium">{row.employeeId}</td>
                        <td className="py-3 px-3 text-gray-600 dark:text-gray-400">{row.name}</td>
                        <td className="py-3 px-3 text-gray-600 dark:text-gray-400">-</td>
                        <td className="py-3 px-3 text-gray-600 dark:text-gray-400">-</td>
                        <td className="py-3 px-3 text-blue-600 dark:text-blue-400">{row.email}</td>
                        <td className="py-3 px-3 text-gray-600 dark:text-gray-400">{row.department || 'N/A'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button 
              variant="outline" 
              onClick={() => setIsResumeDatabaseModalOpen(false)}
              data-testid="button-close-resume-modal"
            >
              Close
            </Button>
            <Button 
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => {
                setIsResumeDatabaseModalOpen(false);
                navigate('/master-database');
              }}
              data-testid="button-view-full-database"
            >
              View Full Database
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Performance Data Modal */}
      <Dialog open={isPerformanceDataModalOpen} onOpenChange={setIsPerformanceDataModalOpen}>
        <DialogContent className="max-w-4xl w-[90vw] max-h-[85vh]">
          <DialogHeader className="flex flex-row items-center justify-between gap-2">
            <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-white">Performance Data - Quarter {performanceMetrics?.currentQuarter || 'Q1 2024'}</DialogTitle>
            <Button 
              variant="destructive" 
              size="sm"
              onClick={() => setIsResetPerformanceConfirmOpen(true)}
              disabled={resetPerformanceDataMutation.isPending}
              data-testid="button-reset-performance"
            >
              {resetPerformanceDataMutation.isPending ? "Resetting..." : "Reset Data"}
            </Button>
          </DialogHeader>
          <div className="overflow-y-auto pr-2 max-h-[calc(85vh-120px)]">
            {/* Performance Summary Cards - Using API data */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <Card className="bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 border-cyan-200 dark:border-cyan-800">
                <CardContent className="p-4">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Minimum Target</div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white" data-testid="text-min-target">
                    ₹{(performanceMetrics?.minimumTarget ?? 0).toLocaleString('en-IN')}
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800">
                <CardContent className="p-4">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Target Achieved</div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white" data-testid="text-achieved-target">
                    ₹{(performanceMetrics?.targetAchieved ?? 0).toLocaleString('en-IN')}
                  </div>
                  <div className="text-sm text-green-600 dark:text-green-400 font-medium">
                    {performanceMetrics?.performancePercentage ?? 0}% Performance
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200 dark:border-purple-800">
                <CardContent className="p-4">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Total Closures</div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white" data-testid="text-total-closures">
                    {performanceMetrics?.closuresCount ?? 0}
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 border-amber-200 dark:border-amber-800">
                <CardContent className="p-4">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Total Incentives</div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white" data-testid="text-total-incentives">
                    ₹{(performanceMetrics?.incentiveEarned ?? 0).toLocaleString('en-IN')}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Team Performance Table */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                <thead>
                  <tr className="bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left p-3 font-medium text-gray-700 dark:text-gray-300 text-sm">Resource</th>
                    <th className="text-left p-3 font-medium text-gray-700 dark:text-gray-300 text-sm">Role</th>
                    <th className="text-left p-3 font-medium text-gray-700 dark:text-gray-300 text-sm">Quarter</th>
                    <th className="text-left p-3 font-medium text-gray-700 dark:text-gray-300 text-sm">Minimum Target</th>
                    <th className="text-left p-3 font-medium text-gray-700 dark:text-gray-300 text-sm">Target Achieved</th>
                    <th className="text-left p-3 font-medium text-gray-700 dark:text-gray-300 text-sm">Performance %</th>
                    <th className="text-left p-3 font-medium text-gray-700 dark:text-gray-300 text-sm">Closures</th>
                    <th className="text-left p-3 font-medium text-gray-700 dark:text-gray-300 text-sm">Incentives</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoadingTargets ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-gray-500 dark:text-gray-400">
                        Loading performance data...
                      </td>
                    </tr>
                  ) : targetMappings.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-gray-500 dark:text-gray-400">
                        No performance data available yet
                      </td>
                    </tr>
                  ) : (
                    targetMappings.slice(0, 10).map((row: any, index) => {
                      const targetValue = typeof row.minimumTarget === 'number' ? row.minimumTarget : parseInt(String(row.minimumTarget).replace(/,/g, ''), 10);
                      const achievedValue = typeof row.targetAchieved === 'number' ? row.targetAchieved : parseInt(String(row.targetAchieved).replace(/,/g, ''), 10);
                      const performancePercent = targetValue > 0 ? ((achievedValue / targetValue) * 100).toFixed(2) : '0.00';
                      const performanceColor = parseFloat(performancePercent) >= 80 ? 'text-green-600 dark:text-green-400' : 
                                              parseFloat(performancePercent) >= 60 ? 'text-yellow-600 dark:text-yellow-400' : 
                                              'text-red-600 dark:text-red-400';
                      
                      return (
                        <tr key={row.id || index} className={`border-b border-gray-100 dark:border-gray-800 ${index % 2 === 0 ? 'bg-gray-50 dark:bg-gray-900/50' : ''}`}>
                          <td className="py-3 px-3 text-gray-900 dark:text-white font-medium" data-testid={`text-resource-${index}`}>{row.teamMemberName || 'N/A'}</td>
                          <td className="py-3 px-3 text-gray-600 dark:text-gray-400">{row.teamMemberRole || 'N/A'}</td>
                          <td className="py-3 px-3 text-gray-600 dark:text-gray-400">{row.quarter}-{row.year}</td>
                          <td className="py-3 px-3 text-gray-600 dark:text-gray-400">₹{targetValue.toLocaleString()}</td>
                          <td className="py-3 px-3 text-gray-600 dark:text-gray-400">₹{achievedValue.toLocaleString()}</td>
                          <td className={`py-3 px-3 font-semibold ${performanceColor}`}>{performancePercent}%</td>
                          <td className="py-3 px-3 text-gray-600 dark:text-gray-400">{row.closures || 0}</td>
                          <td className="py-3 px-3 text-gray-600 dark:text-gray-400">₹{(row.incentives || 0).toLocaleString()}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reset Performance Data Confirmation Dialog */}
      <AlertDialog open={isResetPerformanceConfirmOpen} onOpenChange={setIsResetPerformanceConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Performance Data</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reset all performance data? This will permanently delete all target mappings, revenue mappings, and related data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-reset-performance">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                resetPerformanceDataMutation.mutate();
                setIsResetPerformanceConfirmOpen(false);
              }}
              className="bg-red-600 hover:bg-red-700 text-white"
              data-testid="button-confirm-reset-performance"
            >
              Reset Performance Data
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Master Data Confirmation Dialog */}
      <AlertDialog open={isResetMasterDataConfirmOpen} onOpenChange={setIsResetMasterDataConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Master Data</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reset all master data? This will permanently delete all resume/candidate records and deliveries. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-reset-master">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                resetMasterDataMutation.mutate();
                setIsResetMasterDataConfirmOpen(false);
              }}
              className="bg-red-600 hover:bg-red-700 text-white"
              data-testid="button-confirm-reset-master"
            >
              Reset Master Data
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Download Confirmation Dialog */}
      <AlertDialog open={showDownloadConfirm} onOpenChange={setShowDownloadConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Download</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to download this report? The file will be generated based on your selected filters and format.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-download">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDownload}
              className="bg-cyan-400 hover:bg-cyan-500 text-black"
              data-testid="button-confirm-download"
            >
              Confirm Download
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Success Alert */}
      {showAlert && (
        <div className="fixed bottom-4 right-4 bg-white border border-gray-200 shadow-lg z-50 rounded w-80 overflow-hidden animate-in slide-in-from-right duration-300">
          <div className="p-4 text-gray-800">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-sm font-medium">{alertMessage}</span>
            </div>
          </div>
          <div className="h-1 bg-green-500 animate-pulse"></div>
        </div>
      )}

      {/* Floating Help Button */}
      <button
        onClick={() => setIsChatOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-purple-600 hover:bg-purple-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-110 z-40"
        data-testid="button-help"
        aria-label="Help"
        title="Need help? Chat with us!"
      >
        <HelpCircle size={24} />
      </button>

      {/* Performance Graph Modal */}
      <Dialog open={isPerformanceGraphModalOpen} onOpenChange={setIsPerformanceGraphModalOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Overall Performance - Detailed View</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex justify-start space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Team Performance</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-0.5 bg-red-500"></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Average Benchmark (10)</span>
              </div>
            </div>
            <div className="h-[420px]">
              <PerformanceChart
                data={performanceData}
                height="100%"
                benchmarkValue={10}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Revenue Graph Modal */}
      <Dialog open={isRevenueGraphModalOpen} onOpenChange={setIsRevenueGraphModalOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Revenue Analysis - Detailed View</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Filters Section */}
            <div className="flex flex-wrap gap-4">
              <Select value={revenueTeam} onValueChange={setRevenueTeam}>
                <SelectTrigger className="w-48 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600" data-testid="select-revenue-team">
                  <SelectValue placeholder="Select Team" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Teams</SelectItem>
                  <SelectItem value="arun">Arun (TL)</SelectItem>
                  <SelectItem value="anusha">Anusha (TL)</SelectItem>
                </SelectContent>
              </Select>
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={`w-48 justify-start text-left font-normal ${!revenueDateFrom && "text-gray-500 dark:text-gray-400"}`}
                    data-testid="button-revenue-date-from"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {revenueDateFrom ? format(revenueDateFrom, "PPP") : <span>From Date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={revenueDateFrom}
                    onSelect={setRevenueDateFrom}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={`w-48 justify-start text-left font-normal ${!revenueDateTo && "text-gray-500 dark:text-gray-400"}`}
                    data-testid="button-revenue-date-to"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {revenueDateTo ? format(revenueDateTo, "PPP") : <span>To Date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={revenueDateTo}
                    onSelect={setRevenueDateTo}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              
              <Select value={revenuePeriod} onValueChange={setRevenuePeriod}>
                <SelectTrigger className="w-32 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600" data-testid="select-revenue-period">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-start space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Team Revenue</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-0.5 bg-green-500"></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Average Benchmark (₹230K)</span>
              </div>
            </div>
            <div className="h-[420px]">
              <RevenueChart
                data={revenueData}
                height="100%"
                benchmarkValue={230000}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Client Metrics Modal */}
      <Dialog open={isClientMetricsModalOpen} onOpenChange={setIsClientMetricsModalOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto print-visible">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Client Metrics - Full View</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Header Section */}
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Speed Metrics</h2>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">12-Aug-2025</span>
                </div>
                <Select>
                  <SelectTrigger className="w-24" data-testid="select-client-metrics-period">
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

            {/* Speed Metrics */}
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                <h3 className="text-sm font-medium text-blue-700 mb-2">Time to 1st Submission</h3>
                <div className="flex items-end space-x-3 mb-2">
                  <span className="text-3xl font-bold text-blue-900">0</span>
                  <span className="text-sm text-blue-700 mb-1">days</span>
                  <div className="w-3 h-3 bg-cyan-400 rounded-full mb-1"></div>
                </div>
              </div>
              
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                <h3 className="text-sm font-medium text-blue-700 mb-2">Time to Interview</h3>
                <div className="flex items-end space-x-3 mb-2">
                  <span className="text-3xl font-bold text-blue-900">0</span>
                  <span className="text-sm text-blue-700 mb-1">days</span>
                  <div className="w-3 h-3 bg-red-400 rounded-full mb-1"></div>
                </div>
              </div>
              
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                <h3 className="text-sm font-medium text-blue-700 mb-2">Time to Offer</h3>
                <div className="flex items-end space-x-3 mb-2">
                  <span className="text-3xl font-bold text-blue-900">0</span>
                  <span className="text-sm text-blue-700 mb-1">days</span>
                  <div className="w-3 h-3 bg-purple-400 rounded-full mb-1"></div>
                </div>
              </div>
              
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                <h3 className="text-sm font-medium text-blue-700 mb-2">Time to Fill</h3>
                <div className="flex items-end space-x-3 mb-2">
                  <span className="text-3xl font-bold text-blue-900">0</span>
                  <span className="text-sm text-blue-700 mb-1">days</span>
                  <div className="w-3 h-3 bg-amber-600 rounded-full mb-1"></div>
                </div>
              </div>
            </div>

            {/* Quality Metrics */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Quality Metrics</h2>
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-green-100 rounded-lg p-4 border border-green-200">
                  <h3 className="text-sm font-medium text-green-700 mb-2">Submission to Short List %</h3>
                  <div className="flex items-end space-x-3 mb-2">
                    <span className="text-3xl font-bold text-green-800">0</span>
                    <span className="text-sm text-green-700 mb-1">%</span>
                    <div className="w-3 h-3 bg-cyan-400 rounded-full mb-1"></div>
                  </div>
                </div>
                
                <div className="bg-green-100 rounded-lg p-4 border border-green-200">
                  <h3 className="text-sm font-medium text-green-700 mb-2">Interview to Offer %</h3>
                  <div className="flex items-end space-x-3 mb-2">
                    <span className="text-3xl font-bold text-green-800">0</span>
                    <span className="text-sm text-green-700 mb-1">%</span>
                    <div className="w-3 h-3 bg-red-400 rounded-full mb-1"></div>
                  </div>
                </div>
                
                <div className="bg-green-100 rounded-lg p-4 border border-green-200">
                  <h3 className="text-sm font-medium text-green-700 mb-2">Offer Acceptance %</h3>
                  <div className="flex items-end space-x-3 mb-2">
                    <span className="text-3xl font-bold text-green-800">0</span>
                    <span className="text-sm text-green-700 mb-1">%</span>
                    <div className="w-3 h-3 bg-purple-400 rounded-full mb-1"></div>
                  </div>
                </div>
                
                <div className="bg-green-100 rounded-lg p-4 border border-green-200">
                  <h3 className="text-sm font-medium text-green-700 mb-2">Early Attrition %</h3>
                  <div className="flex items-end space-x-3 mb-2">
                    <span className="text-3xl font-bold text-green-800">0</span>
                    <span className="text-sm text-green-700 mb-1">%</span>
                    <div className="w-3 h-3 bg-amber-600 rounded-full mb-1"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Impact Metrics */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Impact Metrics</h2>
              <div className="grid grid-cols-4 gap-4 mb-4">
                <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                  <h3 className="text-sm font-medium text-red-700 mb-2">Speed to Hire value</h3>
                  <div className="text-3xl font-bold text-red-600">0</div>
                  <div className="text-sm text-gray-600 mt-1">Days faster*</div>
                </div>
                
                <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                  <h3 className="text-sm font-medium text-red-700 mb-2">Revenue Impact Of Delay</h3>
                  <div className="text-3xl font-bold text-red-600">0</div>
                  <div className="text-sm text-gray-600 mt-1">Lost per Role*</div>
                </div>
                
                <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                  <h3 className="text-sm font-medium text-purple-700 mb-2">Client NPS</h3>
                  <div className="text-3xl font-bold text-purple-600">+0</div>
                  <div className="text-sm text-gray-600 mt-1">Net Promoter Score*</div>
                </div>
                
                <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                  <h3 className="text-sm font-medium text-purple-700 mb-2">Candidate NPS</h3>
                  <div className="text-3xl font-bold text-purple-600">+0</div>
                  <div className="text-sm text-gray-600 mt-1">Net Promoter Score*</div>
                </div>
              </div>
              
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200 relative">
                  <h3 className="text-sm font-medium text-yellow-700 mb-2">Feedback Turn Around</h3>
                  <div className="text-3xl font-bold text-yellow-600 mb-1">{impactMetricsQuery.data?.[0]?.feedbackTurnAround || 0}</div>
                  {isEditingFeedbackModal ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-600">days (Avg.</span>
                        <Input
                          type="number"
                          value={avgDaysValueModal}
                          onChange={(e) => setAvgDaysValueModal(e.target.value)}
                          className="h-7 w-16 text-sm"
                          data-testid="input-feedback-turnaround-avg-modal"
                          autoFocus
                        />
                        <span className="text-xs text-gray-600">days)*</span>
                      </div>
                      <div className="flex gap-1">
                        <Button 
                          size="sm" 
                          onClick={handleSaveModal}
                          className="h-7 text-xs"
                          data-testid="button-save-feedback-turnaround-modal"
                        >
                          Save
                        </Button>
                        <Button 
                          size="sm" 
                          onClick={handleCancelModal}
                          className="h-7 text-xs"
                          variant="outline"
                          data-testid="button-cancel-feedback-turnaround-modal"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="text-xs text-gray-500">days (Avg. {impactMetricsQuery.data?.[0]?.feedbackTurnAroundAvgDays || 5} days)*</div>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={handleEditClickModal}
                        className="absolute top-2 right-2 h-6 w-6 hover-elevate"
                        data-testid="button-edit-feedback-turnaround-modal"
                      >
                        <EditIcon className="h-3 w-3" />
                      </Button>
                    </>
                  )}
                </div>
                
                <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                  <h3 className="text-sm font-medium text-yellow-700 mb-2">First Year Retention Rate</h3>
                  <div className="text-3xl font-bold text-yellow-600">0</div>
                  <div className="text-sm text-gray-600 mt-1">%</div>
                </div>
                
                <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                  <h3 className="text-sm font-medium text-yellow-700 mb-2">Fulfillment Rate</h3>
                  <div className="text-3xl font-bold text-yellow-600">0</div>
                  <div className="text-sm text-gray-600 mt-1">%</div>
                </div>
                
                <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                  <h3 className="text-sm font-medium text-yellow-700 mb-2">Revenue Recovered</h3>
                  <div className="text-3xl font-bold text-yellow-600">0 <span className="text-2xl">L</span></div>
                  <div className="text-sm text-gray-600 mt-1">Gained per hire*</div>
                </div>
              </div>
            </div>

            {/* Download Button */}
            <div className="flex justify-end mt-6">
              <Button 
                onClick={() => window.print()}
                className="bg-cyan-400 hover:bg-cyan-500 text-black px-6 py-2 rounded shadow-lg flex items-center gap-2"
                data-testid="button-download-metrics-modal"
              >
                <Download className="h-4 w-4" />
                Download PDF
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Chat Support Modal */}
      <ChatDock 
        open={isChatOpen} 
        onClose={() => setIsChatOpen(false)} 
        userName="Support Team"
      />
    </div>
  );
}