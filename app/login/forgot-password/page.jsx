"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/auth/password-reset/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(data.message || "If an account with that email exists, a password reset code has been sent.");
        router.push(`/login/reset-password?email=${encodeURIComponent(email)}`);
      } else {
        setError(data.error || "An unexpected error occurred.");
      }
    } catch (err) {
      console.error("Forgot password request failed:", err);
      setError("Failed to connect to the server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
            <h1 className="text-4xl font-bold gradient-text">Forgot Password</h1>
            <p className="text-muted-foreground mt-2">
                No problem. We'll email you a reset code.
            </p>
        </div>

        <div className="glass rounded-2xl p-8">
            <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid gap-2">
                <label htmlFor="email" className="text-sm font-medium text-foreground">Email Address</label>
                <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="w-full pl-4 pr-3 py-2 rounded-lg border bg-input text-foreground focus:ring-2 focus:ring-ring"
                />
            </div>
            {message && <p className="text-green-500 text-sm text-center bg-green-500/10 p-3 rounded-lg">{message}</p>}
            {error && <p className="text-destructive text-sm text-center bg-destructive/10 p-3 rounded-lg">{error}</p>}
            <Button type="submit" className="w-full gradient-bg text-primary-foreground font-semibold" disabled={loading}>
                {loading ? "Sending..." : "Send Reset Code"}
            </Button>
            </form>
        </div>
        
        <p className="text-center text-sm text-muted-foreground mt-8">
            Remember your password?{" "}
            <Link href="/login" className="font-semibold text-primary hover:underline">
              Sign In
            </Link>
        </p>
      </div>
    </div>
  );
}
