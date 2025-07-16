
// @/app/client/profile/page.jsx
"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ClientProfile() {
  const { data: session } = useSession();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!session) return;
      try {
        const res = await fetch("/api/client/profile");
        if (!res.ok) throw new Error("Failed to fetch profile.");
        const data = await res.json();
        setProfile(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [session]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/client/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      if (!res.ok) throw new Error("Failed to update profile.");
      alert("Profile updated successfully!");
    } catch (err) {
      setError(err.message);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-red-500">Error: {error}</div>;
  if (!profile) return <div>No profile data found.</div>;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <h1 className="text-4xl font-bold gradient-text mb-8">Your Profile</h1>
      <Card>
        <CardHeader>
          <CardTitle>Edit Your Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdate} className="space-y-4">
            <Input name="name" value={profile.name} onChange={handleChange} placeholder="Full Name" />
            <Input name="email" value={profile.email} onChange={handleChange} placeholder="Email" type="email" readOnly />
            <Input name="phone" value={profile.phone || ''} onChange={handleChange} placeholder="Phone" />
            <Input name="address" value={profile.address || ''} onChange={handleChange} placeholder="Address" />
            <Button type="submit">Save Changes</Button>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}
