// app/pages/admin/finance-seed/page.jsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Database,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Sparkles,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Percent,
} from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// ──────────────────────────────────────────────────────────────────────────────
// Default targets with per-year expense ratios
// 2024: 78% expenses (22% profit) — business reinvesting heavily
// 2025: 70% expenses (30% profit) — growing, still heavy overhead
// 2026: 55% expenses (45% profit) — more efficient, better margins
// ──────────────────────────────────────────────────────────────────────────────
const DEFAULT_TARGETS = {
  2024: { amount: 41300, startMonth: 7, endMonth: 12, expenseRatio: 0.78 },
  2025: { amount: 65000, startMonth: 1, endMonth: 12, expenseRatio: 0.70 },
  2026: { amount: 43000, startMonth: 1, endMonth: 7, expenseRatio: 0.55 },
};

const MONTH_NAMES = [
  "", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

// Must match the API's seasonal weights
const SEASONAL_WEIGHTS = {
  1: 0.35, 2: 0.40, 3: 0.70, 4: 1.10, 5: 0.75, 6: 0.35,
  7: 0.30, 8: 0.50, 9: 0.80, 10: 1.00, 11: 1.30, 12: 1.50,
};

// ──────────────────────────────────────────────────────────────────────────────
// Page component
// ──────────────────────────────────────────────────────────────────────────────

export default function FinanceSeedPage() {
  const [designers, setDesigners] = useState([]);
  const [selectedDesigner, setSelectedDesigner] = useState("");
  const [targets, setTargets] = useState(DEFAULT_TARGETS);
  const [loading, setLoading] = useState(false);
  const [loadingDesigners, setLoadingDesigners] = useState(true);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    fetchDesigners();
  }, []);

  const fetchDesigners = async () => {
    try {
      setLoadingDesigners(true);
      const res = await fetch("/api/admin/finance-seed");
      if (!res.ok) throw new Error("Failed to fetch designers");
      const data = await res.json();
      setDesigners(data.designers || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingDesigners(false);
    }
  };

  // Calculate preview data
  const getPreviewData = useCallback(() => {
    const months = [];
    let grandRevenue = 0;
    let grandExpenses = 0;
    const yearTotals = {};

    for (const [yearStr, config] of Object.entries(targets)) {
      const year = parseInt(yearStr);
      const { amount, startMonth, endMonth, expenseRatio } = config;

      let totalWeight = 0;
      for (let m = startMonth; m <= endMonth; m++) {
        totalWeight += SEASONAL_WEIGHTS[m];
      }

      let yearRev = 0;
      let yearExp = 0;

      for (let m = startMonth; m <= endMonth; m++) {
        const revenue = (amount * SEASONAL_WEIGHTS[m]) / totalWeight;
        const expenses = revenue * expenseRatio;
        months.push({
          label: `${MONTH_NAMES[m]} ${year}`,
          year,
          month: m,
          revenue: Math.round(revenue),
          expenses: Math.round(expenses),
          profit: Math.round(revenue - expenses),
        });
        grandRevenue += revenue;
        grandExpenses += expenses;
        yearRev += revenue;
        yearExp += expenses;
      }

      yearTotals[year] = {
        revenue: Math.round(yearRev),
        expenses: Math.round(yearExp),
        profit: Math.round(yearRev - yearExp),
        margin: Math.round(((yearRev - yearExp) / yearRev) * 100),
      };
    }

    return {
      months,
      grandRevenue: Math.round(grandRevenue),
      grandExpenses: Math.round(grandExpenses),
      yearTotals,
    };
  }, [targets]);

  const preview = getPreviewData();

  const handleGenerate = async () => {
    setConfirmDialog(null);
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/admin/finance-seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          designerId: selectedDesigner,
          targets,
          createClients: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");

      setResult(data);
      fetchDesigners();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    setConfirmDialog(null);
    setClearing(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`/api/admin/finance-seed?designerId=${selectedDesigner}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Clear failed");

      setResult({ success: true, message: data.message, cleared: true });
      fetchDesigners();
    } catch (err) {
      setError(err.message);
    } finally {
      setClearing(false);
    }
  };

  const updateTarget = (year, field, value) => {
    setTargets((prev) => ({
      ...prev,
      [year]: { ...prev[year], [field]: Number(value) || 0 },
    }));
  };

  const updateExpenseRatio = (year, value) => {
    const ratio = Math.min(0.95, Math.max(0.1, parseFloat(value) || 0));
    setTargets((prev) => ({
      ...prev,
      [year]: { ...prev[year], expenseRatio: ratio },
    }));
  };

  const selectedDesignerData = designers.find((d) => d.id === selectedDesigner);

  return (
    <div className="min-h-screen pt-0 md:pt-20 pb-10 mb-24 px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-5xl mx-auto"
      >
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/pages/admin/dashboard"
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold gradient-text flex items-center gap-3">
              <Database className="w-8 h-8 text-amber-500" />
              Finance Data Seed Tool
            </h1>
            <p className="text-muted-foreground mt-1">
              Generate realistic financial transaction history for a designer
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Configuration */}
          <div className="lg:col-span-2 space-y-6">
            {/* Designer Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Users className="w-5 h-5 text-purple-500" />
                  Select Designer
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingDesigners ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading designers...
                  </div>
                ) : (
                  <div className="space-y-3">
                    <select
                      value={selectedDesigner}
                      onChange={(e) => setSelectedDesigner(e.target.value)}
                      className="w-full rounded-lg border border-input bg-background px-4 py-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="">— Choose a designer —</option>
                      {designers.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.email})
                          {d.transactionCount > 0 ? ` — ${d.transactionCount} existing txns` : ""}
                        </option>
                      ))}
                    </select>

                    {selectedDesignerData?.transactionCount > 0 && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-sm"
                      >
                        <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                        <div>
                          <p className="font-medium text-amber-600 dark:text-amber-400">
                            This designer has {selectedDesignerData.transactionCount} existing transactions.
                          </p>
                          <p className="text-muted-foreground mt-1">
                            Use &quot;Clear Data&quot; first to avoid duplicates.
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Revenue & Expense Targets */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <TrendingUp className="w-5 h-5 text-emerald-500" />
                  Revenue Targets & Expense Ratios
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-5">
                  {Object.entries(targets).map(([year, config]) => (
                    <div key={year} className="p-4 rounded-xl bg-muted/30 border border-dashed space-y-3">
                      {/* Year header */}
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold">{year}</span>
                        <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">
                          {Math.round((1 - config.expenseRatio) * 100)}% profit margin
                        </span>
                      </div>

                      {/* Inputs row */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div>
                          <label className="text-xs font-medium text-muted-foreground mb-1 block">
                            Revenue (GHS)
                          </label>
                          <input
                            type="number"
                            value={config.amount}
                            onChange={(e) => updateTarget(year, "amount", e.target.value)}
                            className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-muted-foreground mb-1 block">
                            Start
                          </label>
                          <select
                            value={config.startMonth}
                            onChange={(e) => updateTarget(year, "startMonth", e.target.value)}
                            className="w-full rounded-lg border border-input bg-background px-2 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                          >
                            {MONTH_NAMES.slice(1).map((m, i) => (
                              <option key={i + 1} value={i + 1}>{m}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-muted-foreground mb-1 block">
                            End
                          </label>
                          <select
                            value={config.endMonth}
                            onChange={(e) => updateTarget(year, "endMonth", e.target.value)}
                            className="w-full rounded-lg border border-input bg-background px-2 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                          >
                            {MONTH_NAMES.slice(1).map((m, i) => (
                              <option key={i + 1} value={i + 1}>{m}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-muted-foreground mb-1 block flex items-center gap-1">
                            <Percent className="w-3 h-3" />
                            Expense Ratio
                          </label>
                          <input
                            type="number"
                            min="10"
                            max="95"
                            step="1"
                            value={Math.round(config.expenseRatio * 100)}
                            onChange={(e) => updateExpenseRatio(year, e.target.value / 100)}
                            className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
                          />
                        </div>
                      </div>

                      {/* Mini summary for this year */}
                      {preview.yearTotals[parseInt(year)] && (
                        <div className="flex flex-wrap gap-4 text-xs pt-1">
                          <span className="text-emerald-600 dark:text-emerald-400">
                            Revenue: <span className="font-mono font-semibold">GHS {preview.yearTotals[parseInt(year)].revenue.toLocaleString()}</span>
                          </span>
                          <span className="text-red-500">
                            Expenses: <span className="font-mono font-semibold">GHS {preview.yearTotals[parseInt(year)].expenses.toLocaleString()}</span>
                          </span>
                          <span className="text-blue-500">
                            Profit: <span className="font-mono font-semibold">GHS {preview.yearTotals[parseInt(year)].profit.toLocaleString()}</span>
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Expense breakdown info */}
                <div className="mt-5 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground space-y-1">
                  <p className="font-medium text-foreground text-sm mb-2">Where expenses go:</p>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                    <p>🏠 Rent — 24%</p>
                    <p>👩‍🎨 Designer Salary — 18%</p>
                    <p>🧵 Materials — 25%</p>
                    <p>👥 Temporary Hands — 13%</p>
                    <p>💡 Electricity — 8%</p>
                    <p>💧 Water — 5%</p>
                    <p>📱 Marketing — 4%</p>
                    <p>🔧 Tools — 3%</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Monthly Preview */}
            <Card>
              <CardHeader
                className="cursor-pointer"
                onClick={() => setShowPreview(!showPreview)}
              >
                <CardTitle className="flex items-center justify-between text-lg">
                  <span className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-blue-500" />
                    Monthly Preview
                  </span>
                  {showPreview ? (
                    <ChevronUp className="w-5 h-5" />
                  ) : (
                    <ChevronDown className="w-5 h-5" />
                  )}
                </CardTitle>
              </CardHeader>
              <AnimatePresence>
                {showPreview && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b text-left">
                              <th className="py-2 px-3 font-medium">Month</th>
                              <th className="py-2 px-3 font-medium text-right text-emerald-600">Revenue</th>
                              <th className="py-2 px-3 font-medium text-right text-red-500">Expenses</th>
                              <th className="py-2 px-3 font-medium text-right text-blue-500">Profit</th>
                            </tr>
                          </thead>
                          <tbody>
                            {preview.months.map((m, i) => {
                              const isLoss = m.profit < 0;
                              // Add year separator
                              const showYearHeader = i === 0 || m.year !== preview.months[i - 1]?.year;
                              return (
                                <>
                                  {showYearHeader && (
                                    <tr key={`year-${m.year}`} className="bg-muted/50">
                                      <td colSpan={4} className="py-1.5 px-3 text-xs font-bold text-muted-foreground">
                                        — {m.year} —
                                      </td>
                                    </tr>
                                  )}
                                  <tr key={i} className={`border-b border-dashed hover:bg-muted/50 transition-colors ${isLoss ? "bg-red-500/5" : ""}`}>
                                    <td className="py-2 px-3 font-medium">{m.label}</td>
                                    <td className="py-2 px-3 text-right font-mono text-emerald-600">
                                      {m.revenue.toLocaleString()}
                                    </td>
                                    <td className="py-2 px-3 text-right font-mono text-red-500">
                                      {m.expenses.toLocaleString()}
                                    </td>
                                    <td className={`py-2 px-3 text-right font-mono ${isLoss ? "text-red-600 font-bold" : "text-blue-500"}`}>
                                      {m.profit.toLocaleString()}
                                    </td>
                                  </tr>
                                </>
                              );
                            })}
                          </tbody>
                          <tfoot>
                            <tr className="font-bold border-t-2">
                              <td className="py-3 px-3">TOTAL</td>
                              <td className="py-3 px-3 text-right font-mono text-emerald-600">
                                {preview.grandRevenue.toLocaleString()}
                              </td>
                              <td className="py-3 px-3 text-right font-mono text-red-500">
                                {preview.grandExpenses.toLocaleString()}
                              </td>
                              <td className="py-3 px-3 text-right font-mono text-blue-500">
                                {(preview.grandRevenue - preview.grandExpenses).toLocaleString()}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </CardContent>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          </div>

          {/* Right Column - Actions & Status */}
          <div className="space-y-6">
            {/* Summary Card */}
            <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-primary" />
                  Overall Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Per-year breakdown */}
                {Object.entries(preview.yearTotals).map(([year, totals]) => (
                  <div key={year} className="p-3 rounded-lg bg-muted/30 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm">{year}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        totals.margin >= 40 ? "bg-emerald-500/15 text-emerald-600" :
                        totals.margin >= 25 ? "bg-amber-500/15 text-amber-600" :
                        "bg-red-500/15 text-red-600"
                      }`}>
                        {totals.margin}% margin
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-1 text-xs">
                      <div>
                        <p className="text-muted-foreground">Revenue</p>
                        <p className="font-mono font-semibold text-emerald-600">{totals.revenue.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Expenses</p>
                        <p className="font-mono font-semibold text-red-500">{totals.expenses.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Profit</p>
                        <p className="font-mono font-semibold text-blue-500">{totals.profit.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                ))}

                <div className="border-t pt-3 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Grand Total Profit</span>
                    <span className="font-mono font-bold text-blue-600">
                      GHS {(preview.grandRevenue - preview.grandExpenses).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <span>Months covered</span>
                    <span>{preview.months.length} months</span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <span>Est. transactions</span>
                    <span>~{preview.months.length * 15} records</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <Card>
              <CardContent className="pt-6 space-y-3">
                <button
                  onClick={() => setConfirmDialog("generate")}
                  disabled={!selectedDesigner || loading || clearing}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/20"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating... (this takes a minute)
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Generate Data
                    </>
                  )}
                </button>

                <button
                  onClick={() => setConfirmDialog("clear")}
                  disabled={!selectedDesigner || loading || clearing || (selectedDesignerData?.transactionCount === 0)}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-sm font-medium text-red-600 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {clearing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Clearing...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Clear Existing Data
                    </>
                  )}
                </button>

                {!selectedDesigner && (
                  <p className="text-xs text-center text-muted-foreground">
                    Select a designer to enable actions
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Results */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <Card className="border-red-500/50 bg-red-500/5">
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-red-600 dark:text-red-400">Error</p>
                          <p className="text-sm text-muted-foreground mt-1">{error}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {result && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <Card className={`border-emerald-500/50 ${result.cleared ? "bg-amber-500/5" : "bg-emerald-500/5"}`}>
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className={`w-5 h-5 shrink-0 mt-0.5 ${result.cleared ? "text-amber-500" : "text-emerald-500"}`} />
                        <div className="space-y-2">
                          <p className={`font-medium ${result.cleared ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                            {result.message}
                          </p>
                          {result.summary && (
                            <div className="text-sm space-y-1 text-muted-foreground">
                              <p>📊 Transactions: <span className="font-mono font-medium">{result.summary.transactionsCreated}</span></p>
                              <p>💰 Revenue: <span className="font-mono font-medium text-emerald-600">GHS {result.summary.totalRevenue?.toLocaleString()}</span></p>
                              <p>💸 Expenses: <span className="font-mono font-medium text-red-500">GHS {result.summary.totalExpenses?.toLocaleString()}</span></p>
                              <p>📈 Net Profit: <span className="font-mono font-medium text-blue-500">GHS {result.summary.netProfit?.toLocaleString()}</span></p>
                              <p>📊 Margin: <span className="font-mono font-medium">{result.summary.overallMargin}%</span></p>
                              <p>👥 Clients: <span className="font-mono font-medium">{result.summary.clientsCreated}</span></p>
                              <p>🔗 Job Links: <span className="font-mono font-medium">{result.summary.jobCostingsCreated}</span></p>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Confirmation Dialog */}
        <AnimatePresence>
          {confirmDialog && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
              onClick={() => setConfirmDialog(null)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md rounded-2xl bg-background border shadow-2xl p-6 space-y-4"
              >
                <div className="flex items-center gap-3">
                  {confirmDialog === "generate" ? (
                    <div className="p-2 rounded-full bg-emerald-500/10">
                      <Sparkles className="w-6 h-6 text-emerald-500" />
                    </div>
                  ) : (
                    <div className="p-2 rounded-full bg-red-500/10">
                      <Trash2 className="w-6 h-6 text-red-500" />
                    </div>
                  )}
                  <h3 className="text-lg font-bold">
                    {confirmDialog === "generate"
                      ? "Generate Financial Data?"
                      : "Clear All Financial Data?"}
                  </h3>
                </div>

                <p className="text-sm text-muted-foreground">
                  {confirmDialog === "generate" ? (
                    <>
                      This will generate ~{preview.months.length * 15} transactions for{" "}
                      <span className="font-medium">{selectedDesignerData?.name}</span>{" "}
                      including 8 Ghanaian clients, revenue, expenses (rent, salaries, materials, utilities),
                      and job costings. This may take about a minute.
                    </>
                  ) : (
                    <>
                      This will permanently delete all{" "}
                      <span className="font-mono font-medium">{selectedDesignerData?.transactionCount}</span>{" "}
                      transactions and related job costings for{" "}
                      <span className="font-medium">{selectedDesignerData?.name}</span>.
                      This cannot be undone.
                    </>
                  )}
                </p>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setConfirmDialog(null)}
                    className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium border hover:bg-muted transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDialog === "generate" ? handleGenerate : handleClear}
                    className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors ${
                      confirmDialog === "generate"
                        ? "bg-emerald-600 hover:bg-emerald-700"
                        : "bg-red-600 hover:bg-red-700"
                    }`}
                  >
                    {confirmDialog === "generate" ? "Yes, Generate" : "Yes, Clear Everything"}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
