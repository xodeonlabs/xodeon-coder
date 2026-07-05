import { useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, Code2, Sparkles, Terminal, Database, Rocket, ArrowRight, Copy, Check, Dumbbell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TryItBlock } from "@/components/TryItBlock";

const SECTIONS = [
  { id: "intro", label: "Intro", icon: BookOpen },
  { id: "basis", label: "Basis syntax", icon: Code2 },
  { id: "vars", label: "Variabelen & Lists", icon: Database },
  { id: "slash", label: "Slash commands", icon: Terminal },
  { id: "ai", label: "AI & Templates", icon: Sparkles },
  { id: "exercises", label: "Oefeningen", icon: Dumbbell },
  { id: "publish", label: "Publiceren", icon: Rocket },
] as const;

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="group relative my-3 rounded-xl border border-border/50 bg-card/60 backdrop-blur-md">
      <button
        onClick={() => {
          navigator.clipboard.writeText(code);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        className="absolute right-2 top-2 rounded-md border border-border/40 bg-background/80 p-1.5 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
        aria-label="Copy"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
      <pre className="overflow-x-auto p-4 text-sm leading-relaxed">
        <code className="font-mono text-foreground/90">{code}</code>
      </pre>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4 py-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-sm font-bold text-white shadow-lg shadow-primary/30">
        {n}
      </div>
      <div className="flex-1">
        <h4 className="font-semibold text-foreground">{title}</h4>
        <div className="mt-1 text-sm text-muted-foreground">{children}</div>
      </div>
    </div>
  );
}

