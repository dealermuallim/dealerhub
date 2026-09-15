export type FieldState =
  | 'DECODED'
  | 'MISSING'
  | 'VOICE_ADDED'
  | 'VOICE_CORRECTED'
  | 'CONFLICT'
  | 'UNRESOLVED'
  | 'CONFIRMED';

/** Existing Add Vehicle FormState keys only. */
export type QuickAddFieldKey =
  | 'vin'
  | 'stockNumber'
  | 'year'
  | 'make'
  | 'model'
  | 'trim'
  | 'mileage'
  | 'exteriorColor'
  | 'interiorColor'
  | 'transmission'
  | 'engine'
  | 'fuelType'
  | 'bodyStyle'
  | 'driveType'
  | 'askingPrice'
  | 'cashPrice'
  | 'financingPrice'
  | 'description'
  | 'featured'
  | 'vehicleStatus'
  | 'public';

export type FieldValue = string | number | boolean | null;

export type DraftField = {
  key: QuickAddFieldKey;
  decoded: FieldValue;
  current: FieldValue;
  proposed: FieldValue;
  state: FieldState;
  evidence?: string;
  source?: 'deterministic' | 'unresolved';
};

export type UnresolvedSpan = {
  span: string;
  reason: string;
};

export type VoiceDraftPatch = {
  vin: string;
  fields: DraftField[];
  unresolved: UnresolvedSpan[];
};

export type QuickAddFormSnapshot = Partial<Record<QuickAddFieldKey, FieldValue>>;

export type ParseQuickAddInput = {
  text: string;
  vin: string;
  /** Decoder-filled snapshot (typically post-VIN-decode form values for decoder keys). */
  decoded?: QuickAddFormSnapshot;
  /** Current form values. */
  current?: QuickAddFormSnapshot;
};

export const DECODER_KEYS: QuickAddFieldKey[] = [
  'year',
  'make',
  'model',
  'trim',
  'engine',
  'transmission',
  'fuelType',
  'bodyStyle',
  'driveType',
];

export const ALLOWED_STATUSES = [
  'AVAILABLE',
  'RESERVED',
  'PENDING',
  'SOLD',
  'WHOLESALE',
  'HOLD',
  'ARCHIVED',
] as const;