


// src/types/inventory.ts

export type InventoryCategory = 
  | "Electronics & Equipment"
  | "Furniture"
  | "Safety Equipment"
  | "Office Supplies"
  | "Consumables"
  | "Cleaning & Hygiene";

export type InventoryStatus = "In Stock" | "Low Stock" | "Out of Stock";

export interface InventoryItem {
  id: string;
  category: InventoryCategory;
  itemName: string;
  brand?: string;
  model?: string;
  quantity: number;
  unit: string; // pieces, packs, bottles, boxes, etc.
  minStockLevel: number; // Alert when quantity falls below this
  location: string; // Office/Branch location
  room?: string; // Specific room/office
  unitPrice?: number;
  totalValue?: number; // quantity * unitPrice
  supplier?: string;
  lastRestocked?: string; // ISO date
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StockTransaction {
  id: string;
  itemId: string;
  itemName: string;
  type: "Add Stock" | "Remove Stock" | "Transfer" | "Adjustment";
  quantity: number;
  previousQuantity: number;
  newQuantity: number;
  location: string;
  reason?: string;
  performedBy: string; // User who made the change
  date: string;
}

// Predefined items by category for easy selection
export const INVENTORY_ITEMS_BY_CATEGORY: Record<InventoryCategory, string[]> = {
  "Electronics & Equipment": [
    "TV",
    "WiFi Router",
    "Air Conditioner (AC)",
    "Fridge/Refrigerator",
    "Smoke Sensor",
    "Fan",
    "Water Dispenser",
    "Calculator",
    "Extension Cable",
    "Power Strip",
    "Other Electronics"
  ],
  "Furniture": [
    "Office Chair",
    "Desk/Table",
    "Filing Cabinet",
    "Bookshelf",
    "Meeting Table",
    "Visitor Chair",
    "Other Furniture"
  ],
  "Safety Equipment": [
    "Fire Extinguisher",
    "Smoke Detector",
    "First Aid Kit",
    "Safety Sign",
    "Emergency Light",
    "Other Safety Equipment"
  ],
  "Office Supplies": [
    "Pens",
    "Markers",
    "Pins/Thumbtacks",
    "Perforator",
    "Stapler",
    "Staples",
    "Paper Clips",
    "Rubber Bands",
    "Scissors",
    "Tape",
    "Glue",
    "Ruler",
    "Notepad",
    "Sticky Notes",
    "File Folders",
    "Batteries",
    "Other Office Supplies"
  ],
  "Consumables": [
    "Bottled Water (Bel Aqua)",
    "Water Sachets",
    "Tissues (Box)",
    "Toilet Rolls",
    "Table Tissues",
    "Paper Towels",
    "Trash Bags (Small)",
    "Trash Bags (Large)",
    "Plastic Cups",
    "Disposable Plates",
    "Other Consumables"
  ],
  "Cleaning & Hygiene": [
    "Air Freshener Spray",
    "Air Freshener Diffuser",
    "Insecticide Spray",
    "Disinfectant",
    "Hand Sanitizer",
    "Soap",
    "Detergent",
    "Mop",
    "Broom",
    "Dustpan",
    "Cleaning Cloth",
    "Other Cleaning Supplies"
  ]
};

// Units of measurement
export const INVENTORY_UNITS = [
  "piece(s)",
  "pack(s)",
  "box(es)",
  "bottle(s)",
  "roll(s)",
  "carton(s)",
  "bag(s)",
  "set(s)",
  "dozen",
  "unit(s)"
];

