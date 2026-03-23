import { useState, useEffect, useCallback } from 'react';
import { xodeon } from '@/lib/xodeon';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import {
  Database, Key, RefreshCw, Plus, Trash2, Pencil, Save, X, ChevronRight, FolderOpen, ArrowLeft,
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

const STORAGE_KEY = 'xodeon_api_key';

export default function XodeonData() {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(STORAGE_KEY) || '');
  const [connected, setConnected] = useState(false);
  const [collections, setCollections] = useState<string[]>([]);
  const [activeCollection, setActiveCollection] = useState<string | null>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');

  // Edit / Add dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'add' | 'edit'>('add');
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [jsonInput, setJsonInput] = useState('{\n  \n}');

  // Delete confirm
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const connect = useCallback(async () => {
    if (!apiKey.trim()) { toast.error('Voer een API key in'); return; }
    setLoading(true);
    try {
      const res = await xodeon.collections(apiKey);
      if (res.error) throw new Error(res.error);
      setCollections(res.collections || []);
      setConnected(true);
      localStorage.setItem(STORAGE_KEY, apiKey);
      toast.success('Verbonden met Xodeon Cloud');
    } catch (e: any) {
      toast.error(e.message || 'Kan niet verbinden');
    } finally {
      setLoading(false);
    }
  }, [apiKey]);

  const disconnect = () => {
    setConnected(false);
    setActiveCollection(null);
    setRecords([]);
    setCollections([]);
    localStorage.removeItem(STORAGE_KEY);
    setApiKey('');
    toast('Verbinding verbroken');
  };

  const refreshCollections = async () => {
    setLoading(true);
    try {
      const res = await xodeon.collections(apiKey);
      setCollections(res.collections || []);
    } catch { /* ignore */ }
    setLoading(false);
  };

  const openCollection = async (col: string) => {
    setActiveCollection(col);
    setLoading(true);
    try {
      const res = await xodeon.list(col, apiKey);
      setRecords(res.records || []);
    } catch (e: any) {
      toast.error('Kon data niet laden');
    }
    setLoading(false);
  };

  const refreshRecords = () => {
    if (activeCollection) openCollection(activeCollection);
  };

  const handleAdd = () => {
    setDialogMode('add');
    setEditingRecord(null);
    setJsonInput('{\n  \n}');
    setDialogOpen(true);
  };

  const handleEdit = (record: any) => {
    setDialogMode('edit');
    setEditingRecord(record);
    setJsonInput(JSON.stringify(record.data || {}, null, 2));
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!activeCollection) return;
    let parsed: any;
    try {
      parsed = JSON.parse(jsonInput);
    } catch {
      toast.error('Ongeldige JSON'); return;
    }
    setLoading(true);
    try {
      if (dialogMode === 'add') {
        await xodeon.create(activeCollection, parsed, apiKey);
        toast.success('Record toegevoegd');
      } else if (editingRecord) {
        await xodeon.update(activeCollection, editingRecord.id, parsed, apiKey);
        toast.success('Record bijgewerkt');
      }
      setDialogOpen(false);
      refreshRecords();
    } catch (e: any) {
      toast.error(e.message || 'Fout bij opslaan');
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!activeCollection || !deleteId) return;
    setLoading(true);
    try {
      await xodeon.remove(activeCollection, deleteId, apiKey);
      toast.success('Record verwijderd');
      setDeleteId(null);
      refreshRecords();
    } catch (e: any) {
      toast.error(e.message || 'Fout bij verwijderen');
    }
    setLoading(false);
  };

  const handleCreateCollection = async () => {
    if (!newCollectionName.trim()) return;
    setLoading(true);
    try {
      await xodeon.create(newCollectionName.trim(), { _init: true }, apiKey);
      toast.success(`Collectie "${newCollectionName.trim()}" aangemaakt`);
      setNewCollectionName('');
      refreshCollections();
    } catch (e: any) {
      toast.error(e.message || 'Fout bij aanmaken');
    }
    setLoading(false);
  };

  // Auto-connect if key saved
  useEffect(() => {
    if (apiKey && !connected) connect();
  }, []);

  if (!connected) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-4">
        <Card className="w-full max-w-md border-border/40">
          <CardHeader className="text-center">
            <div className="mx-auto mb-3 h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Database className="h-7 w-7 text-primary" />
            </div>
            <CardTitle className="text-xl">Xodeon Cloud</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Voer je API key in om je data te beheren
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="password"
                placeholder="xodeon_..."
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && connect()}
                className="pl-10"
              />
            </div>
            <Button onClick={connect} disabled={loading} className="w-full">
              {loading ? 'Verbinden...' : 'Verbinden'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Database className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">Xodeon Cloud</h1>
            <p className="text-xs text-muted-foreground">Data beheer</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={disconnect} className="text-destructive hover:text-destructive">
          Verbinding verbreken
        </Button>
      </div>

      {!activeCollection ? (
        /* Collections list */
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground flex-1">Collecties ({collections.length})</h2>
            <Button variant="ghost" size="icon" onClick={refreshCollections} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {/* Create new collection */}
          <div className="flex gap-2">
            <Input
              placeholder="Nieuwe collectie naam..."
              value={newCollectionName}
              onChange={e => setNewCollectionName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreateCollection()}
              className="flex-1"
            />
            <Button onClick={handleCreateCollection} disabled={!newCollectionName.trim() || loading} size="sm">
              <Plus className="h-4 w-4 mr-1" /> Aanmaken
            </Button>
          </div>

          {collections.length === 0 ? (
            <Card className="border-dashed border-border/40">
              <CardContent className="py-12 text-center">
                <FolderOpen className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Geen collecties gevonden</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Maak een collectie aan om te beginnen</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-2">
              {collections.map(col => (
                <button
                  key={col}
                  onClick={() => openCollection(col)}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-xl border border-border/30 bg-card hover:bg-secondary/30 transition-all text-left group"
                >
                  <Database className="h-4 w-4 text-primary/70 shrink-0" />
                  <span className="text-sm font-medium text-foreground flex-1">{col}</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-foreground transition-colors" />
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Records view */
        <div className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="ghost" size="sm" onClick={() => { setActiveCollection(null); setRecords([]); }}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Terug
            </Button>
            <h2 className="text-sm font-semibold text-foreground flex-1">{activeCollection} ({records.length})</h2>
            <Button variant="ghost" size="icon" onClick={refreshRecords} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button size="sm" onClick={handleAdd}>
              <Plus className="h-4 w-4 mr-1" /> Toevoegen
            </Button>
          </div>

          {records.length === 0 ? (
            <Card className="border-dashed border-border/40">
              <CardContent className="py-12 text-center">
                <FolderOpen className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Geen records in deze collectie</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {records.map(record => (
                <Card key={record.id} className="border-border/30">
                  <CardContent className="py-3 px-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-mono text-muted-foreground/60 mb-1">ID: {record.id}</p>
                        <pre className="text-xs text-foreground bg-secondary/30 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-all max-h-40">
                          {JSON.stringify(record.data, null, 2)}
                        </pre>
                        {record.createdAt && (
                          <p className="text-[10px] text-muted-foreground/50 mt-1.5">
                            {new Date(record.createdAt).toLocaleString('nl-NL')}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(record)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteId(record.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialogMode === 'add' ? 'Record toevoegen' : 'Record bewerken'}</DialogTitle>
            <DialogDescription>
              {dialogMode === 'add' ? 'Voer de data in als JSON' : `Record ${editingRecord?.id} bewerken`}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={jsonInput}
            onChange={e => setJsonInput(e.target.value)}
            rows={10}
            className="font-mono text-xs"
            placeholder='{ "key": "value" }'
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuleren</Button>
            <Button onClick={handleSave} disabled={loading}>
              <Save className="h-4 w-4 mr-1" /> {dialogMode === 'add' ? 'Toevoegen' : 'Opslaan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm Dialog */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record verwijderen?</DialogTitle>
            <DialogDescription>
              Weet je zeker dat je dit record wilt verwijderen? Dit kan niet ongedaan worden gemaakt.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Annuleren</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={loading}>
              <Trash2 className="h-4 w-4 mr-1" /> Verwijderen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
