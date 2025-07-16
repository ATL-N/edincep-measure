// app/pages/admin/dashboard/page.jsx

"use client";

import { motion } from "framer-motion";
import { BarChart2, Users, FileText } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const adminSections = [
  {
    title: "Analytics",
    description: "View key metrics and user statistics.",
    href: "/pages/admin/analytics",
    icon: <BarChart2 className="w-8 h-8 mb-4 text-blue-500" />,
  },
  {
    title: "User Management",
    description: "Manage user roles and permissions.",
    href: "/pages/admin/users",
    icon: <Users className="w-8 h-8 mb-4 text-purple-500" />,
  },
  {
    title: "System Logs",
    description: "Browse system and application logs.",
    href: "/pages/admin/logs",
    icon: <FileText className="w-8 h-8 mb-4 text-green-500" />,
  },
];

export default function AdminDashboard() {
  return (
    <div className="min-h-screen pt-0 md:pt-30 pb-10 mb-24 px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-6xl mx-auto"
      >
        <h1 className="text-4xl font-bold gradient-text mb-8">
          Admin Dashboard
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {adminSections.map((section) => (
            <Link href={section.href} key={section.title}>
              <motion.div whileHover={{ y: -5 }} className="h-full">
                <Card className="h-full hover:border-primary/50 transition-colors">
                  <CardHeader>
                    <div className="flex items-center">
                      {section.icon}
                      <CardTitle className="ml-4">{section.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      {section.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            </Link>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
