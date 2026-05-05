import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Je bent een NGC code-assistent. NGC is een visuele programmeertaal voor het bouwen van apps.

NGC code structuur:
- App: bevat Pages
- Page <naam>: bevat componenten
- Componenten: Button, Text, TextBox, Image, Frame
- Elk component heeft properties zoals Tekst, Positie, Grootte, Kleur, Achtergrond, etc.
- Coins(<naam>)=<bedrag> voor in-app valuta
- Var(<naam>)=<waarde> voor variabelen
- Events: Click, Hover als child van Button

Voorbeeld NGC code:
\`\`\`
App:
    Coins(geld)=100
    Page Home:
        Text Titel:
            Tekst="Welkom!"
            Positie="50,50"
            Grootte="300,40"
            Kleur="#ffffff"
        Button Start:
            Tekst="Begin"
            Positie="50,120"
            Grootte="150,40"
            Kleur="#ffffff"
            Achtergrond="#3b82f6"
            Event Click:
                Navigeer="Pagina2"
    Page Pagina2:
        Text Info:
            Tekst="Dit is pagina 2"
            Positie="50,50"
            Grootte="300,30"
            Kleur="#ffffff"
\`\`\`

Properties:
- Tekst: de tekst die wordt weergegeven
- Positie: "x,y" positie
- Grootte: "breedte,hoogte"
- Kleur: hex kleurcode voor tekst
- Achtergrond: hex kleurcode voor achtergrond
- Rand: "dikte kleur" bijv. "2 #ffffff"
- Hoekrond: afronding in px
- Lettergrootte: grootte in px
- Icoon: lucide icon naam bijv. "heart", "star", "save"
- Zichtbaar: true/false
- Placeholder: placeholder tekst voor TextBox
- Bron: URL voor Image component

Slash-commands (snelkoppelingen binnen Event blokken zoals Click, Hover, Start, Changed):
- /nav "PageName"  → navigeer naar pagina (alias: /goto, /page)
- /login           → ga naar pagina "login"
- /home            → ga naar pagina "home"
- /back            → ga naar vorige pagina
- /set varname=waarde
- /add varname 5   (ook /sub, /mul, /div)
- /coin+ wallet 10 (ook /coin- wallet 5)

Voorbeeld: een knop met /nav-snelkoppeling
\`\`\`
Button Inloggen:
    Tekst="Inloggen"
    Positie="50,200"
    Grootte="200,40"
    Event Click:
        /nav "Home"
\`\`\`

Regels:
1. Geef ALTIJD de VOLLEDIGE aangepaste NGC code terug, niet alleen het gewijzigde deel.
2. Wrap de code in een \`\`\`ngc code block.
3. Behoud alle bestaande functionaliteit tenzij de gebruiker vraagt om het te veranderen.
4. Geef een korte uitleg VOOR de code over wat je hebt aangepast.
5. Alle teksten in het Nederlands tenzij anders gevraagd.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { currentCode, userMessage, history } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: `Hier is de huidige NGC code van mijn app:\n\`\`\`ngc\n${currentCode}\n\`\`\`` },
      ...(history || []),
      { role: "user", content: userMessage },
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages,
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Te veel verzoeken, probeer het later opnieuw." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Onvoldoende tegoed. Voeg credits toe in je werkruimte-instellingen." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service fout" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ngc-ai-assist error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Onbekende fout" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
