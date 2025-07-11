// app/pages/admin/dashboard/page.jsx

"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Users, UserCheck, UserX, Loader2, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";

const UserRowSkeleton = () => (
  <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center p-4 border-b border-border/50 animate-pulse">
    <div className="h-5 bg-muted/50 rounded w-3/4"></div>
    <div className="h-5 bg-muted/50 rounded w-full"></div>
    <div className="h-5 bg-muted/50 rounded w-1/2"></div>
    <div className="h-5 bg-muted/50 rounded w-1/3"></div>
    <div className="h-8 bg-muted/50 rounded w-full"></div>
  </div>
);

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingUserId, setEditingUserId] = useState(null);
  const [selectedRole, setSelectedRole] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const router = useRouter();

  const fetchUsers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/users");
      if (!response.ok) {
        if (response.status === 401) {
          router.push("/login"); // Redirect to login if unauthorized
          return;
        }
        const errData = await response.json();
        throw new Error(errData.error || "Failed to fetch users.");
      }
      const data = await response.json();
      setUsers(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleEditClick = (user) => {
    setEditingUserId(user.id);
    setSelectedRole(user.role);
    setSelectedStatus(user.status);
  };

  const handleSaveClick = async (userId) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: selectedRole, status: selectedStatus }),
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to update user.");
      }
      setEditingUserId(null);
      fetchUsers(); // Re-fetch users to get updated data
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen pt-0 md:pt-30 pb-10 mb-24 px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-6xl mx-auto"
      >
        <h1 className="text-4xl font-bold gradient-text mb-8">Admin Dashboard</h1>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-2xl mb-8 flex items-center">
            <AlertCircle className="w-6 h-6 mr-3" />
            <p><strong>Error:</strong> {error}</p>
          </div>
        )}

        <div className="glass rounded-2xl p-6 border">
          <h2 className="text-2xl font-semibold mb-6">User Management</h2>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border/50">
              <thead>
                <tr className="text-left text-sm font-medium text-muted-foreground">
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => <UserRowSkeleton key={i} />)
                ) : users.length > 0 ? (
                  users.map((user) => (
                    <tr key={user.id} className="hover:bg-muted/10 transition-colors">
                      <td className="py-4 px-4 font-medium">{user.name || "N/A"}</td>
                      <td className="py-4 px-4 text-muted-foreground">{user.email}</td>
                      <td className="py-4 px-4">
                        {editingUserId === user.id ? (
                          <select
                            value={selectedRole}
                            onChange={(e) => setSelectedRole(e.target.value)}
                            className="bg-background/50 border border-border rounded-md px-2 py-1 text-sm"
                          >
                            <option value="CLIENT">CLIENT</option>
                            <option value="DESIGNER">DESIGNER</option>
                            <option value="ADMIN">ADMIN</option>
                          </select>
                        ) : (
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            user.role === "ADMIN" ? "bg-purple-500/10 text-purple-500" :
                            user.role === "DESIGNER" ? "bg-blue-500/10 text-blue-500" :
                            "bg-gray-500/10 text-gray-400"
                          }`}>
                            {user.role}
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        {editingUserId === user.id ? (
                          <select
                            value={selectedStatus}
                            onChange={(e) => setSelectedStatus(e.target.value)}
                            className="bg-background/50 border border-border rounded-md px-2 py-1 text-sm"
                          >
                            <option value="ACTIVE">ACTIVE</option>
                            <option value="DELETED">DELETED</option>
                          </select>
                        ) : (
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            user.status === "ACTIVE" ? "bg-green-500/10 text-green-500" :
                            "bg-red-500/10 text-red-500"
                          }`}>
                            {user.status}
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        {editingUserId === user.id ? (
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleSaveClick(user.id)}
                              className="p-2 rounded-full bg-green-500/10 text-green-500 hover:bg-green-500/20 transition-colors"
                              title="Save Changes"
                            >
                              <UserCheck className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => setEditingUserId(null)}
                              className="p-2 rounded-full bg-gray-500/10 text-gray-400 hover:bg-gray-500/20 transition-colors"
                              title="Cancel"
                            >
                              <UserX className="w-5 h-5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleEditClick(user)}
                            className="p-2 rounded-full bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 transition-colors"
                            title="Edit User"
                          >
                            <Edit3 className="w-5 h-5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="py-8 text-center text-muted-foreground">
                      <Users className="w-10 h-10 mx-auto mb-3" />
                      No users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
