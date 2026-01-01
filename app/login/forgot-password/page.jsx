"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function ForgotPasswordPage() {
  const [identifier, setIdentifier] = useState("");
  const [method, setMethod] = useState("email"); // 'email' or 'sms'
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
        body: JSON.stringify({ identifier, method }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(data.message || "If an account exists, a reset code has been sent.");
        // Redirect to the reset page, passing the identifier so it can be pre-filled.
        router.push(`/login/reset-password?identifier=${encodeURIComponent(identifier)}`);
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
                No problem. We'll send you a reset code.
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
                disabled={loading}
                className="w-full pl-4 pr-3 py-2 rounded-lg border bg-input text-foreground focus:ring-2 focus:ring-ring"
                />
            </div>

            <div className="grid gap-2">
                <label className="text-sm font-medium text-foreground">Delivery Method</label>
                <div className="flex items-center space-x-4">
                    <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                            type="radio"
                            name="method"
                            value="email"
                            checked={method === "email"}
                            onChange={() => setMethod("email")}
                            className="form-radio h-4 w-4 text-primary focus:ring-primary"
                        />
                        <span className="text-sm text-foreground">Email</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                            type="radio"
                            name="method"
                            value="sms"
                            checked={method === "sms"}
                            onChange={() => setMethod("sms")}
                            className="form-radio h-4 w-4 text-primary focus:ring-primary"
                        />
                        <span className="text-sm text-foreground">SMS</span>
                    </label>
                </div>
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
