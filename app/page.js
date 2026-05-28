"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  UsersIcon,
  ChartBarIcon,
  SparklesIcon,
  ArrowRightIcon,
  ScissorsIcon,
  ShieldCheckIcon,
  ClockIcon,
  GlobeAltIcon,
  TrophyIcon,
  HeartIcon,
} from "@heroicons/react/24/outline";
import { ThemeProvider } from "./components/ThemeProvider";
import { FloatingCursor } from "./components/FloatingCursor";
import { Navigation } from "./components/Navigation";

const features = [
  {
    icon: ScissorsIcon,
    title: "Precision Measurements",
    description:
      "Advanced 3-point measurement system (Snug, Static, Dynamic) for perfect fit every time.",
    color: "from-purple-500 to-pink-500",
  },
  {
    icon: UsersIcon,
    title: "Client Management",
    description:
      "Comprehensive client profiles with measurement history and design preferences.",
    color: "from-blue-500 to-cyan-500",
  },
  {
    icon: ChartBarIcon,
    title: "Analytics Dashboard",
    description:
      "Track your business growth with detailed insights and performance metrics.",
    color: "from-green-500 to-emerald-500",
  },
  {
    icon: ShieldCheckIcon,
    title: "Secure & Private",
    description:
      "Your client data is protected with enterprise-grade security and privacy controls.",
    color: "from-orange-500 to-red-500",
  },
  {
    icon: ClockIcon,
    title: "Order Tracking",
    description:
      "Monitor order progress from confirmation to delivery with real-time updates.",
    color: "from-indigo-500 to-purple-500",
  },
  {
    icon: GlobeAltIcon,
    title: "Multi-Designer Support",
    description:
      "Collaborate with multiple designers and share client measument easily as a pdf.",
    color: "from-teal-500 to-blue-500",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
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

const floatingVariants = {
  animate: {
    y: [0, -10, 0],
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};

export default function LandingPage() {
  const [activeSection, setActiveSection] = useState("home");
  const { data: session, status } = useSession();

  useEffect(() => {
    const handleScroll = () => {
      const sections = ["home", "features", "testimonials", "pricing"];
      const scrollY = window.scrollY;

      sections.forEach((section) => {
        const element = document.getElementById(section);
        if (element) {
          const offsetTop = element.offsetTop - 100;
          const height = element.offsetHeight;
          if (scrollY >= offsetTop && scrollY < offsetTop + height) {
            setActiveSection(section);
          }
        }
      });
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <ThemeProvider>
        <FloatingCursor />
        <Navigation />

        {/* Hero Section */}
        <motion.section
          id="home"
          className="min-h-screen flex items-center justify-center pt-20 pb-10 px-4 sm:px-6 lg:px-8 relative overflow-hidden"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <div className="absolute inset-0 gradient-bg opacity-5"></div>
          <div className="max-w-7xl mx-auto text-center relative z-10">
            <motion.div variants={itemVariants}>
              <motion.div
                className="inline-block mb-6"
                variants={floatingVariants}
                animate="animate"
              >
                <SparklesIcon className="w-16 h-16 text-primary mx-auto animate-pulse-glow" />
              </motion.div>
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold gradient-text mb-6">
                Perfect Fit,
                <br />
                Every Time
              </h1>
              <p className="text-xl sm:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto">
                Revolutionary measurement platform for fashion designers. Create
                custom clothing with precision using our advanced measurement system.
                Access your workspace anywhere with our new web app.
              </p>
              <div className="mb-8">
                <p className="text-2xl font-bold text-green-500">The system is currently free to use!</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/login"
                  className="inline-flex items-center px-8 py-4 text-lg font-semibold text-foreground glass rounded-2xl hover:shadow-xl transition-all duration-300"
                >
                  Sign In
                </Link>
                <Link
                  href="https://app.edinmeasure.edinception.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-8 py-4 text-lg font-semibold text-white bg-green-500 rounded-2xl hover:shadow-2xl transition-all duration-300 hover:scale-105"
                >
                  Get measureMe App
                  <ArrowRightIcon className="w-5 h-5 ml-2" />
                </Link>
              </div>
            </motion.div>

            {/* Floating Elements */}
            <motion.div
              className="absolute top-20 left-10 w-20 h-20 glass rounded-full flex items-center justify-center"
              animate={{
                y: [0, -20, 0],
                rotate: [0, 360],
              }}
              transition={{
                duration: 8,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <TrophyIcon className="w-8 h-8 text-primary" />
            </motion.div>
            <motion.div
              className="absolute top-40 right-10 w-16 h-16 glass rounded-full flex items-center justify-center"
              animate={{
                y: [0, 20, 0],
                rotate: [0, -360],
              }}
              transition={{
                duration: 6,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <HeartIcon className="w-6 h-6 text-secondary" />
            </motion.div>
          </div>
        </motion.section>

        {/* Features Section */}
        <motion.section
          id="features"
          className="py-20 px-4 sm:px-6 lg:px-8"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
        >
          <div className="max-w-7xl mx-auto">
            <motion.div className="text-center mb-16" variants={itemVariants}>
              <h2 className="text-4xl sm:text-5xl font-bold gradient-text mb-6">
                Powerful Features
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Everything you need to manage your fashion business with
                precision and style.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  className="glass rounded-2xl p-6 card-3d group"
                  variants={itemVariants}
                  whileHover={{ y: -5 }}
                  transition={{ duration: 0.3 }}
                >
                  <div
                    className={`w-12 h-12 rounded-xl bg-gradient-to-r ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
                  >
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* CTA Section */}
        <motion.section
          className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-primary/10 to-secondary/10"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
        >
          <div className="max-w-4xl mx-auto text-center">
            <motion.div variants={itemVariants}>
              <h2 className="text-4xl sm:text-5xl font-bold gradient-text mb-6">
                Ready to Transform Your Fashion Business?
              </h2>
              <p className="text-xl text-muted-foreground mb-8">
                Join thousands of designers creating perfect fits with our
                precision measurement platform.
              </p>
            </motion.div>
          </div>
        </motion.section>

        {/* Footer */}
        <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t border-border">
          <div className="max-w-7xl mx-auto">
            <div className="text-center">
              <div className="flex items-center justify-center mb-4">
                <ScissorsIcon className="w-8 h-8 text-primary mr-2" />
                <span className="text-2xl font-bold gradient-text">
                  EdinMeasure
                </span>
              </div>
              <p className="text-muted-foreground mb-4">
                Precision measurement platform for fashion professionals
              </p>
              <p className="text-sm text-muted-foreground mt-8">
                © 2025 EdinMeasure. All rights reserved.
              </p>
            </div>
          </div>
        </footer>
      </ThemeProvider>
    </>
  );
}
