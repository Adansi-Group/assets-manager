



// Migration helper to update old location names to new branch names
// Run this once to update all existing toners and printers

import { 
  collection, 
  getDocs, 
  updateDoc, 
  doc 
} from "firebase/firestore";
import { db } from "../firebase/firebase";

// Mapping of old location names to new names
const LOCATION_MIGRATION_MAP: Record<string, string> = {
  'Botwe': 'Ashaley Botwe Branch',
  'Nester': 'Nester Square Branch',
  'Tema': 'Tema Branch',
  'Takoradi': 'Takoradi Branch',
  'Kumasi': 'Kumasi Branch',
  'Tarkwa': 'Tarkwa Branch',
  // Travel House stays the same
  'Travel House': 'Travel House',
};

export async function migrateLocationNames() {
  console.log('Starting location name migration...');
  
  let tonersUpdated = 0;
  let printersUpdated = 0;
  
  try {
    // Migrate Toners
    console.log('Migrating toners...');
    const tonersSnapshot = await getDocs(collection(db, 'toners'));
    
    for (const docSnapshot of tonersSnapshot.docs) {
      const toner = docSnapshot.data();
      const oldLocation = toner.location;
      
      // Check if this location needs to be migrated
      if (LOCATION_MIGRATION_MAP[oldLocation]) {
        const newLocation = LOCATION_MIGRATION_MAP[oldLocation];
        
        // Only update if the location actually changed
        if (oldLocation !== newLocation) {
          await updateDoc(doc(db, 'toners', docSnapshot.id), {
            location: newLocation
          });
          tonersUpdated++;
          console.log(`Updated toner: ${oldLocation} → ${newLocation}`);
        }
      }
    }
    
    // Migrate Printers
    console.log('Migrating printers...');
    const printersSnapshot = await getDocs(collection(db, 'printers'));
    
    for (const docSnapshot of printersSnapshot.docs) {
      const printer = docSnapshot.data();
      const oldLocation = printer.location;
      
      // Check if this location needs to be migrated
      if (LOCATION_MIGRATION_MAP[oldLocation]) {
        const newLocation = LOCATION_MIGRATION_MAP[oldLocation];
        
        // Only update if the location actually changed
        if (oldLocation !== newLocation) {
          await updateDoc(doc(db, 'printers', docSnapshot.id), {
            location: newLocation
          });
          printersUpdated++;
          console.log(`Updated printer: ${oldLocation} → ${newLocation}`);
        }
      }
    }
    
    console.log('✅ Migration complete!');
    console.log(`- Toners updated: ${tonersUpdated}`);
    console.log(`- Printers updated: ${printersUpdated}`);
    
    return {
      success: true,
      tonersUpdated,
      printersUpdated,
      message: `Successfully updated ${tonersUpdated} toners and ${printersUpdated} printers`
    };
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      tonersUpdated,
      printersUpdated,
    };
  }
}

// Usage: Call this function from your component or console
// Example:
// import { migrateLocationNames } from './services/locationMigration';
// migrateLocationNames().then(result => console.log(result));