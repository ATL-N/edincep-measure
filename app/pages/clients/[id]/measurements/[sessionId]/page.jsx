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
  const [isEditingStatus, setIsEditingStatus] = useState(false);
  const [currentStatus, setCurrentStatus] = useState("");
  const [currentCompletionDeadline, setCurrentCompletionDeadline] = useState("");

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
        setCurrentStatus(data.session.status || "ORDER_CONFIRMED");
        setCurrentCompletionDeadline(data.session.completionDeadline ? new Date(data.session.completionDeadline).toISOString().split('T')[0] : "");
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
          <div className="glass rounded-2xl p-8 border">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-3xl font-bold gradient-text">
                Measurement Session
              </h1>
              <div className="flex space-x-2">
                <button
                  onClick={() => router.push(`/pages/clients/${id}/measurements/new?sessionId=${sessionId}`)}
                  className="p-2 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                  title="Edit Session"
                >
                  <Edit3 className="w-5 h-5" />
                </button>
                <button
                  onClick={async () => {
                    try {
                      const response = await fetch(`/api/measurements/${sessionId}/pdf`);
                      if (!response.ok) {
                        throw new Error("Failed to generate PDF.");
                      }
                      const blob = await response.blob();
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `measurement_session_${sessionId}.pdf`;
                      document.body.appendChild(a);
                      a.click();
                      a.remove();
                      window.URL.revokeObjectURL(url);
                    } catch (err) {
                      setError(err.message);
                    }
                  }}
                  className="p-2 rounded-full bg-green-500/10 text-green-500 hover:bg-green-500/20 transition-colors"
                  title="Download PDF"
                >
                  <Download className="w-5 h-5" />
                </button>
                <button
                  onClick={() => router.back()}
                  className="p-2 rounded-full bg-muted/10 text-muted-foreground hover:bg-muted/20 transition-colors"
                  title="Back to Client"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              </div>
            </div>
            <p className="text-muted-foreground mb-4">
              For client:{" "}
              <span className="font-semibold text-foreground">
                {client.name}
              </span>
              {client.phone && (
                <span className="ml-4 text-sm">
                  <a href={`tel:${client.phone}`} className="hover:underline">
                    {client.phone}
                  </a>
                </span>
              )}
              {client.email && (
                <span className="ml-4 text-sm">
                  <a href={`mailto:${client.email}`} className="hover:underline">
                    {client.email}
                  </a>
                </span>
              )}
            </p>
            <div className="flex items-center text-sm text-muted-foreground mb-2">
              <Calendar className="w-4 h-4 mr-2" />
              <span>
                Created on: {new Date(session.createdAt).toLocaleDateString()}
              </span>
            </div>

            {/* Order Status and Deadline */}
            <div className="mt-6 p-4 bg-background/50 rounded-lg border border-border/50">
              <h3 className="text-lg font-semibold mb-3 gradient-text">Order Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Order Status:</p>
                  {isEditingStatus ? (
                    <select
                      value={currentStatus}
                      onChange={(e) => setCurrentStatus(e.target.value)}
                      className="w-full bg-background/70 border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="ORDER_CONFIRMED">Order Confirmed</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="COMPLETED">Completed</option>
                      <option value="DELIVERED">Delivered</option>
                    </select>
                  ) : (
                    <p className="text-lg font-bold text-foreground capitalize">
                      {currentStatus.replace(/_/g, ' ').toLowerCase()}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Completion Deadline:</p>
                  {isEditingStatus ? (
                    <input
                      type="date"
                      value={currentCompletionDeadline}
                      onChange={(e) => setCurrentCompletionDeadline(e.target.value)}
                      className="w-full bg-background/70 border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  ) : (
                    <p className="text-lg font-bold text-foreground">
                      {session.completionDeadline ? new Date(session.completionDeadline).toLocaleDateString() : 'N/A'}
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                {isEditingStatus ? (
                  <button
                    onClick={async () => {
                      // Save changes
                      try {
                        const response = await fetch(`/api/clients/${id}/measurements/${sessionId}`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            status: currentStatus,
                            completionDeadline: currentCompletionDeadline,
                          }),
                        });
                        if (!response.ok) {
                          throw new Error('Failed to update order details.');
                        }
                        setSession(prev => ({ ...prev, status: currentStatus, completionDeadline: currentCompletionDeadline }));
                        setIsEditingStatus(false);
                      } catch (err) {
                        setError(err.message);
                      }
                    }}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90 transition-colors"
                  >
                    Save Changes
                  </button>
                ) : (
                  <button
                    onClick={() => setIsEditingStatus(true)}
                    className="px-4 py-2 bg-muted/20 text-muted-foreground rounded-md text-sm hover:bg-muted/30 transition-colors"
                  >
                    Edit Order Details
                  </button>
                )}
              </div>
            </div>

            {/* Image Previews */}
            {(session.materialImageUrl || session.designImageUrl) && (
              <div className="mt-6 p-4 bg-background/50 rounded-lg border border-border/50">
                <h3 className="text-lg font-semibold mb-3 gradient-text">Associated Images</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {session.materialImageUrl && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Material Image:</p>
                      <img src={session.materialImageUrl} alt="Material" className="w-full h-48 object-cover rounded-lg shadow-md" />
                    </div>
                  )}
                  {session.designImageUrl && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Design Image:</p>
                      <img src={session.designImageUrl} alt="Design" className="w-full h-48 object-cover rounded-lg shadow-md" />
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        </motion.div>

        {session.notes && (
          <motion.div variants={itemVariants} className="mb-8">
            <div className="glass rounded-xl p-6 border">
              <h2 className="text-xl font-bold mb-4 gradient-text">Session Notes</h2>
              <p className="text-muted-foreground whitespace-pre-wrap">
                {session.notes}
              </p>
            </div>
          </motion.div>
        )}

        {/* Category Filters */}
        <motion.div variants={itemVariants} className="mb-8">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveCategory("all")}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                activeCategory === "all"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/20 text-muted-foreground hover:bg-muted/30"
              }`}
            >
              All Measurements
            </button>
            {Object.keys(session.measurements).map((categoryKey) => (
              <button
                key={categoryKey}
                onClick={() => setActiveCategory(categoryKey)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  activeCategory === categoryKey
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/20 text-muted-foreground hover:bg-muted/30"
                }`}
              >
                {categoryKey.charAt(0).toUpperCase() + categoryKey.slice(1)}
              </button>
            ))}
          </div>
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
