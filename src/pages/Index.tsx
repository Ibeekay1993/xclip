import { lazy, Suspense } from "react";

const Hero = lazy(() => import("@/components/Hero").then((mod) => ({ default: mod.Hero })));
const ClipGenerator = lazy(() => import("@/components/ClipGenerator").then((mod) => ({ default: mod.ClipGenerator })));

const Index = () => {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="fixed inset-0 cyber-grid pointer-events-none" />
      <div className="fixed inset-0 pointer-events-none scan-line" />

      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/3 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/3 w-[400px] h-[400px] bg-primary/3 rounded-full blur-[100px]" />
      </div>

      <main className="relative z-10 container max-w-7xl mx-auto px-4 py-8">
        <Suspense fallback={<div className="h-48 animate-pulse rounded-sm border border-border/40 bg-muted/20 mb-8" />}>
          <Hero />
        </Suspense>
        <Suspense fallback={<div className="h-[42rem] animate-pulse rounded-sm border border-border/40 bg-muted/20" />}>
          <ClipGenerator />
        </Suspense>

        <div className="mt-20 text-center border-t border-border/30 pt-8">
          <p className="text-[10px] text-muted-foreground uppercase tracking-[0.4em] orbitron">
            X-CLIP AI • Neural Video Intelligence • v2.0
          </p>
        </div>
      </main>
    </div>
  );
};

export default Index;
