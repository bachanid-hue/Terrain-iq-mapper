// Types shared between client and server so both sides agree on the shape
// of a Collection, a Field, and a Mapping result.

export type CollectionType = 'Security Data' | 'Positions Data' | 'Holdings Data';

export interface Field {
  name: string;
}

export interface Collection {
  id: string;
  name: string;
  type: CollectionType;
  fileName: string;
  fields: Field[];
  createdBy: string;
  createdAt: number;
}

// Payload the client sends to create a collection. The server assigns id/createdAt.
export interface NewCollectionInput {
  name: string;
  type: CollectionType;
  fileName: string;
  fields: Field[];
  createdBy: string;
}

export type MatchStatus = 'auto' | 'manual' | 'unmatched';

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
