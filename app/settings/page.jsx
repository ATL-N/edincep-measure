'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { 
  Settings as SettingsIcon, 
  User, 
  Bell, 
  Palette, 
  Database,
  Shield,
  Download,
  Upload,
  Trash2,
  Save,
  ArrowLeft,
  Moon,
  Sun,
  Monitor
} from 'lucide-react';
import { useTheme } from '../components/ThemeProvider';

export default function Settings() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('general');
  const [settings, setSettings] = useState({
    notifications: {
      emailNotifications: true,
      pushNotifications: false,
      measurementReminders: true
    },
    measurements: {
      defaultUnit: 'inches',
      precision: 1,
      autoSave: true
    },
    appearance: {
      compactMode: false,
      animationsEnabled: true
    },
    privacy: {
      dataRetention: '1year',
      shareAnalytics: false
    }
  });
  const [saving, setSaving] = useState(false);

  const tabs = [
    { id: 'general', label: 'General', icon: SettingsIcon },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'data', label: 'Data & Privacy', icon: Database },
    { id: 'security', label: 'Security', icon: Shield }
  ];

  const handleSettingChange = (category, setting, value) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [setting]: value
      }
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    setSaving(false);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Measurement Settings</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Default Unit</label>
                  <select
                    value={settings.measurements.defaultUnit}
                    onChange={(e) => handleSettingChange('measurements', 'defaultUnit', e.target.value)}
                    className="w-full bg-background/50 border border-border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="inches">Inches</option>
                    <option value="cm">Centimeters</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Measurement Precision</label>
                  <select
                    value={settings.measurements.precision}
                    onChange={(e) => handleSettingChange('measurements', 'precision', parseInt(e.target.value))}
                    className="w-full bg-background/50 border border-border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value={0}>Whole numbers (36)</option>
                    <option value={1}>One decimal (36.5)</option>
                    <option value={2}>Two decimals (36.25)</option>
                  </select>
                </div>
                
                <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div>
                    <h4 className="font-medium">Auto-save measurements</h4>
                    <p className="text-sm text-muted-foreground">Automatically save measurements as you type</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.measurements.autoSave}
                      onChange={(e) => handleSettingChange('measurements', 'autoSave', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
              </div>
            </div>
          </div>
        );

      case 'appearance':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Theme</h3>
              <div className="grid grid-cols-3 gap-4">
                <button
                  onClick={() => setTheme('light')}
                  className={`p-4 border rounded-lg flex flex-col items-center space-y-2 transition-colors ${
                    theme === 'light' ? 'border-primary bg-primary/10' : 'border-border hover:bg-accent'
                  }`}
                >
                  <Sun className="w-6 h-6" />
                  <span className="text-sm font-medium">Light</span>
                </button>
                
                <button
                  onClick={() => setTheme('dark')}
                  className={`p-4 border rounded-lg flex flex-col items-center space-y-2 transition-colors ${
                    theme === 'dark' ? 'border-primary bg-primary/10' : 'border-border hover:bg-accent'
                  }`}
                >
                  <Moon className="w-6 h-6" />
                  <span className="text-sm font-medium">Dark</span>
                </button>
                
                <button
                  onClick={() => setTheme('system')}
                  className={`p-4 border rounded-lg flex flex-col items-center space-y-2 transition-colors ${
                    theme === 'system' ? 'border-primary bg-primary/10' : 'border-border hover:bg-accent'
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
                <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div>
                    <h4 className="font-medium">Compact Mode</h4>
                    <p className="text-sm text-muted-foreground">Reduce spacing and padding for more content</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.appearance.compactMode}
                      onChange={(e) => handleSettingChange('appearance', 'compactMode', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
                
                <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div>
                    <h4 className="font-medium">Animations</h4>
                    <p className="text-sm text-muted-foreground">Enable smooth transitions and animations</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.appearance.animationsEnabled}
                      onChange={(e) => handleSettingChange('appearance', 'animationsEnabled', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
              </div>
            </div>
          </div>
        );

      case 'notifications':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Notification Preferences</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div>
                    <h4 className="font-medium">Email Notifications</h4>
                    <p className="text-sm text-muted-foreground">Receive updates and reminders via email</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.notifications.emailNotifications}
                      onChange={(e) => handleSettingChange('notifications', 'emailNotifications', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
                
                <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div>
                    <h4 className="font-medium">Push Notifications</h4>
                    <p className="text-sm text-muted-foreground">Get instant notifications in your browser</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.notifications.pushNotifications}
                      onChange={(e) => handleSettingChange('notifications', 'pushNotifications', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
                
                <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div>
                    <h4 className="font-medium">Measurement Reminders</h4>
                    <p className="text-sm text-muted-foreground">Get reminders for scheduled measurement sessions</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.notifications.measurementReminders}
                      onChange={(e) => handleSettingChange('notifications', 'measurementReminders', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
              </div>
            </div>
          </div>
        );
        
      case 'data':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Data Privacy</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Data Retention Period</label>
                  <select
                    value={settings.privacy.dataRetention}
                    onChange={(e) => handleSettingChange('privacy', 'dataRetention', e.target.value)}
                    className="w-full bg-background/50 border border-border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="3months">3 Months</option>
                    <option value="6months">6 Months</option>
                    <option value="1year">1 Year</option>
                    <option value="forever">Forever</option>
                  </select>
                  <p className="mt-2 text-sm text-muted-foreground">
                    How long we keep your measurement data before automatic deletion
                  </p>
                </div>
                
                <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div>
                    <h4 className="font-medium">Share Analytics</h4>
                    <p className="text-sm text-muted-foreground">Help us improve by sharing anonymous usage data</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.privacy.shareAnalytics}
                      onChange={(e) => handleSettingChange('privacy', 'shareAnalytics', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Data Management</h3>
              <div className="space-y-4">
                <div className="p-4 border border-border rounded-lg">
                  <h4 className="font-medium mb-2">Export Your Data</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Download all your measurement data and settings as a JSON file
                  </p>
                  <button 
                    className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
                    onClick={() => {
                      // Export functionality would go here
                      alert('Data export started');
                    }}
                  >
                    <Download className="w-4 h-4" />
                    <span>Export Data</span>
                  </button>
                </div>
                
                <div className="p-4 border border-border rounded-lg">
                  <h4 className="font-medium mb-2">Import Data</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Import measurement data from a previously exported file
                  </p>
                  <button 
                    className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
                    onClick={() => {
                      // Import functionality would go here
                      alert('Please select a file to import');
                    }}
                  >
                    <Upload className="w-4 h-4" />
                    <span>Import Data</span>
                  </button>
                </div>
                
                <div className="p-4 border border-border rounded-lg border-destructive/20">
                  <h4 className="font-medium text-destructive mb-2">Delete All Data</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Permanently delete all your measurement data and client information
                  </p>
                  <button 
                    className="flex items-center gap-2 px-4 py-2 bg-destructive/10 text-destructive rounded-lg hover:bg-destructive/20 transition-colors"
                    onClick={() => {
                      // Delete functionality would go here
                      if (confirm('Are you sure you want to delete all your data? This action cannot be undone.')) {
                        alert('All data has been deleted');
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete All Data</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
        
      case 'security':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Account Security</h3>
              <div className="space-y-4">
                <div className="p-4 border border-border rounded-lg">
                  <h4 className="font-medium mb-2">Change Password</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    It's a good idea to use a strong password that you don't use elsewhere
                  </p>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Current Password</label>
                      <input
                        type="password"
                        placeholder="••••••••"
                        className="w-full bg-background/50 border border-border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2">New Password</label>
                      <input
                        type="password"
                        placeholder="••••••••"
                        className="w-full bg-background/50 border border-border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2">Confirm New Password</label>
                      <input
                        type="password"
                        placeholder="••••••••"
                        className="w-full bg-background/50 border border-border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    
                    <button 
                      className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                      onClick={() => {
                        // Password change functionality would go here
                        alert('Password updated successfully');
                      }}
                    >
                      Update Password
                    </button>
                  </div>
                </div>
                
                <div className="p-4 border border-border rounded-lg">
                  <h4 className="font-medium mb-2">Two-Factor Authentication</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Add an extra layer of security to your account
                  </p>
                  <button 
                    className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
                    onClick={() => {
                      // 2FA setup functionality would go here
                      alert('Two-factor authentication setup started');
                    }}
                  >
                    <Shield className="w-4 h-4" />
                    <span>Enable Two-Factor Authentication</span>
                  </button>
                </div>
                
                <div className="p-4 border border-border rounded-lg">
                  <h4 className="font-medium mb-2">Active Sessions</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Manage devices where you're currently logged in
                  </p>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-background/50 rounded-lg">
                      <div>
                        <p className="font-medium">Current Device</p>
                        <p className="text-sm text-muted-foreground">Last active: Just now</p>
                      </div>
                      <span className="px-2 py-1 text-xs bg-primary/10 text-primary rounded-full">Current</span>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-background/50 rounded-lg">
                      <div>
                        <p className="font-medium">iPhone 13</p>
                        <p className="text-sm text-muted-foreground">Last active: 2 days ago</p>
                      </div>
                      <button className="text-sm text-destructive hover:underline">
                        Log out
                      </button>
                    </div>
                    
                    <button 
                      className="w-full mt-2 px-4 py-2 border border-destructive/50 text-destructive rounded-lg hover:bg-destructive/10 transition-colors"
                      onClick={() => {
                        // Logout functionality would go here
                        if (confirm('Are you sure you want to log out from all other devices?')) {
                          alert('Logged out from all other devices');
                        }
                      }}
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
    <div className="container max-w-5xl mx-auto py-8 px-4">
      <div className="flex items-center mb-8">
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
        {/* Sidebar Navigation */}
        <motion.div 
          className="md:col-span-1"
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          <nav className="space-y-1">
            {tabs.map((tab) => (
              <motion.button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-accent'
                }`}
                variants={itemVariants}
              >
                <tab.icon className="w-5 h-5" />
                <span>{tab.label}</span>
              </motion.button>
            ))}
          </nav>
        </motion.div>
        
        {/* Main Content */}
        <motion.div 
          className="md:col-span-3 bg-card rounded-xl border border-border p-6"
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          {renderTabContent()}
          
          <div className="mt-8 pt-6 border-t border-border flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-70"
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
  );
}