export default function Tutorial() {
  const [active, setActive] = useState<(typeof SECTIONS)[number]["id"]>("intro");

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute top-1/3 -right-40 h-[500px] w-[500px] rounded-full bg-accent/15 blur-3xl" />
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <header className="mb-8">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/60 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur-md">
            <BookOpen className="h-3 w-3" />
            Tutorial · Xodeon Coder
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-5xl">
            Leer{" "}
            <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
              Xodeon coderen
            </span>
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Bouw je eerste app in enkele minuten. Van basis-syntax tot slash commands, variabelen en de AI-assistent.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
          {/* Sidebar */}
          <nav className="lg:sticky lg:top-6 lg:self-start">
            <div className="flex gap-1 overflow-x-auto rounded-xl border border-border/50 bg-card/60 p-1 backdrop-blur-md lg:flex-col lg:overflow-visible">
              {SECTIONS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setActive(s.id);
                    document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                    active === s.id
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-secondary/40 hover:text-foreground"
                  }`}
                >
                  <s.icon className="h-4 w-4" />
                  {s.label}
                </button>
              ))}
            </div>
          </nav>

          {/* Content */}
          <div className="space-y-12">
            {/* Intro */}
            <section id="intro" className="scroll-mt-6">
              <h2 className="text-2xl font-bold">Wat is Xodeon Coder?</h2>
              <p className="mt-3 text-muted-foreground">
                Xodeon Coder is een <strong className="text-foreground">visuele programmeertaal</strong> waarmee je apps
                bouwt door eenvoudige, leesbare code te schrijven. De live-preview toont direct wat je maakt.
              </p>
              <div className="mt-6 rounded-2xl border border-border/50 bg-card/60 p-6 backdrop-blur-md">
                <Step n={1} title="Maak een app">
                  Ga naar het <strong className="text-foreground">Dashboard</strong> en klik op "Nieuwe app".
                </Step>
                <Step n={2} title="Open de editor">
                  Klik op je app om de editor te openen — code links, preview rechts.
                </Step>
                <Step n={3} title="Schrijf of vraag de AI">
                  Typ zelf Xodeon-code, gebruik <code className="rounded bg-secondary/50 px-1.5 py-0.5 text-xs">/</code>-shortcuts, of vraag de AI-assistent.
                </Step>
              </div>
            </section>

            {/* Basis syntax */}
            <section id="basis" className="scroll-mt-6">
              <h2 className="text-2xl font-bold">Basis syntax</h2>
              <p className="mt-3 text-muted-foreground">
                Elke Xodeon app begint met <code className="rounded bg-secondary/50 px-1.5 py-0.5 text-xs">App:</code>, gevolgd door één of meer <code className="rounded bg-secondary/50 px-1.5 py-0.5 text-xs">Page</code>'s. Componenten worden ingesprongen (4 spaties).
              </p>

              <h3 className="mt-6 font-semibold">Minimal app</h3>
              <CodeBlock
                code={`App:
    Page Home:
        Text Hallo:
            Tekst="Hallo wereld!"
            Positie="50,50"
            Grootte="200,30"
            Kleur="#ffffff"`}
              />

              <h3 className="mt-6 font-semibold">Button met klik-event</h3>
              <CodeBlock
                code={`App:
    Page Home:
        Button Klik:
            Tekst="Druk op mij"
            Positie="50,100"
            Grootte="140,40"
            Kleur="#6366f1"
            OnClick:
                Set score = 1`}
              />

              <h3 className="mt-6 font-semibold">Veelgebruikte componenten</h3>
              <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                <li><code className="rounded bg-secondary/50 px-1.5 py-0.5 text-xs">Text</code> — statische of dynamische tekst</li>
                <li><code className="rounded bg-secondary/50 px-1.5 py-0.5 text-xs">Button</code> — klikbare knop met <code>OnClick</code></li>
                <li><code className="rounded bg-secondary/50 px-1.5 py-0.5 text-xs">Input</code> — invoerveld gekoppeld aan een variabele</li>
                <li><code className="rounded bg-secondary/50 px-1.5 py-0.5 text-xs">Image</code> — afbeelding via <code>Bron</code></li>
                <li><code className="rounded bg-secondary/50 px-1.5 py-0.5 text-xs">Frame</code> — container voor andere elementen</li>
              </ul>
            </section>

            {/* Variabelen */}
            <section id="vars" className="scroll-mt-6">
              <h2 className="text-2xl font-bold">Variabelen & Lists</h2>
              <p className="mt-3 text-muted-foreground">
                Sla waarden op met <code className="rounded bg-secondary/50 px-1.5 py-0.5 text-xs">Var()</code> en collecties met <code className="rounded bg-secondary/50 px-1.5 py-0.5 text-xs">List()</code>.
              </p>

              <h3 className="mt-6 font-semibold">Counter voorbeeld — probeer & pas aan</h3>
              <TryItBlock
                initialCode={`App:
    Var score = 0

    Page Home:
        Text Teller:
            Tekst="Score: {score}"
            Positie="50,50"
            Kleur="#ffffff"

        Button Plus:
            Tekst="+1"
            Positie="50,100"
            Kleur="#6366f1"
            OnClick:
                Add score = 1

        Button Reset:
            Tekst="Reset"
            Positie="120,100"
            Kleur="#ef4444"
            OnClick:
                Set score = 0`}
              />

              <h3 className="mt-6 font-semibold">Lists</h3>
              <CodeBlock
                code={`App:
    List taken = []

    Page Home:
        Input NieuweTaak:
            Variabele="huidige"
            Positie="50,50"

        Button Voeg:
            Tekst="Voeg toe"
            Positie="50,100"
            OnClick:
                Add taken = huidige`}
              />

              <p className="mt-3 text-sm text-muted-foreground">
                Operaties: <code>Set</code> (waarde overschrijven), <code>Add</code> (optellen of toevoegen), <code>Sub</code> (aftrekken).
              </p>
            </section>

            {/* Slash */}
            <section id="slash" className="scroll-mt-6">
              <h2 className="text-2xl font-bold">Slash commands</h2>
              <p className="mt-3 text-muted-foreground">
                Typ <code className="rounded bg-secondary/50 px-1.5 py-0.5 text-xs">/</code> in de editor voor snelle shortcuts. De belangrijkste:
              </p>

              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {[
                  { cmd: "/login", desc: "Login frame met velden" },
                  { cmd: "/signup", desc: "Registratie frame" },
                  { cmd: "/navbar", desc: "Navigatiebalk" },
                  { cmd: "/card", desc: "Kaart met titel en tekst" },
                  { cmd: "/counter", desc: "Teller met +/- knoppen" },
                  { cmd: "/page", desc: "Lege pagina" },
                  { cmd: "/nav", desc: "Navigeer naar pagina" },
                  { cmd: "/back", desc: "Ga terug" },
                  { cmd: "/set", desc: "Zet variabele" },
                  { cmd: "/add", desc: "Tel op bij variabele" },
                  { cmd: "/coin+", desc: "Coins toevoegen" },
                  { cmd: "/coin-", desc: "Coins verwijderen" },
                ].map((s) => (
                  <div key={s.cmd} className="flex items-center justify-between rounded-lg border border-border/40 bg-card/40 px-3 py-2 backdrop-blur-sm">
                    <code className="text-sm font-mono text-primary">{s.cmd}</code>
                    <span className="text-xs text-muted-foreground">{s.desc}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* AI */}
            <section id="ai" className="scroll-mt-6">
              <h2 className="text-2xl font-bold">AI-assistent & Templates</h2>
              <p className="mt-3 text-muted-foreground">
                Geen zin om alles zelf te typen? Open het AI-paneel in de editor en beschrijf wat je wilt.
              </p>

              <div className="mt-6 rounded-2xl border border-border/50 bg-card/60 p-6 backdrop-blur-md">
                <Step n={1} title="Open het AI-paneel">
                  Klik rechts op het <Sparkles className="inline h-4 w-4 text-primary" /> icoon.
                </Step>
                <Step n={2} title="Beschrijf je wens">
                  Bijv. "Maak een login-scherm met een groene knop" of "Voeg een teller toe".
                </Step>
                <Step n={3} title="Bekijk & pas toe">
                  De AI stelt code voor. Klik op <strong className="text-foreground">Apply</strong> om over te nemen (kost coins).
                </Step>
              </div>

              <h3 className="mt-6 font-semibold">Community Templates</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Open de <strong className="text-foreground">Bibliotheek</strong> in de editor en kies "🌟 Community" om templates te bekijken die anderen hebben gedeeld. Eén klik plakt de code in je app.
              </p>
              <Link to="/templates">
                <Button variant="outline" className="mt-4">
                  Bekijk templates
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </section>

            {/* Exercises */}
            <section id="exercises" className="scroll-mt-6">
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold">Interactieve oefeningen</h2>
                <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">LIVE</span>
              </div>
              <p className="mt-3 text-muted-foreground">
                Pas de code aan en druk op <strong className="text-foreground">Run</strong> om je app direct te testen.
              </p>

              <h3 className="mt-6 font-semibold">Oefening 1 — Zeg hallo</h3>
              <p className="mt-1 text-sm text-muted-foreground">Verander de tekst naar je eigen naam en pas de kleur aan.</p>
              <TryItBlock
                initialCode={`App:
    Page Home:
        Text Hallo:
            Tekst="Hallo wereld!"
            Positie="50,50"
            Grootte="300,40"
            Kleur="#22d3ee"`}
              />

              <h3 className="mt-6 font-semibold">Oefening 2 — Twee knoppen</h3>
              <p className="mt-1 text-sm text-muted-foreground">Voeg een derde knop toe die score met 5 verhoogt.</p>
              <TryItBlock
                initialCode={`App:
    Var score = 0

    Page Home:
        Text T:
            Tekst="Score: {score}"
            Positie="50,40"
            Kleur="#ffffff"

        Button Plus:
            Tekst="+1"
            Positie="50,90"
            Kleur="#10b981"
            OnClick:
                Add score = 1

        Button Min:
            Tekst="-1"
            Positie="120,90"
            Kleur="#ef4444"
            OnClick:
                Sub score = 1`}
              />

              <h3 className="mt-6 font-semibold">Oefening 3 — Input echo</h3>
              <p className="mt-1 text-sm text-muted-foreground">Typ in het invoerveld en klik de knop.</p>
              <TryItBlock
                initialCode={`App:
    Var naam = ""

    Page Home:
        TextBox In:
            Placeholder="Jouw naam"
            Positie="50,50"
            Grootte="200,36"
            Variabele="naam"

        Text Uit:
            Tekst="Hallo {naam}!"
            Positie="50,110"
            Grootte="300,30"
            Kleur="#ffffff"`}
              />
            </section>

            {/* Publish */}
            <section id="publish" className="scroll-mt-6">
              <h2 className="text-2xl font-bold">Publiceren</h2>
              <p className="mt-3 text-muted-foreground">
                Klaar? Deel je app publiek of exporteer als HTML. Kies "Share" of "Export" in de editor-toolbar.
              </p>
              <div className="mt-6 rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 to-accent/10 p-8 text-center backdrop-blur-md">
                <h3 className="text-xl font-bold">Klaar om te bouwen?</h3>
                <p className="mt-2 text-muted-foreground">Ga naar je dashboard en start je eerste app.</p>
                <Link to="/">
                  <Button size="lg" className="mt-4 bg-gradient-to-r from-primary to-accent text-white">
                    Naar Dashboard
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
