"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// The component logic is moved here. It uses the searchParams hook.
export default function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [identifier, setIdentifier] = useState("");
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const identifierParam = searchParams.get("identifier");
    if (identifierParam) {
      setIdentifier(identifierParam);
    }
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/password-reset/reset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ identifier, token, newPassword }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(data.message || "Your password has been reset successfully. Redirecting to login...");
        setTimeout(() => {
          router.push("/login");
        }, 3000);
      } else {
        setError(data.error || "Failed to reset password. Please check your code and try again.");
      }
    } catch (err) {
      console.error("Password reset failed:", err);
      setError("Failed to connect to the server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
            <h1 className="text-4xl font-bold gradient-text">Reset Password</h1>
            <p className="text-muted-foreground mt-2">
                Enter the code you received and a new password.
            </p>
        </div>

        <div className="glass rounded-2xl p-8">
            <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid gap-2">
                <label htmlFor="identifier" className="text-sm font-medium text-foreground">Email or Phone Number</label>
                <Input
                id="identifier"
                type="text"
                placeholder="m@example.com or +123456789"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                disabled={loading || searchParams.get("identifier")}
                className="w-full pl-4 pr-3 py-2 rounded-lg border bg-input text-foreground focus:ring-2 focus:ring-ring"
                />
            </div>
            <div className="grid gap-2">
                <label htmlFor="token" className="text-sm font-medium text-foreground">Reset Code</label>
                <Input
                id="token"
                type="text"
                placeholder="6-digit code"
                required
                maxLength={6}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                disabled={loading}
                className="w-full pl-4 pr-3 py-2 rounded-lg border bg-input text-foreground focus:ring-2 focus:ring-ring"
                />
            </div>
            <div className="grid gap-2">
                <label htmlFor="newPassword" className="text-sm font-medium text-foreground">New Password</label>
                <Input
                id="newPassword"
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={loading}
                className="w-full pl-4 pr-3 py-2 rounded-lg border bg-input text-foreground focus:ring-2 focus:ring-ring"
                />
            </div>
            <div className="grid gap-2">
                <label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">Confirm New Password</label>
                <Input
                id="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                className="w-full pl-4 pr-3 py-2 rounded-lg border bg-input text-foreground focus:ring-2 focus:ring-ring"
                />
            </div>
            {message && <p className="text-green-500 text-sm text-center bg-green-500/10 p-3 rounded-lg">{message}</p>}
            {error && <p className="text-destructive text-sm text-center bg-destructive/10 p-3 rounded-lg">{error}</p>}
            <Button type="submit" className="w-full gradient-bg text-primary-foreground font-semibold" disabled={loading}>
                {loading ? "Resetting..." : "Reset Password"}
            </Button>
            </form>
        </div>
        <p className="text-center text-sm text-muted-foreground mt-8">
            Suddenly remembered it?{" "}
            <Link href="/login" className="font-semibold text-primary hover:underline">
              Sign In
            </Link>
        </p>
      </div>
    </div>
  );
}
