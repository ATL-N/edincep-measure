"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
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
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle, // Added this import
} from "lucide-react";

const toCamelCase = (str) => {
  return str
    .toLowerCase()
    .replace(/[^a-zA-Z0-9]+(.)/g, (m, chr) => chr.toUpperCase());
};

// Unit Toggle Component
const UnitToggle = ({ currentUnit, onUnitChange }) => (
  <div className="flex items-center space-x-1 p-1 rounded-full bg-muted border">
    <button
      onClick={() => onUnitChange("INCH")}
      className={`px-3 py-1 text-sm font-semibold rounded-full transition-all duration-300 ${
        currentUnit === "INCH"
          ? "bg-primary text-primary-foreground shadow-md"
          : "bg-transparent text-muted-foreground hover:bg-accent"
      }`}
    >
      Inches (in)
    </button>
    <button
      onClick={() => onUnitChange("CENTIMETER")}
      className={`px-3 py-1 text-sm font-semibold rounded-full transition-all duration-300 ${
        currentUnit === "CENTIMETER"
          ? "bg-primary text-primary-foreground shadow-md"
          : "bg-transparent text-muted-foreground hover:bg-accent"
      }`}
    >
      Centimeters (cm)
    </button>
  </div>
);

// Simplified measurement categories with descriptions for clients
const measurementCategories = {
  length: {
    title: "Vertical/Length Measurements",
    icon: Ruler,
    measurements: [
      { name: "Shoulder to Chest", note: "From the highest point of your shoulder down to the fullest part of your chest." },
      { name: "Shoulder to Bust", note: "From the highest point of your shoulder, over the fullest part of your bust." },
      { name: "Shoulder to Underbust", note: "From the highest point of your shoulder down to just below your bust." },
      { name: "Shoulder to Waist Front", note: "From the highest point of your shoulder down to your natural waistline (front)." },
      { name: "Shoulder to Waist Back", note: "From the highest point of your shoulder down to your natural waistline (back)." },
      { name: "Waist to Hip", note: "From your natural waistline down to the fullest part of your hip." },
      { name: "Shoulder to Knee", note: "From the highest point of your shoulder down to the middle of your knee." },
      { name: "Shoulder to Dress Length", note: "From the highest point of your shoulder down to your desired dress hem." },
      { name: "Shoulder to Ankle", note: "From the highest point of your shoulder down to your ankle." },
    ],
  },
  width: {
    title: "Width Measurements",
    icon: Ruler,
    measurements: [
      { name: "Shoulder Width", note: "Straight across your back, from the tip of one shoulder to the other." },
      { name: "Nipple to Nipple", note: "The distance between the apex of your nipples." },
      { name: "Off Shoulder", note: "Measure from one armpit seam line to the other." },
    ],
  },
  circumference: {
    title: "Circumference Measurements",
    icon: Target,
    measurements: [
      { name: "Bust", note: "Around the fullest part of your bust, keeping the tape horizontal." },
      { name: "Under Bust", note: "Around your rib cage directly below your bust." },
      { name: "Waist", note: "Around the narrowest part of your natural waistline (typically above the navel)." },
      { name: "Hip", note: "Around the fullest part of your hips, including the largest part of your bottom." },
      { name: "Thigh", note: "Around the fullest part of your thigh, just below the crotch." },
      { name: "Knee", note: "Around your knee, with your leg slightly bent." },
      { name: "Ankle", note: "Around your ankle bone." },
      { name: "Neck", note: "Around the base of your neck." },
    ],
  },
  arm: {
    title: "Arm Measurements",
    icon: Move,
    measurements: [
      { name: "Shirt Sleeve", note: "From the shoulder seam down to your desired short sleeve length." },
      { name: "Elbow Length", note: "From the shoulder seam down to your elbow." },
      { name: "Long Sleeves", note: "From the shoulder seam down to your wrist, with your arm slightly bent." },
      { name: "Around Arm", note: "Around the fullest part of your upper arm." },
      { name: "Elbow", note: "Around your elbow, with your arm slightly bent." },
      { name: "Wrist", note: "Around your wrist bone." },
    ],
  },
  leg: {
    title: "Leg Measurements",
    icon: User,
    measurements: [
      { name: "In Seam", note: "From the crotch down to your ankle along the inside of your leg." },
      { name: "Out Seam", note: "From your natural waistline down to your ankle along the outside of your leg." },
    ],
  },
};

