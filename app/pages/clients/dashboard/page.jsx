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

export default function ClientDashboard() {
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

  return (
    <div className="min-h-screen pt-0 md:pt-30 pb-10 mb-24 px-4 sm:px-6 lg:px-8">
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
            Here are your recent measurements.
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
          <motion.div className="lg:col-span-3" variants={itemVariants}>
            <div className="glass rounded-2xl p-6 h-full">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-semibold text-foreground">
                  My Measurements
                </h2>
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
                ) : data?.measurements?.length > 0 ? (
                  data.measurements.map((measurement) => (
                    <Link
                      href={`/pages/clients/${measurement.clientId}/measurements/${measurement.id}`}
                      key={measurement.id}
                      className="block group"
                    >
                      <div className="flex items-center justify-between p-4 rounded-xl hover:bg-muted/30 transition-colors cursor-pointer">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 rounded-full gradient-bg flex-shrink-0 flex items-center justify-center text-white font-semibold">
                            {measurement.id.substring(0, 2)}
                          </div>
                          <div>
                            <p className="font-medium text-foreground">
                              Measurement Session
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(measurement.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="text-right hidden sm:block">
                          <p className="text-sm text-muted-foreground mt-1">
                            {formatTimeAgo(measurement.createdAt)}
                          </p>
                        </div>
                        <div
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          title="View Measurement Details"
                        >
                          <EyeIcon className="w-5 h-5 text-muted-foreground hover:text-primary" />
                        </div>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="text-center py-10 text-muted-foreground">
                    <ChartBarIcon className="w-10 h-10 mx-auto mb-2" />
                    <p>No measurements found.</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}