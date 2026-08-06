import { useEffect, useState } from 'react';
import type { Collection, CollectionType, CollectionSource, ClientOrVendorType, Field } from '../../shared/types';
import { api } from './lib/api';
import Sidebar from './components/Sidebar';
import HomePage from './components/HomePage';
import Dashboard from './components/Dashboard';
import NewCollectionPage from './components/NewCollectionPage';
import CollectionDetail from './components/CollectionDetail';
import MappingPage from './components/MappingPage';

export type View = 'home' | 'dashboard' | 'newCollection' | 'collectionDetail' | 'mapping';

export default function App() {
  const [view, setView] = useState<View>('home');
  const [collections, setCollections] = useState<Collection[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const data = await api.listCollections();
      setCollections(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load collections from the server.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  function navigate(v: View) {
    setActiveId(null);
    setView(v);
  }

  async function handleSaveCollection(input: {
    name: string;
    type: CollectionType;
    source: CollectionSource;
    clientType: ClientOrVendorType;
    fileName: string;
    fields: Field[];
    createdBy: string;
  }) {
    const created = await api.createCollection(input);
    setCollections((prev) => [created, ...prev]);
    navigate('dashboard');
  }

  async function handleRenameCollection(id: string, newName: string) {
    const updated = await api.updateCollectionName(id, newName);
    setCollections((prev) => prev.map((c) => (c.id === id ? updated : c)));
  }

  async function handleDeleteCollection(id: string) {
    await api.deleteCollection(id);
    setCollections((prev) => prev.filter((c) => c.id !== id));
    if (view === 'collectionDetail' && activeId === id) navigate('dashboard');
  }

  const activeCollection = collections.find((c) => c.id === activeId) || null;

  if (view === 'home') {
    return <HomePage onEnter={navigate} />;
  }

  return (
    <div className="shell">
      <Sidebar view={view} collectionCount={collections.length} onNavigate={navigate} />
      <main>
        {view === 'dashboard' && (
          <Dashboard
            collections={collections}
            loading={loading}
            error={error}
            onOpenCollection={(id) => { setActiveId(id); setView('collectionDetail'); }}
            onNewCollection={() => navigate('newCollection')}
            onDeleteCollection={handleDeleteCollection}
          />
        )}
        {view === 'newCollection' && (
          <NewCollectionPage collections={collections} onCancel={() => navigate('dashboard')} onSave={handleSaveCollection} />
        )}
        {view === 'collectionDetail' && (
          <CollectionDetail
            collection={activeCollection}
            collections={collections}
            onBack={() => navigate('dashboard')}
            onDelete={handleDeleteCollection}
            onRename={handleRenameCollection}
          />
        )}
        {view === 'mapping' && (
          <MappingPage collections={collections} onNewCollection={() => navigate('newCollection')} />
        )}
      </main>
    </div>
  );
}
