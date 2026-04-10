import { X, Download, Smartphone, Monitor, Square, Image } from "lucide-react";
import { Button } from "./ui/button";
import { GlassCard } from "./GlassCard";

interface ExportPresetsProps {
  isOpen: boolean;
  onClose: () => void;
  clips: any[];
  onExport: (preset: string) => void;
}

const presets = [
  {
    id: "9:16",
    name: "Vertical",
    description: "TikTok, Instagram Reels, YouTube Shorts",
    icon: Smartphone,
    resolution: "1080x1920",
    platforms: ["TikTok", "Reels", "Shorts"],
  },
  {
    id: "16:9",
    name: "Horizontal",
    description: "YouTube, Twitch, Kick",
    icon: Monitor,
    resolution: "1920x1080",
    platforms: ["YouTube", "Twitch", "Kick"],
  },
  {
    id: "1:1",
    name: "Square",
    description: "Instagram Feed, Twitter/X",
    icon: Square,
    resolution: "1080x1080",
    platforms: ["Instagram", "Twitter"],
  },
  {
    id: "4:5",
    name: "Portrait",
    description: "Instagram Post, Pinterest",
    icon: Image,
    resolution: "1080x1350",
    platforms: ["Instagram", "Pinterest"],
  },
];

export function ExportPresets({ isOpen, onClose, clips, onExport }: ExportPresetsProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/90 backdrop-blur-md" onClick={onClose} />
      
      <div className="relative z-10 w-full max-w-2xl">
        <GlassCard gradient>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Download className="w-6 h-6 text-primary" />
              <div>
                <h2 className="text-2xl font-bold">Export All Clips</h2>
                <p className="text-sm text-muted-foreground">
                  {clips.length} clip{clips.length !== 1 ? "s" : ""} will be exported
                </p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {presets.map((preset) => {
              const Icon = preset.icon;
              return (
                <button
                  key={preset.id}
                  onClick={() => onExport(preset.id)}
                  className="p-6 rounded-xl border-2 border-border/50 hover:border-primary/50 bg-muted/20 hover:bg-muted/40 transition-all text-left group"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground">{preset.name}</h3>
                      <p className="text-xs text-muted-foreground mt-1">{preset.description}</p>
                      <p className="text-xs font-mono text-primary/70 mt-2">{preset.resolution}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {preset.platforms.map((platform) => (
                          <span
                            key={platform}
                            className="text-xs px-2 py-0.5 rounded-full bg-secondary/20 text-secondary-foreground/70"
                          >
                            {platform}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-6 pt-4 border-t border-border/50">
            <Button variant="outline" className="w-full" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
