"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useParams, useRouter } from "next/navigation";
import {
  Save,
  ArrowLeft,
  Ruler,
  User,
  Target,
  Move,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

const measurementCategories = {
  length: {
    title: "Length Measurements",
    icon: Ruler,
    measurements: [
      {
        name: "Shoulder to chest",
        description: "From shoulder to chest",
        unit: "inches",
      },
      {
        name: "Shoulder to bust",
        description: "Shoulder to the fullest part of the bust",
        unit: "inches",
      },
      {
        name: "Shoulder to underbust",
        description: "Shoulder to underbust over the bust",
        unit: "inches",
      },
      {
        name: "Shoulder to waist (front)",
        description: "Shoulder to at the neck to waist over the bust",
        unit: "inches",
      },
      {
        name: "Shoulder to waist (back)",
        description: "From the nape of the neck to waist",
        unit: "inches",
      },
      {
        name: "Waist to hip",
        description: "Distance from waist to the fullest part of the hip",
        unit: "inches",
      },
      {
        name: "Shoulder to knee",
        description: "Shoulder to the knee cap",
        unit: "inches",
      },
      {
        name: "Shoulder to dress length",
        description: "Shoulder to the preferred length of the dress",
        unit: "inches",
      },
      {
        name: "Shoulder to ankle",
        description: "Shoulder to ankle",
        unit: "inches",
      },
      {
        name: "Shoulder width",
        description: "From shoulder tip to shoulder tip across back",
        unit: "inches",
      },
    ],
  },
  circumference: {
    title: "Circumference Measurements",
    icon: Target,
    measurements: [
      {
        name: "Bust",
        description: "Around the fullest part of the bust",
        unit: "inches",
      },
      {
        name: "Under bust",
        description: "Around under the bust",
        unit: "inches",
      },
      {
        name: "Waist",
        description: "Around the natural waist line",
        unit: "inches",
      },
      {
        name: "Hip",
        description: "Around the fullest part of the hip",
        unit: "inches",
      },
      {
        name: "Thigh",
        description: "Around the fullest part of one of the thigh",
        unit: "inches",
      },
      { name: "Knee", description: "Around the knee", unit: "inches" },
      { name: "Ankle", description: "Around the ankle", unit: "inches" },
      {
        name: "Neck",
        description: "Around the base of the neck",
        unit: "inches",
      },
    ],
  },
  arm: {
    title: "Arm Measurements",
    icon: Move,
    measurements: [
      {
        name: "Shirt sleeve",
        description: "Shoulder to the preferred shirt sleeve length",
        unit: "inches",
      },
      {
        name: "Elbow length",
        description:
          "The vertical distance from shoulder to elbow slightly bent to front",
        unit: "inches",
      },
      {
        name: "Long sleeves",
        description: "The distance from the shoulder to elbow",
        unit: "inches",
      },
      {
        name: "Around arm",
        description: "Around the fullest part of the arm",
        unit: "inches",
      },
      {
        name: "Elbow",
        description: "Around the when elbow slightly bent",
        unit: "inches",
      },
      { name: "Wrist", description: "Around the wrist bone", unit: "inches" },
    ],
  },
  leg: {
    title: "Leg Measurements",
    icon: User,
    measurements: [
      {
        name: "In seam",
        description: "From crotch to ankle along the inner thigh",
        unit: "inches",
      },
      {
        name: "Out seam",
        description: "From waist to ankle along the outer leg",
        unit: "inches",
      },
    ],
  },
  special: {
    title: "Special Measurements",
    icon: Target,
    measurements: [
      {
        name: "Nipple to nipple",
        description: "Distance between apex of the bust",
        unit: "inches",
      },
      {
        name: "Off shoulder",
        description: "Off shoulder measurement",
        unit: "inches",
      },
    ],
  },
};

export default function TakeMeasurements() {
  const { id } = useParams();
  const router = useRouter();
  const [measurements, setMeasurements] = useState({});
  const [notes, setNotes] = useState("");
  const [expandedCategories, setExpandedCategories] = useState({
    length: true,
    circumference: false,
    arm: false,
    leg: false,
    special: false,
  });
  const [saving, setSaving] = useState(false);

  const handleMeasurementChange = (category, measurement, type, value) => {
    const key = `${category}-${measurement}`;
    setMeasurements((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        [type]: value,
      },
    }));
  };

  const toggleCategory = (category) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    // Simulate API call
    console.log("Saving data:", { measurements, notes });
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setSaving(false);
    router.push(`/clients/${id}`);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background p-6">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-4xl mx-auto"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="mb-8">
          <button
            onClick={() => router.back()}
            className="mb-4 text-muted-foreground hover:text-foreground transition-colors flex items-center space-x-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Client</span>
          </button>
          <div className="glass rounded-2xl p-8 border">
            <h1 className="text-3xl font-bold gradient-text mb-2">
              Take Measurements
            </h1>
            <p className="text-muted-foreground">
              Record new measurements for this client session
            </p>
          </div>
        </motion.div>

        {/* Session Notes */}
        <motion.div variants={itemVariants} className="mb-8">
          <div className="glass rounded-xl p-6 border">
            <label className="block text-sm font-medium mb-2">
              Session Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about this measurement session..."
              className="w-full h-24 bg-background/50 border border-border rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </motion.div>

        {/* Measurement Categories */}
        <motion.div variants={itemVariants} className="space-y-6">
          {Object.entries(measurementCategories).map(
            ([categoryKey, category]) => (
              <div
                key={categoryKey}
                className="glass rounded-xl border overflow-hidden"
              >
                <button
                  onClick={() => toggleCategory(categoryKey)}
                  className="w-full p-6 flex items-center justify-between hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <category.icon className="w-6 h-6 text-primary" />
                    <h2 className="text-xl font-semibold">{category.title}</h2>
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
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  {/* ====== TABLE IMPLEMENTATION START ====== */}
                  <div className="p-6 pt-0">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="p-2 font-medium text-left text-muted-foreground w-2/5">
                            Measurement
                          </th>
                          <th className="p-2 font-medium text-center text-muted-foreground">
                            Snug ({category.measurements[0]?.unit || "units"})
                          </th>
                          <th className="p-2 font-medium text-center text-muted-foreground">
                            Static ({category.measurements[0]?.unit || "units"})
                          </th>
                          <th className="p-2 font-medium text-center text-muted-foreground">
                            Dynamic ({category.measurements[0]?.unit || "units"}
                            )
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {category.measurements.map((measurement) => (
                          <tr
                            key={measurement.name}
                            className="border-b border-border/50 last:border-b-0 hover:bg-accent/30 transition-colors"
                          >
                            <td className="p-2 align-top">
                              <p className="font-medium">{measurement.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {measurement.description}
                              </p>
                            </td>
                            <td className="p-2 align-top">
                              <input
                                type="number"
                                step="0.1"
                                placeholder="-"
                                className="w-full bg-background/50 border border-border rounded-md p-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary"
                                onChange={(e) =>
                                  handleMeasurementChange(
                                    categoryKey,
                                    measurement.name,
                                    "snug",
                                    e.target.value
                                  )
                                }
                              />
                            </td>
                            <td className="p-2 align-top">
                              <input
                                type="number"
                                step="0.1"
                                placeholder="-"
                                className="w-full bg-background/50 border border-border rounded-md p-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary"
                                onChange={(e) =>
                                  handleMeasurementChange(
                                    categoryKey,
                                    measurement.name,
                                    "static",
                                    e.target.value
                                  )
                                }
                              />
                            </td>
                            <td className="p-2 align-top">
                              <input
                                type="number"
                                step="0.1"
                                placeholder="-"
                                className="w-full bg-background/50 border border-border rounded-md p-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary"
                                onChange={(e) =>
                                  handleMeasurementChange(
                                    categoryKey,
                                    measurement.name,
                                    "dynamic",
                                    e.target.value
                                  )
                                }
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {/* ====== TABLE IMPLEMENTATION END ====== */}
                </motion.div>
              </div>
            )
          )}
        </motion.div>

        {/* Save Button */}
        <motion.div variants={itemVariants} className="mt-8 flex justify-end">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSave}
            disabled={saving}
            className="bg-primary text-primary-foreground px-8 py-4 rounded-xl flex items-center space-x-2 hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <Save className="w-5 h-5" />
            )}
            <span>{saving ? "Saving..." : "Save Measurements"}</span>
          </motion.button>
        </motion.div>
      </motion.div>
    </div>
  );
}
