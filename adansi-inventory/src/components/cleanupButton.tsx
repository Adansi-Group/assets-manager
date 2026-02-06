

import { useState } from "react";
import { Trash2 } from "lucide-react";
import Swal from "sweetalert2";
import { cleanupUnusedOptions } from "../services/printerOptionsService";

export default function CleanupButton() {
  const [loading, setLoading] = useState(false);

  async function handleCleanup() {
    const result = await Swal.fire({
      title: "Clean up unused options?",
      text: "This will remove all custom locations, models, colors, and accessories that are not currently used by any printer.",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#16a34a",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, clean up",
    });

    if (result.isConfirmed) {
      setLoading(true);
      try {
        await cleanupUnusedOptions();
        
        await Swal.fire({
          title: "Cleaned up!",
          text: "Unused custom options have been removed.",
          icon: "success",
          timer: 2000,
          showConfirmButton: false,
        });
      } catch (error) {
        await Swal.fire({
          title: "Error",
          text: "Failed to clean up options. Please try again.",
          icon: "error",
        });
      } finally {
        setLoading(false);
      }
    }
  }

  return (
    <button
      onClick={handleCleanup}
      disabled={loading}
      className="flex items-center gap-2 border border-red-300 text-red-600 px-4 py-2 rounded-lg hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      title="Remove unused custom options"
    >
      <Trash2 size={18} />
      {loading ? "Cleaning..." : "Clean Up Options"}
    </button>
  );
}