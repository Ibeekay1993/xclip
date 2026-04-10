import { useState, useEffect } from "react";
import { X, Scissors, Clock, Type, Image, Wand2, Save, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { Slider } from "./ui/slider";
import { GlassCard } from "./GlassCard";
import { useToast } from "@/hooks/use-toast";

interface Caption {
  start: number;
  end: number;
  text: string;
  emphasis?: boolean;
}

interface ClipEditorProps {
  isOpen: boolean;
  onClose: () => void;
  clipData: {
    id: string;
    clipNumber: number;
    startTime: number;
    endTime: number;
    reason: string;
    transcript?: string;
    captions?: Caption[];
    exportPreset?: string;
  } | null;
  onSave?: (updatedClip: any) => void;
  onGenerateCaptions?: (style: string) => Promise<Caption[]>;
}

const captionStyles = [
  { id: "default", name: "Standard" },
  { id: "viral", name: "Viral" },
  { id: "minimal", name: "Minimal" },
  { id: "storytelling", name: "Story" },
  { id: "meme", name: "Meme" },
];

export function ClipEditor({ isOpen, onClose, clipData, onSave, onGenerateCaptions }: ClipEditorProps) {
  const { toast } = useToast();
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [aspectRatio, setAspectRatio] = useState("9:16");
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState("viral");

  useEffect(() => {
    if (clipData) {
      setStartTime(clipData.startTime);
      setEndTime(clipData.endTime);
      setCaptions(clipData.captions || []);
      setAspectRatio(clipData.exportPreset || "9:16");
    }
  }, [clipData]);

  if (!isOpen || !clipData) return null;

  const duration = endTime - startTime;
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleGenerateCaptions = async () => {
    if (!onGenerateCaptions) return;
    setIsGenerating(true);
    try {
      const newCaptions = await onGenerateCaptions(selectedStyle);
      setCaptions(newCaptions);
      toast({ title: "Captions Generated!", description: `${newCaptions.length} blocks created` });
    } catch {
      toast({ title: "Generation Failed", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = () => {
    onSave?.({ ...clipData, startTime, endTime, captions, aspectRatio });
    toast({ title: "Clip Updated" });
    onClose();
  };

  const updateCaption = (index: number, text: string) => {
    const newCaptions = [...captions];
    newCaptions[index] = { ...newCaptions[index], text };
    setCaptions(newCaptions);
  };

  const deleteCaption = (index: number) => {
    setCaptions(captions.filter((_, i) => i !== index));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/95 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <GlassCard neon>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Scissors className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold orbitron uppercase tracking-wider">Edit Clip {clipData.clipNumber}</h2>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Timeline Editor */}
          <div className="mb-6">
            <h3 className="text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2 orbitron">
              <Clock className="w-4 h-4 text-primary" /> Trim Clip
            </h3>
            <div className="p-4 bg-muted/30 rounded-sm border border-border/50">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Start</label>
                  <p className="mono font-medium text-sm">{formatTime(startTime)}</p>
                </div>
                <div className="text-center">
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Duration</label>
                  <p className="mono font-medium text-sm text-primary">{formatTime(duration)}</p>
                </div>
                <div className="text-right">
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wider">End</label>
                  <p className="mono font-medium text-sm">{formatTime(endTime)}</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block uppercase tracking-wider">Start Time</label>
                  <Slider value={[startTime]} max={clipData.endTime + 30} step={0.5} onValueChange={([value]) => setStartTime(Math.min(value, endTime - 5))} />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block uppercase tracking-wider">End Time</label>
                  <Slider value={[endTime]} max={clipData.endTime + 30} step={0.5} onValueChange={([value]) => setEndTime(Math.max(value, startTime + 5))} />
                </div>
              </div>
            </div>
          </div>

          {/* Aspect Ratio */}
          <div className="mb-6">
            <h3 className="text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2 orbitron">
              <Image className="w-4 h-4 text-primary" /> Export Format
            </h3>
            <div className="grid grid-cols-4 gap-3">
              {[
                { value: "9:16", label: "9:16", desc: "TikTok/Reels" },
                { value: "16:9", label: "16:9", desc: "YouTube" },
                { value: "1:1", label: "1:1", desc: "Instagram" },
                { value: "4:5", label: "4:5", desc: "IG Post" },
              ].map((ratio) => (
                <button
                  key={ratio.value}
                  onClick={() => setAspectRatio(ratio.value)}
                  className={`p-3 rounded-sm border transition-all ${
                    aspectRatio === ratio.value
                      ? "border-primary bg-primary/10 neon-border"
                      : "border-border hover:border-primary/30"
                  }`}
                >
                  <p className="font-bold text-xs mono">{ratio.label}</p>
                  <p className="text-[10px] text-muted-foreground">{ratio.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* AI Captions */}
          <div className="mb-6">
            <h3 className="text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2 orbitron">
              <Type className="w-4 h-4 text-primary" /> Dynamic Captions
            </h3>
            <div className="flex flex-wrap gap-2 mb-4">
              {captionStyles.map((style) => (
                <button
                  key={style.id}
                  onClick={() => setSelectedStyle(style.id)}
                  className={`px-3 py-1 rounded-sm text-[10px] uppercase tracking-widest font-bold transition-all border ${
                    selectedStyle === style.id
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted border-border hover:border-primary/30"
                  }`}
                >
                  {style.name}
                </button>
              ))}
            </div>
            <Button variant="outline" onClick={handleGenerateCaptions} disabled={isGenerating} className="w-full mb-4">
              {isGenerating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating...</> : <><Wand2 className="w-4 h-4 mr-2" />Generate Captions</>}
            </Button>
            {captions.length > 0 && (
              <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
                {captions.map((caption, index) => (
                  <div key={index} className="flex gap-2 items-start p-2 bg-muted/30 rounded-sm border border-border/30">
                    <span className="text-[10px] text-muted-foreground mono min-w-[50px]">{caption.start.toFixed(1)}s</span>
                    <input value={caption.text} onChange={(e) => updateCaption(index, e.target.value)} className="flex-1 bg-transparent text-xs border-none focus:outline-none" />
                    <button onClick={() => deleteCaption(index)} className="text-muted-foreground hover:text-destructive"><X className="w-3 h-3" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {clipData.transcript && (
            <div className="mb-6">
              <h3 className="text-[10px] font-bold uppercase tracking-widest mb-2 text-muted-foreground">Original Transcript</h3>
              <p className="text-xs italic text-muted-foreground p-3 bg-muted/20 rounded-sm border border-border/30">"{clipData.transcript}"</p>
            </div>
          )}

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button variant="gradient" className="flex-1" onClick={handleSave}><Save className="w-4 h-4 mr-2" />Save Changes</Button>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
