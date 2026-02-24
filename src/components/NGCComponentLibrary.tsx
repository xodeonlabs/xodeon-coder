import { useState } from 'react';
import { ChevronRight, ChevronDown, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Snippet {
  label: string;
  code: string;
  description?: string;
}

interface Folder {
  name: string;
  icon: string;
  snippets: Snippet[];
}

const LIBRARY: Folder[] = [
  {
    name: 'Pagina',
    icon: '📄',
    snippets: [
      {
        label: 'Lege pagina',
        description: 'Een nieuwe lege pagina',
        code: '    Page NieuwePagina:\n',
      },
      {
        label: 'Pagina met frame',
        description: 'Pagina met een gecentreerd frame',
        code:
          '    Page NieuwePagina:\n' +
          '        Frame Container:\n' +
          '            Positie="50,50"\n' +
          '            Grootte="300,200"\n' +
          '            Kleur="#1e293b"\n',
      },
    ],
  },
  {
    name: 'Knoppen',
    icon: '🔘',
    snippets: [
      {
        label: 'Knop',
        description: 'Basis knop',
        code:
          '        Button MijnKnop:\n' +
          '            Tekst="Klik"\n' +
          '            Positie="0,0"\n' +
          '            Grootte="120,40"\n' +
          '            Kleur="#3b82f6"\n' +
          '            Hoekradius="6"\n',
      },
      {
        label: 'Knop met navigatie',
        description: 'Knop die naar een andere pagina gaat',
        code:
          '        Button NavKnop:\n' +
          '            Tekst="Ga verder"\n' +
          '            Positie="0,0"\n' +
          '            Grootte="140,40"\n' +
          '            Kleur="#22c55e"\n' +
          '            Hoekradius="6"\n' +
          '            Event Click:\n' +
          '                GaNaar "PaginaNaam"\n',
      },
      {
        label: 'Knop met actie',
        description: 'Knop die een variabele wijzigt',
        code:
          '        Button ActieKnop:\n' +
          '            Tekst="Verhoog"\n' +
          '            Positie="0,0"\n' +
          '            Grootte="120,40"\n' +
          '            Kleur="#f59e0b"\n' +
          '            Hoekradius="6"\n' +
          '            Event Click:\n' +
          '                Var(teller+1)\n',
      },
    ],
  },
  {
    name: 'Tekst',
    icon: '📝',
    snippets: [
      {
        label: 'Tekst label',
        description: 'Eenvoudig tekstveld',
        code:
          '        Text Label:\n' +
          '            Tekst="Hallo wereld"\n' +
          '            Positie="0,0"\n' +
          '            Grootte="200,30"\n' +
          '            Kleur="#ffffff"\n',
      },
      {
        label: 'Titel',
        description: 'Grotere titel tekst',
        code:
          '        Text Titel:\n' +
          '            Tekst="Mijn Titel"\n' +
          '            Positie="0,0"\n' +
          '            Grootte="300,50"\n' +
          '            Kleur="#ffffff"\n',
      },
    ],
  },
  {
    name: 'Invoer',
    icon: '✏️',
    snippets: [
      {
        label: 'Tekstveld',
        description: 'Invoerveld gekoppeld aan een variabele',
        code:
          '        TextBox Invoer:\n' +
          '            Tekst=""\n' +
          '            Positie="0,0"\n' +
          '            Grootte="200,35"\n' +
          '            Placeholder="Type hier..."\n' +
          '            Variabele="mijnVar"\n',
      },
    ],
  },
  {
    name: 'Afbeelding',
    icon: '🖼️',
    snippets: [
      {
        label: 'Afbeelding',
        description: 'Afbeelding met URL bron',
        code:
          '        Image Foto:\n' +
          '            Bron="https://via.placeholder.com/150"\n' +
          '            Positie="0,0"\n' +
          '            Grootte="150,150"\n',
      },
    ],
  },
  {
    name: 'Frames',
    icon: '🔲',
    snippets: [
      {
        label: 'Container',
        description: 'Basis container frame',
        code:
          '        Frame Container:\n' +
          '            Positie="0,0"\n' +
          '            Grootte="300,200"\n' +
          '            Kleur="#1e293b"\n',
      },
      {
        label: 'Kaart',
        description: 'Afgerond kaart-frame',
        code:
          '        Frame Kaart:\n' +
          '            Positie="0,0"\n' +
          '            Grootte="280,160"\n' +
          '            Kleur="#1e293b"\n' +
          '            Hoekradius="12"\n',
      },
    ],
  },
  {
    name: 'Data',
    icon: '💾',
    snippets: [
      {
        label: 'Variabele',
        description: 'Een variabele met standaardwaarde',
        code: '    Var(naam="waarde")\n',
      },
      {
        label: 'Teller variabele',
        description: 'Numerieke variabele voor tellen',
        code: '    Var(teller=0)\n',
      },
      {
        label: 'Lijst',
        description: 'Een lijst met items',
        code: '    List(items="item1,item2,item3")\n',
      },
    ],
  },
  {
    name: 'Sjablonen',
    icon: '📋',
    snippets: [
      {
        label: 'Login pagina',
        description: 'Complete login pagina met invoervelden',
        code:
          '    Var(gebruiker="")\n' +
          '    Var(wachtwoord="")\n' +
          '    Var(ingelogd=0)\n' +
          '    Page Login:\n' +
          '        Frame LoginBox:\n' +
          '            Positie="50,60"\n' +
          '            Grootte="300,250"\n' +
          '            Kleur="#1e293b"\n' +
          '            Hoekradius="12"\n' +
          '            Text Titel:\n' +
          '                Tekst="Inloggen"\n' +
          '                Positie="20,15"\n' +
          '                Grootte="260,35"\n' +
          '                Kleur="#ffffff"\n' +
          '            TextBox UserInput:\n' +
          '                Positie="20,60"\n' +
          '                Grootte="260,35"\n' +
          '                Placeholder="Gebruikersnaam..."\n' +
          '                Variabele="gebruiker"\n' +
          '            TextBox PassInput:\n' +
          '                Positie="20,105"\n' +
          '                Grootte="260,35"\n' +
          '                Placeholder="Wachtwoord..."\n' +
          '                Variabele="wachtwoord"\n' +
          '            Button LoginBtn:\n' +
          '                Tekst="Inloggen"\n' +
          '                Positie="20,155"\n' +
          '                Grootte="260,40"\n' +
          '                Kleur="#3b82f6"\n' +
          '                Hoekradius="6"\n' +
          '                Event Click:\n' +
          '                    Var(ingelogd=1)\n',
      },
      {
        label: 'Welkomstpagina',
        description: 'Eenvoudige welkomstpagina met navigatie',
        code:
          '    Page Welkom:\n' +
          '        Text Welkom:\n' +
          '            Tekst="Welkom bij mijn app!"\n' +
          '            Positie="50,50"\n' +
          '            Grootte="300,40"\n' +
          '            Kleur="#ffffff"\n' +
          '        Button StartBtn:\n' +
          '            Tekst="Begin"\n' +
          '            Positie="50,110"\n' +
          '            Grootte="140,40"\n' +
          '            Kleur="#3b82f6"\n' +
          '            Hoekradius="8"\n' +
          '            Event Click:\n' +
          '                GaNaar "Home"\n',
      },
    ],
  },
];

export function NGCComponentLibrary({ onInsert }: { onInsert: (code: string) => void }) {
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  const toggle = (name: string) => {
    setOpenFolders(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const handleCopy = (snippet: Snippet) => {
    onInsert(snippet.code);
    toast({ title: 'Code ingevoegd', description: snippet.label });
  };

  return (
    <div className="overflow-auto h-full p-1.5 space-y-0.5">
      {LIBRARY.map(folder => {
        const isOpen = openFolders[folder.name] ?? false;
        return (
          <div key={folder.name}>
            <button
              onClick={() => toggle(folder.name)}
              className="flex items-center gap-1.5 w-full px-2 py-1.5 text-xs rounded-sm hover:bg-secondary/60 transition-colors text-left"
            >
              {isOpen ? (
                <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
              ) : (
                <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
              )}
              <span>{folder.icon}</span>
              <span className="font-medium text-foreground">{folder.name}</span>
              <span className="ml-auto text-muted-foreground/60 text-[10px]">{folder.snippets.length}</span>
            </button>
            {isOpen && (
              <div className="ml-4 space-y-0.5 mt-0.5">
                {folder.snippets.map(snippet => (
                  <button
                    key={snippet.label}
                    onClick={() => handleCopy(snippet)}
                    className="flex items-center gap-2 w-full px-2 py-1.5 text-xs rounded-sm hover:bg-primary/10 transition-colors text-left group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-foreground truncate">{snippet.label}</div>
                      {snippet.description && (
                        <div className="text-muted-foreground/60 text-[10px] truncate">{snippet.description}</div>
                      )}
                    </div>
                    <Copy className="h-3 w-3 text-muted-foreground/40 group-hover:text-primary shrink-0 transition-colors" />
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
