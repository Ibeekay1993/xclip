import { useState, useEffect, type CSSProperties } from "react";
import { Play, Pause, Volume2, VolumeX, Maximize, X, Edit3, Download, Type, ExternalLink } from "lucide-react";
import { Button } from "./ui/button";
import { Slider } from "./ui/slider";
import { GlassCard } from "./GlassCard";

interface Caption {
  start: number;
  end: number;
  text: string;
  emphasis?: boolean;
}

interface VideoPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  videoUrl?: string;
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
  onEdit?: () => void;
  onDownload?: () => void;
}

export function VideoPreview({ isOpen, onClose, videoUrl, clipData, onEdit, onDownload }: VideoPreviewProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [showCaptions, setShowCaptions] = useState(true);
  const [embedMode, setEmbedMode] = useState<"fit" | "fill">("fill");

  useEffect(() => {
    if (clipData) {
      setCurrentTime(0);
      setIsPlaying(false);
    }
  }, [clipData]);

  // Guard: must be after hooks
  if (!isOpen || !clipData) return null;

  const duration = clipData.endTime - clipData.startTime;
  const exportPreset = clipData.exportPreset || "9:16";
  const [wRaw, hRaw] = exportPreset.split(":");
  const w = Number(wRaw);
  const h = Number(hRaw);
  const targetRatio = Number.isFinite(w) && Number.isFinite(h) && h > 0 ? w / h : 9 / 16;
  const aspectStyle: CSSProperties = {
    aspectRatio: Number.isFinite(w) && Number.isFinite(h) && h > 0 ? `${w} / ${h}` : "9 / 16",
  };
  const sourceRatio = 16 / 9;
  const embedScale = embedMode === "fill" ? Math.max(targetRatio / sourceRatio, sourceRatio / targetRatio) : 1;

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getCurrentCaption = (): Caption | null => {
    if (!clipData.captions || !showCaptions) return null;
    return clipData.captions.find((c) => currentTime >= c.start && currentTime <= c.end) || null;
  };

  const currentCaption = getCurrentCaption();

  // YouTube embed URL
  const getEmbedUrl = (url: string): string | null => {
    if (!url) return null;
    try {
      const urlObj = new URL(url);
      if (urlObj.hostname.includes("youtube.com")) {
        const videoId = urlObj.searchParams.get("v");
        if (videoId) return `https://www.youtube.com/embed/${videoId}?start=${Math.floor(clipData.startTime)}&end=${Math.floor(clipData.endTime)}&autoplay=0`;
      }
      if (urlObj.hostname.includes("youtu.be")) {
        const videoId = urlObj.pathname.slice(1);
        return `https://www.youtube.com/embed/${videoId}?start=${Math.floor(clipData.startTime)}&end=${Math.floor(clipData.endTime)}&autoplay=0`;
      }
    } catch { return null; }
    return null;
  };

  const embedUrl = videoUrl ? getEmbedUrl(videoUrl) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/95 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-4xl">
        <GlassCard className="overflow-hidden border-primary/20" neon>
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold orbitron uppercase tracking-wider">
                Clip {clipData.clipNumber} <span className="text-primary">Preview</span>
              </h3>
              <p className="text-xs text-muted-foreground mono">
                {formatTime(clipData.startTime)} → {formatTime(clipData.endTime)} ({formatTime(duration)})
              </p>
            </div>
            <div className="flex items-center gap-2">
              {clipData.captions?.length ? (
                <Button variant={showCaptions ? "default" : "ghost"} size="sm" onClick={() => setShowCaptions(!showCaptions)}>
                  <Type className="w-3 h-3 mr-1" /> CC
                </Button>
              ) : null}
              {embedUrl && (
                <Button variant="ghost" size="sm" onClick={() => setEmbedMode((m) => (m === "fill" ? "fit" : "fill"))}>
                  <Maximize className="w-3 h-3 mr-1" /> {embedMode === "fill" ? "Fill" : "Fit"}
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Video Player Area */}
          <div
            className={`relative mx-auto w-full ${targetRatio < 1 ? "max-w-md" : "max-w-4xl"} max-h-[60vh] bg-muted/30 rounded-sm overflow-hidden mb-4 border border-border`}
            style={aspectStyle}
          >
            {embedUrl ? (
              <div className="absolute inset-0 overflow-hidden">
                <iframe
                  src={embedUrl}
                  className="absolute inset-0 w-full h-full"
                  style={{
                    transform: embedMode === "fill" ? `scale(${embedScale})` : undefined,
                    transformOrigin: "center",
                  }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
                <div
                  className="w-16 h-16 rounded-sm border border-primary/50 bg-primary/10 flex items-center justify-center mb-4 cursor-pointer hover:bg-primary/20 transition-colors"
                  onClick={() => setIsPlaying(!isPlaying)}
                >
                  {isPlaying ? (
                    <Pause className="w-8 h-8 text-primary" />
                  ) : (
                    <Play className="w-8 h-8 text-primary ml-1" />
                  )}
                </div>
                <p className="text-sm font-medium orbitron uppercase tracking-wider">Clip Preview</p>
                <p className="text-xs text-center max-w-xs mt-2 text-muted-foreground">
                  Simulated playback • Click play to preview timing
                </p>
                {videoUrl && (
                  <a
                    href={videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 text-primary hover:underline flex items-center gap-1 text-xs uppercase tracking-wider"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Open Source Video
                  </a>
                )}
              </div>
            )}

            {/* Caption Overlay */}
            {currentCaption && (
              <div className="absolute bottom-16 left-0 right-0 flex justify-center px-4">
                <div className={`px-4 py-2 rounded-sm ${
                  currentCaption.emphasis
                    ? "bg-primary text-primary-foreground font-bold"
                    : "bg-background/80 text-foreground border border-border"
                }`}>
                  <p className="text-center text-sm uppercase tracking-wide">{currentCaption.text}</p>
                </div>
              </div>
            )}

            {/* Overlay Controls (non-embed) */}
            {!embedUrl && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background/90 to-transparent p-4">
                <Slider
                  value={[currentTime]}
                  max={duration}
                  step={0.1}
                  className="mb-3"
                  onValueChange={([value]) => setCurrentTime(value)}
                />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => setIsPlaying(!isPlaying)}>
                      {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setIsMuted(!isMuted)}>
                      {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </Button>
                    <span className="text-xs text-muted-foreground mono">
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Clip Info */}
          <div className="p-4 bg-muted/30 rounded-sm mb-4 border border-border/50">
            <h4 className="text-xs font-bold uppercase tracking-wider mb-2 orbitron">Why This Clip?</h4>
            <p className="text-xs text-muted-foreground">{clipData.reason}</p>
            {clipData.transcript && (
              <div className="mt-3 pt-3 border-t border-border/30">
                <h5 className="text-[10px] font-bold uppercase tracking-wider mb-1 orbitron">Transcript</h5>
                <p className="text-xs text-muted-foreground italic">"{clipData.transcript}"</p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={onEdit}>
              <Edit3 className="w-4 h-4 mr-2" />
              Edit Clip
            </Button>
            <Button variant="gradient" className="flex-1" onClick={onDownload}>
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
