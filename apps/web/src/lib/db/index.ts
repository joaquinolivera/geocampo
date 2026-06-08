/**
 * @fileoverview Data access layer — routes queries to Supabase (production)
 * or localStorage farm-store (demo mode), behind IS_DEMO_MODE flag.
 *
 * Import from here, never directly from farm-store or supabase in components.
 *
 * Usage:
 *   import { db } from '@/lib/db';
 *   const pastures = await db.pastures.list(farmId);
 */

export { pasturesDb  } from './pastures';
export { herdsDb     } from './herds';
export { weightsDb   } from './weights';
export { healthDb    } from './health';
export { movementsDb } from './movements';
export { cattleDb    } from './cattle';
export { expensesDb  } from './expenses';
export { fuelDb      } from './fuel';
export { employeesDb } from './employees';
export { machineryDb } from './machinery';
