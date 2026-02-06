








// src/types/internetUsage.ts

export interface InternetUsage {
  id: string;
  officeName: string;
  datePurchased: string;
  dateExhausted: string | null; // Can be null if still active
  bundleSize?: string; // e.g., "100GB", "Unlimited"
  cost?: number;
  provider: string; // "Starlink" by default
  status: "Active" | "Exhausted" | "Upcoming";
  notes?: string;
  createdAt: string;
}

export type InternetUsageFormData = Omit<InternetUsage, "id" | "createdAt" | "status">;