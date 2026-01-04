// app/pages/admin/users/page.jsx

"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Users,
  UserCheck,
  UserX,
  Loader2,
  AlertCircle,
  Edit,
  Search,
  ChevronUp,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { useRouter } from "next/navigation";

// A simple debounce hook
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
};

const UserRowSkeleton = () => (
  <tr className="animate-pulse">
    {[...Array(7)].map((_, i) => (
      <td key={i} className="py-4 px-4">
        <div className="h-5 bg-muted/50 rounded w-full"></div>
      </td>
    ))}
    <td className="py-4 px-4">
      <div className="h-8 bg-muted/50 rounded w-20"></div>
    </td>
  </tr>
);

const SortableHeader = ({ children, sortKey, sortConfig, onSort }) => {
  const isSorted = sortConfig.key === sortKey;
  const Icon =
    isSorted && sortConfig.direction === "asc" ? ChevronUp : ChevronDown;
  return (
    <th
      className="py-3 px-4 cursor-pointer hover:bg-muted/20 transition-colors"
      onClick={() => onSort(sortKey)}
    >
      <div className="flex items-center space-x-1">
        <span>{children}</span>
        {isSorted && <Icon className="w-4 h-4" />}
      </div>
    </th>
  );
};

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Editing State
  const [editingUser, setEditingUser] = useState(null);

  // Search, Sort, Pagination State
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState({
    key: "createdAt",
    direction: "desc",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 10;

  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  const router = useRouter();

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        q: debouncedSearchQuery,
        sortBy: sortConfig.key,
        order: sortConfig.direction,
        page: currentPage,
        limit: usersPerPage,
      });

      const response = await fetch(`/api/admin/users?${params.toString()}`);

      if (!response.ok) {
        if (response.status === 401) {
          router.push("/login");
          return;
        }
        const errData = await response.json();
        throw new Error(errData.error || "Failed to fetch users.");
      }

      const { users: data, totalUsers: total } = await response.json();
      setUsers(data);
      setTotalUsers(total);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [
    router,
    debouncedSearchQuery,
    sortConfig,
    currentPage,
    usersPerPage,
  ]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleEditClick = (user) => {
    setEditingUser({ ...user });
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditingUser((prev) => ({ ...prev, [name]: value }));
  };

  const handleCancelEdit = () => {
    setEditingUser(null);
  };

  const handleSaveClick = async (userId) => {
    try {
      const { role, status, email, phone } = editingUser;
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, status, email, phone }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to update user.");
      }
      setEditingUser(null);
      fetchUsers(); // Re-fetch to show updated data
    } catch (err) {
      setError(err.message);
      // Optionally, don't cancel editing on error so user can retry
    }
  };

  const handleSort = (key) => {
    setSortConfig((prevConfig) => {
      if (prevConfig.key === key) {
        return {
          key,
          direction: prevConfig.direction === "asc" ? "desc" : "asc",
        };
      }
      return { key, direction: "desc" };
    });
    setCurrentPage(1); // Reset to first page on new sort
  };

  const handlePageChange = (newPage) => {
    if (newPage > 0 && newPage <= Math.ceil(totalUsers / usersPerPage)) {
      setCurrentPage(newPage);
    }
  };
  
  const totalPages = Math.ceil(totalUsers / usersPerPage);

  return (
    <div className="min-h-screen pt-0 md:pt-30 pb-10 mb-24 px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-7xl mx-auto"
      >
        <h1 className="text-4xl font-bold gradient-text mb-8">
          User Management
        </h1>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-2xl mb-8 flex items-center">
            <AlertCircle className="w-6 h-6 mr-3" />
            <p>
              <strong>Error:</strong> {error}
            </p>
          </div>
        )}

        <div className="glass rounded-2xl p-6 border">
          <div className="flex justify-between items-center mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by name, email, phone..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1); // Reset to first page on new search
                }}
                className="pl-10 pr-4 py-2 w-80 bg-background/50 border border-border rounded-lg focus:ring-2 focus:ring-primary/50 focus:outline-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border/50">
              <thead>
                <tr className="text-left text-sm font-medium text-muted-foreground">
                  <SortableHeader sortKey="name" sortConfig={sortConfig} onSort={handleSort}>Name</SortableHeader>
                  <SortableHeader sortKey="email" sortConfig={sortConfig} onSort={handleSort}>Email</SortableHeader>
                  <SortableHeader sortKey="phone" sortConfig={sortConfig} onSort={handleSort}>Phone</SortableHeader>
                  <SortableHeader sortKey="role" sortConfig={sortConfig} onSort={handleSort}>Role</SortableHeader>
                  <SortableHeader sortKey="status" sortConfig={sortConfig} onSort={handleSort}>Status</SortableHeader>
                  <SortableHeader sortKey="measurementUnit" sortConfig={sortConfig} onSort={handleSort}>Unit</SortableHeader>
                  <SortableHeader sortKey="createdAt" sortConfig={sortConfig} onSort={handleSort}>Created At</SortableHeader>
                  <th className="py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {isLoading ? (
                  Array.from({ length: usersPerPage }).map((_, i) => (
                    <UserRowSkeleton key={i} />
                  ))
                ) : users.length > 0 ? (
                  users.map((user) => (
                    <tr key={user.id} className="hover:bg-muted/10 transition-colors">
                      <td className="py-4 px-4 font-medium">{user.name || "N/A"}</td>
                      <td className="py-4 px-4 text-muted-foreground">
                        {editingUser?.id === user.id ? (
                          <input type="email" name="email" value={editingUser.email || ''} onChange={handleEditChange} className="bg-transparent border-b border-border focus:outline-none focus:border-primary w-full"/>
                        ) : (
                          user.email
                        )}
                      </td>
                       <td className="py-4 px-4 text-muted-foreground">
                        {editingUser?.id === user.id ? (
                          <input type="tel" name="phone" value={editingUser.phone || ''} onChange={handleEditChange} className="bg-transparent border-b border-border focus:outline-none focus:border-primary w-full"/>
                        ) : (
                          user.phone || 'N/A'
                        )}
                      </td>
                      <td className="py-4 px-4">
                        {editingUser?.id === user.id ? (
                          <select name="role" value={editingUser.role} onChange={handleEditChange} className="bg-background/50 border border-border rounded-md px-2 py-1 text-sm w-full">
                            <option value="CLIENT">CLIENT</option>
                            <option value="DESIGNER">DESIGNER</option>
                            <option value="ADMIN">ADMIN</option>
                          </select>
                        ) : (
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${ user.role === "ADMIN" ? "bg-purple-500/10 text-purple-500" : user.role === "DESIGNER" ? "bg-blue-500/10 text-blue-500" : "bg-gray-500/10 text-gray-400"}`}>
                            {user.role}
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        {editingUser?.id === user.id ? (
                          <select name="status" value={editingUser.status} onChange={handleEditChange} className="bg-background/50 border border-border rounded-md px-2 py-1 text-sm w-full">
                            <option value="ACTIVE">ACTIVE</option>
                            <option value="DELETED">DELETED</option>
                          </select>
                        ) : (
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${ user.status === "ACTIVE" ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500" }`}>
                            {user.status}
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-muted-foreground text-xs">{user.measurementUnit}</td>
                      <td className="py-4 px-4 text-muted-foreground text-xs">{new Date(user.createdAt).toLocaleDateString()}</td>
                      <td className="py-4 px-4">
                        {editingUser?.id === user.id ? (
                          <div className="flex space-x-2">
                            <button onClick={() => handleSaveClick(user.id)} className="p-2 rounded-full bg-green-500/10 text-green-500 hover:bg-green-500/20 transition-colors" title="Save Changes"><UserCheck className="w-5 h-5" /></button>
                            <button onClick={handleCancelEdit} className="p-2 rounded-full bg-gray-500/10 text-gray-400 hover:bg-gray-500/20 transition-colors" title="Cancel"><UserX className="w-5 h-5" /></button>
                          </div>
                        ) : (
                          <button onClick={() => handleEditClick(user)} className="p-2 rounded-full bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 transition-colors" title="Edit User"><Edit className="w-5 h-5" /></button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="py-8 text-center text-muted-foreground">
                      <Users className="w-10 h-10 mx-auto mb-3" />
                      No users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {!isLoading && totalUsers > 0 && (
            <div className="flex justify-between items-center mt-6 text-sm text-muted-foreground">
              <p>Showing {users.length} of {totalUsers} users</p>
              <div className="flex items-center space-x-2">
                 <button onClick={() => handlePageChange(1)} disabled={currentPage === 1} className="p-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted/20"><ChevronsLeft className="w-5 h-5" /></button>
                <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="p-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted/20">Previous</button>
                <span className="px-4 py-2 border border-border rounded-md">{currentPage} / {totalPages}</span>
                <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} className="p-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted/20">Next</button>
                <button onClick={() => handlePageChange(totalPages)} disabled={currentPage === totalPages} className="p-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted/20"><ChevronsRight className="w-5 h-5" /></button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}