// @/app/client/layout.jsx
"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Navigation } from "@/app/components/Navigation"; // Import the main navigation

export default function ClientLayout({ children }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return; // Do nothing while loading
    if (!session) {
      router.push("/login");
    } else if (session.user.role !== "CLIENT") {
      // If the user is not a client, redirect them to a suitable page
      // or to an unauthorized page.
      router.push("/unauthorized");
    }
  }, [session, status, router]);

  // Render a loading state while session is being checked
  if (status === "loading" || !session || session.user.role !== "CLIENT") {
    return (
      <div className="flex items-center justify-center h-screen w-full">
        <div className="text-lg">Loading Client Portal...</div>
      </div>
    );
  }

  // Render the layout with the main navigation
  return (
    <div className="relative min-h-screen">
      <Navigation />
      <main className="pt-24 md:pt-32 px-4 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}