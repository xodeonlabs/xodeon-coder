import { useState, useEffect, useCallback } from 'react';
import { ChevronRight, ChevronDown, Copy, Share2, Star } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';


interface Snippet {
  label: string;
  code: string;
  description?: string;
}

// Template type – the dedicated `templates` table may not exist yet so we
// define the shape manually rather than deriving from Database types.
export type Template = {
  id: string;
  name: string;
  description: string;
  ngc_code: string;
  creator_id: string;
  downloads: number;
  rating: number;
  created_at: string;
  is_public?: boolean;
  is_fallback?: boolean;
};

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
    icon: '📦',
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
      {
        label: 'Data toevoegen',
        description: 'Voeg een record toe aan een tabel',
        code: '                Data.Add(gebruikers, naam="Jan", leeftijd="25")\n',
      },
      {
        label: 'Data ophalen',
        description: 'Converteer tabel records naar een lijst',
        code: '                Data.Get(gebruikers)\n',
      },
      {
        label: 'Data verwijderen',
        description: 'Verwijder een record uit een tabel',
        code: '                Data.Delete(gebruikers, "rec_123456")\n',
      },
      {
        label: 'Data wissen',
        description: 'Wis alle records uit een tabel',
        code: '                Data.Clear(gebruikers)\n',
      },
    ],
  },
  {
    name: 'Coins',
    icon: '🪙',
    snippets: [
      {
        label: 'Coins instellen',
        description: 'Stel een coins-saldo in met startwaarde',
        code: '    Coins(munten)=100\n',
      },
      {
        label: 'Coins toevoegen',
        description: 'Voeg coins toe bij een event',
        code: '                Coins.Add(munten, 10)\n',
      },
      {
        label: 'Coins verwijderen',
        description: 'Trek coins af bij een event',
        code: '                Coins.Remove(munten, 5)\n',
      },
      {
        label: 'Betaalcode registreren',
        description: 'Registreer een inwisselbare code (bv. BUY100)',
        code: '    Coins.Code(munten, "BUY100", 100)\n',
      },
      {
        label: 'Code inwisselen',
        description: 'Wissel code in uit een variabele',
        code: '                Coins.Redeem(munten, codeInvoer)\n',
      },
      {
        label: 'Coins weergeven',
        description: 'Toon het huidige saldo',
        code:
          '        Text Saldo:\n' +
          '            Tekst="Saldo: Coins(munten)"\n' +
          '            Positie="10,10"\n' +
          '            Grootte="200,30"\n' +
          '            Kleur="#fbbf24"\n',
      },
      {
        label: 'Coins winkel (compleet)',
        description: 'Compleet voorbeeld met saldo, kopen en code inwisselen',
        code:
          '    Coins(munten)=50\n' +
          '    Coins.Code(munten, "GRATIS100", 100)\n' +
          '    Coins.Code(munten, "BONUS50", 50)\n' +
          '    Var(betaalcode)=""\n' +
          '    Page Winkel:\n' +
          '        Text SaldoLabel:\n' +
          '            Tekst="🪙 Saldo: Coins(munten)"\n' +
          '            Positie="20,20"\n' +
          '            Grootte="250,30"\n' +
          '            Kleur="#fbbf24"\n' +
          '        Button Koop:\n' +
          '            Tekst="Koop item (-10 🪙)"\n' +
          '            Positie="20,70"\n' +
          '            Grootte="200,40"\n' +
          '            Kleur="#3b82f6"\n' +
          '            Hoekradius="8"\n' +
          '            Event Click:\n' +
          '                Coins.Remove(munten, 10)\n' +
          '        Button Verdien:\n' +
          '            Tekst="Verdien +5 🪙"\n' +
          '            Positie="20,125"\n' +
          '            Grootte="200,40"\n' +
          '            Kleur="#22c55e"\n' +
          '            Hoekradius="8"\n' +
          '            Event Click:\n' +
          '                Coins.Add(munten, 5)\n' +
          '        TextBox CodeInput:\n' +
          '            Positie="20,185"\n' +
          '            Grootte="200,35"\n' +
          '            Placeholder="Voer code in..."\n' +
          '            Variabele="betaalcode"\n' +
          '        Button WisselIn:\n' +
          '            Tekst="Code inwisselen"\n' +
          '            Positie="20,235"\n' +
          '            Grootte="200,40"\n' +
          '            Kleur="#f59e0b"\n' +
          '            Hoekradius="8"\n' +
          '            Event Click:\n' +
          '                Coins.Redeem(munten, betaalcode)\n',
      },
    ],
  },
  {
    name: 'Besturing',
    icon: '🔀',
    snippets: [
      {
        label: 'If-statement',
        description: 'Voer code uit als voorwaarde waar is',
        code:
          'If(voorwaarde):\n' +
          '    Text Result:\n' +
          '        Tekst="Waar"\n' +
          '        Positie="0,0"\n' +
          '        Grootte="100,30"\n' +
          '        Kleur="#22c55e"\n',
      },
      {
        label: 'If-Else-statement',
        description: 'Kijk twee voorwaarden uit',
        code:
          'If(voorwaarde):\n' +
          '    Text Waar:\n' +
          '        Tekst="Waar"\n' +
          '        Positie="0,0"\n' +
          '        Grootte="100,30"\n' +
          '        Kleur="#22c55e"\n' +
          'Else:\n' +
          '    Text Onwaar:\n' +
          '        Tekst="Onwaar"\n' +
          '        Positie="0,0"\n' +
          '        Grootte="100,30"\n' +
          '        Kleur="#ef4444"\n',
      },
      {
        label: 'Repeat-loop',
        description: 'Herhaal een blok X keer',
        code:
          'Repeat(5):\n' +
          '    Button Item:\n' +
          '        Tekst="Klik mij"\n' +
          '        Positie="0,0"\n' +
          '        Grootte="100,40"\n' +
          '        Kleur="#3b82f6"\n',
      },
      {
        label: 'While-loop',
        description: 'Herhaal zolang voorwaarde waar is',
        code:
          'While(teller<10):\n' +
          '    Text Counter:\n' +
          '        Tekst="Teller"\n' +
          '        Positie="0,0"\n' +
          '        Grootte="100,30"\n' +
          '        Kleur="#3b82f6"\n',
      },
    ],
  },
  {
    name: 'Sjablonen',
    icon: '⭐',
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
      {
        label: 'Teller app',
        description: 'Eenvoudige teller met plus/min knoppen',
        code:
          '    Var(teller=0)\n' +
          '    Page Teller:\n' +
          '        Frame Container:\n' +
          '            Positie="50,80"\n' +
          '            Grootte="300,180"\n' +
          '            Kleur="#1e293b"\n' +
          '            Hoekradius="12"\n' +
          '            Text Titel:\n' +
          '                Tekst="Mijn Teller"\n' +
          '                Positie="10,10"\n' +
          '                Grootte="280,30"\n' +
          '                Kleur="#ffffff"\n' +
          '            Text Display:\n' +
          '                Tekst="0"\n' +
          '                Positie="100,55"\n' +
          '                Grootte="100,40"\n' +
          '                Kleur="#22c55e"\n' +
          '            Button PlusBtn:\n' +
          '                Tekst="+"\n' +
          '                Positie="20,110"\n' +
          '                Grootte="60,40"\n' +
          '                Kleur="#22c55e"\n' +
          '                Hoekradius="6"\n' +
          '                Event Click:\n' +
          '                    Var(teller+1)\n' +
          '            Button MinBtn:\n' +
          '                Tekst="-"\n' +
          '                Positie="100,110"\n' +
          '                Grootte="60,40"\n' +
          '                Kleur="#ef4444"\n' +
          '                Hoekradius="6"\n' +
          '                Event Click:\n' +
          '                    Var(teller-1)\n' +
          '            Button ResetBtn:\n' +
          '                Tekst="Reset"\n' +
          '                Positie="180,110"\n' +
          '                Grootte="100,40"\n' +
          '                Kleur="#f59e0b"\n' +
          '                Hoekradius="6"\n' +
          '                Event Click:\n' +
          '                    Var(teller=0)\n',
      },
      {
        label: 'Todo lijstje',
        description: 'Basis todo app met toevoegen & verwijderen',
        code:
          '    Var(nieuweItem="")\n' +
          '    List(items="Boodschappen,Huiswerk,Sporten")\n' +
          '    Page Todo:\n' +
          '        Text Titel:\n' +
          '            Tekst="Mijn Todo Lijstje"\n' +
          '            Positie="20,20"\n' +
          '            Grootte="300,30"\n' +
          '            Kleur="#ffffff"\n' +
          '        TextBox NewItem:\n' +
          '            Positie="20,65"\n' +
          '            Grootte="240,35"\n' +
          '            Placeholder="Nieuwe item..."\n' +
          '            Variabele="nieuweItem"\n' +
          '        Button AddBtn:\n' +
          '            Tekst="Toevoegen"\n' +
          '            Positie="265,65"\n' +
          '            Grootte="75,35"\n' +
          '            Kleur="#22c55e"\n' +
          '            Hoekradius="4"\n' +
          '            Event Click:\n' +
          '                Data.Add(todos, taak=Var(nieuweItem))\n',
      },
      {
        label: 'Quiz app',
        description: 'Eenvoudige quiz met score tracking',
        code:
          '    Var(score=0)\n' +
          '    Var(vraagNummer=1)\n' +
          '    Page Quiz:\n' +
          '        Text Titel:\n' +
          '            Tekst="Quiz"\n' +
          '            Positie="50,20"\n' +
          '            Grootte="300,30"\n' +
          '            Kleur="#ffffff"\n' +
          '        Text Vraag:\n' +
          '            Tekst="Wat is de hoofdstad van Nederland?"\n' +
          '            Positie="30,70"\n' +
          '            Grootte="340,40"\n' +
          '            Kleur="#e0e0e0"\n' +
          '        Button Antwoord1:\n' +
          '            Tekst="Amsterdam"\n' +
          '            Positie="30,130"\n' +
          '            Grootte="140,40"\n' +
          '            Kleur="#3b82f6"\n' +
          '            Hoekradius="6"\n' +
          '            Event Click:\n' +
          '                Var(score+1)\n' +
          '        Button Antwoord2:\n' +
          '            Tekst="Rotterdam"\n' +
          '            Positie="180,130"\n' +
          '            Grootte="140,40"\n' +
          '            Kleur="#3b82f6"\n' +
          '            Hoekradius="6"\n' +
          '        Text ScoreLbl:\n' +
          '            Tekst="Score: 0"\n' +
          '            Positie="30,190"\n' +
          '            Grootte="100,30"\n' +
          '            Kleur="#22c55e"\n',
      },
      {
        label: 'Formulier',
        description: 'Contact formulier met meerdere velden',
        code:
          '    Var(naam="")\n' +
          '    Var(email="")\n' +
          '    Var(bericht="")\n' +
          '    Page Contact:\n' +
          '        Frame FormBox:\n' +
          '            Positie="30,30"\n' +
          '            Grootte="340,300"\n' +
          '            Kleur="#1e293b"\n' +
          '            Hoekradius="12"\n' +
          '            Text Titel:\n' +
          '                Tekst="Contact Formulier"\n' +
          '                Positie="15,15"\n' +
          '                Grootte="310,25"\n' +
          '                Kleur="#ffffff"\n' +
          '            TextBox NaamInput:\n' +
          '                Positie="15,50"\n' +
          '                Grootte="310,35"\n' +
          '                Placeholder="Uw naam"\n' +
          '                Variabele="naam"\n' +
          '            TextBox EmailInput:\n' +
          '                Positie="15,95"\n' +
          '                Grootte="310,35"\n' +
          '                Placeholder="Uw email"\n' +
          '                Variabele="email"\n' +
          '            TextBox BerichtInput:\n' +
          '                Positie="15,140"\n' +
          '                Grootte="310,100"\n' +
          '                Placeholder="Uw bericht..."\n' +
          '                Variabele="bericht"\n' +
          '            Button VerstuurBtn:\n' +
          '                Tekst="Verstuur"\n' +
          '                Positie="15,250"\n' +
          '                Grootte="310,40"\n' +
          '                Kleur="#3b82f6"\n' +
          '                Hoekradius="6"\n' +
          '                Event Click:\n' +
          '                    Data.Add(berichten, naam=Var(naam), email=Var(email), bericht=Var(bericht))\n',
      },
      {
        label: 'Galerij viewer',
        description: 'Afbeeldingen viewer met navigatie',
        code:
          '    Var(huidigeAfbeelding=0)\n' +
          '    Page Galerij:\n' +
          '        Text Titel:\n' +
          '            Tekst="Foto Galerij"\n' +
          '            Positie="20,20"\n' +
          '            Grootte="360,30"\n' +
          '            Kleur="#ffffff"\n' +
          '        Frame ImageFrame:\n' +
          '            Positie="20,70"\n' +
          '            Grootte="360,240"\n' +
          '            Kleur="#2d3748"\n' +
          '            Hoekradius="8"\n' +
          '            Image Foto:\n' +
          '                Bron="https://via.placeholder.com/360x240"\n' +
          '                Positie="0,0"\n' +
          '                Grootte="360,240"\n' +
          '        Button VorigBtn:\n' +
          '            Tekst="← Vorig"\n' +
          '            Positie="20,330"\n' +
          '            Grootte="170,40"\n' +
          '            Kleur="#3b82f6"\n' +
          '            Hoekradius="6"\n' +
          '            Event Click:\n' +
          '                Var(huidigeAfbeelding-1)\n' +
          '        Button VolgendeBtn:\n' +
          '            Tekst="Volgende →"\n' +
          '            Positie="210,330"\n' +
          '            Grootte="170,40"\n' +
          '            Kleur="#3b82f6"\n' +
          '            Hoekradius="6"\n' +
          '            Event Click:\n' +
          '                Var(huidigeAfbeelding+1)\n',
      },
      {
        label: 'Profiel pagina',
        description: 'Gebruiker profiel met gegevens',
        code:
          '    Var(gebruikernaam="JanDoe")\n' +
          '    Var(email="jan@example.com")\n' +
          '    Var(bio="Ik hou van coderen!")\n' +
          '    Page Profiel:\n' +
          '        Frame ProfielBox:\n' +
          '            Positie="20,20"\n' +
          '            Grootte="360,200"\n' +
          '            Kleur="#1e293b"\n' +
          '            Hoekradius="12"\n' +
          '            Text GebruikerNaam:\n' +
          '                Tekst="JanDoe"\n' +
          '                Positie="20,20"\n' +
          '                Grootte="320,30"\n' +
          '                Kleur="#3b82f6"\n' +
          '            Text EmailLabel:\n' +
          '                Tekst="Email: jan@example.com"\n' +
          '                Positie="20,60"\n' +
          '                Grootte="320,25"\n' +
          '                Kleur="#e0e0e0"\n' +
          '            Text BioLabel:\n' +
          '                Tekst="Bio: Ik hou van coderen!"\n' +
          '                Positie="20,95"\n' +
          '                Grootte="320,70"\n' +
          '                Kleur="#e0e0e0"\n' +
          '        Button BewerkenBtn:\n' +
          '            Tekst="Bewerk Profiel"\n' +
          '            Positie="20,240"\n' +
          '            Grootte="360,40"\n' +
          '            Kleur="#22c55e"\n' +
          '            Hoekradius="6"\n' +
          '            Event Click:\n' +
          '                GaNaar "ProfielEdit"\n',
      },
      {
        label: 'Menu/Navigatie',
        description: 'Navigatie menu met meerdere knoppen',
        code:
          '    Page Home:\n' +
          '        Text Titel:\n' +
          '            Tekst="Home"\n' +
          '            Positie="20,20"\n' +
          '            Grootte="360,40"\n' +
          '            Kleur="#ffffff"\n' +
          '        Button DashboardBtn:\n' +
          '            Tekst="Dashboard"\n' +
          '            Positie="20,80"\n' +
          '            Grootte="360,50"\n' +
          '            Kleur="#3b82f6"\n' +
          '            Hoekradius="8"\n' +
          '            Event Click:\n' +
          '                GaNaar "Dashboard"\n' +
          '        Button ProfielBtn:\n' +
          '            Tekst="Mijn Profiel"\n' +
          '            Positie="20,140"\n' +
          '            Grootte="360,50"\n' +
          '            Kleur="#8b5cf6"\n' +
          '            Hoekradius="8"\n' +
          '            Event Click:\n' +
          '                GaNaar "Profiel"\n' +
          '        Button InstellingenBtn:\n' +
          '            Tekst="Instellingen"\n' +
          '            Positie="20,200"\n' +
          '            Grootte="360,50"\n' +
          '            Kleur="#f59e0b"\n' +
          '            Hoekradius="8"\n' +
          '            Event Click:\n' +
          '                GaNaar "Instellingen"\n',
      },
    ],
  },
];

