"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Save,
  ArrowLeft,
  Ruler,
  User,
  Target,
  Move,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from "lucide-react";

// Helper to convert display names to camelCase DB fields
const toCamelCase = (str) => {
  return str
    .toLowerCase()
    .replace(/[^a-zA-Z0-9]+(.)/g, (m, chr) => chr.toUpperCase());
};

const measurementCategories = {
  length: {
    title: "Vertical/Length",
    icon: Ruler,
    measurements: [
      "Shoulder to Chest",
      "Shoulder to Bust",
      "Shoulder to Underbust",
      "Shoulder to Waist Front",
      "Shoulder to Waist Back",
      "Waist to Hip",
      "Shoulder to Knee",
      "Shoulder to Dress Length",
      "Shoulder to Ankle",
    ],
  },
  width: {
    title: "Width",
    icon: Ruler,
    measurements: ["Shoulder Width", "Nipple to Nipple", "Off Shoulder"],
  },
  circumference: {
    title: "Circumference",
    icon: Target,
    measurements: [
      "Bust",
      "Under Bust",
      "Waist",
      "Hip",
      "Thigh",
      "Knee",
      "Ankle",
      "Neck",
    ],
  },
  arm: {
    title: "Arm",
    icon: Move,
    measurements: [
      "Shirt Sleeve",
      "Elbow Length",
      "Long Sleeves",
      "Around Arm",
      "Elbow",
      "Wrist",
    ],
  },
  leg: { title: "Leg", icon: User, measurements: ["In Seam", "Out Seam"] },
};

// Skeleton Loader for the form page
const FormSkeleton = () => (
  <div className="min-h-screen p-6 pt-10 animate-pulse">
    <div className="max-w-6xl mx-auto">
      <div className="h-6 w-36 bg-muted/50 rounded mb-8"></div>
      <div className="glass rounded-2xl p-8 border mb-8">
        <div className="h-8 w-64 bg-muted/50 rounded mb-3"></div>
        <div className="h-5 w-80 bg-muted/50 rounded"></div>
      </div>
      <div className="glass rounded-xl p-6 border mb-8 h-32"></div>
      <div className="space-y-6">
        <div className="glass rounded-xl border h-20"></div>
        <div className="glass rounded-xl border h-20"></div>
        <div className="glass rounded-xl border h-20"></div>
      </div>
    </div>
  </div>
);

