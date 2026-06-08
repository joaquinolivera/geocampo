/**
 * English translations — GeoCampo
 * This is the canonical/master translation file.
 * All keys must be present here; Spanish (es.ts) must mirror this structure exactly.
 *
 * `Translations` is exported as a recursive string map so Spanish values
 * can differ from English while still enforcing the same key structure.
 */

// Recursively maps a type's leaf values to `string`, preserving structure.
type DeepStringMap<T> = T extends string
  ? string
  : { [K in keyof T]: DeepStringMap<T[K]> };

/** Type-safe translation shape: same keys as `en`, any string values. */
export type Translations = DeepStringMap<typeof en>;

export const en = {
  // ── Authentication ───────────────────────────────────────────────────────────
  auth: {
    title: 'GeoCampo',
    tagline: 'Intelligent livestock management',
    email: 'Email',
    password: 'Password',
    emailPlaceholder: 'farmer@ranch.com',
    passwordPlaceholder: '••••••••',
    loginBtn: 'Enter the field',
    loggingIn: 'Logging in…',
    demoTitle: 'Demo mode',
    demoBody: 'Enter any email and password to access the demo farm.',
    errEmpty: 'Please fill in your email and password.',
    errCredentials: 'Incorrect email or password. Please try again.',
    errConfig: 'Configuration error. Contact your administrator.',
    support: 'Problems logging in?',
    supportLink: 'Contact support',
    footer: 'Built for the field · GeoCampo',
    logout: 'Log out',
    close: 'Close',
  },

  // ── Top bar ──────────────────────────────────────────────────────────────────
  topbar: {
    cattle: 'cattle',
    pastures: 'pastures',
    hectares: 'hectares',
    alert: 'alert',
    alerts: 'alerts',
    allGood: 'All good',
  },

  // ── Sidebar ──────────────────────────────────────────────────────────────────
  sidebar: {
    tabPastures: 'Pastures',
    tabInfra: 'Infra',
    demoData: 'GeoCampo · Demo data',
  },

  // ── Pasture card & status ────────────────────────────────────────────────────
  parcel: {
    noHerd: 'No herd assigned',
    heads: 'head',
    loadPct: 'load',
    avgWeight: 'Avg. weight',
    adg: 'ADG',
    adgUnit: 'kg/day',
    daysOccupied: 'days occupied',
    noData: 'No data',
    status: {
      ok: 'Normal',
      warning: 'Near limit',
      critical: 'Overloaded',
    },
    health: {
      excellent: 'Excellent',
      good: 'Good',
      attention: 'Attention',
      critical: 'Critical',
    },
  },

  // ── Alerts panel ─────────────────────────────────────────────────────────────
  alerts: {
    title: 'Alerts',
    none: 'No active alerts',
    overload: 'Overload · {count}/{capacity} head ({pct}%)',
    overdueDays: 'Overdue {days} day(s)',
    dueIn: 'Due in {days} day(s)',
  },

  // ── Movements log ─────────────────────────────────────────────────────────────
  movements: {
    title: 'Recent movements',
    daysAgo: '{days} day(s) ago',
    today: 'Today',
    by: 'by',
  },

  // ── Parcel detail panel ───────────────────────────────────────────────────────
  detail: {
    currentHerd: 'Current herd',
    noHerd: 'No herd in this pasture',
    heads: 'head',
    stockingCaption: '{count} of {capacity} animals',
    productivity: 'Productivity',
    avgWeight: 'Avg. weight',
    adg: 'Avg. daily gain',
    daysOcc: 'Days occupied',
    noData: 'No data',
    timeInPasture: 'Time in pasture',
    entryDate: 'Entry date',
    daysOccupied: 'days',
    rotationWarning: '>30 days — consider rotation',
    weightHistory: 'Weight history',
    health: 'Health',
    kg: 'kg',
    close: 'Close',
  },

  // ── Infrastructure detail panel ───────────────────────────────────────────────
  infra: {
    types: {
      water: 'Water',
      fence: 'Fence / Wire',
      corral: 'Corral / Squeeze chute',
      building: 'Building / Installation',
    },
    typeShort: {
      water: 'Water',
      fence: 'Fence',
      corral: 'Corral',
      building: 'Building',
    },
    condition: {
      good: 'Good',
      fair: 'Fair',
      poor: 'Needs attention',
    },
    conditionLabel: 'Condition:',
    details: 'Details',
    type: 'Type',
    subtype: 'Subtype',
    capacityWater: 'Capacity (m³)',
    capacityCorral: 'Capacity (head)',
    observations: 'Observations',
    geometry: 'Geometry',
    geometryType: 'Geometry type',
    geoPoint: 'Point',
    geoLine: 'Line',
    geoPoly: 'Polygon',
    longitude: 'Longitude',
    latitude: 'Latitude',
    maintenanceRec: '⚠️ Maintenance recommended',
    maintenanceUrgent: '🔴 Urgent attention',
    maintenanceBodyFair:
      'This installation requires review soon to prevent further deterioration.',
    maintenanceBodyPoor:
      'This installation is in poor condition. Immediate intervention recommended.',
    capacityUnit: {
      water: 'm³',
      corral: 'head',
    },
  },

  // ── Map ───────────────────────────────────────────────────────────────────────
  map: {
    loading: 'Loading map…',
    noTokenTitle: 'Mapbox token required',
    noTokenBody: 'Add NEXT_PUBLIC_MAPBOX_TOKEN to .env.local',
    legendLoad: 'Stocking load',
    legendInfra: 'Infrastructure',
    legendCondition: 'Condition',
    loadNormal: 'Normal  (<80%)',
    loadWarning: 'Near limit  (80–99%)',
    loadCritical: 'Overloaded  (≥100%)',
    infraWater: 'Water',
    infraFence: 'Fence',
    infraCorral: 'Corral / Chute',
    infraBuilding: 'Building',
    condGood: 'Good condition',
    condFair: 'Fair',
    condPoor: 'Needs attention',
  },

  // ── Mobile: dashboard ─────────────────────────────────────────────────────────
  dashboard: {
    totalCattle: 'Total cattle',
    pastures: 'Pastures',
    activeAlerts: 'Alerts',
    weighings: 'Weighings',
    allGood: 'All good',
    needsAttention: 'Needs attention',
    loadAlertsTitle: 'Load alerts',
    healthAlertsTitle: 'Health alerts',
    adgSection: 'Avg. daily gain (ADG)',
    noAdg: 'Insufficient data',
    noActiveAlerts: 'No active alerts',
  },

  // ── Mobile: herds ─────────────────────────────────────────────────────────────
  herds: {
    title: 'Herds',
    subtitle: '{count} herds · {total} head',
    recordWeight: 'Record weighing',
    statusActive: 'Active',
    noAdg: 'No ADG yet',
    adgLabel: 'ADG:',
    modalTitle: 'Record weighing',
    modalSubtitle: 'Total herd weighing',
    totalKg: 'Total kg (full herd)',
    cattleCount: 'Animals weighed',
    avgWeight: 'Average',
    notes: 'Notes (optional)',
    save: 'Save weighing',
    cancel: 'Cancel',
    errWeight: 'Enter the total herd weight.',
    errCattle: 'Enter the number of animals weighed.',
    weightSaved: '✅ Weighing saved',
  },

  // ── Mobile: health ────────────────────────────────────────────────────────────
  health: {
    title: 'Health',
    tabUpcoming: 'Upcoming',
    tabHistory: 'History',
    registerTreatment: 'Register treatment',
    noUpcoming: 'No upcoming treatments',
    modalTitle: 'Register treatment',
    herd: 'Herd',
    treatmentType: 'Treatment type',
    product: 'Product / Vaccine',
    dosage: 'Dosage',
    appliedBy: 'Applied by (required)',
    nextDueDays: 'Next dose in (days)',
    notes: 'Notes (optional)',
    noExpiry: 'No expiry',
    expiresIn: 'Expires in {days} day(s)',
    expiresToday: 'Expires today',
    errAppliedBy: 'Enter who applied the treatment.',
    treatmentRegistered: 'Treatment registered',
    save: 'Save treatment',
    cancel: 'Cancel',
    types: {
      vaccination: 'Vaccination',
      deworming: 'Deworming',
      treatment: 'Treatment',
      checkup: 'Vet checkup',
    },
  },

  // ── Mobile: map ───────────────────────────────────────────────────────────────
  mobileMap: {
    legendTitle: 'Stocking load',
    legendNormal: 'Normal',
    legendWarning: 'Near limit',
    legendCritical: 'Overloaded',
    recentMovements: 'Recent movements',
    heads: 'head',
  },

  // ── Mobile navigation ────────────────────────────────────────────────────────
  nav: {
    home: 'Home',
    map: 'Map',
    herds: 'Herds',
    health: 'Health',
  },

  // ── Common ────────────────────────────────────────────────────────────────────
  common: {
    loading: 'Loading…',
    close: 'Close',
    cancel: 'Cancel',
    save: 'Save',
    error: 'Error',
    confirm: 'Confirm',
    kg: 'kg',
    days: 'days',
    day: 'day',
    ha: 'ha',
    head: 'head',
    pct: '%',
    today: 'Today',
    unknownDate: 'Unknown date',
  },
} as const;
