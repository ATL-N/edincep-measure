// @/app/pages/admin/logs/page.jsx
"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { BookText, Loader2, AlertCircle, Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const LogRowSkeleton = () => (
  <tr className="animate-pulse">
    <td className="py-4 px-4"><div className="h-5 bg-muted/50 rounded w-3/4"></div></td>
    <td className="py-4 px-4"><div className="h-5 bg-muted/50 rounded w-full"></div></td>
    <td className="py-4 px-4"><div className="h-5 bg-muted/50 rounded w-1/2"></div></td>
    <td className="py-4 px-4"><div className="h-5 bg-muted/50 rounded w-1/3"></div></td>
    <td className="py-4 px-4"><div className="h-5 bg-muted/50 rounded w-1/2"></div></td>
  </tr>
);

const LogsPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterAction, setFilterAction] = useState("");

  const actionTypes = [
    "USER_LOGIN", "USER_REGISTRATION", "USER_UPDATE", "USER_DELETE",
    "CLIENT_CREATE", "CLIENT_UPDATE", "CLIENT_DELETE",
    "MEASUREMENT_CREATE", "MEASUREMENT_UPDATE", "MEASUREMENT_DELETE",
    "FILE_UPLOAD",
  ];

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      setError(null);
      try {
        const queryParams = new URLSearchParams();
        if (searchTerm) queryParams.append("search", searchTerm);
        if (filterAction && filterAction !== "all") queryParams.append("action", filterAction);

        const res = await fetch(`/api/admin/logs?${queryParams.toString()}`);
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Failed to fetch logs");
        }
        const data = await res.json();
        setLogs(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    const debounce = setTimeout(fetchLogs, 300);
    return () => clearTimeout(debounce);
  }, [searchTerm, filterAction]);

  const getActionBadgeStyle = (action) => {
    if (action.includes("DELETE")) return "bg-red-500/10 text-red-500";
    if (action.includes("CREATE") || action.includes("REGISTRATION")) return "bg-green-500/10 text-green-500";
    if (action.includes("UPDATE") || action.includes("LOGIN")) return "bg-blue-500/10 text-blue-500";
    if (action.includes("UPLOAD")) return "bg-purple-500/10 text-purple-500";
    return "bg-gray-500/10 text-gray-400";
  };

  return (
    <div className="min-h-screen pt-0 md:pt-30 pb-10 mb-24 px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-7xl mx-auto"
      >
        <h1 className="text-4xl font-bold gradient-text mb-8">System Logs</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Search by user, email, or IP..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 bg-background/50 border-border"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Select onValueChange={setFilterAction} value={filterAction}>
              <SelectTrigger className="w-full pl-10 bg-background/50 border-border">
                <SelectValue placeholder="Filter by Action Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                {actionTypes.map((action) => (
                  <SelectItem key={action} value={action}>
                    {action.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-2xl mb-8 flex items-center">
            <AlertCircle className="w-6 h-6 mr-3" />
            <p><strong>Error:</strong> {error}</p>
          </div>
        )}

        <div className="glass rounded-2xl p-6 border">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border/50">
              <thead>
                <tr className="text-left text-sm font-medium text-muted-foreground">
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">IP Address</th>
                  <th className="py-3 px-4">OS</th>
                  <th className="py-3 px-4">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {loading ? (
                  Array.from({ length: 10 }).map((_, i) => <LogRowSkeleton key={i} />)
                ) : logs.length > 0 ? (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-muted/10 transition-colors">
                      <td className="py-4 px-4 font-medium">{log.user?.name || "System"}</td>
                      <td className="py-4 px-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getActionBadgeStyle(log.action)}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-muted-foreground">{log.ipAddress || "N/A"}</td>
                      <td className="py-4 px-4 text-muted-foreground text-xs">{log.os || "N/A"}</td>
                      <td className="py-4 px-4 text-muted-foreground text-sm">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="py-8 text-center text-muted-foreground">
                      <BookText className="w-10 h-10 mx-auto mb-3" />
                      No logs found matching your criteria.
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
};

export default LogsPage;