export default function MeasurementEditPage() {
  const { id: clientId, sessionId } = useParams();
  const router = useRouter();
  const { data: session } = useSession();

  // State for data
  const [clientName, setClientName] = useState("");
  const [measurements, setMeasurements] = useState({});
  const [notes, setNotes] = useState("");
  const [orderStatus, setOrderStatus] = useState("ORDER_CONFIRMED");
  const [completionDeadline, setCompletionDeadline] = useState("");
  const [materialFile, setMaterialFile] = useState(null);
  const [designFile, setDesignFile] = useState(null);
  const [materialImageUrl, setMaterialImageUrl] = useState("");
  const [designImageUrl, setDesignImageUrl] = useState("");

  // UI State
  const [expandedCategories, setExpandedCategories] = useState({
    length: true,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  // --- Unit Conversion Logic ---
  const measurementUnit = session?.user?.measurementUnit || "INCH";
  const displayUnitLabel = measurementUnit === "CENTIMETER" ? "cm" : "in";

  const convertToDisplay = (valueInInches) => {
    if (valueInInches === null || valueInInches === undefined || valueInInches === "") return "";
    if (measurementUnit === "CENTIMETER") {
      return (parseFloat(valueInInches) * 2.54).toFixed(2);
    }
    return valueInInches;
  };

  const convertToStorage = (valueInDisplayUnit) => {
    if (valueInDisplayUnit === null || valueInDisplayUnit === undefined || valueInDisplayUnit === "") return null;
    if (measurementUnit === "CENTIMETER") {
      const parsedValue = parseFloat(valueInDisplayUnit);
      if (isNaN(parsedValue)) return null;
      return parsedValue / 2.54;
    }
    const parsedValue = parseFloat(valueInDisplayUnit);
    return isNaN(parsedValue) ? null : parsedValue;
  };

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [clientRes, sessionRes] = await Promise.all([
          fetch(`/api/clients/${clientId}`),
          fetch(`/api/clients/${clientId}/measurements/${sessionId}?format=raw`),
        ]);

        if (!clientRes.ok) throw new Error("Failed to load client details.");
        if (!sessionRes.ok) throw new Error("Failed to load session data.");

        const clientData = await clientRes.json();
        const { session } = await sessionRes.json();

        setClientName(clientData.name);
        setMeasurements(session || {});
        setNotes(session.notes || "");
        setOrderStatus(session.status || "ORDER_CONFIRMED");
        setCompletionDeadline(
          session.completionDeadline
            ? new Date(session.completionDeadline)
                .toISOString()
                .split("T")[0]
            : ""
        );
        setMaterialImageUrl(session.materialImageUrl || "");
        setDesignImageUrl(session.designImageUrl || "");
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [clientId, sessionId]);

  const handleMeasurementChange = (fieldName, type, value) => {
    const key = `${fieldName}${type.charAt(0).toUpperCase() + type.slice(1)}`;
    setMeasurements((prev) => ({ ...prev, [key]: value }));
  };

  const toggleCategory = (category) => {
    setExpandedCategories((prev) => ({ ...prev, [category]: !prev[category] }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    let finalMaterialImageUrl = materialImageUrl;
    let finalDesignImageUrl = designImageUrl;

    try {
      if (materialFile) {
        const formData = new FormData();
        formData.append("file", materialFile);
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        if (!uploadRes.ok) {
          const errData = await uploadRes.json();
          throw new Error(errData.error || "Failed to upload material image.");
        }
        const uploadResult = await uploadRes.json();
        finalMaterialImageUrl = uploadResult.path;
      }

      if (designFile) {
        const formData = new FormData();
        formData.append("file", designFile);
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        if (!uploadRes.ok) {
          const errData = await uploadRes.json();
          throw new Error(errData.error || "Failed to upload design image.");
        }
        const uploadResult = await uploadRes.json();
        finalDesignImageUrl = uploadResult.path;
      }

      const url = `/api/clients/${clientId}/measurements/${sessionId}`;
      const method = "PUT";

      const body = {
        notes,
        ...measurements,
        status: orderStatus,
        completionDeadline,
        materialImageUrl: finalMaterialImageUrl,
        designImageUrl: finalDesignImageUrl,
      };

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to save measurements.");
      }
      router.push(`/pages/clients/${clientId}/measurements/${sessionId}`);
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <FormSkeleton />;

  return (
    <div className="min-h-screen pt-0 md:pt-30 pb-10 mb-24 px-4 sm:px-6 lg:px-8">
      <motion.div
        initial="hidden"
        animate="visible"
        className="max-w-6xl mx-auto"
      >
        <motion.div className="mb-8">
          <button
            onClick={() => router.back()}
            className="mb-4 text-muted-foreground hover:text-foreground transition-colors flex items-center space-x-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
          <div className="glass rounded-2xl p-8 border">
            <h1 className="text-3xl font-bold gradient-text mb-2">
              Edit Measurement Session
            </h1>
            <p className="text-muted-foreground">
              For client:{" "}
              <span className="font-semibold text-foreground">
                {clientName}
              </span>
            </p>
          </div>
        </motion.div>

        <motion.div className="mb-8">
          <div className="glass rounded-xl p-6 border">
            <label className="block text-sm font-medium mb-2">
              Session Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about this session (e.g., fabric type, client preferences)..."
              className="w-full h-24 bg-background/50 border border-border rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </motion.div>

        <motion.div className="mb-8">
          <div className="glass rounded-xl p-6 border">
            <h2 className="text-xl font-bold mb-4 gradient-text">
              Order Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label
                  className="block text-sm font-medium mb-2"
                  htmlFor="orderStatus"
                >
                  Order Status
                </label>
                <select
                  id="orderStatus"
                  value={orderStatus}
                  onChange={(e) => setOrderStatus(e.target.value)}
                  className="w-full bg-background/50 border border-border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="ORDER_CONFIRMED">Order Confirmed</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="DELIVERED">Delivered</option>
                </select>
              </div>
              <div>
                <label
                  className="block text-sm font-medium mb-2"
                  htmlFor="completionDeadline"
                >
                  Completion Deadline
                </label>
                <input
                  type="date"
                  id="completionDeadline"
                  value={completionDeadline}
                  onChange={(e) => setCompletionDeadline(e.target.value)}
                  className="w-full bg-background/50 border border-border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label
                  className="block text-sm font-medium mb-2"
                  htmlFor="materialImage"
                >
                  Material Image
                </label>
                <input
                  type="file"
                  id="materialImage"
                  accept="image/*"
                  onChange={(e) => setMaterialFile(e.target.files[0])}
                  className="w-full bg-background/50 border border-border rounded-lg p-3 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/80"
                />
                {materialImageUrl && (
                  <div className="mt-2">
                    <p className="text-sm text-muted-foreground">
                      Current:{" "}
                      <a
                        href={materialImageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        {materialImageUrl.split("/").pop()}
                      </a>
                    </p>
                    <img
                      src={materialImageUrl}
                      alt="Material Preview"
                      className="mt-2 max-h-32 rounded-lg object-cover"
                    />
                  </div>
                )}
              </div>
              <div>
                <label
                  className="block text-sm font-medium mb-2"
                  htmlFor="designImage"
                >
                  Design/Style Image
                </label>
                <input
                  type="file"
                  id="designImage"
                  accept="image/*"
                  onChange={(e) => setDesignFile(e.target.files[0])}
                  className="w-full bg-background/50 border border-border rounded-lg p-3 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/80"
                />
                {designImageUrl && (
                  <div className="mt-2">
                    <p className="text-sm text-muted-foreground">
                      Current:{" "}
                      <a
                        href={designImageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        {designImageUrl.split("/").pop()}
                      </a>
                    </p>
                    <img
                      src={designImageUrl}
                      alt="Design Preview"
                      className="mt-2 max-h-32 rounded-lg object-cover"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        <div className="space-y-6">
          {Object.entries(measurementCategories).map(
            ([categoryKey, category]) => (
              <div
                key={categoryKey}
                className="glass rounded-xl border overflow-hidden"
              >
                <button
                  onClick={() => toggleCategory(categoryKey)}
                  className="w-full p-4 flex items-center justify-between hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <category.icon className="w-5 h-5 text-primary" />
                    <h2 className="text-lg font-semibold">{category.title}</h2>
                  </div>
                  {expandedCategories[categoryKey] ? (
                    <ChevronUp className="w-5 h-5" />
                  ) : (
                    <ChevronDown className="w-5 h-5" />
                  )}
                </button>
                <motion.div
                  initial={false}
                  animate={{
                    height: expandedCategories[categoryKey] ? "auto" : 0,
                    opacity: expandedCategories[categoryKey] ? 1 : 0,
                  }}
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
                              Snug ({displayUnitLabel})
                            </th>
                            <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">
                              Static ({displayUnitLabel})
                            </th>
                            <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">
                              Dynamic ({displayUnitLabel})
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {category.measurements.map((name) => {
                            const fieldName = toCamelCase(name);
                            return (
                              <tr
                                key={name}
                                className="border-b border-border/30 last:border-b-0"
                              >
                                <td className="py-3 px-2 font-medium text-sm">
                                  {name}
                                </td>
                                {["snug", "static", "dynamic"].map((type) => {
                                  const fullFieldName = `${fieldName}${
                                    type.charAt(0).toUpperCase() + type.slice(1)
                                  }`;
                                  return (
                                    <td
                                      key={type}
                                      className="py-3 px-2 text-center"
                                    >
                                      <input
                                        type="number"
                                        step="0.1"
                                        value={
                                          measurements[fullFieldName] || ""
                                        }
                                        onChange={(e) =>
                                          handleMeasurementChange(
                                            fieldName,
                                            type,
                                            e.target.value
                                          )
                                        }
                                        className="w-full max-w-[80px] mx-auto bg-background/50 border border-border/50 rounded-md px-2 py-1 text-sm text-center focus:outline-none focus:ring-1 focus:ring-primary"
                                      />
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </motion.div>
              </div>
            )
          )}
        </div>

        <div className="mt-8 flex flex-col sm:flex-row justify-end items-center gap-4">
          {error && (
            <div className="text-destructive text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSave}
            disabled={isSaving || isLoading}
            className="bg-primary text-primary-foreground w-full sm:w-auto px-8 py-3 rounded-xl flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            {isSaving ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <Save className="w-5 h-5" />
            )}
            <span>
              {isSaving
                ? "Saving..."
                : "Update Session"}
            </span>
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