export function NGCComponentLibrary({ onInsert }: { onInsert: (code: string) => void }) {
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({});
  const [communityTemplates, setCommunityTemplates] = useState<Template[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [activeTab, setActiveTab] = useState<'library' | 'community'>('library');
  const { toast } = useToast();

  // Load community templates from database
  const refreshTemplates = useCallback(async () => {
    try {
      const { data, error } = await (supabase
        .from('templates' as any) as any)
        .select('*')
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) {
        // table might not exist yet
        if (error.code === 'PGRST205' || error.message?.includes('templates')) {
          console.warn('Templates table missing, falling back to public apps');
          const { data: apps, error: appsErr } = await supabase
            .from('apps')
            .select('id,name,ngc_code,owner_id,created_at')
            .eq('is_public', true)
            .order('created_at', { ascending: false })
            .limit(50);
          if (appsErr) {
            console.error('Failed to load apps fallback:', appsErr);
            setCommunityTemplates([]);
          } else {
            const fallback = (apps || []).map(a => ({
              id: a.id,
              name: a.name,
              description: '',
              ngc_code: a.ngc_code,
              creator_id: a.owner_id,
              downloads: 0,
              rating: 0,
              created_at: a.created_at as string,
              is_fallback: true,
            } as Template));
            setCommunityTemplates(fallback);
          }
        } else {
          console.error('Fout bij laden templates:', error);
        }
      } else {
        setCommunityTemplates(data || []);
      }
    } catch (e) {
      console.error('Template loading error:', e);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    
    const loadTemplates = async () => {
      setLoadingTemplates(true);
      await refreshTemplates();
      if (isMounted) {
        setLoadingTemplates(false);
      }
    };
    
    loadTemplates();

    // Subscribe to new templates in real-time
    const subscription = supabase
      .channel('templates-channel')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'templates' },
        async (payload) => {
          if (!isMounted) return;
          console.log('New template detected:', payload);
          setActiveTab('community');
          await refreshTemplates();
          toast({ title: 'Nieuwe template!', description: 'Een nieuwe template is gedeeld.' });
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(subscription);
    };
  }, [refreshTemplates]);

  const toggle = (name: string) => {
    setOpenFolders(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const handleCopy = (snippet: Snippet) => {
    onInsert(snippet.code);
    toast({ title: 'Code ingevoegd', description: snippet.label });
  };

  const handleUseTemplate = (template: Template) => {
    onInsert(template.ngc_code);
    toast({ title: 'Template ingevoegd', description: template.name });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Tab buttons */}
      <div className="flex border-b border-border/30 px-1.5 pt-1.5">
        <button
          onClick={() => setActiveTab('library')}
          className={`flex-1 py-1.5 text-xs font-medium rounded-t-sm transition-colors text-center ${
            activeTab === 'library'
              ? 'bg-secondary/60 text-foreground border-b-2 border-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          📂 Bibliotheek
        </button>
        <button
          onClick={() => setActiveTab('community')}
          className={`flex-1 py-1.5 text-xs font-medium rounded-t-sm transition-colors text-center relative ${
            activeTab === 'community'
              ? 'bg-secondary/60 text-foreground border-b-2 border-accent'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          🌟 Gemeenschap
          {communityTemplates.length > 0 && (
            <span className="absolute top-0.5 right-1 h-2 w-2 rounded-full bg-accent animate-pulse"></span>
          )}
        </button>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto p-1.5">
        {activeTab === 'library' ? (
          // Library tab
          <div className="space-y-0.5">
            {LIBRARY.map(folder => {
              const isOpen = openFolders[folder.name] ?? false;
              const isTemplates = folder.name === 'Sjablonen';
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
        ) : (
          // Community tab
          <div className="space-y-0.5">
            {loadingTemplates ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary/20 border-t-primary mr-2"></div>
                <span className="text-sm">Templates laden...</span>
              </div>
            ) : communityTemplates.length === 0 ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <div className="text-center">
                  <div className="text-2xl mb-2"></div>
                  <p className="text-sm">Geen community templates beschikbaar</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Deel je eerste template!</p>
                </div>
              </div>
            ) : (
              communityTemplates.map(template => (
                <button
                  key={(template as any).id}
                  onClick={() => handleUseTemplate(template)}
                  className="flex items-center gap-2 w-full px-2.5 py-2 text-xs rounded-sm hover:bg-accent/10 transition-colors text-left group bg-secondary/30"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-foreground font-medium truncate">{(template as any).name}</div>
                    <div className="text-muted-foreground/70 text-[10px] truncate mt-0.5">{(template as any).description || 'Geen beschrijving'}</div>
                    <div className="flex items-center gap-2 text-muted-foreground/50 text-[9px] mt-1">
                      <div className="flex items-center gap-1">
                        <Star className="h-2.5 w-2.5" fill="currentColor" />
                        <span>{((template as any).rating as number)?.toFixed(1) || '0'}</span>
                      </div>
                      <span>•</span>
                      <div className="flex items-center gap-1">
                        <span>📥</span>
                        <span>{(template as any).downloads}</span>
                      </div>
                    </div>
                  </div>
                  <Share2 className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-accent shrink-0 transition-colors" />
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
