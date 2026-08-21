// Types shared between client and server so both sides agree on the shape
// of a Collection, a Field, and a Mapping result.

// Category and Source System are dynamic, user-managed data persisted in
// their own tables — collections just reference them by name.
export type CollectionType = string;
export type CollectionSource = string;
export type InternalOrExternalType = 'Internal' | 'External';
export type CollectionStatus = 'Draft' | 'Live';

export type FieldDataType = 'Text' | 'Number' | 'Date';
export type FieldKind = 'Text' | 'List';

export interface Category {
  id: string;
  name: string;
  createdBy: string;
  createdAt: number;
}

export interface NewCategoryInput {
  name: string;
  createdBy?: string;
}

export interface SourceSystem {
  id: string;
  name: string;
  createdBy: string;
  createdAt: number;
}

export interface NewSourceSystemInput {
  name: string;
  createdBy?: string;
}

export interface Field {
  name: string;
  dataType?: FieldDataType;
  fieldType?: FieldKind;
  description?: string;
}

export interface Collection {
  id: string;
  name: string;
  type: CollectionType; // labeled "Category" in the UI
  source: CollectionSource; // labeled "Source System" in the UI
  clientType: InternalOrExternalType; // labeled "Type" in the UI
  status: CollectionStatus;
  fileName: string;
  fields: Field[];
  createdBy: string;
  createdAt: number;
  editedBy: string;
  editedAt: number | null; // null until the collection is edited (e.g. renamed) for the first time
}

// Payload the client sends to create a collection. The server assigns id/createdAt.
export interface NewCollectionInput {
  name: string;
  type: CollectionType;
  source: CollectionSource;
  clientType: InternalOrExternalType;
  status: CollectionStatus;
  fileName: string;
  fields: Field[];
  createdBy?: string;
}

export type MatchStatus = 'auto' | 'manual' | 'unmatched' | 'ai';

export interface MappingRow {
  sourceField: string;
  targetField: string; // '' when unmatched
  confidence: number | null; // 0-100, null when unmatched
  status: MatchStatus;
  reason: string; // brief human-readable explanation of the confidence score
}

export interface MappingResult {
  sourceId: string;
  targetId: string;
  rows: MappingRow[];
}

// A mapping the user has explicitly saved to the database, so it's shared
// and persists beyond a single session. Source/target names are snapshotted
// at save time, since the source/target collection could later be renamed
// or deleted — the saved mapping should still make sense on its own.
export interface SavedMapping {
  id: string;
  sourceId: string;
  targetId: string;
  sourceName: string;
  targetName: string;
  rows: MappingRow[];
  savedBy: string;
  createdAt: number;
}

export interface NewSavedMappingInput {
  sourceId: string;
  targetId: string;
  sourceName: string;
  targetName: string;
  rows: MappingRow[];
  savedBy: string;
}
