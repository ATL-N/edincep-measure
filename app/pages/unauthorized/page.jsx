"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ShieldExclamationIcon } from "@heroicons/react/24/outline";

export default function UnauthorizedPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md text-center"
      >
        <div className="glass rounded-2xl p-8">
          <ShieldExclamationIcon className="w-24 h-24 text-destructive mx-auto mb-6" />
          <h1 className="text-4xl font-bold gradient-text mb-4">Access Denied</h1>
          <p className="text-muted-foreground mb-8">
            You do not have permission to view this page.
          </p>
          <button
            onClick={() => router.back()}
            className="w-full py-3 gradient-bg text-primary-foreground font-semibold rounded-lg disabled:opacity-50 flex items-center justify-center cursor-pointer"
          >
            Go Back
          </button>
        </div>
      </motion.div>
    </div>
  );
}