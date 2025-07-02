"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  UsersIcon,
  ChartBarIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ScaleIcon,
  UserPlusIcon,
  TrophyIcon,
  ClockIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import Link from "next/link";

// Helper to format date
const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 100 } },
};

const StatCard = ({ title, value, change, icon: Icon }) => {
  const isPositive = change >= 0;
  return (
    <motion.div
      variants={itemVariants}
      className="glass rounded-2xl p-6 card-3d"
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        {change !== undefined && (
          <div
            className={`flex items-center text-xs font-semibold ${
              isPositive ? "text-green-500" : "text-red-500"
            }`}
          >
            {isPositive ? (
              <ArrowUpIcon className="h-3 w-3 mr-1" />
            ) : (
              <ArrowDownIcon className="h-3 w-3 mr-1" />
            )}
            {Math.abs(change)}%
          </div>
        )}
      </div>
      <div className="mt-2 flex items-end justify-between">
        <p className="text-3xl font-bold text-foreground">{value}</p>
        <div className="p-3 rounded-xl bg-gradient-to-r from-primary/10 to-secondary/10 text-primary">
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </motion.div>
  );
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass rounded-xl p-4 shadow-lg">
        <p className="label font-semibold text-foreground">{`${label}`}</p>
        <p className="intro text-sm text-primary">{`Measurements: ${payload[0].value}`}</p>
      </div>
    );
  }
  return null;
};

export default function AnalyticsPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/dashboard/stats");
        if (!response.ok) throw new Error("Network response was not ok.");
        const data = await response.json();
        setStats(data);
      } catch (e) {
        setError("Failed to load statistics. Please try again later.");
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen pt-30 pb-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto animate-pulse">
          {/* Header Skeleton */}
          <div className="mb-10">
            <div className="h-10 w-1/3 rounded-lg bg-muted/50"></div>{" "}
            <div className="h-6 w-1/2 mt-4 rounded-lg bg-muted/40"></div>
          </div>
          {/* Stats Cards Skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-32 rounded-2xl bg-muted/50"></div>
            ))}
          </div>
          {/* Chart Skeleton */}
          <div className="h-96 rounded-2xl bg-muted/50 mb-8"></div>
          {/* Tables Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            <div className="lg:col-span-3 h-80 rounded-2xl bg-muted/50"></div>
            <div className="lg:col-span-2 h-80 rounded-2xl bg-muted/50"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center px-4">
        <div className="glass p-8 rounded-2xl">
          <ExclamationTriangleIcon className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-2">
            An Error Occurred
          </h2>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-30 pb-10 px-4 sm:px-6 lg:px-8">
      <motion.div
        className="max-w-7xl mx-auto"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header */}
        <motion.div className="mb-10" variants={itemVariants}>
          <h1 className="text-4xl font-bold gradient-text mb-2">
            Performance Overview
          </h1>
          <p className="text-muted-foreground text-lg">
            Track your business growth and client engagement.
          </p>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Clients"
            value={stats.summaryStats.totalClients.value}
            icon={UsersIcon}
          />
          <StatCard
            title="Total Measurements"
            value={stats.summaryStats.totalMeasurements.value}
            icon={ScaleIcon}
          />
          <StatCard
            title="New Clients (This Month)"
            value={stats.summaryStats.thisMonthClients.value}
            change={stats.summaryStats.thisMonthClients.change}
            icon={UserPlusIcon}
          />
          <StatCard
            title="Measurements (This Month)"
            value={stats.summaryStats.thisMonthMeasurements.value}
            change={stats.summaryStats.thisMonthMeasurements.change}
            icon={ChartBarIcon}
          />
        </div>

        {/* Main Chart */}
        <motion.div
          variants={itemVariants}
          className="glass rounded-2xl p-6 mb-8"
        >
          <h2 className="text-xl font-semibold text-foreground mb-4">
            Monthly Measurement Activity
          </h2>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={stats.monthlyGrowth}
                margin={{ top: 5, right: 20, left: -10, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border) / 0.5)"
                />
                <XAxis
                  dataKey="month"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  content={<CustomTooltip />}
                  cursor={{ fill: "hsl(var(--primary) / 0.1)" }}
                />
                <Legend iconType="circle" />
                <Bar
                  dataKey="count"
                  name="Measurements"
                  fill="hsl(var(--primary))"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Detailed Lists */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Top Clients */}
          <motion.div
            variants={itemVariants}
            className="lg:col-span-2 glass rounded-2xl p-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <TrophyIcon className="h-6 w-6 text-brand-accent" />
              <h2 className="text-xl font-semibold text-foreground">
                Top Clients
              </h2>
            </div>
            <div className="space-y-4">
              {stats.topClients.map((client, index) => (
                <div
                  key={client.id}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-bold text-muted-foreground w-6 text-center">
                      {index + 1}
                    </span>
                    <Link
                      href={`/clients/${client.id}`}
                      className="font-medium text-foreground hover:text-primary transition-colors"
                    >
                      {client.name}
                    </Link>
                  </div>
                  <span className="text-sm font-semibold bg-primary/10 text-primary px-3 py-1 rounded-full">
                    {client.measurementCount}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
          {/* Recent Activity */}
          <motion.div
            variants={itemVariants}
            className="lg:col-span-3 glass rounded-2xl p-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <ClockIcon className="h-6 w-6 text-brand-secondary" />
              <h2 className="text-xl font-semibold text-foreground">
                Recent Activity
              </h2>
            </div>
            <div className="flow-root">
              <ul role="list" className="-mb-8">
                {stats.recentMeasurements.map((item, itemIdx) => (
                  <li key={item.id}>
                    <div className="relative pb-8">
                      {itemIdx !== stats.recentMeasurements.length - 1 ? (
                        <span
                          className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-border"
                          aria-hidden="true"
                        />
                      ) : null}
                      <div className="relative flex space-x-3 items-center">
                        <div>
                          <span className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center ring-8 ring-background">
                            <ScaleIcon
                              className="h-5 w-5 text-primary"
                              aria-hidden="true"
                            />
                          </span>
                        </div>
                        <div className="flex min-w-0 flex-1 justify-between space-x-4">
                          <div>
                            <p className="text-sm text-foreground">
                              New measurement for{" "}
                              <Link
                                href={`/clients/${item.client.id}`}
                                className="font-medium text-primary hover:underline"
                              >
                                {item.client.name}
                              </Link>
                            </p>
                          </div>
                          <div className="whitespace-nowrap text-right text-sm text-muted-foreground">
                            <time dateTime={item.createdAt}>
                              {formatDate(item.createdAt)}
                            </time>
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
