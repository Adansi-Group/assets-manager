


// src/components/ExportDropdown.tsx

import { useState, useRef, useEffect } from "react";
import { Download, FileSpreadsheet, FileText, File } from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface Props {
  data: any[];
  filename: string;
  columns: { key: string; label: string }[];
}

export default function ExportDropdown({ data, filename, columns }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const exportToExcel = () => {
    // Prepare data
    const exportData = data.map(item => {
      const row: any = {};
      columns.forEach(col => {
        row[col.label] = item[col.key] || "";
      });
      return row;
    });

    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data");

    // Save file
    XLSX.writeFile(wb, `${filename}.xlsx`);
    setIsOpen(false);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(16);
    doc.text(filename, 14, 15);
    
    // Prepare table data
    const tableData = data.map(item => 
      columns.map(col => item[col.key] || "")
    );
    
    // Create table
    autoTable(doc, {
      head: [columns.map(col => col.label)],
      body: tableData,
      startY: 25,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [22, 163, 74] } // Green color
    });

    // Save file
    doc.save(`${filename}.pdf`);
    setIsOpen(false);
  };

  const exportToCSV = () => {
    // Prepare CSV content
    const headers = columns.map(col => col.label).join(",");
    const rows = data.map(item =>
      columns.map(col => {
        const value = item[col.key] || "";
        // Escape commas and quotes
        return `"${String(value).replace(/"/g, '""')}"`;
      }).join(",")
    );

    const csvContent = [headers, ...rows].join("\n");

    // Create blob and download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}.csv`);
    link.style.visibility = "hidden";
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
      >
        <Download size={20} />
        Export
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
          <button
            onClick={exportToExcel}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 text-left rounded-t-lg"
          >
            <FileSpreadsheet size={18} className="text-green-600" />
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Excel</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">.xlsx</p>
            </div>
          </button>

          <button
            onClick={exportToPDF}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 text-left border-t border-gray-200 dark:border-gray-700"
          >
            <FileText size={18} className="text-red-600" />
            <div>
              <p className="font-medium text-gray-900 dark:text-white">PDF</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">.pdf</p>
            </div>
          </button>

          <button
            onClick={exportToCSV}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 text-left border-t border-gray-200 dark:border-gray-700 rounded-b-lg"
          >
            <File size={18} className="text-blue-600" />
            <div>
              <p className="font-medium text-gray-900 dark:text-white">CSV</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">.csv</p>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}