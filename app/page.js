"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  UsersIcon,
  PlusIcon,
  ChartBarIcon,
  CalendarIcon,
  ArrowTrendingUpIcon,
  ClockIcon,
  ArrowRightIcon,
  EyeIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

// Helper function to format dates into "X days ago"
function formatTimeAgo(dateString) {
  if (!dateString) return "Never";
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " years ago";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " months ago";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " days ago";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " hours ago";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " minutes ago";

  if (seconds < 10) return "just now";

  return Math.floor(seconds) + " seconds ago";
}

const quickActions = [
  {
    title: "Add New Client",
    description: "Register a new client profile",
    href: "/clients/add", // Corrected href
    icon: PlusIcon,
    color: "from-blue-500 to-cyan-500",
  },
  {
    title: "Take Measurements",
    description: "Find a client to measure",
    href: "/clients",
    icon: ChartBarIcon,
    color: "from-purple-500 to-pink-500",
  },
  {
    title: "View All Clients",
    description: "Browse your client database",
    href: "/clients",
    icon: UsersIcon,
    color: "from-green-500 to-emerald-500",
  },
];

// Mock data for appointments as it's not in the DB schema
const upcomingAppointments = [
  {
    client: "Amanda Clark",
    time: "Today, 2:00 PM",
    type: "Initial Measurement",
  },
  { client: "Robert Lee", time: "Tomorrow, 10:30 AM", type: "Fitting Session" },
  { client: "Lisa Garcia", time: "Friday, 3:00 PM", type: "Final Fitting" },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: "spring", stiffness: 100 },
  },
};

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch("/api/dashboard");
        if (!response.ok) {
          throw new Error("Failed to fetch data from the server.");
        }
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const stats = data
    ? [
        {
          name: "Total Clients",
          value: data.stats.totalClients,
          icon: UsersIcon,
        },
        {
          name: "New This Month",
          value: data.stats.newClientsThisMonth,
          icon: CalendarIcon,
        },
        {
          name: "Measurements",
          value: data.stats.totalMeasurements,
          icon: ChartBarIcon,
        },
        {
          name: "Active Clients",
          value: data.stats.activeClients,
          icon: ArrowTrendingUpIcon,
        },
      ]
    : [];

  return (
    <div className="min-h-screen pt-30 pb-10 px-4 sm:px-6 lg:px-8">
      <motion.div
        className="max-w-7xl mx-auto"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div className="mb-8" variants={itemVariants}>
          <h1 className="text-4xl font-bold gradient-text mb-2">
            Welcome back! ✨
          </h1>
          <p className="text-muted-foreground text-lg">
            Here's what's happening with your fashion business today.
          </p>
        </motion.div>

        {error && (
          <motion.div
            variants={itemVariants}
            className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-2xl mb-8 flex items-center"
          >
            <ExclamationTriangleIcon className="w-6 h-6 mr-3" />
            <p>
              <strong>Error:</strong> {error}
            </p>
          </motion.div>
        )}

        {/* Stats Grid */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
          variants={itemVariants}
        >
          {loading
            ? Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="glass rounded-2xl p-6 h-[136px] animate-pulse"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-muted/30"></div>
                  </div>
                  <div>
                    <div className="h-7 w-1/3 rounded bg-muted/30 mb-2"></div>
                    <div className="h-4 w-2/3 rounded bg-muted/30"></div>
                  </div>
                </div>
              ))
            : stats.map((stat) => (
                <motion.div
                  key={stat.name}
                  className="glass rounded-2xl p-6"
                  variants={itemVariants}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 rounded-xl bg-gradient-to-r from-primary/20 to-secondary/20 text-primary">
                      <stat.icon className="w-6 h-6" />
                    </div>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground mb-1">
                      {stat.value}
                    </p>
                    <p className="text-sm text-muted-foreground">{stat.name}</p>
                  </div>
                </motion.div>
              ))}
        </motion.div>

        {/* Quick Actions */}
        <motion.div className="mb-8" variants={itemVariants}>
          <h2 className="text-2xl font-semibold text-foreground mb-6">
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {quickActions.map((action) => (
              <motion.div
                key={action.title}
                whileHover={{ y: -5 }}
                className="h-full"
              >
                <Link
                  href={action.href}
                  className="block p-6 glass rounded-2xl hover:shadow-xl transition-all duration-300 group h-full"
                >
                  <div
                    className={`w-12 h-12 rounded-xl bg-gradient-to-r ${action.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
                  >
                    <action.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {action.title}
                  </h3>
                  <p className="text-muted-foreground text-sm mb-3">
                    {action.description}
                  </p>
                  <div className="flex items-center text-primary group-hover:translate-x-1 transition-transform mt-auto">
                    <span className="text-sm font-medium">Get started</span>
                    <ArrowRightIcon className="w-4 h-4 ml-1" />
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <motion.div className="lg:col-span-2" variants={itemVariants}>
            <div className="glass rounded-2xl p-6 h-full">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-foreground">
                  Recent Clients
                </h2>
                <Link
                  href="/clients"
                  className="text-primary hover:text-primary/80 text-sm font-medium transition-colors flex items-center"
                >
                  View all <ArrowRightIcon className="w-4 h-4 ml-1" />
                </Link>
              </div>
              <div className="space-y-4">
                {loading ? (
                  Array.from({ length: 4 }).map((_, index) => (
                    <div
                      key={index}
                      className="flex items-center p-4 animate-pulse"
                    >
                      <div className="w-12 h-12 rounded-full bg-muted/30 mr-4"></div>
                      <div className="flex-grow space-y-2">
                        <div className="h-4 w-1/2 rounded bg-muted/30"></div>
                        <div className="h-4 w-1/3 rounded bg-muted/30"></div>
                      </div>
                      <div className="w-24 h-6 rounded-full bg-muted/30"></div>
                    </div>
                  ))
                ) : data?.recentClients?.length > 0 ? (
                  data.recentClients.map((client) => (
                    <Link
                      href={`/clients/${client.id}`}
                      key={client.id}
                      className="block group"
                    >
                      <div className="flex items-center justify-between p-4 rounded-xl hover:bg-muted/30 transition-colors cursor-pointer">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 rounded-full gradient-bg flex-shrink-0 flex items-center justify-center text-white font-semibold">
                            {client.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-foreground">
                              {client.name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {client.phone}
                            </p>
                          </div>
                        </div>
                        <div className="text-right hidden sm:block">
                          <span
                            className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                              client.status === "Active"
                                ? "bg-green-500/10 text-green-500"
                                : "bg-gray-500/10 text-gray-400"
                            }`}
                          >
                            {client.status}
                          </span>
                          <p className="text-sm text-muted-foreground mt-1">
                            {formatTimeAgo(client.lastMeasured)}
                          </p>
                        </div>
                        <div
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          title="View Client Details"
                        >
                          <EyeIcon className="w-5 h-5 text-muted-foreground hover:text-primary" />
                        </div>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="text-center py-10 text-muted-foreground">
                    <UsersIcon className="w-10 h-10 mx-auto mb-2" />
                    <p>No recent clients found.</p>
                    <Link
                      href="/clients/add"
                      className="text-primary hover:underline mt-2 inline-block"
                    >
                      Add your first client
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          <motion.div className="space-y-6" variants={itemVariants}>
            <div className="glass rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-foreground">
                  Upcoming
                </h2>
                <ClockIcon className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="space-y-4">
                {upcomingAppointments.length > 0 ? (
                  upcomingAppointments.map((appointment) => (
                    <motion.div
                      key={appointment.client}
                      className="p-4 border-l-4 border-primary bg-primary/5 rounded-r-lg"
                      whileHover={{ borderColor: "var(--primary-hover)" }}
                    >
                      <p className="font-medium text-foreground mb-1">
                        {appointment.client}
                      </p>
                      <p className="text-sm text-muted-foreground mb-2">
                        {appointment.time}
                      </p>
                      <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                        {appointment.type}
                      </span>
                    </motion.div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No upcoming appointments.
                  </p>
                )}
                <p className="text-xs text-center text-muted-foreground/50 pt-2">
                  Appointment data is currently mocked.
                </p>
              </div>
            </div>

            <div className="glass rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                This Week
              </h3>
              {loading ? (
                <div className="space-y-3 animate-pulse">
                  <div className="flex justify-between items-center">
                    <div className="h-4 w-2/4 bg-muted/30 rounded"></div>
                    <div className="h-5 w-8 bg-muted/30 rounded"></div>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="h-4 w-2/5 bg-muted/30 rounded"></div>
                    <div className="h-5 w-8 bg-muted/30 rounded"></div>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="h-4 w-3/5 bg-muted/30 rounded"></div>
                    <div className="h-5 w-8 bg-muted/30 rounded"></div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      Measurements taken
                    </span>
                    <span className="font-semibold text-foreground">
                      {data?.activitySummary?.measurementsThisWeek}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      New clients
                    </span>
                    <span className="font-semibold text-foreground">
                      {data?.activitySummary?.newClientsThisWeek}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      Appointments
                    </span>
                    <span className="font-semibold text-foreground">
                      {data?.activitySummary?.appointmentsThisWeek}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
