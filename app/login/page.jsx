"use client";
import { useState, useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  UserIcon, // Changed from AtSymbolIcon
  LockClosedIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  EyeSlashIcon,
} from "@heroicons/react/24/outline";

// A simple Google icon component
const GoogleIcon = () => (
  <svg viewBox="0 0 48 48" className="w-6 h-6">
    <path
      fill="#FFC107"
      d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"
    ></path>
    <path
      fill="#FF3D00"
      d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"
    ></path>
    <path
      fill="#4CAF50"
      d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"
    ></path>
    <path
      fill="#1976D2"
      d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571l6.19,5.238C44.434,36.336,48,30.836,48,24c0-3.38-0.635-6.61-1.789-9.611l-1.023,1.023L43.611,20.083z"
    ></path>
  </svg>
);

export default function LoginPage() {
  const [login, setLogin] = useState(""); // Changed from email
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "authenticated") {
      if (session.user.role === "ADMIN") {
        router.push("/pages/admin/dashboard");
      } else if (session.user.role === "CLIENT") {
        router.push("/pages/client/dashboard");
      } else if (session.user.role === "DESIGNER") {
        router.push("/pages/dashboard");
      } else {
        router.push("/"); // Default fallback
      }
    }
  }, [session, status, router]);

  const handleCredentialsLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const result = await signIn("credentials", {
      redirect: false,
      login, // Changed from email
      password,
    });

    setIsLoading(false);

    if (result.error) {
      setError("Invalid credentials. Please try again.");
    } else {
      // Redirection is now handled by the useEffect hook
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold gradient-text">Welcome Back</h1>
          <p className="text-muted-foreground mt-2">
            Sign in to access your dashboard.
          </p>
        </div>
        <div className="glass rounded-2xl p-8">
          {/* <button
            onClick={() => signIn("google")}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-border rounded-xl bg-background/50 hover:bg-accent transition-colors mb-6 cursor-pointer"
          >
            <GoogleIcon />
            <span className="font-medium text-foreground">
              Sign in with Google
            </span>
          </button> */}
          {/* <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t"></span>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with details
              </span>
            </div>
          </div> */}
          <form onSubmit={handleCredentialsLogin} className="space-y-6">
            <div className="space-y-2">
              <label
                htmlFor="login"
                className="text-sm font-medium text-foreground"
              >
                Email or Phone Number
              </label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  id="login"
                  type="text"
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                  required
                  placeholder="m@example.com or +123456789"
                  className="w-full pl-10 pr-3 py-2 rounded-lg border bg-input text-foreground focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label
                htmlFor="password"
                className="text-sm font-medium text-foreground"
              >
                Password
              </label>
              <div className="relative">
                <LockClosedIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-10 pr-10 py-2 rounded-lg border bg-input text-foreground focus:ring-2 focus:ring-ring"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground"
                >
                  {showPassword ? <EyeSlashIcon /> : <EyeIcon />}
                </button>
              </div>
              <div className="flex justify-end text-sm mt-1">
                <Link href="/login/forgot-password" className="text-primary hover:underline">
                  Forgot your password?
                </Link>
              </div>
            </div>
            {error && (
              <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg flex items-center gap-2">
                <ExclamationTriangleIcon className="w-5 h-5" />
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 gradient-bg text-primary-foreground font-semibold rounded-lg disabled:opacity-50 flex items-center justify-center cursor-pointer"
            >
              {isLoading && (
                <div className="w-5 h-5 border-2 border-primary-foreground/50 border-t-primary-foreground rounded-full animate-spin mr-2 cursor-cancel" />
              )}
              {isLoading ? "Signing In..." : "Sign In"}
            </button>
          </form>
        </div>
        <p className="text-center text-sm text-muted-foreground mt-8">
          Don't have an account?{" "}
          <Link
            href="/signup"
            className="font-semibold text-primary hover:underline"
          >
            Sign up
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
