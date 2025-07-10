"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  FileText,
  Ruler,
  User,
  Edit3,
  Download,
  Share,
  AlertTriangle,
  Heart,
  Maximize,
  TrendingUp,
  Move,
  Target,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

// Icons for categories
const categoryIcons = {
  length: Ruler,
  width: Maximize,
  circumference: Target,
  arm: Move,
  leg: User,
  special: Target, // Added for consistency
  default: Heart,
};

// Skeleton Loader (remains the same)
const MeasurementDetailSkeleton = () => (
  <div className="min-h-screen p-6 pt-30 animate-pulse">
    {/* ... skeleton code is unchanged ... */}
  </div>
);

export default function MeasurementDetailPage() {
  const { id, sessionId } = useParams();
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [client, setClient] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeCategory, setActiveCategory] = useState("all");
  const [expandedCategories, setExpandedCategories] = useState({});

  useEffect(() => {
    if (!id || !sessionId) return;
    const fetchSession = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/clients/${id}/measurements/${sessionId}`
        );
        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || "Failed to load session data.");
        }
        const data = await response.json();
        setClient(data.client);
        setSession(data.session);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSession();
  }, [id, sessionId]);

  // Effect to manage which category tables are expanded
  useEffect(() => {
    if (!session?.measurements) return;

    if (activeCategory === "all") {
      // Expand all categories when 'all' is selected
      const allExpanded = Object.keys(session.measurements).reduce(
        (acc, key) => {
          acc[key] = true;
          return acc;
        },
        {}
      );
      setExpandedCategories(allExpanded);
    } else {
      // Expand only the active category
      const singleExpanded = { [activeCategory]: true };
      setExpandedCategories(singleExpanded);
    }
  }, [activeCategory, session]);

  const toggleCategory = (categoryKey) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [categoryKey]: !prev[categoryKey],
    }));
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
  };
  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 },
  };

  if (isLoading) return <MeasurementDetailSkeleton />;

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center p-6">
        <AlertTriangle className="w-16 h-16 text-destructive mb-4" />
        <h2 className="text-2xl font-bold mb-2">Could Not Load Session</h2>
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

  const allMeasurements = Object.values(session.measurements).flat();
  const totalMeasurements = allMeasurements.length;
  const categories = Object.keys(session.measurements);
  const categoriesToRender =
    activeCategory === "all"
      ? categories
      : categories.includes(activeCategory)
      ? [activeCategory]
      : [];

  return (
    <div className="min-h-screen pt-0 md:pt-30 pb-10 mb-24 px-4 sm:px-6 lg:px-8">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-6xl mx-auto"
      >
        {/* Header and Client Info - Unchanged */}
        <motion.div variants={itemVariants} className="mb-8">
          {/* ... header code is unchanged ... */}
        </motion.div>

        {/* Session Notes - Unchanged */}
        {session.notes && (
          <motion.div variants={itemVariants} className="mb-8">
            {/* ... notes code is unchanged ... */}
          </motion.div>
        )}

        {/* Category Filters - Unchanged */}
        <motion.div variants={itemVariants} className="mb-8">
          {/* ... filter buttons code is unchanged ... */}
        </motion.div>

        {/* NEW: Measurement Tables */}
        <motion.div variants={itemVariants} className="space-y-6">
          {categoriesToRender.map((categoryKey) => {
            const measurementsInCategory = session.measurements[categoryKey];
            if (!measurementsInCategory || measurementsInCategory.length === 0)
              return null;

            const CategoryIcon =
              categoryIcons[categoryKey] || categoryIcons.default;
            const isExpanded = expandedCategories[categoryKey] || false;

            return (
              <div
                key={categoryKey}
                className="glass rounded-xl border overflow-hidden transition-all duration-300"
              >
                <button
                  onClick={() => toggleCategory(categoryKey)}
                  className="w-full p-4 flex items-center justify-between hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <CategoryIcon className="w-5 h-5 text-primary" />
                    <h2 className="text-lg font-semibold capitalize">
                      {categoryKey}
                    </h2>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5" />
                  ) : (
                    <ChevronDown className="w-5 h-5" />
                  )}
                </button>

                <motion.div
                  initial={false}
                  animate={{
                    height: isExpanded ? "auto" : 0,
                    opacity: isExpanded ? 1 : 0,
                  }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="p-6 pt-0">
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[600px]">
                        <thead>
                          <tr className="border-b border-border/50">
                            <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">
                              Measurement
                            </th>
                            <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">
                              Snug Fit
                            </th>
                            <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">
                              Static Fit
                            </th>
                            <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">
                              Dynamic Fit
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {measurementsInCategory.map((m, index) => (
                            <tr
                              key={m.name}
                              className="border-b border-border/30 last:border-b-0 hover:bg-accent/20 transition-colors group"
                            >
                              <td className="py-4 px-2">
                                <p className="font-medium">{m.name}</p>
                                <p className="text-xs text-muted-foreground mt-1 opacity-80 group-hover:opacity-100 transition-opacity">
                                  {m.description}
                                </p>
                              </td>
                              <td className="py-4 px-2 text-center">
                                <div className="text-lg font-bold text-green-500">
                                  {m.snug || "—"}
                                  {m.snug && (
                                    <span className="text-xs text-muted-foreground ml-1">
                                      {m.unit}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-4 px-2 text-center">
                                <div className="text-lg font-bold text-blue-500">
                                  {m.static || "—"}
                                  {m.static && (
                                    <span className="text-xs text-muted-foreground ml-1">
                                      {m.unit}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-4 px-2 text-center">
                                <div className="text-lg font-bold text-purple-500">
                                  {m.dynamic || "—"}
                                  {m.dynamic && (
                                    <span className="text-xs text-muted-foreground ml-1">
                                      {m.unit}
                                    </span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </motion.div>
              </div>
            );
          })}
        </motion.div>
      </motion.div>
    </div>
  );
}
