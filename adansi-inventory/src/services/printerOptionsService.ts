







// Service to manage custom printer options in Firebase
import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  getDocs,
  query,
} from "firebase/firestore";
import { db } from "../firebase/firebase";
import type { Printer } from "../types/printer";

const OPTIONS_DOC = "printer_options";
const OPTIONS_COLLECTION = "settings";
const PRINTERS_COLLECTION = "printers";

// Default options
export const DEFAULT_LOCATIONS = [
  'Travel House',
  'Ashaley Botwe Branch',
  'Nester Square Branch',
  'Tema Branch',
  'Takoradi Branch',
  'Kumasi Branch',
  'Tarkwa Branch',
];

export const DEFAULT_MODELS = [
  'HP Color LaserJet Pro MFP M479fdw',
  'HP Color LaserJet Pro MFP M283fdw',
  'i-SENSYS MF752Cdw',
  'Canon imageRunner C3025i',
  'Canon imageRunner C3326i',
  'Canon PIXMA TS3440',
];

export const DEFAULT_COLORS = [
  { value: 'white', label: 'White' },
  { value: 'black', label: 'Black' },
  { value: 'gray', label: 'Gray' },
];

// No default accessories - all must be added manually
export const DEFAULT_ACCESSORIES: string[] = [];

interface CustomOptions {
  locations: string[];
  models: string[];
  colors: string[];
  accessories: string[];
}

// Get all printers from Firebase
async function getAllPrintersFromDB(): Promise<Printer[]> {
  try {
    const q = query(collection(db, PRINTERS_COLLECTION));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<Printer, "id">),
    }));
  } catch (error) {
    console.error('Error fetching printers:', error);
    return [];
  }
}

// Get custom options from Firebase
async function getCustomOptionsFromDB(): Promise<CustomOptions> {
  try {
    const docRef = doc(db, OPTIONS_COLLECTION, OPTIONS_DOC);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        locations: data.locations || [],
        models: data.models || [],
        colors: data.colors || [],
        accessories: data.accessories || [],
      };
    }

    // Initialize if doesn't exist
    const initialData: CustomOptions = {
      locations: [],
      models: [],
      colors: [],
      accessories: [],
    };
    await setDoc(docRef, initialData);
    return initialData;
  } catch (error) {
    console.error('Error reading custom options from Firebase:', error);
    return {
      locations: [],
      models: [],
      colors: [],
      accessories: [],
    };
  }
}

// Save custom options to Firebase
async function saveCustomOptionsToDB(options: CustomOptions): Promise<void> {
  try {
    const docRef = doc(db, OPTIONS_COLLECTION, OPTIONS_DOC);
    await setDoc(docRef, options);
  } catch (error) {
    console.error('Error saving custom options to Firebase:', error);
    throw error;
  }
}

// Clean up unused custom options
export async function cleanupUnusedOptions(): Promise<void> {
  try {
    const printers = await getAllPrintersFromDB();
    const customOptions = await getCustomOptionsFromDB();

    // Extract used values from all printers
    const usedLocations = printers
      .map(p => p.location)
      .filter(loc => !DEFAULT_LOCATIONS.includes(loc));

    const usedModels = printers
      .map(p => p.model)
      .filter(model => !DEFAULT_MODELS.includes(model));

    const usedColors = printers
      .map(p => p.printerColorType)
      .filter(col => !DEFAULT_COLORS.some(dc => dc.value === col));

    const usedAccessories: string[] = [];
    printers.forEach(p => {
      p.accessories?.forEach(acc => {
        if (!DEFAULT_ACCESSORIES.includes(acc) && !usedAccessories.includes(acc)) {
          usedAccessories.push(acc);
        }
      });
    });

    // Filter custom options to only keep those still in use
    const filteredLocations = customOptions.locations.filter(loc => usedLocations.includes(loc));
    const filteredModels = customOptions.models.filter(model => usedModels.includes(model));
    const filteredColors = customOptions.colors.filter(col => usedColors.includes(col));
    const filteredAccessories = customOptions.accessories.filter(acc => usedAccessories.includes(acc));
    
    const cleanedOptions: CustomOptions = {
      locations: filteredLocations,
      models: filteredModels,
      colors: filteredColors,
      accessories: filteredAccessories,
    };

    // Save cleaned options back to Firebase
    await saveCustomOptionsToDB(cleanedOptions);
    console.log('Unused custom options cleaned up successfully');
  } catch (error) {
    console.error('Error cleaning up unused options:', error);
    throw error;
  }
}

// Add a custom option to a specific field
async function addCustomOption(field: keyof CustomOptions, value: string): Promise<void> {
  try {
    const options = await getCustomOptionsFromDB();
    
    if (!options[field].includes(value)) {
      options[field] = [...options[field], value];
      await saveCustomOptionsToDB(options);
    }
  } catch (error) {
    console.error(`Error adding custom ${field}:`, error);
    throw error;
  }
}

// Location methods
export async function getAllLocations(): Promise<string[]> {
  const custom = await getCustomOptionsFromDB();
  return [...DEFAULT_LOCATIONS, ...custom.locations];
}

export async function addCustomLocation(location: string): Promise<void> {
  await addCustomOption('locations', location);
}

// Model methods
export async function getAllModels(): Promise<string[]> {
  const custom = await getCustomOptionsFromDB();
  return [...DEFAULT_MODELS, ...custom.models];
}

export async function addCustomModel(model: string): Promise<void> {
  await addCustomOption('models', model);
}

// Color methods
export async function getAllColors(): Promise<Array<{ value: string; label: string }>> {
  const custom = await getCustomOptionsFromDB();
  const customColorObjects = custom.colors.map(color => ({
    value: color,
    label: color.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
  }));
  return [...DEFAULT_COLORS, ...customColorObjects];
}

export async function addCustomColor(color: string): Promise<void> {
  // Convert to kebab-case
  const kebabColor = color.trim().toLowerCase().replace(/\s+/g, '-');
  await addCustomOption('colors', kebabColor);
}

// Accessory methods
export async function getAllAccessories(): Promise<string[]> {
  const custom = await getCustomOptionsFromDB();
  return [...DEFAULT_ACCESSORIES, ...custom.accessories];
}

export async function addCustomAccessory(accessory: string): Promise<void> {
  await addCustomOption('accessories', accessory);
}

export async function getCustomAccessories(): Promise<string[]> {
  const custom = await getCustomOptionsFromDB();
  return custom.accessories;
}