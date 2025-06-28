"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  UsersIcon,
  PlusIcon,
  ChartBarIcon,
  CalendarIcon,
  TrendingUpIcon,
  ClockIcon,
  ArrowRightIcon,
  EyeIcon,
} from "@heroicons/react/24/outline";

// Dummy data
const stats = [
  {
    name: "Total Clients",
    value: "124",
    change: "+12%",
    icon: UsersIcon,
    color: "text-blue-500",
  },
  {
    name: "This Month",
    value: "8",
    change: "+23%",
    icon: CalendarIcon,
    color: "text-green-500",
  },
  {
    name: "Measurements",
    value: "1,247",
    change: "+5%",
    icon: ChartBarIcon,
    color: "text-purple-500",
  },
  {
    name: "Active Projects",
    value: "15",
    change: "+3%",
    icon: TrendingUpIcon,
    color: "text-orange-500",
  },
];

const recentClients = [
  {
    id: 1,
    name: "Sarah Johnson",
    phone: "+1 (555) 123-4567",
    lastMeasured: "2 days ago",
    status: "Completed",
  },
  {
    id: 2,
    name: "Emily Davis",
    phone: "+1 (555) 987-6543",
    lastMeasured: "5 days ago",
    status: "In Progress",
  },
  {
    id: 3,
    name: "Michael Brown",
    phone: "+1 (555) 456-7890",
    lastMeasured: "1 week ago",
    status: "Pending",
  },
  {
    id: 4,
    name: "Jessica Wilson",
    phone: "+1 (555) 321-0987",
    lastMeasured: "2 weeks ago",
    status: "Completed",
  },
];

const upcomingAppointments = [
  {
    client: "Amanda Clark",
    time: "Today, 2:00 PM",
    type: "Initial Measurement",
  },
  { client: "Robert Lee", time: "Tomorrow, 10:30 AM", type: "Fitting Session" },
  { client: "Lisa Garcia", time: "Friday, 3:00 PM", type: "Final Fitting" },
];

const quickActions = [
  {
    title: "Add New Client",
    description: "Register a new client",
    href: "/clients/new",
    icon: PlusIcon,
    color: "from-blue-500 to-cyan-500",
  },
  {
    title: "Take Measurements",
    description: "Record client measurements",
    href: "/clients",
    icon: ChartBarIcon,
    color: "from-purple-500 to-pink-500",
  },
  {
    title: "View All Clients",
    description: "Browse client database",
    href: "/clients",
    icon: UsersIcon,
    color: "from-green-500 to-emerald-500",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      delayChildren: 0.1,
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      damping: 12,
      stiffness: 200,
    },
  },
};

export default function Dashboard() {
  return (
    <div className="min-h-screen pt-30 pb-10 px-4 sm:px-6 lg:px-8">
      <motion.div
        className="max-w-7xl mx-auto"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header */}
        <motion.div className="mb-8" variants={itemVariants}>
          <h1 className="text-4xl font-bold gradient-text mb-2">
            Welcome back! ✨
          </h1>
          <p className="text-muted-foreground text-lg">
            Here's what's happening with your fashion business today.
          </p>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
          variants={itemVariants}
        >
          {stats?.map((stat, index) => {
            const Icon = stat?.icon;
            return (
              <motion.div
                key={stat.name}
                className="glass rounded-2xl p-6 card-3d hover:shadow-2xl group"
                whileHover={{ scale: 1.02, rotateY: 5 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div
                    className={`p-3 rounded-xl bg-gradient-to-r from-primary/20 to-secondary/20 ${stat.color}`}
                  >
                    <EyeIcon className="w-6 h-6" />
                  </div>
                  <span className="text-sm font-medium text-green-500 bg-green-500/10 px-2 py-1 rounded-full">
                    {stat.change}
                  </span>
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground mb-1">
                    {stat.value}
                  </p>
                  <p className="text-sm text-muted-foreground">{stat.name}</p>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Quick Actions */}
        <motion.div className="mb-8" variants={itemVariants}>
          <h2 className="text-2xl font-semibold text-foreground mb-6">
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <motion.div
                  key={action.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Link
                    href={action.href}
                    className="block p-6 glass rounded-2xl hover:shadow-xl transition-all duration-300 group"
                  >
                    <div
                      className={`w-12 h-12 rounded-xl bg-gradient-to-r ${action.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
                    >
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      {action.title}
                    </h3>
                    <p className="text-muted-foreground text-sm mb-3">
                      {action.description}
                    </p>
                    <div className="flex items-center text-primary group-hover:translate-x-1 transition-transform">
                      <span className="text-sm font-medium">Get started</span>
                      <ArrowRightIcon className="w-4 h-4 ml-1" />
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Clients */}
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
                  View all
                  <ArrowRightIcon className="w-4 h-4 ml-1" />
                </Link>
              </div>

              <div className="space-y-4">
                {recentClients.map((client, index) => (
                  <motion.div
                    key={client.id}
                    className="flex items-center justify-between p-4 rounded-xl hover:bg-muted/30 transition-colors group cursor-pointer"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ scale: 1.01 }}
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 rounded-full gradient-bg flex items-center justify-center text-white font-semibold">
                        {client.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
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
                    <div className="text-right">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                          client.status === "Completed"
                            ? "bg-green-500/10 text-green-500"
                            : client.status === "In Progress"
                            ? "bg-blue-500/10 text-blue-500"
                            : "bg-orange-500/10 text-orange-500"
                        }`}
                      >
                        {client.status}
                      </span>
                      <p className="text-sm text-muted-foreground mt-1">
                        {client.lastMeasured}
                      </p>
                    </div>
                    <button className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <EyeIcon className="w-5 h-5 text-muted-foreground hover:text-primary" />
                    </button>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Upcoming Appointments */}
          <motion.div className="space-y-6" variants={itemVariants}>
            <div className="glass rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-foreground">
                  Upcoming
                </h2>
                <ClockIcon className="w-5 h-5 text-muted-foreground" />
              </div>

              <div className="space-y-4">
                {upcomingAppointments.map((appointment, index) => (
                  <motion.div
                    key={appointment.client}
                    className="p-4 border-l-4 border-primary bg-primary/5 rounded-r-lg"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
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
                ))}
              </div>
            </div>

            {/* Activity Summary */}
            <div className="glass rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                This Week
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    Measurements taken
                  </span>
                  <span className="font-semibold text-foreground">23</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    New clients
                  </span>
                  <span className="font-semibold text-foreground">3</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    Appointments
                  </span>
                  <span className="font-semibold text-foreground">8</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
