"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { data: session, update } = useSession();
  const [activeTab, setActiveTab] = useState("general");
  const [measurementUnit, setMeasurementUnit] = useState("INCH");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const tabs = [
    { id: "general", label: "General", icon: SettingsIcon },
    // { id: "appearance", label: "Appearance", icon: Palette },
    // { id: "notifications", label: "Notifications", icon: Bell },
    // { id: "data", label: "Data & Privacy", icon: Database },
    // { id: "security", label: "Security", icon: Shield },
  ];

  useEffect(() => {
    if (session?.user?.measurementUnit) {
      setMeasurementUnit(session.user.measurementUnit);
    }
  }, [session]);

  const handleSave = async () => {
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

      // This is a NextAuth.js specific function to trigger a session update
      // on the client, ensuring the new preference is available immediately.
      await update({ measurementUnit });

      setSuccess("Settings saved successfully!");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
      setTimeout(() => setSuccess(null), 3000); // Clear success message after 3s
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

      case "appearance":
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Theme</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <button
                  onClick={() => setTheme("light")}
                  className={`p-4 border rounded-lg flex flex-col items-center space-y-2 transition-colors ${
                    theme === "light"
                      ? "border-primary bg-primary/10"
                      : "border-border hover:bg-accent"
                  }`}
                >
                  <Sun className="w-6 h-6" />
                  <span className="text-sm font-medium">Light</span>
                </button>
                <button
                  onClick={() => setTheme("dark")}
                  className={`p-4 border rounded-lg flex flex-col items-center space-y-2 transition-colors ${
                    theme === "dark"
                      ? "border-primary bg-primary/10"
                      : "border-border hover:bg-accent"
                  }`}
                >
                  <Moon className="w-6 h-6" />
                  <span className="text-sm font-medium">Dark</span>
                </button>
                <button
                  onClick={() => setTheme("system")}
                  className={`p-4 border rounded-lg flex flex-col items-center space-y-2 transition-colors ${
                    theme === "system"
                      ? "border-primary bg-primary/10"
                      : "border-border hover:bg-accent"
                  }`}
                >
                  <Monitor className="w-6 h-6" />
                  <span className="text-sm font-medium">System</span>
                </button>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Display Options</h3>
              <div className="space-y-4">
                <ToggleSwitch
                  title="Compact Mode"
                  description="Reduce spacing for more content"
                  checked={tabs.appearance.compactMode}
                  onChange={(e) =>
                    handleSettingChange(
                      "appearance",
                      "compactMode",
                      e.target.checked
                    )
                  }
                />
                <ToggleSwitch
                  title="Animations"
                  description="Enable smooth transitions"
                  checked={settings.appearance.animationsEnabled}
                  onChange={(e) =>
                    handleSettingChange(
                      "appearance",
                      "animationsEnabled",
                      e.target.checked
                    )
                  }
                />
              </div>
            </div>
          </div>
        );

      case "notifications":
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">
                Notification Preferences
              </h3>
              <div className="space-y-4">
                <ToggleSwitch
                  title="Email Notifications"
                  description="Receive updates and reminders via email"
                  checked={settings.notifications.emailNotifications}
                  onChange={(e) =>
                    handleSettingChange(
                      "notifications",
                      "emailNotifications",
                      e.target.checked
                    )
                  }
                />
                <ToggleSwitch
                  title="Push Notifications"
                  description="Get instant notifications in your browser"
                  checked={settings.notifications.pushNotifications}
                  onChange={(e) =>
                    handleSettingChange(
                      "notifications",
                      "pushNotifications",
                      e.target.checked
                    )
                  }
                />
                <ToggleSwitch
                  title="Measurement Reminders"
                  description="Get reminders for scheduled measurement sessions"
                  checked={settings.notifications.measurementReminders}
                  onChange={(e) =>
                    handleSettingChange(
                      "notifications",
                      "measurementReminders",
                      e.target.checked
                    )
                  }
                />
              </div>
            </div>
          </div>
        );

      case "data":
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Data Privacy</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Data Retention Period
                  </label>
                  <select
                    value={settings.privacy.dataRetention}
                    onChange={(e) =>
                      handleSettingChange(
                        "privacy",
                        "dataRetention",
                        e.target.value
                      )
                    }
                    className="w-full bg-background/50 border border-border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="3months">3 Months</option>
                    <option value="6months">6 Months</option>
                    <option value="1year">1 Year</option>
                    <option value="forever">Forever</option>
                  </select>
                  <p className="mt-2 text-sm text-muted-foreground">
                    How long we keep your data before automatic deletion.
                  </p>
                </div>
                <ToggleSwitch
                  title="Share Analytics"
                  description="Help us improve by sharing anonymous usage data"
                  checked={settings.privacy.shareAnalytics}
                  onChange={(e) =>
                    handleSettingChange(
                      "privacy",
                      "shareAnalytics",
                      e.target.checked
                    )
                  }
                />
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Data Management</h3>
              <div className="space-y-4">
                <div className="p-4 border border-border rounded-lg">
                  <h4 className="font-medium mb-2">Export Your Data</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Download all your measurement data as a JSON file.
                  </p>
                  <button
                    onClick={() => alert("Data export started")}
                    className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span>Export Data</span>
                  </button>
                </div>
                <div className="p-4 border border-border rounded-lg">
                  <h4 className="font-medium mb-2">Import Data</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Import data from a previously exported file.
                  </p>
                  <button
                    onClick={() => alert("Please select a file to import")}
                    className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Import Data</span>
                  </button>
                </div>
                <div className="p-4 border border-destructive/20 rounded-lg">
                  <h4 className="font-medium text-destructive mb-2">
                    Delete All Data
                  </h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Permanently delete all your measurement data.
                  </p>
                  <button
                    onClick={() => {
                      if (
                        confirm(
                          "Are you sure you want to delete all your data? This action cannot be undone."
                        )
                      ) {
                        alert("All data has been deleted");
                      }
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-destructive/10 text-destructive rounded-lg hover:bg-destructive/20 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete All Data</span>
                  </button>
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
                        className="w-full bg-background/50 border border-border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <button
                      onClick={() => alert("Password updated successfully")}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                    >
                      Update Password
                    </button>
                  </div>
                </div>
                <div className="p-4 border border-border rounded-lg">
                  <h4 className="font-medium mb-2">
                    Two-Factor Authentication
                  </h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Add an extra layer of security to your account.
                  </p>
                  <button
                    onClick={() =>
                      alert("Two-factor authentication setup started")
                    }
                    className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
                  >
                    <Shield className="w-4 h-4" />
                    <span>Enable Two-Factor Authentication</span>
                  </button>
                </div>
                <div className="p-4 border border-border rounded-lg">
                  <h4 className="font-medium mb-2">Active Sessions</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Manage devices where you're currently logged in.
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-background/50 rounded-lg">
                      <div>
                        <p className="font-medium">Current Device</p>
                        <p className="text-sm text-muted-foreground">
                          Last active: Just now
                        </p>
                      </div>
                      <span className="px-2 py-1 text-xs bg-primary/10 text-primary rounded-full">
                        Current
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-background/50 rounded-lg">
                      <div>
                        <p className="font-medium">iPhone 13</p>
                        <p className="text-sm text-muted-foreground">
                          Last active: 2 days ago
                        </p>
                      </div>
                      <button className="text-sm text-destructive hover:underline">
                        Log out
                      </button>
                    </div>
                    <button
                      onClick={() => {
                        if (
                          confirm(
                            "Are you sure you want to log out from all other devices?"
                          )
                        ) {
                          alert("Logged out from all other devices");
                        }
                      }}
                      className="w-full mt-2 px-4 py-2 border border-destructive/50 text-destructive rounded-lg hover:bg-destructive/10 transition-colors"
                    >
                      Log out from all other devices
                    </button>
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

  return (
    <div className="container max-w-5xl mx-auto py-8 px-4 mt-20">
      <div className="flex items-center mb-6 md:mb-8">
        <button
          onClick={() => router.back()}
          className="mr-4 p-2 rounded-full hover:bg-accent transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold">Settings</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* --- DESKTOP SIDEBAR NAVIGATION (hidden on mobile) --- */}
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

        {/* --- MAIN CONTENT AREA --- */}
        <div className="md:col-span-3">
          {/* --- MOBILE HORIZONTAL TAB NAVIGATION (visible on mobile) --- */}
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

          {/* --- SETTINGS CONTENT --- */}
          <motion.div
            className="bg-card rounded-xl border border-border p-4 md:p-6"
            key={activeTab} // Key re-triggers animation on tab change
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {renderTabContent()}

            <div className="mt-8 pt-6 border-t border-border flex items-center justify-end gap-4">
              {success && <p className="text-sm text-green-500">{success}</p>}
              {error && <p className="text-sm text-red-500">{error}</p>}
              <button
                onClick={handleSave}
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
          </motion.div>
        </div>
      </div>
    </div>
  );
}
