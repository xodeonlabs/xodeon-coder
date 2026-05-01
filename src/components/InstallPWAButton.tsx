import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface InstallPWAButtonProps {
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  label?: string;
}

/**
 * Install button voor de PWA.
 * - Toont alleen wanneer het `beforeinstallprompt` event beschikbaar is (Chrome/Edge/Android).
 * - Op iOS Safari is geen API beschikbaar; we tonen daar instructies via een toast.
 * - Verbergt zichzelf wanneer de app al geïnstalleerd is (display-mode: standalone).
 */
export function InstallPWAButton({
  variant = "default",
  size = "sm",
  className,
  label = "App installeren",
}: InstallPWAButtonProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Detecteer of de app al draait als geïnstalleerde PWA
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // @ts-expect-error iOS Safari property
      window.navigator.standalone === true;
    setIsStandalone(standalone);

    // iOS detectie (Safari ondersteunt geen beforeinstallprompt)
    const ua = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(ua) && !/crios|fxios/.test(ua));

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const onInstalled = () => {
      setDeferredPrompt(null);
      setIsStandalone(true);
      toast.success("App geïnstalleerd!");
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  // Niet tonen wanneer al geïnstalleerd
  if (isStandalone) return null;

  // Niet tonen als er geen prompt is en het geen iOS is (browser ondersteunt het niet)
  if (!deferredPrompt && !isIOS) return null;

  const handleClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        toast.success("Installatie gestart");
      }
      setDeferredPrompt(null);
      return;
    }

    if (isIOS) {
      toast.info("Tik op het deel-icoon en kies 'Zet op beginscherm'", {
        duration: 6000,
      });
    }
  };

  return (
    <Button onClick={handleClick} variant={variant} size={size} className={className}>
      <Download className="h-4 w-4" />
      {label}
    </Button>
  );
}
