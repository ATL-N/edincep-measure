"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useParams, useRouter } from "next/navigation";
import {
  Calendar,
  Ruler,
  Search,
  Plus,
  ArrowLeft,
  FileText,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";

// Custom hook for debouncing input
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
};

// Skeleton Loader Component
const MeasurementHistorySkeleton = () => (
  <div className="min-h-screen p-6 pt-30 animate-pulse">
    <div className="max-w-6xl mx-auto">
      <div className="h-6 w-48 bg-muted/50 rounded mb-8"></div>
      <div className="glass rounded-2xl p-8 border mb-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-8 w-72 bg-muted/50 rounded mb-2"></div>
            <div className="h-5 w-80 bg-muted/50 rounded"></div>
          </div>
          <div className="w-40 h-12 bg-muted/50 rounded-xl"></div>
        </div>
      </div>
      <div className="mb-8">
        <div className="glass rounded-xl p-6 border h-20"></div>
      </div>
      <div className="space-y-6">
        <div className="glass rounded-xl border p-6 h-48"></div>
        <div className="glass rounded-xl border p-6 h-48"></div>
        <div className="glass rounded-xl border p-6 h-48"></div>
      </div>
    </div>
  </div>
);

export default function MeasurementHistoryPage() {
  const { id } = useParams();
  const router = useRouter();

  const [sessions, setSessions] = useState([]);
  const [client, setClient] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const debouncedSearchQuery = useDebounce(searchQuery, 500);

  const fetchHistory = useCallback(async () => {
    if (!isLoading) setIsSearching(true);
    setError(null);
    try {
      const params = new URLSearchParams({ search: debouncedSearchQuery });
      const response = await fetch(
        `/api/clients/${id}/measurements?${params.toString()}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error: ${response.status}`);
      }
      const data = await response.json();
      setClient(data.client);
      setSessions(data.measurements);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
      setIsSearching(false);
    }
  }, [id, debouncedSearchQuery, isLoading]);

  useEffect(() => {
    fetchHistory();
  }, [id, debouncedSearchQuery, fetchHistory]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };
  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 },
  };

  // Helper to get a few key measurements for the preview card
  const getKeyMeasurements = (session) => {
    const keys = [
      {
        name: "Bust",
        value: session.bustSnug || session.bustStatic || session.bustDynamic,
      },
      {
        name: "Waist",
        value: session.waistSnug || session.waistStatic || session.waistDynamic,
      },
      {
        name: "Hip",
        value: session.hipSnug || session.hipStatic || session.hipDynamic,
      },
    ];
    return keys.filter((k) => k.value !== null && k.value !== undefined);
  };

  if (isLoading) {
    return <MeasurementHistorySkeleton />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center p-6">
        <AlertTriangle className="w-16 h-16 text-destructive mb-4" />
        <h2 className="text-2xl font-bold mb-2">
          Failed to load measurement history
        </h2>
        <p className="text-muted-foreground mb-6">{error}</p>
        <button
          onClick={() => router.back()}
          className="text-primary hover:underline"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 pt-30">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-6xl mx-auto"
      >
        <motion.div variants={itemVariants} className="mb-8">
          <button
            onClick={() => router.back()}
            className="mb-4 text-muted-foreground hover:text-foreground transition-colors flex items-center space-x-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to {client?.name}</span>
          </button>
          <div className="glass rounded-2xl p-8 border">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold gradient-text mb-2">
                  Measurement History
                </h1>
                <p className="text-muted-foreground">
                  All measurement sessions for {client?.name}
                </p>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push(`/clients/${id}/measurements/new`)}
                className="bg-primary text-primary-foreground px-6 py-3 rounded-xl flex items-center space-x-2 hover:bg-primary/90 transition-colors"
              >
                <Plus className="w-5 h-5" />
                <span>New Session</span>
              </motion.button>
            </div>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="mb-8">
          <div className="glass rounded-xl p-6 border">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
              <input
                type="text"
                placeholder="Search sessions by notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-background/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </motion.div>

        <motion.div
          variants={itemVariants}
          className={`space-y-6 transition-opacity duration-300 ${
            isSearching ? "opacity-50" : "opacity-100"
          }`}
        >
          {sessions.length > 0 ? (
            sessions.map((session, index) => (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="glass rounded-xl border p-6 hover:bg-accent/50 transition-colors cursor-pointer card-3d"
                onClick={() =>
                  router.push(`/clients/${id}/measurements/${session.id}`)
                }
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Calendar className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">
                        Session from{" "}
                        {new Date(session.createdAt).toLocaleDateString(
                          "en-US",
                          { year: "numeric", month: "long", day: "numeric" }
                        )}
                      </h3>
                      <p className="text-muted-foreground text-sm">
                        {new Date(session.createdAt).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-primary">
                      {session.totalMeasurementsCount}
                    </div>
                    <div className="text-muted-foreground text-sm">
                      measurements
                    </div>
                  </div>
                </div>
                <div className="mb-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Notes</span>
                  </div>
                  <p className="text-muted-foreground pl-6 italic">
                    {session.notes || "No notes for this session."}
                  </p>
                </div>
                <div className="border-t border-border pt-4">
                  <div className="flex items-center space-x-2 mb-3">
                    <TrendingUp className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      Key Measurements
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pl-6">
                    {getKeyMeasurements(session).length > 0 ? (
                      getKeyMeasurements(session).map((m, idx) => (
                        <div key={idx} className="text-center">
                          <div className="text-lg font-semibold text-primary">
                            {m.value}"
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {m.name}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground col-span-full">
                        No key measurements recorded.
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="glass rounded-xl border p-12 text-center">
              <Ruler className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">
                {searchQuery
                  ? "No matching sessions found"
                  : "No measurement sessions yet"}
              </h3>
              <p className="text-muted-foreground mb-6">
                {searchQuery
                  ? "Try adjusting your search terms."
                  : "Start by taking the first set of measurements."}
              </p>
              {!searchQuery && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => router.push(`/clients/${id}/measurements/new`)}
                  className="bg-primary text-primary-foreground px-6 py-3 rounded-xl hover:bg-primary/90 transition-colors"
                >
                  Take First Measurements
                </motion.button>
              )}
            </div>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}
