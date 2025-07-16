"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { useTheme } from "./ThemeProvider";
import { useSession } from "next-auth/react";
import {
  HomeIcon,
  UsersIcon,
  PlusIcon,
  ChartBarIcon,
  CogIcon,
  SunIcon,
  MoonIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";
import {
  HomeIcon as HomeIconSolid,
  UsersIcon as UsersIconSolid,
  PlusIcon as PlusIconSolid,
  ChartBarIcon as ChartBarIconSolid,
  CogIcon as CogIconSolid,
  DocumentTextIcon as DocumentTextIconSolid,
} from "@heroicons/react/24/solid";

const getNavigation = (role) => {
  switch (role) {
    case "ADMIN":
      return [
        {
          name: "Dashboard",
          href: "/pages/admin/dashboard",
          icon: HomeIcon,
          iconSolid: HomeIconSolid,
        },
        {
          name: "Analytics",
          href: "/pages/admin/analytics",
          icon: ChartBarIcon,
          iconSolid: ChartBarIconSolid,
        },
        {
          name: "Users",
          href: "/pages/admin/users",
          icon: UsersIcon,
          iconSolid: UsersIconSolid,
        },
        {
          name: "Logs",
          href: "/pages/admin/logs",
          icon: DocumentTextIcon,
          iconSolid: DocumentTextIconSolid,
        },
      ];
    case "DESIGNER":
      return [
        {
          name: "Clients",
          href: "/pages/clients",
          icon: UsersIcon,
          iconSolid: UsersIconSolid,
        },
        {
          name: "Add Client",
          href: "/pages/clients/new",
          icon: PlusIcon,
          iconSolid: PlusIconSolid,
        },
        {
          name: "Analytics",
          href: "/pages/analytics",
          icon: ChartBarIcon,
          iconSolid: ChartBarIconSolid,
        },
        {
          name: "Settings",
          href: "/pages/settings",
          icon: CogIcon,
          iconSolid: CogIconSolid,
        },
      ];
    case "CLIENT":
      return [
        {
          name: "Dashboard",
          href: "/client/dashboard",
          icon: HomeIcon,
          iconSolid: HomeIconSolid,
        },
        {
          name: "Profile",
          href: "/client/profile",
          icon: UsersIcon,
          iconSolid: UsersIconSolid,
        },
        {
          name: "Measurements",
          href: "/client/measurements",
          icon: DocumentTextIcon,
          iconSolid: DocumentTextIconSolid,
        },
      ];
    default:
      return [];
  }
};

const getMobileNavigation = (role) => {
  switch (role) {
    case "ADMIN":
      return [
        {
          name: "Dashboard",
          href: "/pages/admin/dashboard",
          icon: HomeIcon,
          iconSolid: HomeIconSolid,
          label: "Home",
        },
        {
          name: "Analytics",
          href: "/pages/admin/analytics",
          icon: ChartBarIcon,
          iconSolid: ChartBarIconSolid,
          label: "Analytics",
        },
        {
          name: "Users",
          href: "/pages/admin/users",
          icon: UsersIcon,
          iconSolid: UsersIconSolid,
          label: "Users",
        },
        {
          name: "Logs",
          href: "/pages/admin/logs",
          icon: DocumentTextIcon,
          iconSolid: DocumentTextIconSolid,
          label: "Logs",
        },
        {
          name: "Settings",
          href: "/pages/settings",
          icon: CogIcon,
          iconSolid: CogIconSolid,
          label: "Settings",
        },
      ];
    case "DESIGNER":
      return [
        {
          name: "Dashboard",
          href: "/pages/dashboard",
          icon: HomeIcon,
          iconSolid: HomeIconSolid,
          label: "Home",
        },
        {
          name: "Clients",
          href: "/pages/clients",
          icon: UsersIcon,
          iconSolid: UsersIconSolid,
          label: "Clients",
        },
        {
          name: "Add Client",
          href: "/pages/clients/new",
          icon: PlusIcon,
          iconSolid: PlusIconSolid,
          label: "Add",
        },
        {
          name: "Analytics",
          href: "/pages/analytics",
          icon: ChartBarIcon,
          iconSolid: ChartBarIconSolid,
          label: "Analytics",
        },
        {
          name: "Settings",
          href: "/pages/settings",
          icon: CogIcon,
          iconSolid: CogIconSolid,
          label: "Settings",
        },
      ];
    case "CLIENT":
      return [
        {
          name: "Dashboard",
          href: "/client/dashboard",
          icon: HomeIcon,
          iconSolid: HomeIconSolid,
          label: "Home",
        },
        {
          name: "Profile",
          href: "/client/profile",
          icon: UsersIcon,
          iconSolid: UsersIconSolid,
          label: "Profile",
        },
        {
          name: "Measurements",
          href: "/client/measurements",
          icon: DocumentTextIcon,
          iconSolid: DocumentTextIconSolid,
          label: "History",
        },
      ];
    default:
      return [];
  }
};

export function Navigation() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const { data: session } = useSession();
  const userRole = session?.user?.role;

  const navigation = getNavigation(userRole);
  const mobileNavigation = getMobileNavigation(userRole);

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="hidden md:flex fixed top-6 left-1/2 transform -translate-x-1/2 z-50 glass rounded-full px-6 py-3">
        <div className="flex items-center space-x-6">
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full gradient-bg flex items-center justify-center animate-pulse-glow">
              <span className="text-white font-bold text-sm">E</span>
            </div>
            <span className="font-bold gradient-text text-lg">Edinception</span>
          </Link>

          <div className="flex items-center space-x-4">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`relative flex items-center space-x-2 px-4 py-2 rounded-full transition-all duration-300 ${
                    isActive
                      ? "text-primary bg-primary/10 shadow-lg animate-pulse-glow"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50 hover:scale-105"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{item.name}</span>
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 rounded-full bg-primary/20 border border-primary/30 shimmer"
                      initial={false}
                      transition={{
                        type: "spring",
                        bounce: 0.2,
                        duration: 0.6,
                      }}
                    />
                  )}
                </Link>
              );
            })}
          </div>

          <button
            onClick={toggleTheme}
            className="p-2 rounded-full hover:bg-muted/50 transition-all duration-300 hover:scale-110 animate-float"
          >
            {theme === "light" ? (
              <MoonIcon className="w-5 h-5" />
            ) : (
              <SunIcon className="w-5 h-5" />
            )}
          </button>
        </div>
      </nav>

      {/* Mobile Top Bar */}
      <nav className="md:hidden fixed top-0 left-0 right-0 z-50 glass border-b">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full gradient-bg flex items-center justify-center animate-pulse-glow">
              <span className="text-white font-bold text-sm">E</span>
            </div>
            <span className="font-bold gradient-text">Edinception</span>
          </Link>

          <button
            onClick={toggleTheme}
            className="p-2 rounded-full hover:bg-muted/50 transition-all duration-300 hover:scale-110"
          >
            {theme === "light" ? (
              <MoonIcon className="w-5 h-5" />
            ) : (
              <SunIcon className="w-5 h-5" />
            )}
          </button>
        </div>
      </nav>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass border-t">
        <div className="flex items-center justify-around px-2 py-2">
          {mobileNavigation.map((item) => {
            const Icon = item.icon;
            const IconSolid = item.iconSolid;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`relative flex flex-col items-center justify-center p-3 rounded-xl transition-all duration-300 min-w-0 flex-1 ${
                  isActive
                    ? "text-primary bg-primary/10 scale-105"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/30 hover:scale-105"
                }`}
              >
                <div className="relative">
                  {isActive ? (
                    <IconSolid className="w-6 h-6 mb-1" />
                  ) : (
                    <Icon className="w-6 h-6 mb-1" />
                  )}
                  {isActive && (
                    <motion.div
                      className="absolute -top-1 -left-1 -right-1 -bottom-1 rounded-full bg-primary/20 animate-pulse-glow"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{
                        type: "spring",
                        bounce: 0.4,
                        duration: 0.6,
                      }}
                    />
                  )}
                </div>
                <span
                  className={`text-xs font-medium ${
                    isActive ? "font-semibold" : ""
                  }`}
                >
                  {item.label}
                </span>
                {isActive && (
                  <motion.div
                    className="absolute top-0 left-1/2 w-8 h-1 bg-primary rounded-full"
                    initial={{ x: "-50%", scale: 0 }}
                    animate={{ x: "-50%", scale: 1 }}
                    transition={{
                      type: "spring",
                      bounce: 0.4,
                      duration: 0.6,
                    }}
                  />
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Mobile spacing */}
      <div className="md:hidden h-16" />
      <div className="md:hidden h-20" />
    </>
  );
}
