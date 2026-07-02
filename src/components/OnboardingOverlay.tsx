import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Sparkles, ArrowRight, X, Code2, Terminal, Database } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "xodeon.onboarding.dismissed.v1";

const STEPS = [
  {
    icon: Sparkles,
    title: "Welkom bij Xodeon Coder",
    body: "Bouw apps met een simpele, leesbare taal — live preview terwijl je typt.",
  },
  {
    icon: Code2,
    title: "Schrijf je eerste component",
    body: "Alles begint met App: → Page → componenten zoals Text, Button, Input. 4 spaties inspringen.",
  },
  {
    icon: Terminal,
    title: "Gebruik slash commands",
    body: "Typ / in de editor voor kant-en-klare blokken: /login, /navbar, /counter, /nav …",
  },
  {
    icon: Database,
    title: "Variabelen & AI",
    body: "Sla data op met Var() en List(). Vraag de AI-assistent voor snelle wijzigingen.",
  },
] as const;

export function OnboardingOverlay() {
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(STORAGE_KEY)) return;
    // Skip on auth-adjacent routes
    if (["/auth", "/welcome", "/reset-password", "/privacy"].some((p) => location.pathname.startsWith(p))) return;
    const t = setTimeout(() => setOpen(true), 800);
    return () => clearTimeout(t);
  }, [location.pathname]);

  if (!open) return null;

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setOpen(false);
  };

  const current = STEPS[step];
  const Icon = current.icon;
  const isLast = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl border border-border/60 bg-card/95 p-6 shadow-2xl backdrop-blur-md">
        <button
          onClick={dismiss}
          className="absolute right-3 top-3 rounded-lg p-1.5 text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
          aria-label="Sluiten"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 text-primary">
          <Icon className="h-5 w-5" />
        </div>

        <h2 className="text-xl font-bold text-foreground">{current.title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{current.body}</p>

        <div className="mt-5 flex items-center gap-1.5">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === step ? "w-6 bg-primary" : "w-1.5 bg-border"
              }`}
            />
          ))}
        </div>

        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            onClick={dismiss}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Overslaan
          </button>
          <div className="flex gap-2">
            {!isLast ? (
              <Button size="sm" onClick={() => setStep((s) => s + 1)} className="bg-gradient-to-r from-primary to-accent text-white">
                Volgende
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            ) : (
              <>
                <Button size="sm" variant="outline" onClick={dismiss}>
                  Later
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    dismiss();
                    navigate("/tutorial");
                  }}
                  className="bg-gradient-to-r from-primary to-accent text-white"
                >
                  Open tutorial
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
