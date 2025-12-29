"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Pre-fill email from query parameter if available
    const emailParam = searchParams.get("email");
    if (emailParam) {
      setEmail(emailParam);
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
        body: JSON.stringify({ email, token, newPassword }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(data.message || "Your password has been reset successfully. You can now log in.");
        // Optionally redirect to login page after a short delay
        setTimeout(() => {
          router.push("/login");
        }, 3000);
      } else {
        setError(data.error || "Failed to reset password. Please check your token and try again.");
      }
    } catch (err) {
      console.error("Password reset failed:", err);
      setError("Failed to connect to the server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-theme(spacing.16))] flex-col items-center justify-center py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Reset Password</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-sm text-muted-foreground mb-6">
            Enter the code sent to your email and your new password.
          </p>
          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid gap-2">
              <label htmlFor="email">Email</label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading || searchParams.get("email")} // Disable if pre-filled from URL
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="token">Reset Code (6 digits)</label>
              <Input
                id="token"
                type="text"
                placeholder="e.g., 123456"
                required
                maxLength={6}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="newPassword">New Password</label>
              <Input
                id="newPassword"
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="confirmPassword">Confirm New Password</label>
              <Input
                id="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
              />
            </div>
            {message && <p className="text-green-500 text-sm text-center">{message}</p>}
            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Resetting..." : "Reset Password"}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            Remember your password?{" "}
            <Link href="/login" className="underline">
              Sign In
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
