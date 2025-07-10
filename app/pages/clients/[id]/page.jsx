"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useParams, useRouter } from "next/navigation";
import {
  User,
  Phone,
  Mail,
  Calendar,
  Ruler,
  Plus,
  History,
  Edit3,
  AlertTriangle,
} from "lucide-react";

// Skeleton Component for a better loading experience
const ClientProfileSkeleton = () => (
  <div className="min-h-screen p-6 pt-30 animate-pulse">
    <div className="max-w-6xl mx-auto">
      <div className="h-6 w-36 bg-muted/50 rounded mb-8"></div>
      <div className="glass rounded-2xl p-8 border mb-8">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-6">
            <div className="w-20 h-20 rounded-full bg-muted/50"></div>
            <div>
              <div className="h-8 w-48 bg-muted/50 rounded mb-3"></div>
              <div className="space-y-2">
                <div className="h-5 w-40 bg-muted/50 rounded"></div>
                <div className="h-5 w-52 bg-muted/50 rounded"></div>
                <div className="h-5 w-44 bg-muted/50 rounded"></div>
              </div>
            </div>
          </div>
          <div className="flex space-x-3">
            <div className="w-48 h-12 bg-muted/50 rounded-xl"></div>
            <div className="w-14 h-12 bg-muted/50 rounded-xl"></div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="glass rounded-xl p-6 border h-24"></div>
        <div className="glass rounded-xl p-6 border h-24"></div>
        <div className="glass rounded-xl p-6 border h-24"></div>
      </div>
      <div className="glass rounded-2xl p-8 border">
        <div className="h-8 w-64 bg-muted/50 rounded mb-6"></div>
        <div className="space-y-4">
          <div className="border rounded-xl p-6 h-28 bg-muted/30"></div>
          <div className="border rounded-xl p-6 h-28 bg-muted/30"></div>
        </div>
      </div>
    </div>
  </div>
);

export default function ClientProfilePage() {
  const { id } = useParams();
  const router = useRouter();
  const [client, setClient] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) return;

    const fetchClient = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/clients/${id}`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Error: ${response.status}`);
        }
        const data = await response.json();
        setClient(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchClient();
  }, [id]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 },
  };

  if (isLoading) {
    return <ClientProfileSkeleton />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center p-6">
        <AlertTriangle className="w-16 h-16 text-destructive mb-4" />
        <h2 className="text-2xl font-bold mb-2">Failed to load client data</h2>
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

  if (!client) {
    return null; // or a "Not Found" component
  }

  const totalMeasurementsAcrossSessions = client.measurements.reduce(
    (sum, session) => sum + session.totalMeasurementsCount,
    0
  );

  return (
    <div className="min-h-screen pt-0 md:pt-30 pb-10 mb-24 px-4 sm:px-6 lg:px-8">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-6xl mx-auto"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="mb-8">
          <button
            onClick={() => router.back()}
            className="mb-4 text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back to Clients
          </button>

          <div className="glass rounded-2xl p-8 border">
            <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
              <div className="flex items-center space-x-6">
                <div className="w-20 h-20 rounded-full gradient-bg flex items-center justify-center">
                  <User className="w-10 h-10 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold gradient-text mb-2">
                    {client.name}
                  </h1>
                  <div className="space-y-2 text-muted-foreground">
                    <div className="flex items-center space-x-2">
                      <Phone className="w-4 h-4" />
                      <span>{client.phone || "N/A"}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Mail className="w-4 h-4" />
                      <span>{client.email || "N/A"}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4" />
                      <span>
                        Client since{" "}
                        {new Date(client.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex space-x-3 self-start">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => router.push(`/pages/clients/${id}/measurements/new`)}
                  className="bg-primary text-primary-foreground px-6 py-3 rounded-xl flex items-center space-x-2 hover:bg-primary/90 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  <span>New Measurements</span>
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="border border-border px-4 py-3 rounded-xl hover:bg-accent transition-colors"
                >
                  <Edit3 className="w-5 h-5" />
                </motion.button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          variants={itemVariants}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
        >
          <div className="glass rounded-xl p-6 border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Total Sessions</p>
                <p className="text-2xl font-bold">
                  {client.measurements.length}
                </p>
              </div>
              <Ruler className="w-8 h-8 text-primary" />
            </div>
          </div>
          <div className="glass rounded-xl p-6 border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Latest Session</p>
                <p className="text-2xl font-bold">
                  {client.measurements.length > 0
                    ? new Date(
                        client.measurements[0].createdAt
                      ).toLocaleDateString()
                    : "N/A"}
                </p>
              </div>
              <Calendar className="w-8 h-8 text-primary" />
            </div>
          </div>
          <div className="glass rounded-xl p-6 border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">
                  Total Data Points
                </p>
                <p className="text-2xl font-bold">
                  {totalMeasurementsAcrossSessions}
                </p>
              </div>
              <History className="w-8 h-8 text-primary" />
            </div>
          </div>
        </motion.div>

        {/* Recent Measurements */}
        <motion.div
          variants={itemVariants}
          className="glass rounded-2xl p-8 border"
        >
          <div
            className="flex items-center justify-between mb-6"
            title="View all client measurements"
          >
            <h2 className="text-2xl font-bold">Measurement History</h2>
            {client.measurements.length > 0 && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push(`/pages/clients/${id}/measurements`)}
                className="text-primary hover:text-primary/80 transition-colors"
              >
                View All
              </motion.button>
            )}
          </div>
          <div className="space-y-4">
            {client.measurements.length > 0 ? (
              client.measurements.map((session, index) => (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="border border-border rounded-xl p-6 hover:bg-accent/50 transition-colors cursor-pointer card-3d"
                  onClick={() =>
                    router.push(`/pages/clients/${id}/measurements/${session.id}`)
                  }
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-lg mb-1">
                        Session from{" "}
                        {new Date(session.createdAt).toLocaleDateString()}
                      </h3>
                      <p className="text-muted-foreground text-sm italic">
                        {session.notes || "No notes for this session."}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-primary">
                        {session.totalMeasurementsCount}
                      </p>
                      <p className="text-muted-foreground text-sm">
                        measurements
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-12">
                <Ruler className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">
                  No measurements yet
                </h3>
                <p className="text-muted-foreground mb-6">
                  Start by taking the first set of measurements for this client.
                </p>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => router.push(`/pages/clients/${id}/measurements/new`)}
                  className="bg-primary text-primary-foreground px-6 py-3 rounded-xl hover:bg-primary/90 transition-colors"
                >
                  Take First Measurements
                </motion.button>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
