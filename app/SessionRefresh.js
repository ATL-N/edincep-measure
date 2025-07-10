'use client'
import { useSession, signOut } from "next-auth/react";
import { useEffect, useCallback } from "react";

const ACTIVITY_EVENTS = ["mousedown", "keydown", "touchstart", "mousemove"];
const REFRESH_INTERVAL = 4 * 60 * 1000; // 4 minutes
const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes

export default function SessionRefresh() {
  const { data: session, update } = useSession();

  const refreshSession = useCallback(async () => {
    if (session) {
      try {
        await update(); // This triggers a session refresh
      } catch (error) {
        console.error("Failed to refresh session:", error);
        signOut(); // Sign out if refresh fails
      }
    }
  }, [session, update]);

  useEffect(() => {
    let inactivityTimeout;
    let refreshInterval;

    const resetTimers = () => {
      // Clear existing timers
      clearTimeout(inactivityTimeout);
      clearInterval(refreshInterval);

      // Set new timers
      inactivityTimeout = setTimeout(() => {
        signOut(); // Sign out after inactivity
      }, INACTIVITY_TIMEOUT);

      refreshInterval = setInterval(refreshSession, REFRESH_INTERVAL);
    };

    // Add activity event listeners
    ACTIVITY_EVENTS.forEach((event) => {
      window.addEventListener(event, resetTimers);
    });

    // Initial timer setup
    resetTimers();

    // Cleanup
    return () => {
      ACTIVITY_EVENTS.forEach((event) => {
        window.removeEventListener(event, resetTimers);
      });
      clearTimeout(inactivityTimeout);
      clearInterval(refreshInterval);
    };
  }, [refreshSession]);

  return null;
}
