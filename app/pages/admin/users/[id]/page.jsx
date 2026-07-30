// app/pages/admin/users/[id]/page.jsx
"use client";

import { useState, useEffect, use } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Shield,
  Calendar,
  Loader2,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Ruler,
  Briefcase,
  BarChart3,
  Tag,
  Receipt,
  Link2,
  Clock,
} from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const MONTH_NAMES = [
  "", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

// ──────────────────────────────────────────────────────────────────────────────
// Stat card component
// ──────────────────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, subValue, color = "primary", className = "" }) {
  const colorMap = {
    primary: "text-primary bg-primary/10",
    emerald: "text-emerald-500 bg-emerald-500/10",
    red: "text-red-500 bg-red-500/10",
    blue: "text-blue-500 bg-blue-500/10",
    purple: "text-purple-500 bg-purple-500/10",
    amber: "text-amber-500 bg-amber-500/10",
  };

  return (
    <Card className={className}>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start gap-3">
          <div className={`p-2.5 rounded-xl ${colorMap[color]}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground font-medium truncate">{label}</p>
            <p className="text-xl font-bold mt-0.5 tracking-tight">{value}</p>
            {subValue && (
              <p className="text-xs text-muted-foreground mt-0.5">{subValue}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Category bar
// ──────────────────────────────────────────────────────────────────────────────
function CategoryBar({ name, total, count, maxTotal, color }) {
  const pct = maxTotal > 0 ? (total / maxTotal) * 100 : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium truncate">{name}</span>
        <span className="font-mono text-xs text-muted-foreground ml-2 shrink-0">
          GHS {total.toLocaleString()} <span className="text-muted-foreground/60">({count})</span>
        </span>
      </div>
      <div className="h-2 rounded-full bg-muted/50 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className={`h-full rounded-full ${color}`}
        />
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Main page
// ──────────────────────────────────────────────────────────────────────────────
export default function UserDetailPage({ params }) {
  const { id } = use(params);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchSummary() {
      try {
        setLoading(true);
        const res = await fetch(`/api/admin/users/${id}/summary`);
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to fetch user");
        }
        const result = await res.json();
        setData(result);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    if (id) fetchSummary();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading user details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen pt-20 px-4">
        <div className="max-w-3xl mx-auto">
          <Link href="/pages/admin/users" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
            <ArrowLeft className="w-4 h-4" /> Back to Users
          </Link>
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-6 rounded-2xl flex items-center gap-3">
            <AlertCircle className="w-6 h-6 shrink-0" />
            <p><strong>Error:</strong> {error}</p>
          </div>
        </div>
      </div>
    );
  }

  const { user, finance, clients, measurements, clientProfile } = data;
  const isDesigner = user.role === "DESIGNER";
  const isClient = user.role === "CLIENT";

  const roleColors = {
    ADMIN: "bg-purple-500/10 text-purple-500 border-purple-500/30",
    DESIGNER: "bg-blue-500/10 text-blue-500 border-blue-500/30",
    CLIENT: "bg-gray-500/10 text-gray-400 border-gray-500/30",
  };

  const statusColors = {
    ACTIVE: "bg-emerald-500/10 text-emerald-500",
    DELETED: "bg-red-500/10 text-red-500",
  };

  return (
    <div className="min-h-screen pt-0 md:pt-20 pb-10 mb-24 px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-6xl mx-auto"
      >
        {/* Back link */}
        <Link
          href="/pages/admin/users"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Users
        </Link>

        {/* User Header */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
              {/* Avatar */}
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/20 shrink-0">
                {user.image ? (
                  <img src={user.image} alt={user.name} className="w-full h-full rounded-2xl object-cover" />
                ) : (
                  <User className="w-8 h-8 text-primary" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h1 className="text-2xl font-bold tracking-tight">{user.name || "Unnamed User"}</h1>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${roleColors[user.role]}`}>
                    {user.role}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusColors[user.status]}`}>
                    {user.status}
                  </span>
                </div>

                <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground mt-2">
                  {user.email && (
                    <span className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5" /> {user.email}
                    </span>
                  )}
                  {user.phone && (
                    <span className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5" /> {user.phone}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" /> Joined {new Date(user.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Ruler className="w-3.5 h-3.5" /> {user.measurementUnit}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Designer Content ─────────────────────────────────────────── */}
        {isDesigner && (
          <>
            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
              <StatCard
                icon={DollarSign}
                label="Total Revenue"
                value={`GHS ${finance?.totalRevenue?.toLocaleString() || 0}`}
                color="emerald"
              />
              <StatCard
                icon={TrendingDown}
                label="Total Expenses"
                value={`GHS ${finance?.totalExpenses?.toLocaleString() || 0}`}
                color="red"
              />
              <StatCard
                icon={TrendingUp}
                label="Net Profit"
                value={`GHS ${finance?.netProfit?.toLocaleString() || 0}`}
                subValue={`${finance?.overallMargin || 0}% margin`}
                color="blue"
              />
              <StatCard
                icon={Users}
                label="Clients"
                value={clients?.total || 0}
                subValue={`${clients?.active || 0} active`}
                color="purple"
              />
              <StatCard
                icon={Ruler}
                label="Measurements"
                value={measurements?.total || 0}
                color="amber"
              />
              <StatCard
                icon={Receipt}
                label="Transactions"
                value={finance?.transactionCount || 0}
                subValue={`${finance?.jobCostingCount || 0} job links`}
                color="primary"
              />
            </div>

            {/* Year-by-Year Breakdown + Categories */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              {/* Yearly Breakdown */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <BarChart3 className="w-5 h-5 text-blue-500" />
                    Yearly Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {finance && Object.keys(finance.byYear).length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left">
                            <th className="py-2 px-3 font-medium">Year</th>
                            <th className="py-2 px-3 font-medium text-right">Txns</th>
                            <th className="py-2 px-3 font-medium text-right text-emerald-600">Revenue</th>
                            <th className="py-2 px-3 font-medium text-right text-red-500">Expenses</th>
                            <th className="py-2 px-3 font-medium text-right text-blue-500">Profit</th>
                            <th className="py-2 px-3 font-medium text-right">Margin</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(finance.byYear)
                            .sort(([a], [b]) => a.localeCompare(b))
                            .map(([year, d]) => (
                              <tr key={year} className="border-b border-dashed hover:bg-muted/50 transition-colors">
                                <td className="py-2.5 px-3 font-bold">{year}</td>
                                <td className="py-2.5 px-3 text-right font-mono text-muted-foreground">{d.count}</td>
                                <td className="py-2.5 px-3 text-right font-mono text-emerald-600">{d.revenue.toLocaleString()}</td>
                                <td className="py-2.5 px-3 text-right font-mono text-red-500">{d.expenses.toLocaleString()}</td>
                                <td className="py-2.5 px-3 text-right font-mono text-blue-500">{d.profit.toLocaleString()}</td>
                                <td className="py-2.5 px-3 text-right">
                                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                    d.margin >= 40 ? "bg-emerald-500/15 text-emerald-600" :
                                    d.margin >= 20 ? "bg-amber-500/15 text-amber-600" :
                                    "bg-red-500/15 text-red-600"
                                  }`}>
                                    {d.margin}%
                                  </span>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                        <tfoot>
                          <tr className="font-bold border-t-2">
                            <td className="py-3 px-3">TOTAL</td>
                            <td className="py-3 px-3 text-right font-mono text-muted-foreground">{finance.transactionCount}</td>
                            <td className="py-3 px-3 text-right font-mono text-emerald-600">{finance.totalRevenue.toLocaleString()}</td>
                            <td className="py-3 px-3 text-right font-mono text-red-500">{finance.totalExpenses.toLocaleString()}</td>
                            <td className="py-3 px-3 text-right font-mono text-blue-500">{finance.netProfit.toLocaleString()}</td>
                            <td className="py-3 px-3 text-right">
                              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-600">
                                {finance.overallMargin}%
                              </span>
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">No financial data yet</p>
                  )}
                </CardContent>
              </Card>

              {/* Revenue Categories */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Tag className="w-4 h-4 text-emerald-500" />
                    Revenue Sources
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {finance?.topRevenueCategories?.length > 0 ? (
                    <div className="space-y-3">
                      {finance.topRevenueCategories.map((cat) => (
                        <CategoryBar
                          key={cat.name}
                          name={cat.name}
                          total={cat.total}
                          count={cat.count}
                          maxTotal={finance.topRevenueCategories[0].total}
                          color="bg-emerald-500"
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No revenue data</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Expense Categories + Monthly Trend */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              {/* Expense Categories */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Tag className="w-4 h-4 text-red-500" />
                    Expense Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {finance?.topExpenseCategories?.length > 0 ? (
                    <div className="space-y-3">
                      {finance.topExpenseCategories.map((cat) => (
                        <CategoryBar
                          key={cat.name}
                          name={cat.name}
                          total={cat.total}
                          count={cat.count}
                          maxTotal={finance.topExpenseCategories[0].total}
                          color="bg-red-500"
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No expense data</p>
                  )}
                </CardContent>
              </Card>

              {/* Monthly Trend */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <BarChart3 className="w-4 h-4 text-primary" />
                    Monthly Trend
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {finance?.monthly?.length > 0 ? (
                    <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                      <table className="w-full text-xs">
                        <thead className="sticky top-0 bg-background">
                          <tr className="border-b text-left">
                            <th className="py-1.5 px-2 font-medium">Month</th>
                            <th className="py-1.5 px-2 font-medium text-right text-emerald-600">Revenue</th>
                            <th className="py-1.5 px-2 font-medium text-right text-red-500">Expenses</th>
                            <th className="py-1.5 px-2 font-medium text-right text-blue-500">Profit</th>
                          </tr>
                        </thead>
                        <tbody>
                          {finance.monthly.map((m) => {
                            const [y, mo] = m.month.split("-");
                            const label = `${MONTH_NAMES[parseInt(mo)]} ${y}`;
                            const isLoss = m.profit < 0;
                            return (
                              <tr key={m.month} className={`border-b border-dashed hover:bg-muted/50 ${isLoss ? "bg-red-500/5" : ""}`}>
                                <td className="py-1.5 px-2 font-medium">{label}</td>
                                <td className="py-1.5 px-2 text-right font-mono text-emerald-600">{m.revenue.toLocaleString()}</td>
                                <td className="py-1.5 px-2 text-right font-mono text-red-500">{m.expenses.toLocaleString()}</td>
                                <td className={`py-1.5 px-2 text-right font-mono ${isLoss ? "text-red-600 font-bold" : "text-blue-500"}`}>
                                  {m.profit.toLocaleString()}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">No monthly data</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Clients List + Recent Transactions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Clients */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-base">
                    <span className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-purple-500" />
                      Clients ({clients?.total || 0})
                    </span>
                    <span className="text-xs font-normal text-muted-foreground">
                      {clients?.active || 0} active
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {clients?.list?.length > 0 ? (
                    <div className="space-y-2 max-h-[350px] overflow-y-auto">
                      {clients.list.map((client) => (
                        <div
                          key={client.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                        >
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{client.name}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {client.phone || client.email || "No contact"}
                            </p>
                          </div>
                          <div className="flex items-center gap-3 shrink-0 ml-3">
                            <span className="text-xs text-muted-foreground font-mono">
                              {client.measurementCount} meas.
                            </span>
                            <span className={`w-2 h-2 rounded-full ${client.status === "ACTIVE" ? "bg-emerald-500" : "bg-red-500"}`} />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">No clients assigned</p>
                  )}
                </CardContent>
              </Card>

              {/* Recent Transactions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Clock className="w-4 h-4 text-amber-500" />
                    Recent Transactions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {finance?.recentTransactions?.length > 0 ? (
                    <div className="space-y-2 max-h-[350px] overflow-y-auto">
                      {finance.recentTransactions.map((tx) => {
                        const isRevenue = tx.type === "REVENUE";
                        return (
                          <div
                            key={tx.id}
                            className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isRevenue ? "bg-emerald-500" : "bg-red-500"}`} />
                                <p className="font-medium text-sm truncate">{tx.categoryName}</p>
                              </div>
                              <p className="text-xs text-muted-foreground truncate ml-3.5 mt-0.5">
                                {tx.notes || "No notes"} · {new Date(tx.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" })}
                              </p>
                            </div>
                            <span className={`font-mono text-sm font-semibold shrink-0 ml-3 ${isRevenue ? "text-emerald-600" : "text-red-500"}`}>
                              {isRevenue ? "+" : "-"}GHS {tx.amount.toLocaleString()}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">No transactions yet</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {/* ── Client Content ───────────────────────────────────────────── */}
        {isClient && clientProfile && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
            <StatCard
              icon={Ruler}
              label="Measurements"
              value={clientProfile.measurementCount}
              color="amber"
            />
            <StatCard
              icon={Briefcase}
              label="Assigned Designers"
              value={clientProfile.designers.length}
              subValue={clientProfile.designers.map((d) => d.name).join(", ") || "None"}
              color="purple"
            />
            <StatCard
              icon={Shield}
              label="Account Type"
              value="Client"
              subValue="Linked to client profile"
              color="blue"
            />
          </div>
        )}

        {/* ── Admin Content ────────────────────────────────────────────── */}
        {user.role === "ADMIN" && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 text-muted-foreground">
                <Shield className="w-5 h-5 text-purple-500" />
                <p className="text-sm">
                  This is an administrator account. Admins have full access to user management, analytics, and system configuration.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* No finance data message for designers */}
        {isDesigner && finance?.transactionCount === 0 && (
          <Card className="border-dashed">
            <CardContent className="pt-6 pb-6">
              <div className="text-center space-y-3">
                <BarChart3 className="w-10 h-10 text-muted-foreground/50 mx-auto" />
                <div>
                  <p className="font-medium">No Financial Data</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    This designer has no transactions yet. Use the{" "}
                    <Link href="/pages/admin/finance-seed" className="text-primary hover:underline">
                      Finance Seed Tool
                    </Link>{" "}
                    to generate sample data.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </motion.div>
    </div>
  );
}
