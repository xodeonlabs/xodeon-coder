import { useMemo, useState, useRef, useEffect } from 'react';
import { NGCNode } from '@/lib/ngc-ast';
import { Database, Table, Trash2, Upload, Image as ImageIcon, Copy, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DataPanelProps {
  ast: NGCNode | null;
  appId?: string;
}

interface ExtractedList {
  name: string;
  items: string[];
}

interface ExtractedVar {
  name: string;
  value: string;
}

interface DataOperation {
  type: 'Add' | 'Delete' | 'Clear' | 'Get';
  table: string;
  details?: string;
}

interface UploadedImage {
  name: string;
  url: string;
}

function extractDataFromAST(node: NGCNode, vars: ExtractedVar[], lists: ExtractedList[], operations: DataOperation[]) {
  if (node.type === 'Var') {
    const raw = node.name;
    if (raw.startsWith('Data.')) {
      const addMatch = raw.match(/^Data\.Add\((\w+)\s*,/);
      if (addMatch) {
        operations.push({ type: 'Add', table: addMatch[1], details: raw });
      }
      const getMatch = raw.match(/^Data\.Get\((\w+)\)/);
      if (getMatch) {
        const tableName = getMatch[1];
        operations.push({ type: 'Get', table: tableName, details: raw });
        lists.push({ name: tableName, items: [] });
      }
      const delMatch = raw.match(/^Data\.Delete\((\w+)\s*,/);
      if (delMatch) {
        operations.push({ type: 'Delete', table: delMatch[1], details: raw });
      }
      const clearMatch = raw.match(/^Data\.Clear\((\w+)\)/);
      if (clearMatch) {
        operations.push({ type: 'Clear', table: clearMatch[1], details: raw });
      }
      return;
    }
    if (raw.includes('(') && raw.includes(')')) {
      const inner = raw.match(/\(([^)]+)\)/)?.[1] || '';
      if (inner.includes('=')) {
        const eqIdx = inner.indexOf('=');
        vars.push({ name: inner.substring(0, eqIdx), value: inner.substring(eqIdx + 1).replace(/^"|"$/g, '') });
      } else {
        vars.push({ name: inner, value: '' });
      }
    } else {
      const varName = raw;
      const val = Object.values(node.properties)[0] || '';
      vars.push({ name: varName, value: val.replace(/^"|"$/g, '') });
    }
  }
  if (node.type === 'List') {
    const raw = node.name;
    let parsedItems: string[] = [];
    let listName = raw;

    if (raw.includes('(') && raw.includes(')')) {
      const inner = raw.match(/\(([^)]+)\)/)?.[1] || '';
      if (inner.includes('=')) {
        const eqIdx = inner.indexOf('=');
        const name = inner.substring(0, eqIdx);
        const itemsStr = inner.substring(eqIdx + 1).replace(/^"|"$/g, '');
        listName = name;
        parsedItems = itemsStr ? itemsStr.split(',').map(s => s.trim()) : [];
      } else {
        listName = inner;
      }
    } else {
      const val = Object.values(node.properties)[0] || '';
      parsedItems = val ? val.replace(/^"|"$/g, '').split(',').map(s => s.trim()) : [];
    }

    lists.push({ name: listName, items: parsedItems });

    parsedItems.forEach(item => {
      const varMatch = item.match(/Var\(([^)=]+)(=([^)]*))?\)/);
      if (varMatch) {
        const varName = varMatch[1];
        const varValue = varMatch[3] || '';
        vars.push({ name: varName, value: varValue.replace(/^"|"$/g, '') });
      }
    });
  }
  for (const child of node.children) {
    extractDataFromAST(child, vars, lists, operations);
  }
}

