import { Scissors, Zap, Sparkles, Cpu } from "lucide-react";

export function Hero() {
  return (
    <div className="text-center mb-16 pt-8">
      <div className="inline-flex items-center justify-center mb-8">
        <div className="relative">
          <div className="absolute inset-0 bg-primary blur-3xl opacity-20 animate-pulse" />
          <div className="relative w-20 h-20 rounded-sm border border-primary/50 bg-background flex items-center justify-center glow">
            <Scissors className="w-10 h-10 text-primary" />
          </div>
        </div>
      </div>

      <h1 className="orbitron text-5xl md:text-7xl font-black mb-3 tracking-wider">
        <span className="text-primary neon-text">X-CLIP</span>{" "}
        <span className="text-foreground">AI</span>
      </h1>
      <p className="text-sm tracking-[0.3em] uppercase text-muted-foreground mb-8 orbitron">
        Neural Video Processing Platform
      </p>

      <div className="flex items-center justify-center gap-8 text-xs uppercase tracking-widest text-muted-foreground">
        <div className="flex items-center gap-2">
          <Zap className="w-3 h-3 text-primary" />
          <span>AI Hook Detection</span>
        </div>
        <div className="w-1 h-1 rounded-full bg-primary" />
        <div className="flex items-center gap-2">
          <Cpu className="w-3 h-3 text-primary" />
          <span>Viral Scoring</span>
        </div>
        <div className="w-1 h-1 rounded-full bg-primary" />
        <div className="flex items-center gap-2">
          <Sparkles className="w-3 h-3 text-primary" />
          <span>Smart Export</span>
        </div>
      </div>
    </div>
  );
}
