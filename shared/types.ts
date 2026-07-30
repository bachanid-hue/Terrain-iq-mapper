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
  createdAt: number;
}

// Payload the client sends to create a collection. The server assigns id/createdAt.
export interface NewCollectionInput {
  name: string;
  type: CollectionType;
  fileName: string;
  fields: Field[];
}

export type MatchStatus = 'auto' | 'manual' | 'unmatched';

export interface MappingRow {
  sourceField: string;
  targetField: string; // '' when unmatched
  confidence: number | null; // 0-100, null when unmatched
  status: MatchStatus;
}

export interface MappingResult {
  sourceId: string;
  targetId: string;
  rows: MappingRow[];
}
