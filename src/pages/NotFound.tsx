import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { ArrowLeft, Home } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background relative overflow-hidden px-4">
      {/* Background glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full bg-destructive/5 blur-[120px] pointer-events-none" />

      <div className="text-center relative z-10 animate-scale-in">
        <div className="text-8xl sm:text-9xl font-bold font-display bg-gradient-to-b from-foreground/20 to-foreground/5 bg-clip-text text-transparent select-none mb-4">
          404
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground font-display mb-2">Pagina niet gevonden</h1>
        <p className="text-sm text-muted-foreground mb-8 max-w-sm mx-auto">
          De pagina die je zoekt bestaat niet of is verplaatst.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-muted-foreground bg-secondary/50 border border-border/40 hover:bg-secondary hover:text-foreground transition-all active:scale-[0.98]"
          >
            <ArrowLeft className="h-4 w-4" />
            Terug
          </button>
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-primary-foreground bg-gradient-to-r from-primary to-primary/80 hover:shadow-lg hover:shadow-primary/20 transition-all active:scale-[0.98]"
          >
            <Home className="h-4 w-4" />
            Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;