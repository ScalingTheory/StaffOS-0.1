import { useState } from 'react';
import { ChevronDown, User, Settings, LogOut, HelpCircle } from "lucide-react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth, useEmployeeAuth } from "@/contexts/auth-context";
import { SignOutDialog } from "@/components/ui/sign-out-dialog";
import { ProfileSettingsModal } from "@/components/dashboard/modals/profile-settings-modal";

interface SimpleClientHeaderProps {
  companyName?: string;
  clientName?: string;
  clientEmail?: string;
  onHelpClick?: () => void;
}

export default function SimpleClientHeader({ 
  companyName = "Loading...",
  clientName,
  clientEmail,
  onHelpClick
}: SimpleClientHeaderProps) {
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showSignOutDialog, setShowSignOutDialog] = useState(false);
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { logout } = useAuth();
  const employee = useEmployeeAuth();
  
  const userName = clientName || employee?.name || "Client User";
  const userEmail = clientEmail || employee?.email || "";
  const userImage = "/api/placeholder/32/32";
  
  // Logout mutation for client (employee)
  const logoutMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/auth/logout', {});
      return await res.json();
    },
    onSuccess: () => {
      logout();
      toast({
        title: "Logged out successfully",
        description: "You have been signed out.",
      });
      navigate('/employer-login');
    },
    onError: () => {
      logout();
      toast({
        title: "Logged out",
        description: "You have been signed out (session cleared locally).",
      });
      navigate('/employer-login');
    }
  });

  const handleLogout = () => {
    setShowUserDropdown(false);
    setShowSignOutDialog(true);
  };

  const confirmLogout = () => {
    logoutMutation.mutate();
    setShowSignOutDialog(false);
  };

  const handleProfileSettings = () => {
    setShowUserDropdown(false);
    setShowProfileSettings(true);
  };

  const handleAccountSettings = () => {
    setShowUserDropdown(false);
    setShowProfileSettings(true); // For now, account settings opens the same modal
  };
  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Company Name */}
        <h1 className="text-lg font-semibold text-gray-900">{companyName}</h1>
        
        {/* Right side - Help and User Profile */}
        <div className="flex items-center gap-4">
          {/* Help Button */}
          <button 
            onClick={onHelpClick}
            className="flex items-center gap-1 px-3 py-2 text-gray-600 hover:text-gray-900 transition-colors duration-200 hover:bg-gray-100 rounded-lg"
            data-testid="button-header-help"
          >
            <HelpCircle size={16} />
            <span className="text-sm">Help</span>
          </button>
          
          {/* User Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              onBlur={() => setTimeout(() => setShowUserDropdown(false), 150)}
              className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:text-gray-900 transition-all duration-200 hover:bg-gray-100 rounded-lg"
              data-testid="button-client-user-dropdown"
            >
              <img 
                src={userImage} 
                alt={userName}
                className="w-8 h-8 rounded-full object-cover"
              />
              <span className="text-sm font-medium">{userName}</span>
              <ChevronDown 
                size={16} 
                className={`transition-transform duration-200 ${showUserDropdown ? 'rotate-180' : ''}`} 
              />
            </button>

            {/* Dropdown Menu */}
            {showUserDropdown && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-xl py-4 z-50">
                {/* Profile Section */}
                <div className="px-4 pb-4 border-b border-gray-200">
                  <div className="flex items-center space-x-4">
                    <img 
                      src={userImage} 
                      alt={userName}
                      className="w-16 h-16 rounded-full object-cover flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-lg font-semibold text-gray-900 truncate">
                        {userName}
                      </div>
                      <div className="text-sm text-gray-500 truncate">
                        Client - {companyName}
                      </div>
                      {userEmail && (
                        <div className="text-xs text-gray-400 truncate">
                          {userEmail}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Menu Items */}
                <div className="py-2">
                  <button 
                    onClick={handleProfileSettings}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-150"
                    data-testid="button-client-profile-settings"
                  >
                    <User size={16} />
                    <span>Profile Settings</span>
                  </button>
                  
                  <button 
                    onClick={handleAccountSettings}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-150"
                    data-testid="button-client-account-settings"
                  >
                    <Settings size={16} />
                    <span>Account Settings</span>
                  </button>
                  
                  <hr className="my-2 border-gray-200" />
                  
                  <button 
                    onClick={handleLogout}
                    disabled={logoutMutation.isPending}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors duration-150 disabled:opacity-50"
                    data-testid="button-client-header-logout"
                  >
                    <LogOut size={16} />
                    <span>{logoutMutation.isPending ? 'Signing out...' : 'Sign out'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <SignOutDialog
        open={showSignOutDialog}
        onOpenChange={setShowSignOutDialog}
        onConfirm={confirmLogout}
        userName={userName}
        isLoading={logoutMutation.isPending}
      />
      
      <ProfileSettingsModal
        open={showProfileSettings}
        onOpenChange={setShowProfileSettings}
      />
    </div>
  );
}