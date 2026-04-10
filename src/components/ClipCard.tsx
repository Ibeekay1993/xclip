import { Download, Play, Clock, Sparkles, Edit3, Type } from "lucide-react";
import { Button } from "./ui/button";

interface ClipCardProps {
  clipNumber: number;
  startTime: string;
  endTime: string;
  duration: string;
  reason: string;
  hookScore?: number;
  thumbnailUrl?: string;
  hasCaptions?: boolean;
  onDownload?: () => void;
  onPreview?: () => void;
  onEdit?: () => void;
  onGenerateCaptions?: () => void;
}

function getScoreColor(score: number) {
  if (score >= 80) return "text-primary border-primary/40 bg-primary/10";
  if (score >= 60) return "text-yellow-400 border-yellow-400/40 bg-yellow-400/10";
  return "text-destructive border-destructive/40 bg-destructive/10";
}

export function ClipCard({
  clipNumber,
  startTime,
  endTime,
  duration,
  reason,
  hookScore,
  thumbnailUrl,
  hasCaptions,
  onDownload,
  onPreview,
  onEdit,
  onGenerateCaptions,
}: ClipCardProps) {
  const score = hookScore ?? 0;

  return (
    <div className="clip-card glass rounded-sm p-4 animate-fade-in">
      <div className="flex gap-4">
        {/* Thumbnail */}
        <div
          className="relative w-28 h-20 rounded-sm overflow-hidden bg-muted flex-shrink-0 cursor-pointer group border border-border"
          onClick={onPreview}
        >
          {thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt={`Clip ${clipNumber}`}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${clipNumber}/320/180`;
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Play className="w-6 h-6 text-muted-foreground" />
            </div>
          )}
          <div className="absolute inset-0 bg-background/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Play className="w-8 h-8 text-primary" />
          </div>
          <div className="absolute bottom-1 right-1 bg-background/80 text-foreground text-[10px] px-1.5 py-0.5 rounded-sm mono border border-border">
            {duration}
          </div>
          {hasCaptions && (
            <div className="absolute top-1 left-1 bg-primary text-primary-foreground text-[10px] px-1 py-0.5 rounded-sm flex items-center gap-0.5">
              <Type className="w-2.5 h-2.5" />
              CC
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h4 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                Clip {clipNumber}
                {score > 0 && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-sm font-bold border mono ${getScoreColor(score)}`}>
                    {score}%
                  </span>
                )}
              </h4>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground mono mt-1">
                <Clock className="w-3 h-3" />
                <span>{startTime} → {endTime}</span>
              </div>
            </div>
          </div>

          {/* Score Bar */}
          {score > 0 && (
            <div className="w-full h-1 rounded-full bg-muted mb-2 overflow-hidden">
              <div
                className="h-full score-gradient rounded-full transition-all duration-700"
                style={{ width: `${score}%` }}
              />
            </div>
          )}

          <div className="flex items-start gap-2 mb-3 p-2 rounded-sm bg-muted/50 border border-border/50">
            <Sparkles className="w-3 h-3 text-primary mt-0.5 flex-shrink-0" />
            <p className="text-[10px] text-muted-foreground line-clamp-2 uppercase tracking-wide">{reason}</p>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" className="h-7 text-[10px]" onClick={onPreview}>
              <Play className="w-3 h-3 mr-1" />
              Preview
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-[10px]" onClick={onEdit}>
              <Edit3 className="w-3 h-3 mr-1" />
              Edit
            </Button>
            {!hasCaptions && onGenerateCaptions && (
              <Button variant="outline" size="sm" className="h-7 text-[10px]" onClick={onGenerateCaptions}>
                <Type className="w-3 h-3 mr-1" />
                Captions
              </Button>
            )}
            <Button variant="gradient" size="sm" className="h-7 text-[10px]" onClick={onDownload}>
              <Download className="w-3 h-3 mr-1" />
              Export
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