// Skeleton Loader for the form page
export const FormSkeleton = () => (
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

export default function FillForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  // State for data
  const [clientName, setClientName] = useState("");
  const [designerName, setDesignerName] = useState("");
  const [measurements, setMeasurements] = useState({}); // Stores display values
  const [notes, setNotes] = useState("");
  const [existingMeasurementId, setExistingMeasurementId] = useState(null); // Used for update mode
  const [clientUnit, setClientUnit] = useState("INCH"); // Unit set by designer for client

  // UI State
  const [expandedCategories, setExpandedCategories] = useState({
    length: true,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [pageMessage, setPageMessage] = useState({ type: "", text: "" }); // 'info', 'success', 'error'
  const [expirationTime, setExpirationTime] = useState(null); // For display
  const [showUnitChangeConfirm, setShowUnitChangeConfirm] = useState(false);
  const [pendingUnit, setPendingUnit] = useState(null);

  const displayUnitLabel = clientUnit === "CENTIMETER" ? "cm" : "in";

  // --- Unit Conversion Logic ---
  const convertToDisplay = (valueInInches) => {
    if (valueInInches === null || valueInInches === undefined || valueInInches === "") return "";
    if (clientUnit === "CENTIMETER") {
      return (parseFloat(valueInInches) * 2.54).toFixed(2);
    }
    return valueInInches;
  };

  const convertToStorage = (valueInDisplayUnit) => {
    if (valueInDisplayUnit === null || valueInDisplayUnit === undefined || valueInDisplayUnit === "") return null;
    if (clientUnit === "CENTIMETER") {
      const parsedValue = parseFloat(valueInDisplayUnit);
      if (isNaN(parsedValue)) return null;
      return parsedValue / 2.54;
    }
    const parsedValue = parseFloat(valueInDisplayUnit);
    return isNaN(parsedValue) ? null : parsedValue;
  };

  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      setPageMessage({ type: "error", text: "Invalid or missing share token." });
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      setPageMessage({ type: "info", text: "Validating link..." });

      try {
        const response = await fetch(`/api/measurements/share/${token}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to validate share link.");
        }

        setClientName(data.clientName);
        setDesignerName(data.designerName);
        setClientUnit(data.measurementUnit || "INCH"); // Use client's unit preference

        if (data.measurement) {
          // Update mode: pre-fill form
          setExistingMeasurementId(data.measurement.id);
          const displayMeasurements = {};
          // Only map the Static fields from existing measurement
          for (const categoryKey in measurementCategories) {
            for (const measurement of measurementCategories[categoryKey].measurements) {
              const fieldName = toCamelCase(measurement.name);
              const staticKey = `${fieldName}Static`; // We only map to static
              if (data.measurement[staticKey] !== undefined) {
                displayMeasurements[fieldName] = convertToDisplay(data.measurement[staticKey]);
              }
            }
          }
          setMeasurements(displayMeasurements);
          setNotes(data.measurement.notes || "");
          setPageMessage({ type: "info", text: "Please review and update your measurements (2-hour window)." });
          setExpirationTime(data.updateWindowEnd); // From API response for update window
        } else {
          // Creation mode
          setPageMessage({ type: "info", text: `Please fill in your measurements. Link valid until ${new Date(data.expiresAt).toLocaleDateString()}.` });
          setExpirationTime(data.expiresAt); // From API response for creation window
        }
        
      } catch (err) {
        setError(err.message);
        setPageMessage({ type: "error", text: err.message });
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [token]);

  const handleMeasurementChange = (fieldName, value) => {
    // Allow empty string or numbers with up to two decimal places
    if (value === "" || /^-?\d*\.?\d{0,2}$/.test(value)) {
      setMeasurements((prev) => ({ ...prev, [fieldName]: value }));
    }
  };

  const handleUnitChangeRequest = (newUnit) => {
    if (newUnit !== clientUnit && Object.values(measurements).some(v => v !== '')) {
      setPendingUnit(newUnit);
      setShowUnitChangeConfirm(true);
    } else if (newUnit !== clientUnit) {
      setClientUnit(newUnit);
    }
  };

  const confirmUnitChange = () => {
    setClientUnit(pendingUnit);
    setMeasurements({}); // Clear measurements
    setShowUnitChangeConfirm(false);
    setPendingUnit(null);
  };

  const toggleCategory = (category) => {
    setExpandedCategories((prev) => ({ ...prev, [category]: !prev[category] }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    try {
      const storageMeasurements = {};
      for (const fieldName in measurements) {
        // Map the single input field to the corresponding Static field in DB
        const staticKey = `${fieldName}Static`;
        storageMeasurements[staticKey] = convertToStorage(measurements[fieldName]);
      }

      const body = {
        notes,
        ...storageMeasurements,
      };

      const url = `/api/measurements/share/${token}`;
      const method = "POST"; // Always POST for this public form

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to save measurements.");
      }
      setPageMessage({ type: "success", text: data.message || "Measurements saved successfully!" });
      // In update mode, the page won't redirect, just show success.
      // In create mode, we can show success and maybe disable the form.
      if (!existingMeasurementId) {
        setExistingMeasurementId(data.measurementId); // Link just created measurement
        // Optionally, disable form after first submission, and allow updates for 2 hours
        setPageMessage({ type: "success", text: "Measurements submitted! You have a 2-hour window to make corrections." });
        setExpirationTime(new Date(Date.now() + 2 * 60 * 60 * 1000)); // Set the 2-hour update window
      }

    } catch (err) {
      setError(err.message);
      setPageMessage({ type: "error", text: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="text-center">
          <XCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold">Token Missing</h1>
          <p className="text-muted-foreground mt-2">No measurement share token provided in the URL.</p>
        </div>
      </div>
    );
  }


  if (isLoading) return <FormSkeleton />;

  return (
    <div className="min-h-screen pt-0 md:pt-30 pb-10 mb-24 px-4 sm:px-6 lg:px-8">
       {showUnitChangeConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="glass rounded-2xl p-8 border w-full max-w-sm text-center"
          >
            <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Change Units?</h2>
            <p className="text-muted-foreground mb-6">
              Switching units will clear all values you have already entered. Are you sure you want to continue?
            </p>
            <div className="flex justify-center gap-4">
              <button
                onClick={() => setShowUnitChangeConfirm(false)}
                className="px-6 py-2 rounded-lg border border-border hover:bg-accent"
              >
                Cancel
              </button>
              <button
                onClick={confirmUnitChange}
                className="px-6 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Yes, Change
              </button>
            </div>
          </motion.div>
        </div>
      )}
      <motion.div
        initial="hidden"
        animate="visible"
        className="max-w-6xl mx-auto"
      >
        <motion.div className="mb-8">
          <div className="glass rounded-2xl p-8 border">
            {pageMessage.text && (
                <div className={`p-3 rounded-lg text-sm mb-4 flex items-center gap-2
                    ${pageMessage.type === "error" ? "bg-destructive/10 text-destructive" : ""}
                    ${pageMessage.type === "info" ? "bg-blue-500/10 text-blue-500" : ""}
                    ${pageMessage.type === "success" ? "bg-green-500/10 text-green-500" : ""}
                `}>
                    {pageMessage.type === "error" && <XCircle className="w-4 h-4" />}
                    {pageMessage.type === "info" && <Clock className="w-4 h-4" />}
                    {pageMessage.type === "success" && <CheckCircle className="w-4 h-4" />}
                    {pageMessage.text}
                    {expirationTime && new Date(expirationTime) > new Date() && (
                      <span className="ml-auto text-xs">Expires: {new Date(expirationTime).toLocaleTimeString()}</span>
                    )}
                </div>
            )}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                <div>
                    <h1 className="text-3xl font-bold gradient-text mb-2">
                    {existingMeasurementId ? "Update Your Measurements" : "Submit Your Measurements"}
                    </h1>
                    <p className="text-muted-foreground">
                    For client:{" "}
                    <span className="font-semibold text-foreground">
                        {clientName}
                    </span>
                    {" "}shared by{" "}
                    <span className="font-semibold text-foreground">
                        {designerName}
                    </span>
                    </p>
                </div>
                <div className="flex-shrink-0">
                    <UnitToggle currentUnit={clientUnit} onUnitChange={handleUnitChangeRequest} />
                </div>
            </div>
            <p className="mt-4 text-sm text-yellow-500 bg-yellow-500/10 p-3 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Please provide accurate measurements. All values should be in {clientUnit.toLowerCase()}. You can change your preferred unit using the toggle above.
            </p>
          </div>
        </motion.div>

        <motion.div className="mb-8">
          <div className="glass rounded-xl p-6 border">
            <label className="block text-sm font-medium mb-2">
              Notes for your Designer
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any specific instructions or preferences for your designer..."
              className="w-full h-24 bg-background/50 border border-border rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-primary"
            />
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
                      <table className="w-full min-w-[300px] border-separate border-spacing-y-2">
                        <tbody>
                          {category.measurements.map((measurement) => {
                            const fieldName = toCamelCase(measurement.name);
                            return (
                              <tr
                                key={measurement.name}
                                className="bg-background/50 rounded-lg border border-border/50"
                              >
                                <td className="py-3 px-4 font-medium text-sm rounded-l-lg w-1/2">
                                  {measurement.name}
                                  <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                                    {measurement.note}
                                  </p>
                                </td>
                                <td className="py-3 px-4 text-center rounded-r-lg w-1/2">
                                  <div className="flex items-center justify-center">
                                    <input
                                      type="number"
                                      step="0.1"
                                      value={measurements[fieldName] || ""}
                                      placeholder={`0.0 ${displayUnitLabel}`}
                                      onChange={(e) =>
                                        handleMeasurementChange(
                                          fieldName,
                                          e.target.value
                                        )
                                      }
                                      className="w-full max-w-[120px] bg-transparent border-b border-primary/50 rounded-none px-2 py-1 text-base text-center focus:outline-none focus:border-primary placeholder:text-muted-foreground/40"
                                    />
                                    <span className="ml-2 text-muted-foreground">
                                      {displayUnitLabel}
                                    </span>
                                  </div>
                                </td>
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
                : existingMeasurementId
                ? "Update Measurements"
                : "Submit Measurements"}
            </span>
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
