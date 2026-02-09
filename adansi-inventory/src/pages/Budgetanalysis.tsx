


import { useState, useEffect } from "react";
import { Download, DollarSign, TrendingUp, TrendingDown, AlertCircle, CheckCircle } from "lucide-react";
import { getToners } from "../services/tonerService";
import { getA4Sheets } from "../services/a4SheetService";
import { getInternetUsage } from "../services/internetUsageService";

export default function BudgetAnalysis() {
  const [loading, setLoading] = useState(true);
  const [actualData, setActualData] = useState({
    toners: 0,
    a4Sheets: 0,
    internet: 0,
    gadgets: 0,
  });

  // Budget allocations (can be made dynamic later)
  const [budgetAllocations, setBudgetAllocations] = useState({
    toners: 15000,
    a4Sheets: 10000,
    internet: 12000,
    gadgets: 13000,
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    
    // Load actual spending data
    const [toners, sheets, internet] = await Promise.all([
      getToners(),
      getA4Sheets(),
      getInternetUsage(),
    ]);

    const tonerCost = toners.reduce((sum, t) => sum + (t.quantity * (t.costPerUnit || 0)), 0);
    const sheetCost = sheets.reduce((sum, s) => sum + s.currentQuantity * s.costPerReam, 0);
    const internetCost = internet.reduce((sum, i) => sum + (i.cost || 0), 0);
    
    setActualData({
      toners: tonerCost,
      a4Sheets: sheetCost,
      internet: internetCost,
      gadgets: 8500, // Placeholder - update when gadget service is available
    });

    setLoading(false);
  }

  const totalBudget = Object.values(budgetAllocations).reduce((sum, val) => sum + val, 0);
  const totalSpent = Object.values(actualData).reduce((sum, val) => sum + val, 0);
  const totalRemaining = totalBudget - totalSpent;
  const percentageUsed = (totalSpent / totalBudget) * 100;

  // Calculate variance for each category
  const categories = [
    {
      name: "Toners",
      budget: budgetAllocations.toners,
      actual: actualData.toners,
      variance: budgetAllocations.toners - actualData.toners,
      percentage: (actualData.toners / budgetAllocations.toners) * 100,
      icon: "💧",
      color: "blue",
    },
    {
      name: "A4 Sheets",
      budget: budgetAllocations.a4Sheets,
      actual: actualData.a4Sheets,
      variance: budgetAllocations.a4Sheets - actualData.a4Sheets,
      percentage: (actualData.a4Sheets / budgetAllocations.a4Sheets) * 100,
      icon: "📄",
      color: "orange",
    },
    {
      name: "Internet",
      budget: budgetAllocations.internet,
      actual: actualData.internet,
      variance: budgetAllocations.internet - actualData.internet,
      percentage: (actualData.internet / budgetAllocations.internet) * 100,
      icon: "📡",
      color: "green",
    },
    {
      name: "Gadgets",
      budget: budgetAllocations.gadgets,
      actual: actualData.gadgets,
      variance: budgetAllocations.gadgets - actualData.gadgets,
      percentage: (actualData.gadgets / budgetAllocations.gadgets) * 100,
      icon: "💻",
      color: "purple",
    },
  ];

  function exportExcel() {
    const csv = [
      ["BUDGET ANALYSIS REPORT"],
      ["Period:", new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })],
      [""],
      ["Category", "Budget", "Actual", "Variance", "% Used"],
      ...categories.map((c) => [
        c.name,
        `GH₵${c.budget.toFixed(2)}`,
        `GH₵${c.actual.toFixed(2)}`,
        `GH₵${c.variance.toFixed(2)}`,
        `${c.percentage.toFixed(1)}%`,
      ]),
      [""],
      ["TOTALS", `GH₵${totalBudget.toFixed(2)}`, `GH₵${totalSpent.toFixed(2)}`, `GH₵${totalRemaining.toFixed(2)}`, `${percentageUsed.toFixed(1)}%`],
    ]
      .map((r) => r.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `budget-analysis-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-gray-100 dark:bg-gray-900">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Budget Analysis
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Track spending against allocated budgets
          </p>
        </div>

        <button
          onClick={exportExcel}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
        >
          <Download size={18} />
          Export Report
        </button>
      </div>

      {/* Overall Budget Summary */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl shadow-2xl p-8 text-white">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div>
            <p className="text-blue-100 text-sm mb-2">Total Budget</p>
            <p className="text-3xl font-bold">GH₵{totalBudget.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-blue-100 text-sm mb-2">Total Spent</p>
            <p className="text-3xl font-bold">GH₵{totalSpent.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-blue-100 text-sm mb-2">Remaining</p>
            <p className={`text-3xl font-bold ${totalRemaining < 0 ? 'text-red-300' : ''}`}>
              GH₵{totalRemaining.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-blue-100 text-sm mb-2">Budget Used</p>
            <p className="text-3xl font-bold">{percentageUsed.toFixed(1)}%</p>
            <div className="w-full bg-blue-900/50 rounded-full h-2 mt-2">
              <div
                className={`h-2 rounded-full ${
                  percentageUsed > 100 ? 'bg-red-400' : percentageUsed > 80 ? 'bg-yellow-400' : 'bg-green-400'
                }`}
                style={{ width: `${Math.min(percentageUsed, 100)}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Budget Status Alert */}
      {percentageUsed > 90 && (
        <div
          className={`${
            percentageUsed > 100 ? 'bg-red-100 border-red-500' : 'bg-yellow-100 border-yellow-500'
          } border-l-4 p-4 rounded-lg dark:bg-opacity-20`}
        >
          <div className="flex items-center gap-3">
            <AlertCircle
              className={percentageUsed > 100 ? 'text-red-600' : 'text-yellow-600'}
              size={24}
            />
            <div>
              <p
                className={`font-semibold ${
                  percentageUsed > 100 ? 'text-red-800 dark:text-red-300' : 'text-yellow-800 dark:text-yellow-300'
                }`}
              >
                {percentageUsed > 100 ? 'Budget Exceeded!' : 'Budget Warning'}
              </p>
              <p
                className={`text-sm ${
                  percentageUsed > 100 ? 'text-red-700 dark:text-red-400' : 'text-yellow-700 dark:text-yellow-400'
                }`}
              >
                {percentageUsed > 100
                  ? `You have exceeded your budget by GH₵${Math.abs(totalRemaining).toLocaleString()}`
                  : `You have used ${percentageUsed.toFixed(1)}% of your total budget. Only GH₵${totalRemaining.toLocaleString()} remaining.`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Category Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {categories.map((category) => {
          const isOverBudget = category.variance < 0;
          const isNearLimit = category.percentage > 80 && !isOverBudget;

          return (
            <div
              key={category.name}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border-l-4"
              style={{
                borderColor: isOverBudget
                  ? '#dc2626'
                  : isNearLimit
                  ? '#f59e0b'
                  : '#10b981',
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{category.icon}</span>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    {category.name}
                  </h3>
                </div>
                {isOverBudget ? (
                  <TrendingUp className="text-red-600" size={24} />
                ) : (
                  <CheckCircle className="text-green-600" size={24} />
                )}
              </div>

              <div className="space-y-3">
                {/* Budget vs Actual */}
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Budget:</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    GH₵{category.budget.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Spent:</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    GH₵{category.actual.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {isOverBudget ? 'Over Budget:' : 'Remaining:'}
                  </span>
                  <span
                    className={`text-sm font-bold ${
                      isOverBudget
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-green-600 dark:text-green-400'
                    }`}
                  >
                    {isOverBudget && '-'}GH₵{Math.abs(category.variance).toLocaleString()}
                  </span>
                </div>

                {/* Progress Bar */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-gray-500 dark:text-gray-400">Progress</span>
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                      {category.percentage.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full ${
                        isOverBudget
                          ? 'bg-red-600'
                          : isNearLimit
                          ? 'bg-yellow-500'
                          : 'bg-green-600'
                      }`}
                      style={{ width: `${Math.min(category.percentage, 100)}%` }}
                    ></div>
                  </div>
                </div>

                {/* Status Message */}
                {isOverBudget && (
                  <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                    <AlertCircle size={12} />
                    Over budget by {((category.percentage - 100).toFixed(1))}%
                  </p>
                )}
                {isNearLimit && (
                  <p className="text-xs text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
                    <AlertCircle size={12} />
                    Approaching budget limit
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Comparison Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Budget vs Actual Comparison
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                {["Category", "Budget", "Actual Spent", "Variance", "% Used", "Status"].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {categories.map((c) => {
                const isOverBudget = c.variance < 0;
                return (
                  <tr key={c.name} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-white">
                      {c.icon} {c.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                      GH₵{c.budget.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-white">
                      GH₵{c.actual.toLocaleString()}
                    </td>
                    <td
                      className={`px-6 py-4 whitespace-nowrap text-sm font-bold ${
                        isOverBudget
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-green-600 dark:text-green-400'
                      }`}
                    >
                      {isOverBudget && '-'}GH₵{Math.abs(c.variance).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-white">
                      {c.percentage.toFixed(1)}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          isOverBudget
                            ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                            : c.percentage > 80
                            ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
                            : 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                        }`}
                      >
                        {isOverBudget ? 'Over Budget' : c.percentage > 80 ? 'Near Limit' : 'On Track'}
                      </span>
                    </td>
                  </tr>
                );
              })}
              
              {/* Totals Row */}
              <tr className="bg-gray-100 dark:bg-gray-900 font-bold">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  TOTAL
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  GH₵{totalBudget.toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  GH₵{totalSpent.toLocaleString()}
                </td>
                <td
                  className={`px-6 py-4 whitespace-nowrap text-sm ${
                    totalRemaining < 0
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-green-600 dark:text-green-400'
                  }`}
                >
                  {totalRemaining < 0 && '-'}GH₵{Math.abs(totalRemaining).toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {percentageUsed.toFixed(1)}%
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      percentageUsed > 100
                        ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                        : percentageUsed > 90
                        ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
                        : 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                    }`}
                  >
                    {percentageUsed > 100 ? 'Over Budget' : percentageUsed > 90 ? 'Near Limit' : 'On Track'}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}