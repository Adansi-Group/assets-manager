// src/toners/migrationPlan.fixture.ts
//
// The live stock as exported on 2026-09-23, before pooling. Kept verbatim so
// the migration's expected output is pinned to real data rather than to
// invented examples. Firestore cannot be read from a test on this account, so
// this fixture is the closest thing to a rehearsal that exists.

import type { Toner } from "../types/toner";

export const REAL_STOCK: Toner[] = [
  { id: "r0", location: "Nester Square Branch", room: undefined, printerType: "i-SENSYS MF752Cdw", tonerType: "CARTRIDGE 069", colorType: "Cyan", quantity: 3, dateBrought: "2026-02-16" },
  { id: "r1", location: "Tema Branch", room: undefined, printerType: "HP Color LaserJet Pro MFP M283fdw", tonerType: "222A", colorType: "Yellow", quantity: 4, dateBrought: "2026-02-16" },
  { id: "r2", location: "Tema Branch", room: undefined, printerType: "HP Color LaserJet Pro MFP M283fdw", tonerType: "222A", colorType: "Magenta", quantity: 1, dateBrought: "2026-02-16" },
  { id: "r3", location: "Tema Branch", room: undefined, printerType: "HP Color LaserJet Pro MFP M283fdw", tonerType: "222A", colorType: "Cyan", quantity: 0, dateBrought: "2026-02-16" },
  { id: "r4", location: "Travel House", room: "HR Manager Office", printerType: "i-SENSYS MF752Cdw", tonerType: "CARTRIDGE 069", colorType: "Yellow", quantity: 1, dateBrought: "2026-02-14" },
  { id: "r5", location: "Travel House", room: "HR Manager Office", printerType: "i-SENSYS MF752Cdw", tonerType: "CARTRIDGE 069", colorType: "Magenta", quantity: 1, dateBrought: "2026-02-14" },
  { id: "r6", location: "Travel House", room: "Down Floor", printerType: "Canon imageRunner C3326i", tonerType: "C-EXV65", colorType: "Black", quantity: 4, dateBrought: "2026-02-14" },
  { id: "r7", location: "Travel House", room: "First Floor", printerType: "Canon imageRunner C3025i", tonerType: "C-EXV54", colorType: "Yellow", quantity: 5, dateBrought: "2026-02-14" },
  { id: "r8", location: "Travel House", room: "Account Office", printerType: "HP Color LaserJet Pro MFP M283fdw", tonerType: "207A", colorType: "Cyan", quantity: 2, dateBrought: "2026-02-14" },
  { id: "r9", location: "Travel House", room: "Account Office", printerType: "HP Color LaserJet Pro MFP M283fdw", tonerType: "207A", colorType: "Black", quantity: 1, dateBrought: "2026-02-14" },
  { id: "r10", location: "Travel House", room: "Account Office", printerType: "HP Color LaserJet Pro MFP M283fdw", tonerType: "207A", colorType: "Yellow", quantity: 3, dateBrought: "2026-02-14" },
  { id: "r11", location: "Travel House", room: "First Floor", printerType: "Canon imageRunner C3025i", tonerType: "C-EXV54", colorType: "Black", quantity: 4, dateBrought: "2026-02-14" },
  { id: "r12", location: "Travel House", room: "HR Manager Office", printerType: "i-SENSYS MF752Cdw", tonerType: "CARTRIDGE 069", colorType: "Black", quantity: 1, dateBrought: "2026-02-14" },
  { id: "r13", location: "Travel House", room: "Cashier Office", printerType: "Canon PIXMA TS3440", tonerType: "PIXMA 446", colorType: "Black", quantity: 9, dateBrought: "2026-02-14" },
  { id: "r14", location: "Nester Square Branch", room: undefined, printerType: "i-SENSYS MF752Cdw", tonerType: "CARTRIDGE 069", colorType: "Black", quantity: 3, dateBrought: "2026-02-14" },
  { id: "r15", location: "Travel House", room: "First Floor", printerType: "Canon imageRunner C3025i", tonerType: "C-EXV54", colorType: "Cyan", quantity: 3, dateBrought: "2026-02-14" },
  { id: "r16", location: "Travel House", room: "HR Manager Office", printerType: "i-SENSYS MF752Cdw", tonerType: "CARTRIDGE 069", colorType: "Cyan", quantity: 1, dateBrought: "2026-02-14" },
  { id: "r17", location: "Nester Square Branch", room: undefined, printerType: "i-SENSYS MF752Cdw", tonerType: "CARTRIDGE 069", colorType: "Magenta", quantity: 3, dateBrought: "2026-02-14" },
  { id: "r18", location: "Travel House", room: "Cashier Office", printerType: "Canon PIXMA TS3440", tonerType: "PIXMA 446", colorType: "Color", quantity: 4, dateBrought: "2026-02-14" },
  { id: "r19", location: "Ashaley Botwe Branch", room: undefined, printerType: "HP Color LaserJet Pro MFP M479fdw", tonerType: "415A", colorType: "Magenta", quantity: 2, dateBrought: "2026-02-13" },
  { id: "r20", location: "Ashaley Botwe Branch", room: undefined, printerType: "HP Color LaserJet Pro MFP M479fdw", tonerType: "415A", colorType: "Yellow", quantity: 2, dateBrought: "2026-02-13" },
  { id: "r21", location: "Travel House", room: "CEO's Office", printerType: "HP Color Laser Jet Pro MFP 3303", tonerType: "222A-CEO", colorType: "Black", quantity: 1, dateBrought: "2026-02-13" },
  { id: "r22", location: "Tema Branch", room: undefined, printerType: "HP Color LaserJet Pro MFP M283fdw", tonerType: "222A", colorType: "Black", quantity: 2, dateBrought: "2026-02-13" },
  { id: "r23", location: "Nester Square Branch", room: undefined, printerType: "i-SENSYS MF752Cdw", tonerType: "CARTRIDGE 069", colorType: "Yellow", quantity: 3, dateBrought: "2026-02-13" },
  { id: "r24", location: "Travel House", room: "Cashier Office", printerType: "Canon PIXMA TS3440", tonerType: "PIXMA 446", colorType: "Cyan", quantity: 1, dateBrought: "2026-02-13" },
  { id: "r25", location: "Travel House", room: "Account Office", printerType: "HP Color LaserJet Pro MFP M283fdw", tonerType: "207A", colorType: "Magenta", quantity: 3, dateBrought: "2026-02-13" },
  { id: "r26", location: "Travel House", room: "CEO's Office", printerType: "HP Color Laser Jet Pro MFP 3303", tonerType: "222A-CEO", colorType: "Magenta", quantity: 1, dateBrought: "2026-02-13" },
  { id: "r27", location: "Travel House", room: "First Floor", printerType: "Canon imageRunner C3025i", tonerType: "C-EXV54", colorType: "Magenta", quantity: 2, dateBrought: "2026-02-13" },
  { id: "r28", location: "Ashaley Botwe Branch", room: undefined, printerType: "HP Color LaserJet Pro MFP M479fdw", tonerType: "415A", colorType: "Cyan", quantity: 2, dateBrought: "2026-02-13" },
  { id: "r29", location: "Travel House", room: "CEO's Office", printerType: "HP Color Laser Jet Pro MFP 3303", tonerType: "222A-CEO", colorType: "Cyan", quantity: 1, dateBrought: "2026-02-13" },
  { id: "r30", location: "Travel House", room: "CEO's Office", printerType: "HP Color Laser Jet Pro MFP 3303", tonerType: "222A-CEO", colorType: "Yellow", quantity: 1, dateBrought: "2026-02-13" },
  { id: "r31", location: "Ashaley Botwe Branch", room: undefined, printerType: "HP Color LaserJet Pro MFP M479fdw", tonerType: "415A", colorType: "Black", quantity: 2, dateBrought: "2026-02-13" },
];