function ImageUploadSection({ appId }: { appId: string }) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  // Load existing images for this app
  useEffect(() => {
    loadImages();
  }, [appId]);

  async function loadImages() {
    const { data, error } = await supabase.storage.from('app-images').list(appId, { limit: 100 });
    if (error || !data) return;
    const imgs: UploadedImage[] = data
      .filter(f => f.name && /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(f.name))
      .map(f => {
        const { data: urlData } = supabase.storage.from('app-images').getPublicUrl(`${appId}/${f.name}`);
        return { name: f.name, url: urlData.publicUrl };
      });
    setImages(imgs);
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'Te groot', description: 'Maximaal 5MB', variant: 'destructive' });
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
      const uniqueName = `img_${Date.now()}.${ext}`;
      const path = `${appId}/${uniqueName}`;

      const { error, data } = await supabase.storage.from('app-images').upload(path, file, { 
        upsert: true,
        contentType: file.type,
      });
      if (error) throw error;

      toast({ title: '✅ Afbeelding geüpload!' });
      await loadImages();
    } catch (err: any) {
      console.error('Upload error:', err);
      toast({ title: 'Upload mislukt', description: err?.message || 'Onbekende fout', variant: 'destructive' });
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  }

  function copyUrl(url: string) {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    toast({ title: '📋 URL gekopieerd!', description: 'Plak in de Bron eigenschap van een Image component', duration: 2000 });
    setTimeout(() => setCopiedUrl(null), 2000);
  }

  async function deleteImage(name: string) {
    const { error } = await supabase.storage.from('app-images').remove([`${appId}/${name}`]);
    if (error) {
      toast({ title: 'Verwijderen mislukt', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: '🗑️ Verwijderd' });
    setImages(prev => prev.filter(img => img.name !== name));
  }

  return (
    <div>
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
        🖼️ Afbeeldingen
      </h3>

      {/* Upload button */}
      <button
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="w-full flex items-center justify-center gap-2 px-3 py-2 mb-2 text-xs rounded-md border border-dashed border-border hover:border-primary/50 hover:bg-secondary/30 transition-colors cursor-pointer disabled:opacity-50"
      >
        {uploading ? (
          <div className="animate-spin rounded-full h-3 w-3 border-2 border-muted-foreground/30 border-t-primary" />
        ) : (
          <Upload className="h-3 w-3 text-muted-foreground" />
        )}
        <span className="text-muted-foreground">{uploading ? 'Uploaden...' : 'Afbeelding uploaden'}</span>
      </button>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />

      {/* Image grid */}
      {images.length > 0 ? (
        <div className="grid grid-cols-2 gap-1.5">
          {images.map(img => (
            <div key={img.name} className="group relative rounded-md border border-border overflow-hidden bg-secondary/20 cursor-grab active:cursor-grabbing"
              draggable
              onDragStart={e => {
                e.dataTransfer.setData('ngc/image-url', img.url);
                e.dataTransfer.effectAllowed = 'copy';
              }}
            >
              <img src={img.url} alt={img.name} className="w-full h-16 object-cover pointer-events-none" />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                <button
                  onClick={() => copyUrl(img.url)}
                  className="p-1 rounded bg-primary/80 hover:bg-primary transition-colors"
                  title="Kopieer URL"
                >
                  {copiedUrl === img.url ? <Check className="h-3 w-3 text-primary-foreground" /> : <Copy className="h-3 w-3 text-primary-foreground" />}
                </button>
                <button
                  onClick={() => deleteImage(img.name)}
                  className="p-1 rounded bg-destructive/80 hover:bg-destructive transition-colors"
                  title="Verwijderen"
                >
                  <Trash2 className="h-3 w-3 text-destructive-foreground" />
                </button>
              </div>
              <div className="px-1 py-0.5 text-[9px] text-muted-foreground truncate">{img.name}</div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[10px] text-muted-foreground/60 italic text-center">Geen afbeeldingen geüpload</p>
      )}

      <p className="text-[9px] text-muted-foreground/50 mt-2 text-center">
        💡 Sleep een afbeelding naar een Image component in Ontwerp modus
      </p>
    </div>
  );
}

export function NGCDataPanel({ ast, appId }: DataPanelProps) {
  const { vars, lists, operations } = useMemo(() => {
    const vars: ExtractedVar[] = [];
    const lists: ExtractedList[] = [];
    const operations: DataOperation[] = [];
    if (ast) extractDataFromAST(ast, vars, lists, operations);
    return { vars, lists, operations };
  }, [ast]);

  const hasData = vars.length > 0 || lists.length > 0 || operations.length > 0;

  return (
    <div className="overflow-auto h-full p-2 space-y-4">
      {/* Image upload section */}
      {appId && <ImageUploadSection appId={appId} />}

      {/* Variables */}
      {vars.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
            💾 Variabelen
          </h3>
          <div className="rounded-md border border-border overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: 'hsl(var(--ide-panel-header))' }}>
                  <th className="text-left px-2 py-1.5 text-muted-foreground font-medium">Naam</th>
                  <th className="text-left px-2 py-1.5 text-muted-foreground font-medium">Waarde</th>
                </tr>
              </thead>
              <tbody>
                {vars.map((v, i) => (
                  <tr key={i} className="border-t border-border hover:bg-secondary/50 transition-colors">
                    <td className="px-2 py-1.5 font-mono text-primary">{v.name}</td>
                    <td className="px-2 py-1.5 font-mono text-foreground">{v.value || <span className="text-muted-foreground italic">leeg</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Lists */}
      {lists.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
            📋 Lijsten
          </h3>
          {lists.map((list, i) => (
            <div key={i} className="mb-3">
              <div className="text-xs font-mono text-primary mb-1">{list.name}</div>
              {list.items.length > 0 ? (
                <div className="rounded-md border border-border overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr style={{ background: 'hsl(var(--ide-panel-header))' }}>
                        <th className="text-left px-2 py-1 text-muted-foreground font-medium w-8">#</th>
                        <th className="text-left px-2 py-1 text-muted-foreground font-medium">Waarde</th>
                      </tr>
                    </thead>
                    <tbody>
                      {list.items.map((item, j) => (
                        <tr key={j} className="border-t border-border hover:bg-secondary/50 transition-colors">
                          <td className="px-2 py-1 text-muted-foreground">{j}</td>
                          <td className="px-2 py-1 font-mono text-foreground">{item}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground/60 italic pl-1">Lege lijst</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Data Operations */}
      {operations.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
            ⚡ Data Operaties
          </h3>
          <div className="rounded-md border border-border overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: 'hsl(var(--ide-panel-header))' }}>
                  <th className="text-left px-2 py-1.5 text-muted-foreground font-medium">Type</th>
                  <th className="text-left px-2 py-1.5 text-muted-foreground font-medium">Tabel</th>
                </tr>
              </thead>
              <tbody>
                {operations.map((op, i) => (
                  <tr key={i} className="border-t border-border hover:bg-secondary/50 transition-colors">
                    <td className="px-2 py-1.5 font-mono text-primary">
                      {op.type === 'Get' && 'Ophalen'}
                      {op.type === 'Add' && 'Toevoegen'}
                      {op.type === 'Delete' && 'Verwijderen'}
                      {op.type === 'Clear' && 'Wissen'}
                    </td>
                    <td className="px-2 py-1.5 font-mono text-foreground">{op.table}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!hasData && !appId && (
        <div className="flex h-full items-center justify-center p-4">
          <div className="text-center">
            <Database className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">Geen data gevonden</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Voeg Var() of List() toe aan je code</p>
          </div>
        </div>
      )}
    </div>
  );
}
