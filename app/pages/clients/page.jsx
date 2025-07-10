"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  PlusIcon,
  PhoneIcon,
  EnvelopeIcon,
  CalendarIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

// A custom hook to debounce user input
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
};

// A simple spinner component for the search indicator
const Spinner = () => (
  <svg
    className="animate-spin h-5 w-5 text-muted-foreground"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    ></circle>
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    ></path>
  </svg>
);

export default function ClientsPage() {
  // State for data from API
  const [clients, setClients] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [isLoading, setIsLoading] = useState(true); // For initial page load
  const [isSearching, setIsSearching] = useState(false); // For subsequent searches/filters
  const [error, setError] = useState(null);

  // State for filters, search, and pagination
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [sortBy, setSortBy] = useState("recent");
  const [currentPage, setCurrentPage] = useState(1);
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  // Data fetching logic
  const fetchClients = useCallback(async () => {
    // Determine if this is a subsequent search or the initial load
    // We check if pagination data already exists to make this determination.
    if (!isLoading) {
      setIsSearching(true);
    }
    setError(null);

    try {
      const params = new URLSearchParams({
        page: currentPage,
        limit: 12,
        search: debouncedSearchTerm,
        status: filterStatus,
        sort: sortBy,
      });

      const response = await fetch(`/api/clients?${params.toString()}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch clients");
      }
      const data = await response.json();
      setClients(data.clients);
      setPagination(data.pagination);
    } catch (err) {
      setError(err.message);
      setClients([]); // Clear clients on error
      setPagination(null);
    } finally {
      // Always turn off both loading states
      setIsLoading(false);
      setIsSearching(false);
    }
  }, [isLoading, currentPage, debouncedSearchTerm, filterStatus, sortBy]);

  // Effect to re-fetch when dependencies change
  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  // Reset to page 1 when filters or sort change, but not for the initial render
  useEffect(() => {
    if (!isLoading) {
      setCurrentPage(1);
    }
  }, [debouncedSearchTerm, filterStatus, sortBy]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
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

  return (
    <div className="min-h-screen pt-0 md:pt-30 pb-10 mb-24 px-4 sm:px-6 lg:px-8">
      <motion.div
        className="max-w-7xl mx-auto"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        {/* Header */}
        <motion.div className="mb-8" variants={itemVariants}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-4xl font-bold gradient-text mb-2">
                Clients Directory 👥
              </h1>
              <p className="text-muted-foreground text-lg">
                Manage your client database and measurements
              </p>
            </div>
            <Link href="/pages/clients/new">
              <motion.button
                className="mt-4 sm:mt-0 px-6 py-3 rounded-xl gradient-bg text-white font-medium flex items-center space-x-2 shadow-lg"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <PlusIcon className="w-5 h-5" />
                <span>Add Client</span>
              </motion.button>
            </Link>
          </div>
        </motion.div>

        {/* Filters and Search */}
        <motion.div
          className="glass rounded-2xl p-6 mb-8"
          variants={itemVariants}
        >
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search clients by name, phone, or email..."
                className="w-full pl-10 pr-10 py-3 rounded-xl border border-border bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {/* Spinner appears inside the search bar when searching */}
              {isSearching && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <Spinner />
                </div>
              )}
            </div>
            <select
              className="px-4 py-3 rounded-xl border border-border bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="All">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
            <select
              className="px-4 py-3 rounded-xl border border-border bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="recent">Most Recent</option>
              <option value="name">Sort by Name</option>
              <option value="measurements">Most Measurements</option>
            </select>
          </div>
          <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {pagination
                ? `Showing ${clients.length} of ${pagination.total} clients`
                : "Loading..."}
            </span>
            <div className="flex items-center space-x-2">
              <FunnelIcon className="w-4 h-4" />
              <span>Filtered by: {filterStatus}</span>
            </div>
          </div>
        </motion.div>

        {/* --- CONTENT AREA --- */}
        {/* Initial Load Skeleton */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="glass rounded-2xl p-6 h-64 animate-pulse">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-full bg-muted/30"></div>
                  <div className="w-20 h-6 rounded-full bg-muted/30"></div>
                </div>
                <div className="mt-4 space-y-2">
                  <div className="h-6 w-3/4 rounded bg-muted/30"></div>
                  <div className="h-4 w-1/2 rounded bg-muted/30"></div>
                  <div className="h-4 w-5/6 rounded bg-muted/30"></div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <motion.div
            className="text-center py-16 bg-red-500/10 text-red-500 rounded-2xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-red-500/20 flex items-center justify-center">
              <ExclamationTriangleIcon className="w-12 h-12" />
            </div>
            <h3 className="text-xl font-semibold mb-2">An Error Occurred</h3>
            <p>{error}</p>
          </motion.div>
        ) : (
          <>
            {/* Clients Grid with smooth transition on search */}
            <motion.div
              className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 transition-opacity duration-300 ${
                isSearching ? "opacity-50" : "opacity-100"
              }`}
              variants={containerVariants}
            >
              <AnimatePresence>
                {clients.map((client) => (
                  <motion.div
                    key={client.id}
                    className="glass rounded-2xl p-6 card-3d hover:shadow-2xl group cursor-pointer"
                    variants={itemVariants}
                    layout
                    exit={{ opacity: 0, scale: 0.8 }}
                    whileHover={{
                      scale: 1.02,
                      rotateY: 5,
                      transition: { type: "spring", stiffness: 300 },
                    }}
                  >
                    <Link href={`/pages/clients/${client.id}`}>
                      {/* Client card content remains the same */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="w-12 h-12 rounded-full gradient-bg flex items-center justify-center text-white font-semibold text-lg">
                            {client.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </div>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${
                              client.status === "Active"
                                ? "bg-green-500/10 text-green-500"
                                : "bg-orange-500/10 text-orange-500"
                            }`}
                          >
                            {client.status}
                          </span>
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-foreground mb-1">
                            {client.name}
                          </h3>
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                              <PhoneIcon className="w-4 h-4" />
                              <span>{client.phone || "N/A"}</span>
                            </div>
                            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                              <EnvelopeIcon className="w-4 h-4" />
                              <span className="truncate">
                                {client.email || "N/A"}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/50">
                          <div className="text-center">
                            <span className="text-sm text-muted-foreground mb-1">
                              Measurements
                            </span>
                            <p className="text-lg font-semibold text-foreground">
                              {client._count.measurements}
                            </p>
                          </div>
                          <div className="text-center">
                            <span className="text-sm text-muted-foreground mb-1">
                              Last Visit
                            </span>
                            <p className="text-sm font-medium text-foreground">
                              {client.measurements[0]?.createdAt
                                ? new Date(
                                    client.measurements[0].createdAt
                                  ).toLocaleDateString()
                                : "Never"}
                            </p>
                          </div>
                        </div>
                        {client.notes && (
                          <div className="pt-2 border-t border-border/30">
                            <p className="text-xs text-muted-foreground italic">
                              "{client.notes}"
                            </p>
                          </div>
                        )}
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>

            {/* Empty State */}
            {!isSearching && clients.length === 0 && (
              <motion.div
                className="text-center py-16"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-muted/30 flex items-center justify-center">
                  <MagnifyingGlassIcon className="w-12 h-12 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  No clients found
                </h3>
                <p className="text-muted-foreground mb-6">
                  Try adjusting your search or filter criteria.
                </p>
                <Link href="/pages/clients/new">
                  <motion.button
                    className="px-6 py-3 rounded-xl gradient-bg text-white font-medium"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Add Your First Client
                  </motion.button>
                </Link>
              </motion.div>
            )}
          </>
        )}

        {/* Floating Action Button */}
        <motion.div
          className="fixed bottom-26 sm:bottom-6 right-6 z-40"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{
            delay: 0.5,
            type: "spring",
            stiffness: 260,
            damping: 20,
          }}
        >
          <Link href="/pages/clients/new">
            <motion.button
              className="w-14 h-14 rounded-full gradient-bg shadow-lg flex items-center justify-center text-white animate-pulse-glow"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <PlusIcon className="w-6 h-6" />
            </motion.button>
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
}
