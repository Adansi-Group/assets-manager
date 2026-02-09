








// src/components/ExcelImportModal.tsx

import { useState } from "react";
import { X, Upload, AlertCircle, CheckCircle } from "lucide-react";
import * as XLSX from "xlsx";
import Swal from "sweetalert2";
import type { Gadget } from "../types/gadget";

type Props = {
  onClose: () => void;
  onImport: (gadgets: Omit<Gadget, "id">[]) => void;
};

type ValidationResult = {
  row: number;
  deviceType: string;
  model: string;
  serialNumber: string;
  processor: string;
  storage: string;
  year: number;
  status: string;
  assignedTo: string;
  assignedDate: string;
  isValid: boolean;
  errors: string[];
};

export default function GadgetsExcelImportModal({ onClose, onImport }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      validateFile(selectedFile);
    }
  }

  async function validateFile(file: File) {
    setIsProcessing(true);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);

      console.log("📊 Raw Excel Data:", jsonData);

      const results: ValidationResult[] = [];

      jsonData.forEach((row, index) => {
        // Skip completely empty rows
        if (!row || Object.values(row).every(val => !val)) {
          return;
        }

        // Map Excel columns to our format
        const deviceType = String(row["Device Name / Type"] || row["Device Type"] || "").trim();
        const model = String(row["Model"] || "").trim();
        const serialNumber = String(row["Serial Number"] || "").trim();
        const processor = String(row["Processor"] || "").trim();
        const storage = String(row["Storage"] || "").trim();
        const assignedTo = String(row["Assigned To"] || "").trim();
        const dateReceived = String(row["Date Received "] || row["Date Received"] || "").trim();
        
        // Parse year
        const yearValue = row["YEAR"] || row["Year"];
        let finalYear = new Date().getFullYear(); // Default to current year
        if (yearValue) {
          const parsedYear = parseInt(String(yearValue));
          if (!isNaN(parsedYear) && parsedYear >= 2000 && parsedYear <= new Date().getFullYear() + 1) {
            finalYear = parsedYear;
          }
        }

        // Normalize status
        let status = String(row["Status"] || "In-Stock").trim();
        if (status.toLowerCase() === "in use" || status.toLowerCase() === "in-use") {
          status = "In-Use";
        } else if (status.toLowerCase() === "in stock" || status.toLowerCase() === "in-stock") {
          status = "In-Stock";
        } else if (status.toLowerCase() === "faulty") {
          status = "Faulty";
        } else {
          status = "In-Stock"; // Default
        }

        // Skip header rows and section markers
        const skipKeywords = ["IN STOCK", "IN USE", "FAULTY", "LAPTOP", "PHONE", "SMARTPHONE"];
        if (skipKeywords.includes(deviceType.toUpperCase()) && !model) {
          return;
        }

        // Skip rows without model (these are usually empty or header rows)
        if (!model) {
          return;
        }

        const errors: string[] = [];

        // Validate required fields
        if (!model) errors.push("Missing Model");
        if (!serialNumber) errors.push("Missing Serial Number");

        // Determine device type
        let finalDeviceType: "Laptop" | "Smartphone" = "Laptop";
        if (deviceType.toLowerCase().includes("phone") || deviceType.toLowerCase().includes("smartphone")) {
          finalDeviceType = "Smartphone";
        } else if (deviceType.toLowerCase().includes("laptop")) {
          finalDeviceType = "Laptop";
        } else {
          // Guess from model name
          const modelLower = model.toLowerCase();
          if (modelLower.includes("iphone") || modelLower.includes("galaxy") || 
              modelLower.includes("pixel") || modelLower.includes("phone")) {
            finalDeviceType = "Smartphone";
          }
        }

        results.push({
          row: index + 2, // Excel row number (accounting for header)
          deviceType: finalDeviceType,
          model,
          serialNumber,
          processor,
          storage,
          year: finalYear,
          status: status || "In-Stock",
          assignedTo: assignedTo !== "nan" ? assignedTo : "",
          assignedDate: dateReceived !== "nan" ? dateReceived : "",
          isValid: errors.length === 0,
          errors,
        });
      });

      console.log("✅ Validation Results:", results);
      setValidationResults(results);
    } catch (error) {
      console.error("❌ Error parsing Excel:", error);
      Swal.fire({
        icon: "error",
        title: "Error Reading File",
        text: "Failed to read Excel file. Please check the format.",
      });
    }

    setIsProcessing(false);
  }

  function handleImport() {
    const validGadgets = validationResults
      .filter((r) => r.isValid)
      .map((r) => {
        const gadget: Omit<Gadget, "id"> = {
          deviceType: r.deviceType as "Laptop" | "Smartphone",
          model: r.model,
          serialNumber: r.serialNumber,
          processor: r.processor || undefined,
          storage: r.storage || undefined,
          year: r.year,
          status: r.status as "In-Stock" | "In-Use" | "Faulty",
          assignedTo: r.assignedTo || undefined,
          assignedDate: r.assignedDate || undefined,
          notes: undefined,
        };
        return gadget;
      });

    if (validGadgets.length === 0) {
      Swal.fire({
        icon: "warning",
        title: "No Valid Gadgets",
        text: "No valid gadgets to import. Please check your Excel file.",
      });
      return;
    }

    console.log("📦 Gadgets to import:", validGadgets);

    onImport(validGadgets);
    onClose();
  }

  const validCount = validationResults.filter((r) => r.isValid).length;
  const errorCount = validationResults.filter((r) => !r.isValid).length;

  return (
    <>
      {/* BACKDROP */}
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />

      {/* MODAL */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-6xl p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                <Upload className="text-green-600 dark:text-green-400" size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Import Gadgets from Excel
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Upload an Excel file with your gadget inventory
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <X size={24} />
            </button>
          </div>

          {/* File Upload */}
          <div className="mb-6">
            <label className="block w-full">
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center cursor-pointer hover:border-green-500 dark:hover:border-green-400 transition-colors">
                {file ? (
                  <div className="space-y-2">
                    <div className="text-green-600 dark:text-green-400 text-4xl">📊</div>
                    <p className="font-semibold text-gray-900 dark:text-white">{file.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {(file.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="mx-auto text-gray-400" size={48} />
                    <p className="font-semibold text-gray-700 dark:text-gray-300">
                      Click to upload Excel file
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      .xlsx or .xls format
                    </p>
                  </div>
                )}
              </div>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>

          {/* Validation Summary */}
          {validationResults.length > 0 && (
            <>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="text-green-600 dark:text-green-400" size={24} />
                    <div>
                      <p className="text-sm text-green-600 dark:text-green-400">Valid Rows</p>
                      <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                        {validCount}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="text-red-600 dark:text-red-400" size={24} />
                    <div>
                      <p className="text-sm text-red-600 dark:text-red-400">Errors</p>
                      <p className="text-2xl font-bold text-red-700 dark:text-red-300">
                        {errorCount}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Validation Table */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden mb-6">
                <div className="max-h-96 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left text-gray-700 dark:text-gray-300">Row</th>
                        <th className="px-4 py-3 text-left text-gray-700 dark:text-gray-300">Device Type</th>
                        <th className="px-4 py-3 text-left text-gray-700 dark:text-gray-300">Model</th>
                        <th className="px-4 py-3 text-left text-gray-700 dark:text-gray-300">Serial Number</th>
                        <th className="px-4 py-3 text-left text-gray-700 dark:text-gray-300">Year</th>
                        <th className="px-4 py-3 text-left text-gray-700 dark:text-gray-300">Status</th>
                        <th className="px-4 py-3 text-left text-gray-700 dark:text-gray-300">Assigned To</th>
                        <th className="px-4 py-3 text-left text-gray-700 dark:text-gray-300">Validation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {validationResults.map((result) => (
                        <tr
                          key={result.row}
                          className={`${
                            result.isValid
                              ? "bg-white dark:bg-gray-800"
                              : "bg-red-50 dark:bg-red-900/10"
                          }`}
                        >
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                            {result.row}
                            {result.isValid ? (
                              <CheckCircle className="inline ml-2 text-green-600" size={16} />
                            ) : (
                              <AlertCircle className="inline ml-2 text-red-600" size={16} />
                            )}
                          </td>
                          <td className="px-4 py-3 text-gray-900 dark:text-white">
                            {result.deviceType || "—"}
                          </td>
                          <td className="px-4 py-3 text-gray-900 dark:text-white">
                            {result.model || "—"}
                          </td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                            {result.serialNumber || "—"}
                          </td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                            {result.year}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${
                                result.status === "In-Stock"
                                  ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                                  : result.status === "In-Use"
                                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                                  : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                              }`}
                            >
                              {result.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-900 dark:text-white font-medium">
                            {result.assignedTo || "—"}
                          </td>
                          <td className="px-4 py-3">
                            {result.isValid ? (
                              <span className="text-green-600 dark:text-green-400 text-xs flex items-center gap-1">
                                <CheckCircle size={14} /> Ready
                              </span>
                            ) : (
                              <span className="text-red-600 dark:text-red-400 text-xs">
                                {result.errors.join(", ")}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-4">
            <button
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
            >
              Cancel
            </button>
            {validCount > 0 && (
              <button
                onClick={handleImport}
                disabled={isProcessing}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Upload size={18} />
                Import {validCount} Gadget{validCount !== 1 ? "s" : ""}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}







