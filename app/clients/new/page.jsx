"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  UserIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  CalendarIcon,
  DocumentTextIcon,
  ArrowLeftIcon,
  CheckIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      delayChildren: 0.1,
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

const formFields = [
  {
    name: "firstName",
    label: "First Name",
    type: "text",
    icon: UserIcon,
    placeholder: "Enter first name",
    required: true,
  },
  {
    name: "lastName",
    label: "Last Name",
    type: "text",
    icon: UserIcon,
    placeholder: "Enter last name",
    required: true,
  },
  {
    name: "phone",
    label: "Phone Number",
    type: "tel",
    icon: PhoneIcon,
    placeholder: "+1 (555) 123-4567",
    required: true,
  },
  {
    name: "email",
    label: "Email Address",
    type: "email",
    icon: EnvelopeIcon,
    placeholder: "client@example.com",
    required: false,
  },
  {
    name: "address",
    label: "Address",
    type: "text",
    icon: MapPinIcon,
    placeholder: "Street address",
    required: false,
  },
  {
    name: "dateOfBirth",
    label: "Date of Birth",
    type: "date",
    icon: CalendarIcon,
    placeholder: "",
    required: false,
  },
];

export default function AddClient() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    address: "",
    dateOfBirth: "",
    notes: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.firstName.trim())
      newErrors.firstName = "First name is required";
    if (!formData.lastName.trim()) newErrors.lastName = "Last name is required";
    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required";
    } else if (!/^\+?[\d\s\-\(\)]+$/.test(formData.phone)) {
      newErrors.phone = "Please enter a valid phone number";
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError("");
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setSubmitError(errorData.error || "An unexpected error occurred.");
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      setShowSuccess(true);
      setTimeout(() => {
        router.push("/clients");
        router.refresh(); // Force a data refresh on the clients page
      }, 1500);
    } catch (error) {
      console.error("Error adding client:", error);
      if (!submitError) {
        setSubmitError("Network error. Please check your connection.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (showSuccess) {
    return (
      <div className="min-h-screen pt-30 pb-10 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 }}
            className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6"
          >
            <CheckIcon className="w-10 h-10 text-white" />
          </motion.div>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Client Added Successfully!
          </h2>
          <p className="text-muted-foreground">Redirecting to client list...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-30 pb-10 px-4 sm:px-6 lg:px-8">
      <motion.div
        className="max-w-2xl mx-auto"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div className="mb-8" variants={itemVariants}>
          <Link
            href="/clients"
            className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Back to Clients
          </Link>
          <h1 className="text-4xl font-bold gradient-text mb-2">
            Add New Client
          </h1>
          <p className="text-muted-foreground text-lg">
            Create a new client profile to start taking measurements.
          </p>
        </motion.div>

        <motion.div className="glass rounded-2xl p-8" variants={itemVariants}>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-4">
                Basic Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {formFields.map((field) => (
                  <motion.div
                    key={field.name}
                    className="space-y-2"
                    variants={itemVariants}
                  >
                    <label
                      htmlFor={field.name}
                      className="block text-sm font-medium text-foreground"
                    >
                      {field.label}
                      {field.required && (
                        <span className="text-red-500 ml-1">*</span>
                      )}
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <field.icon className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <input
                        type={field.type}
                        id={field.name}
                        name={field.name}
                        value={formData[field.name]}
                        onChange={handleInputChange}
                        placeholder={field.placeholder}
                        className={`w-full pl-10 pr-4 py-3 border rounded-xl bg-background/50 backdrop-blur-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary ${
                          errors[field.name]
                            ? "border-red-500 focus:ring-red-500/50 focus:border-red-500"
                            : "border-border hover:border-primary/50"
                        }`}
                      />
                    </div>
                    {errors[field.name] && (
                      <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-sm text-red-500 flex items-center"
                      >
                        <XMarkIcon className="w-4 h-4 mr-1" />
                        {errors[field.name]}
                      </motion.p>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>

            <motion.div className="space-y-2" variants={itemVariants}>
              <label
                htmlFor="notes"
                className="block text-sm font-medium text-foreground"
              >
                Notes
              </label>
              <div className="relative">
                <div className="absolute top-3 left-3 pointer-events-none">
                  <DocumentTextIcon className="h-5 w-5 text-muted-foreground" />
                </div>
                <textarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  rows={4}
                  placeholder="Any additional notes about the client..."
                  className="w-full pl-10 pr-4 py-3 border border-border rounded-xl bg-background/50 backdrop-blur-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary hover:border-primary/50 resize-none"
                />
              </div>
            </motion.div>

            {submitError && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-xl flex items-center text-sm"
              >
                <ExclamationTriangleIcon className="w-5 h-5 mr-3 flex-shrink-0" />
                {submitError}
              </motion.div>
            )}

            <motion.div
              className="flex justify-end space-x-4 pt-6"
              variants={itemVariants}
            >
              <Link
                href="/clients"
                className="px-6 py-3 border border-border rounded-xl text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all duration-200"
              >
                Cancel
              </Link>
              <motion.button
                type="submit"
                disabled={isSubmitting}
                className="px-8 py-3 gradient-bg text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    Adding Client...
                  </>
                ) : (
                  <>
                    <UserIcon className="w-5 h-5 mr-2" />
                    Add Client
                  </>
                )}
              </motion.button>
            </motion.div>
          </form>
        </motion.div>

        <motion.div
          className="mt-8 p-6 bg-primary/5 border border-primary/20 rounded-2xl"
          variants={itemVariants}
        >
          <h4 className="font-semibold text-foreground mb-2">💡 Quick Tip</h4>
          <p className="text-sm text-muted-foreground">
            After adding a client, you can immediately start taking their
            measurements. Make sure to have accurate contact information for
            appointment scheduling.
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
