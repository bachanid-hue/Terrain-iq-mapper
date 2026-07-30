import type { Collection, NewCollectionInput, MappingResult } from '../../../shared/types';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      /* ignore parse errors */
    }
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  listCollections: () => request<Collection[]>('/collections'),
  getCollection: (id: string) => request<Collection>(`/collections/${id}`),
  createCollection: (input: NewCollectionInput) =>
    request<Collection>('/collections', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  updateCollectionName: (id: string, name: string) =>
    request<Collection>(`/collections/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    }),
  deleteCollection: (id: string) =>
    request<void>(`/collections/${id}`, { method: 'DELETE' }),
  runMapping: (sourceId: string, targetId: string) =>
    request<MappingResult>('/mapping/run', {
      method: 'POST',
      body: JSON.stringify({ sourceId, targetId }),
    }),
};
