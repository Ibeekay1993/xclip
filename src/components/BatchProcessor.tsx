import { useState } from "react";
import { X, Layers, Plus, Trash2, Play } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { GlassCard } from "./GlassCard";

interface BatchProcessorProps {
  isOpen: boolean;
  onClose: () => void;
  onProcess: (urls: string[]) => void;
}

export function BatchProcessor({ isOpen, onClose, onProcess }: BatchProcessorProps) {
  const [urls, setUrls] = useState<string[]>([""]);
  const [bulkInput, setBulkInput] = useState("");
  const [mode, setMode] = useState<"single" | "bulk">("single");

  if (!isOpen) return null;

  const addUrl = () => {
    setUrls([...urls, ""]);
  };

  const removeUrl = (index: number) => {
    setUrls(urls.filter((_, i) => i !== index));
  };

  const updateUrl = (index: number, value: string) => {
    const newUrls = [...urls];
    newUrls[index] = value;
    setUrls(newUrls);
  };

  const handleProcess = () => {
    let urlsToProcess: string[];
    
    if (mode === "bulk") {
      urlsToProcess = bulkInput
        .split("\n")
        .map((u) => u.trim())
        .filter((u) => u.length > 0);
    } else {
      urlsToProcess = urls.filter((u) => u.trim().length > 0);
    }

    if (urlsToProcess.length === 0) return;

    onProcess(urlsToProcess);
  };

  const validCount = mode === "bulk" 
    ? bulkInput.split("\n").filter((u) => u.trim().length > 0).length
    : urls.filter((u) => u.trim().length > 0).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/90 backdrop-blur-md" onClick={onClose} />
      
      <div className="relative z-10 w-full max-w-2xl">
        <GlassCard gradient>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Layers className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-bold">Batch Processing</h2>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Mode Toggle */}
          <div className="flex gap-2 mb-6">
            <Button
              variant={mode === "single" ? "gradient" : "outline"}
              size="sm"
              onClick={() => setMode("single")}
            >
              Single URLs
            </Button>
            <Button
              variant={mode === "bulk" ? "gradient" : "outline"}
              size="sm"
              onClick={() => setMode("bulk")}
            >
              Bulk Paste
            </Button>
          </div>

          {mode === "single" ? (
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
              {urls.map((url, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    placeholder="https://youtube.com/watch?v=..."
                    value={url}
                    onChange={(e) => updateUrl(index, e.target.value)}
                  />
                  {urls.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeUrl(index)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addUrl}>
                <Plus className="w-4 h-4 mr-2" />
                Add URL
              </Button>
            </div>
          ) : (
            <Textarea
              placeholder="Paste multiple URLs, one per line:
https://youtube.com/watch?v=video1
https://kick.com/channel/videos/video2
https://twitch.tv/videos/12345"
              value={bulkInput}
              onChange={(e) => setBulkInput(e.target.value)}
              className="min-h-[300px] font-mono text-sm"
            />
          )}

          <div className="flex items-center justify-between mt-6 pt-4 border-t border-border/50">
            <p className="text-sm text-muted-foreground">
              {validCount} video{validCount !== 1 ? "s" : ""} ready to process
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                variant="gradient" 
                onClick={handleProcess}
                disabled={validCount === 0}
              >
                <Play className="w-4 h-4 mr-2" />
                Process {validCount} Video{validCount !== 1 ? "s" : ""}
              </Button>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
