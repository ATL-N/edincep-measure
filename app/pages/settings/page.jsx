"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useSession } from "next-auth/react";
import {
  Settings as SettingsIcon,
  Palette,
  Bell,
  Database,
  Shield,
  Download,
  Upload,
  Trash2,
  Save,
  ArrowLeft,
  Moon,
  Sun,
  Monitor,
} from "lucide-react";
import { useTheme } from "../../components/ThemeProvider";

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const { data: session, update } = useSession();
  const [activeTab, setActiveTab] = useState("general");
  // Initialize state directly from session to prevent flicker, with a fallback
  const [measurementUnit, setMeasurementUnit] = useState(session?.user?.measurementUnit || "INCH");
  
  // State for the main save button
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // State for password change form
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordChangeStatus, setPasswordChangeStatus] = useState({ loading: false, error: null, success: null });


  const tabs = [
    { id: "general", label: "General", icon: SettingsIcon },
    // { id: "appearance", label: "Appearance", icon: Palette },
    // { id: "notifications", label: "Notifications", icon: Bell },
    // { id: "data", label: "Data & Privacy", icon: Database },
    { id: "security", label: "Security", icon: Shield },
  ];

  const handleSaveGeneral = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch('/api/user/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ measurementUnit }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to save settings.");
      }

      // Correctly update the session with the new value
      await update({ measurementUnit: measurementUnit });
      setSuccess("Settings saved successfully!");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  const handleChangePassword = async () => {
    setPasswordChangeStatus({ loading: true, error: null, success: null });

    if (newPassword !== confirmPassword) {
      setPasswordChangeStatus({ loading: false, error: "New passwords do not match.", success: null });
      return;
    }
    if (newPassword.length < 8) {
      setPasswordChangeStatus({ loading: false, error: "New password must be at least 8 characters long.", success: null });
      return;
    }

    try {
        const response = await fetch('/api/user/change-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || "Failed to change password.");
        }

        setPasswordChangeStatus({ loading: false, error: null, success: "Password updated successfully!" });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
    } catch (err) {
        setPasswordChangeStatus({ loading: false, error: err.message, success: null });
    } finally {
        setTimeout(() => setPasswordChangeStatus({ loading: false, error: null, success: null }), 3000);
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 },
  };

  const ToggleSwitch = ({ checked, onChange, title, description }) => (
    <div className="flex items-center justify-between p-4 border border-border rounded-lg">
      <div className="pr-4">
        <h4 className="font-medium">{title}</h4>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="sr-only peer"
        />
        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 dark:peer-focus:ring-primary/40 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border dark:border-gray-600 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
      </label>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case "general":
        return (
          // General tab content remains the same
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">
                Measurement Settings
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Default Unit
                  </label>
                  <select
                    value={measurementUnit}
                    onChange={(e) => setMeasurementUnit(e.target.value)}
                    className="w-full bg-background/50 border border-border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="INCH">Inches</option>
                    <option value="CENTIMETER">Centimeters</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        );

        case "security":
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Account Security</h3>
              <div className="space-y-4">
                <div className="p-4 border border-border rounded-lg">
                  <h4 className="font-medium mb-2">Change Password</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Use a strong, unique password for best security.
                  </p>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Current Password
                      </label>
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full bg-background/50 border border-border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        New Password
                      </label>
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full bg-background/50 border border-border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Confirm New Password
                      </label>
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full bg-background/50 border border-border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div className="flex items-center gap-4 mt-4">
                        <button
                            onClick={handleChangePassword}
                            disabled={passwordChangeStatus.loading}
                            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-70"
                        >
                            {passwordChangeStatus.loading ? (
                                <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                <span>Updating...</span>
                                </>
                            ) : (
                                "Update Password"
                            )}
                        </button>
                        {passwordChangeStatus.success && <p className="text-sm text-green-500">{passwordChangeStatus.success}</p>}
                        {passwordChangeStatus.error && <p className="text-sm text-destructive">{passwordChangeStatus.error}</p>}
                    </div>
                  </div>
                </div>
                {/* Other security options remain the same */}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="container max-w-5xl mx-auto py-8 px-4 mt-20">
      <div className="flex items-center mb-6 md:mb-8">
        <button
          onClick={() => window.history.back()}
          className="mr-4 p-2 rounded-full hover:bg-accent transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold">Settings</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <nav className="hidden md:block md:col-span-1">
          <div className="space-y-1 sticky top-24">
            {tabs.map((tab) => (
              <motion.button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors text-left ${
                  activeTab === tab.id
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent text-foreground"
                }`}
                variants={itemVariants}
                initial="hidden"
                animate="visible"
                layout
              >
                <tab.icon className="w-5 h-5" />
                <span>{tab.label}</span>
              </motion.button>
            ))}
          </div>
        </nav>

        <div className="md:col-span-3">
          <div className="md:hidden mb-6">
            <div className="border-b border-border">
              <nav
                className="-mb-px flex space-x-4 overflow-x-auto"
                aria-label="Tabs"
              >
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`whitespace-nowrap flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === tab.id
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                    }`}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          <motion.div
            className="bg-card rounded-xl border border-border p-4 md:p-6"
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {renderTabContent()}

            {activeTab === 'general' && (
                 <div className="mt-8 pt-6 border-t border-border flex items-center justify-end gap-4">
                    {success && <p className="text-sm text-green-500">{success}</p>}
                    {error && <p className="text-sm text-red-500">{error}</p>}
                    <button
                        onClick={handleSaveGeneral}
                        disabled={saving}
                        className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {saving ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>Saving...</span>
                        </>
                        ) : (
                        <>
                            <Save className="w-4 h-4" />
                            <span>Save Changes</span>
                        </>
                        )}
                    </button>
                </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
