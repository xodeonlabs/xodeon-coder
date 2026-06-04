import { XodeonLogo } from "@/components/XodeonLogo";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Sparkles, Code2, Users, Rocket, Zap, Shield, ArrowRight, Eye } from "lucide-react";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export default function Welcome() {
  const { session, loading } = useAuth();
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <span className="text-sm text-muted-foreground">{t("common.loading")}</span>
      </div>
    );
  }

  if (session) return <Navigate to="/" replace />;

  const features = [
    { icon: <Code2 className="h-5 w-5" />, key: "editor" },
    { icon: <Users className="h-5 w-5" />, key: "collab" },
    { icon: <Zap className="h-5 w-5" />, key: "slash" },
    { icon: <Rocket className="h-5 w-5" />, key: "orgs" },
    { icon: <Shield className="h-5 w-5" />, key: "safe" },
    { icon: <Sparkles className="h-5 w-5" />, key: "ai" },
  ] as const;

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute top-1/3 -right-40 h-[500px] w-[500px] rounded-full bg-accent/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-[400px] w-[400px] rounded-full bg-primary/10 blur-3xl" />
      </div>

      <header className="flex items-center justify-between px-6 py-5 sm:px-10">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center">
            <XodeonLogo className="h-full w-full object-contain" />
          </div>
          <span className="text-lg font-bold tracking-tight">Xodeon Coder</span>
        </div>
        <div className="flex items-center gap-2">
          <LanguageSwitcher variant="compact" />
          <Link to="/guest">
            <Button variant="ghost" size="sm" className="hidden sm:inline-flex">
              <Eye className="mr-1.5 h-4 w-4" />
              {t("welcome.guestShort")}
            </Button>
          </Link>
          <Link to="/auth">
            <Button size="sm" className="bg-gradient-to-r from-primary to-accent text-white">
              {t("common.login")}
            </Button>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-20 pt-10 sm:pt-20">
        <div className="flex flex-col items-center text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/60 px-4 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur-md">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            {t("welcome.badge")}
          </div>

          <h1 className="text-4xl font-extrabold leading-tight tracking-tight sm:text-6xl md:text-7xl">
            {t("welcome.titlePart1")}{" "}
            <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
              {t("welcome.titleHighlight")}
            </span>
          </h1>

          <p className="mt-6 max-w-2xl text-base text-muted-foreground sm:text-lg">
            {t("welcome.subtitle")}
          </p>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link to="/auth">
              <Button size="lg" className="bg-gradient-to-r from-primary to-accent text-white shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40">
                {t("welcome.ctaStart")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link to="/guest">
              <Button size="lg" variant="outline">
                <Eye className="mr-2 h-4 w-4" />
                {t("welcome.ctaGuest")}
              </Button>
            </Link>
          </div>

          <p className="mt-4 text-xs text-muted-foreground">{t("welcome.note")}</p>
        </div>

        <div className="mt-24 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <FeatureCard
              key={f.key}
              icon={f.icon}
              title={t(`welcome.features.${f.key}.title`)}
              description={t(`welcome.features.${f.key}.description`)}
            />
          ))}
        </div>

        <div className="mt-24 rounded-2xl border border-border/60 bg-card/60 p-8 text-center backdrop-blur-md sm:p-12">
          <h2 className="text-2xl font-bold sm:text-3xl">{t("welcome.readyTitle")}</h2>
          <p className="mt-3 text-muted-foreground">{t("welcome.readySubtitle")}</p>
          <div className="mt-6 flex justify-center">
            <Link to="/auth">
              <Button size="lg" className="bg-gradient-to-r from-primary to-accent text-white">
                {t("welcome.createAccount")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </main>

      <footer className="border-t border-border/40 px-6 py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Xodeon Labs ·{" "}
        <Link to="/privacy" className="underline hover:text-foreground">{t("welcome.privacy")}</Link>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="group rounded-xl border border-border/60 bg-card/60 p-5 backdrop-blur-md transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10">
      <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 text-primary">
        {icon}
      </div>
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
