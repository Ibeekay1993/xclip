import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Link, Download, Wand2, FileAudio, Scissors, Sparkles, Settings, Upload, Layers, Zap } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { GlassCard } from "./GlassCard";
import { WorkflowStep } from "./WorkflowStep";
import { ClipCard } from "./ClipCard";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  analyzeVideoFromBackend,
  exportClipFromBackend,
  getBackendVideoUrl,
  processVideoFromBackend,
  uploadVideoToBackend,
} from "@/lib/backend";

type Status = "idle" | "processing" | "complete" | "error";

interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
}

interface Clip {
  id: string;
  jobId?: string;
  sourceVideoId?: string;
  clipNumber: number;
  start: number;
  end: number;
  reason: string;
  hookScore: number;
  transcript?: string;
  thumbnailUrl?: string;
  captions?: any[];
  exportPreset?: string;
  platform?: string;
}

interface RecentJob {
  id: string;
  source_video_id: string | null;
  video_url: string;
  video_title: string | null;
  status: string;
  error_message: string | null;
  created_at: string;
}

const SettingsPanel = lazy(() => import("./SettingsPanel").then((mod) => ({ default: mod.SettingsPanel })));
const BatchProcessor = lazy(() => import("./BatchProcessor").then((mod) => ({ default: mod.BatchProcessor })));
const ExportPresets = lazy(() => import("./ExportPresets").then((mod) => ({ default: mod.ExportPresets })));
const VideoPreview = lazy(() => import("./VideoPreview").then((mod) => ({ default: mod.VideoPreview })));
const ClipEditor = lazy(() => import("./ClipEditor").then((mod) => ({ default: mod.ClipEditor })));

const ACTIVE_JOB_STATUSES = new Set(["pending", "downloading", "transcribing", "analyzing", "generating"]);

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

const formatDuration = (start: number, end: number): string => `${Math.floor(Math.max(0, end - start))}s`;

const getPlatformDefaultPreset = (platform: string): string => {
  if (platform === "youtube" || platform === "twitch" || platform === "kick") return "16:9";
  return "9:16";
};

const normalizeClipWindow = (startRaw: number, endRaw: number, maxDuration = 900) => {
  const safeStart = Number.isFinite(startRaw) ? Math.max(0, startRaw) : 0;
  const safeEndInput = Number.isFinite(endRaw) ? Math.max(safeStart + 1, endRaw) : safeStart + 20;
  const boundedEnd = Math.min(safeEndInput, Math.max(1, maxDuration));
  const duration = boundedEnd - safeStart;

  if (duration < 12) {
    const adjustedEnd = Math.min(maxDuration, safeStart + 18);
    return { start: safeStart, end: adjustedEnd, duration: adjustedEnd - safeStart };
  }

  if (duration > 60) {
    return { start: safeStart, end: safeStart + 60, duration: 60 };
  }

  return { start: safeStart, end: boundedEnd, duration };
};

const inferPlatformFromUrl = (sourceUrl: string): string => {
  try {
    const host = new URL(sourceUrl).hostname.toLowerCase();
    if (host.includes("youtube") || host.includes("youtu.be")) return "youtube";
    if (host.includes("kick")) return "kick";
    if (host.includes("twitch")) return "twitch";
    if (host.includes("tiktok")) return "tiktok";
  } catch {
    return "youtube";
  }

  return "youtube";
};

const buildTranscriptText = (segments: TranscriptSegment[]): string =>
  segments.map((segment) => `${formatTime(segment.start)} - ${segment.text}`).join("\n");

const buildClipTranscript = (segments: TranscriptSegment[], start: number, end: number): string =>
  segments
    .filter((segment) => segment.start >= start && segment.start <= end)
    .map((segment) => segment.text)
    .filter(Boolean)
    .join(" ")
    .trim();

export function ClipGenerator() {
  const [url, setUrl] = useState("");
  const [clipCount, setClipCount] = useState(5);
  const [status, setStatus] = useState<{
    download: Status;
    transcribe: Status;
    analyze: Status;
    generate: Status;
  }>({
    download: "idle",
    transcribe: "idle",
    analyze: "idle",
    generate: "idle",
  });
  const [clips, setClips] = useState<Clip[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [batchOpen, setBatchOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [previewClip, setPreviewClip] = useState<Clip | null>(null);
  const [editingClip, setEditingClip] = useState<Clip | null>(null);
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourcePlaybackUrl, setSourcePlaybackUrl] = useState("");
  const [sourceVideoId, setSourceVideoId] = useState("");
  const [sourceType, setSourceType] = useState<"url" | "upload">("url");
  const [sourcePlatform, setSourcePlatform] = useState("youtube");
  const [transcriptData, setTranscriptData] = useState<{ transcript: string; segments: TranscriptSegment[] } | null>(null);
  const [recentJobs, setRecentJobs] = useState<RecentJob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const loadRecentJobs = useCallback(async () => {
    const { data, error } = await supabase
      .from("clip_jobs")
      .select("id, source_video_id, video_url, video_title, status, error_message, created_at")
      .order("created_at", { ascending: false })
      .limit(5);

    if (!error && data) {
      setRecentJobs(data as RecentJob[]);
    }
  }, []);

  useEffect(() => {
    void loadRecentJobs();
  }, [loadRecentJobs]);

  useEffect(() => {
    const shouldPoll = isProcessing || recentJobs.some((job) => ACTIVE_JOB_STATUSES.has(job.status));
    if (!shouldPoll) return;

    const interval = window.setInterval(() => {
      void loadRecentJobs();
    }, 4000);

    return () => window.clearInterval(interval);
  }, [isProcessing, recentJobs, loadRecentJobs]);

  const createClipJob = async (videoUrl: string, videoTitle?: string, uploadedFileUrl?: string) => {
    const { data, error } = await supabase
      .from("clip_jobs")
      .insert({
        video_url: videoUrl,
        video_title: videoTitle || null,
        uploaded_file_url: uploadedFileUrl || null,
        source_video_id: null,
        status: "pending",
      })
      .select("id")
      .single();

    if (error) throw error;
    return data.id as string;
  };

  const updateClipJobStatus = async (jobId: string, nextStatus: string, errorMessage?: string) => {
    const payload: { status: string; error_message?: string | null } = { status: nextStatus };
    if (errorMessage) payload.error_message = errorMessage;
    const { error } = await supabase.from("clip_jobs").update(payload).eq("id", jobId);
    if (error) throw error;
  };

  const saveGeneratedClips = async (
    jobId: string,
    generatedClips: Clip[],
    sourceKind: "url" | "upload",
    sourceUrlValue: string,
    backendVideoId?: string
  ) => {
    const rows = generatedClips.map((clip) => ({
      job_id: jobId,
      source_video_id: backendVideoId || clip.sourceVideoId || null,
      clip_number: clip.clipNumber,
      start_time: clip.start,
      end_time: clip.end,
      duration: Math.max(0, clip.end - clip.start),
      reason: clip.reason,
      hook_score: clip.hookScore,
      thumbnail_url: clip.thumbnailUrl || null,
      video_url: sourceUrlValue,
      transcript: clip.transcript || null,
      captions: clip.captions || [],
      export_preset: clip.exportPreset || "9:16",
      source_type: sourceKind,
    }));

    const { error } = await supabase.from("clips").insert(rows);
    if (error) throw error;
  };

  const processVideo = async (videoUrl?: string, inputType: "url" | "upload" = "url", file?: File) => {
    const targetUrl = (videoUrl || url).trim();
    if (inputType === "url" && !targetUrl) {
      toast({ title: "URL Required", description: "Please enter a valid video URL", variant: "destructive" });
      return;
    }

    setIsProcessing(true);
    setClips([]);
    setStatus({ download: "idle", transcribe: "idle", analyze: "idle", generate: "idle" });
    setTranscriptData(null);
    setSourceUrl(targetUrl);
    setSourcePlaybackUrl("");
    setSourceVideoId("");
    setSourceType(inputType);

    let jobId: string | null = null;
    let backendVideoId = "";

    try {
      jobId = await createClipJob(targetUrl || file?.name || "uploaded-video", undefined, inputType === "upload" ? "uploaded-file" : undefined);

      setStatus((current) => ({ ...current, download: "processing" }));
      await updateClipJobStatus(jobId, "downloading");

      if (inputType === "upload") {
        if (!file) throw new Error("Please select a video file to upload.");
        const uploadResult = await uploadVideoToBackend(file);
        backendVideoId = uploadResult.video_id;
        setSourcePlatform("upload");
      } else {
        const downloadResult = await processVideoFromBackend({ url: targetUrl });
        backendVideoId = downloadResult.video_id;
        setSourcePlatform(inferPlatformFromUrl(targetUrl));
      }

      const playbackUrl = getBackendVideoUrl(backendVideoId);
      setSourceVideoId(backendVideoId);
      setSourcePlaybackUrl(playbackUrl);
      await supabase.from("clip_jobs").update({ source_video_id: backendVideoId }).eq("id", jobId);

      setStatus((current) => ({ ...current, download: "complete", transcribe: "processing" }));
      await updateClipJobStatus(jobId, "transcribing");

      const analysisResult = await analyzeVideoFromBackend(backendVideoId);
      const transcriptionSegments = Array.isArray(analysisResult.transcription)
        ? analysisResult.transcription
            .map((segment) => ({
              start: Number((segment as any).start ?? 0),
              end: Number((segment as any).end ?? 0),
              text: String((segment as any).text ?? ""),
            }))
            .filter((segment) => segment.text.length > 0)
        : [];

      setTranscriptData({ transcript: buildTranscriptText(transcriptionSegments), segments: transcriptionSegments });
      setStatus((current) => ({ ...current, transcribe: "complete", analyze: "processing" }));
      await updateClipJobStatus(jobId, "analyzing");

      const backendClips = Array.isArray(analysisResult.clips) ? analysisResult.clips : [];
      const detectedDuration = Number(analysisResult.duration || transcriptionSegments[transcriptionSegments.length - 1]?.end || 900);
      const platform = inputType === "upload" ? "upload" : inferPlatformFromUrl(targetUrl);
      const defaultPreset = getPlatformDefaultPreset(platform === "upload" ? "youtube" : platform);

      setStatus((current) => ({ ...current, analyze: "complete", generate: "processing" }));
      await updateClipJobStatus(jobId, "generating");

      const generatedClips: Clip[] = backendClips.slice(0, clipCount).map((clip: any, index: number) => {
        const startValue = Number(clip.start ?? clip.start_time ?? 0);
        const endValue = Number(clip.end ?? clip.end_time ?? 0);
        const normalized = normalizeClipWindow(startValue, endValue, detectedDuration);

        return {
          id: `clip-${Date.now()}-${index}`,
          jobId,
          sourceVideoId: backendVideoId,
          clipNumber: Number(clip.clip_number || index + 1),
          start: normalized.start,
          end: normalized.end,
          reason: String(clip.reason || "Strong self-contained highlight"),
          hookScore: Number(clip.hook_score || 70),
          transcript: clip.transcript || buildClipTranscript(transcriptionSegments, normalized.start, normalized.end),
          thumbnailUrl: "/placeholder.svg",
          exportPreset: defaultPreset,
          platform,
        };
      });

      await saveGeneratedClips(jobId, generatedClips, inputType, playbackUrl, backendVideoId);
      await updateClipJobStatus(jobId, "complete");

      setClips(generatedClips);
      setStatus((current) => ({ ...current, generate: "complete" }));
      void loadRecentJobs();

      toast({
        title: "Analysis Complete",
        description: `${generatedClips.length} viral clips detected from ${platform}${analysisResult.title ? ` - ${analysisResult.title}` : ""}`,
      });
    } catch (error) {
      console.error("Processing error:", error);
      if (jobId) {
        try {
          await updateClipJobStatus(jobId, "error", error instanceof Error ? error.message : "An error occurred");
        } catch {
          // Best effort only.
        }
      }

      setStatus((current) => ({
        ...current,
        download: current.download === "processing" ? "error" : current.download,
        transcribe: current.transcribe === "processing" ? "error" : current.transcribe,
        analyze: current.analyze === "processing" ? "error" : current.analyze,
        generate: current.generate === "processing" ? "error" : current.generate,
      }));
      toast({
        title: "Processing Failed",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("video/")) {
      toast({ title: "Invalid File", description: "Please upload a video file (MP4, WebM, etc.)", variant: "destructive" });
      return;
    }

    toast({ title: "Uploading Video", description: "Please wait while we upload your video..." });

    try {
      await processVideo(file.name, "upload", file);
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload video",
        variant: "destructive",
      });
      setIsProcessing(false);
    }
  };

  const resetWorkflow = () => {
    setStatus({ download: "idle", transcribe: "idle", analyze: "idle", generate: "idle" });
    setClips([]);
    setIsProcessing(false);
    setSourceUrl("");
    setSourcePlaybackUrl("");
    setSourceVideoId("");
    setSourceType("url");
    setSourcePlatform("youtube");
    setTranscriptData(null);
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const blobUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = blobUrl;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(blobUrl);
  };

  const handleDownload = async (clip: Clip, format?: string) => {
    const preset = format || clip.exportPreset || "9:16";
    try {
      const source = sourcePlaybackUrl || sourceUrl || url;
      if (!source) {
        toast({ title: "Source missing", description: "Please process a video first.", variant: "destructive" });
        return;
      }

      toast({
        title: "Rendering clip",
        description:
          sourceType === "upload"
            ? "Server-side FFmpeg is cutting your uploaded video..."
            : `Server-side FFmpeg is creating clip #${clip.clipNumber}...`,
      });

      const blob = await exportClipFromBackend({
        videoId: clip.sourceVideoId || sourceVideoId || undefined,
        videoUrl: source,
        start: clip.start,
        end: clip.end,
        captions: !!clip.captions?.length,
        preset,
        clipNumber: clip.clipNumber,
        title: sourcePlatform,
      });

      downloadBlob(blob, `xclip_${clip.clipNumber}_${preset.replace(":", "x")}.mp4`);
      if (clip.jobId) {
        await supabase
          .from("clips")
          .update({ exported: true, exported_at: new Date().toISOString() })
          .eq("job_id", clip.jobId)
          .eq("clip_number", clip.clipNumber);
      }

      toast({ title: "Clip ready", description: `Downloaded real MP4 clip #${clip.clipNumber}` });
    } catch (error) {
      toast({
        title: "Export failed",
        description: error instanceof Error ? error.message : "Could not export clip from backend.",
        variant: "destructive",
      });
    }
  };

  const generateCaptions = async (clip: Clip) => {
    try {
      toast({ title: "Generating Captions", description: "AI is creating captions..." });
      const { data, error } = await supabase.functions.invoke("generate-captions", {
        body: { transcript: clip.transcript, clipStart: clip.start, clipEnd: clip.end, style: "viral" },
      });
      if (error || !data?.success) throw new Error(data?.error || error?.message || "Failed");
      setClips((previous) => previous.map((current) => (current.id === clip.id ? { ...current, captions: data.captions } : current)));
      toast({ title: "Captions Generated", description: `${data.captions.length} caption blocks created` });
    } catch (error) {
      toast({
        title: "Caption Generation Failed",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    }
  };

  const handleBatchProcess = async (urls: string[]) => {
    setBatchOpen(false);
    for (const videoUrl of urls) {
      setUrl(videoUrl);
      await processVideo(videoUrl);
    }
  };

  return (
    <>
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <GlassCard neon>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-sm font-bold uppercase tracking-widest orbitron flex items-center gap-2">
                <Link className="w-4 h-4 text-primary" />
                Video Input
              </h2>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => setBatchOpen(true)}>
                  <Layers className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setSettingsOpen(true)}>
                  <Settings className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] text-muted-foreground mb-2 block uppercase tracking-widest">
                  Video URL (YouTube, Twitch, Kick, TikTok)
                </label>
                <Input
                  placeholder="https://youtube.com/watch?v=... or https://kick.com/..."
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  disabled={isProcessing}
                  className="bg-input border-border focus:border-primary focus:shadow-[0_0_15px_hsl(var(--primary)/0.2)] transition-shadow rounded-sm"
                />
              </div>

              <div className="flex items-center gap-4">
                <div className="flex-1 h-px bg-border" />
                <span className="text-[10px] text-muted-foreground uppercase tracking-widest">or</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              <div>
                <input ref={fileInputRef} type="file" accept="video/*" onChange={handleFileUpload} className="hidden" />
                <Button variant="outline" className="w-full" onClick={() => fileInputRef.current?.click()} disabled={isProcessing}>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Video File
                </Button>
              </div>

              <div>
                <label className="text-[10px] text-muted-foreground mb-2 block uppercase tracking-widest">Number of Clips</label>
                <div className="flex gap-2">
                  {[3, 5, 7, 10].map((num) => (
                    <Button
                      key={num}
                      variant={clipCount === num ? "gradient" : "outline"}
                      size="sm"
                      onClick={() => setClipCount(num)}
                      disabled={isProcessing}
                    >
                      {num}
                    </Button>
                  ))}
                </div>
              </div>

              <Button variant="gradient" size="xl" className="w-full mt-4" onClick={() => processVideo()} disabled={isProcessing}>
                <Wand2 className="w-5 h-5" />
                {isProcessing ? "Processing..." : "Analyze"}
              </Button>

              {clips.length > 0 && (
                <div className="flex gap-2">
                  <Button variant="outline" size="lg" className="flex-1" onClick={resetWorkflow}>
                    New Project
                  </Button>
                  <Button variant="outline" size="lg" onClick={() => setExportOpen(true)}>
                    <Zap className="w-4 h-4 mr-2" />
                    Export All
                  </Button>
                </div>
              )}
            </div>
          </GlassCard>

          <GlassCard>
            <h2 className="text-sm font-bold uppercase tracking-widest orbitron mb-6 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Processing Pipeline
            </h2>
            <div className="space-y-1">
              <WorkflowStep icon={Download} title="Fetch Video" description="Connecting to video source" status={status.download} />
              <WorkflowStep icon={FileAudio} title="Transcription" description="Generating transcript with AI" status={status.transcribe} />
              <WorkflowStep icon={Sparkles} title="Viral Detection" description="Finding hooks and viral moments" status={status.analyze} />
              <WorkflowStep icon={Scissors} title="Generate Clips" description="Creating clip data and thumbnails" status={status.generate} isLast />
            </div>
          </GlassCard>

          <GlassCard>
            <h2 className="text-sm font-bold uppercase tracking-widest orbitron mb-6 flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" />
              Recent Jobs
              <Button variant="ghost" size="sm" className="ml-auto h-7 text-[10px]" onClick={() => void loadRecentJobs()}>
                Refresh
              </Button>
            </h2>

            {recentJobs.length === 0 ? (
              <p className="text-xs text-muted-foreground">No recent jobs yet. Analyze a clip and it will appear here with its latest processing status.</p>
            ) : (
              <div className="space-y-2">
                {recentJobs.map((job) => (
                  <div key={job.id} className="rounded-sm border border-border bg-muted/30 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[10px] uppercase tracking-wider text-foreground truncate">{job.video_title || job.video_url}</p>
                        <p className="text-[10px] text-muted-foreground mono">{new Date(job.created_at).toLocaleString()}</p>
                      </div>
                      <span className="text-[10px] px-2 py-1 rounded-sm border border-border uppercase tracking-wider">{job.status}</span>
                    </div>
                    {job.error_message && <p className="mt-2 text-[10px] text-destructive line-clamp-2">{job.error_message}</p>}
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </div>

        <div>
          <GlassCard className="h-full">
            <h2 className="text-sm font-bold uppercase tracking-widest orbitron mb-6 flex items-center gap-2">
              <Scissors className="w-4 h-4 text-primary" />
              Detected Clips
              {clips.length > 0 && (
                <span className="ml-auto text-[10px] text-muted-foreground font-normal mono">{clips.length} clips</span>
              )}
            </h2>

            {clips.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 rounded-sm border border-border bg-muted flex items-center justify-center mb-4">
                  <Scissors className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-foreground mb-2 orbitron">No Clips Yet</h3>
                <p className="text-xs text-muted-foreground max-w-xs">Enter a video URL or upload a file to detect viral moments</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                {clips.map((clip) => (
                  <ClipCard
                    key={clip.id}
                    clipNumber={clip.clipNumber}
                    startTime={formatTime(clip.start)}
                    endTime={formatTime(clip.end)}
                    duration={formatDuration(clip.start, clip.end)}
                    reason={clip.reason}
                    hookScore={clip.hookScore}
                    thumbnailUrl={clip.thumbnailUrl}
                    hasCaptions={!!clip.captions?.length}
                    onDownload={() => handleDownload(clip)}
                    onPreview={() => setPreviewClip(clip)}
                    onEdit={() => setEditingClip(clip)}
                    onGenerateCaptions={() => generateCaptions(clip)}
                  />
                ))}
              </div>
            )}
          </GlassCard>
        </div>
      </div>

      <Suspense fallback={null}>
        <SettingsPanel isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
        <BatchProcessor isOpen={batchOpen} onClose={() => setBatchOpen(false)} onProcess={handleBatchProcess} />
        <ExportPresets
          isOpen={exportOpen}
          onClose={() => setExportOpen(false)}
          clips={clips}
          onExport={(preset) => {
            clips.forEach((clip) => handleDownload(clip, preset));
            setExportOpen(false);
          }}
        />

        <VideoPreview
          isOpen={!!previewClip}
          onClose={() => setPreviewClip(null)}
          videoUrl={sourcePlaybackUrl || sourceUrl || url}
          sourceUrl={sourceUrl || url}
          clipData={
            previewClip
              ? {
                  id: previewClip.id,
                  clipNumber: previewClip.clipNumber,
                  startTime: previewClip.start,
                  endTime: previewClip.end,
                  reason: previewClip.reason,
                  transcript: previewClip.transcript,
                  captions: previewClip.captions,
                  exportPreset: previewClip.exportPreset,
                }
              : null
          }
          onEdit={() => {
            setEditingClip(previewClip);
            setPreviewClip(null);
          }}
          onDownload={() => {
            if (previewClip) handleDownload(previewClip);
          }}
        />

        <ClipEditor
          isOpen={!!editingClip}
          onClose={() => setEditingClip(null)}
          clipData={
            editingClip
              ? {
                  id: editingClip.id,
                  clipNumber: editingClip.clipNumber,
                  startTime: editingClip.start,
                  endTime: editingClip.end,
                  reason: editingClip.reason,
                  transcript: editingClip.transcript,
                  captions: editingClip.captions,
                  exportPreset: editingClip.exportPreset,
                }
              : null
          }
          onSave={(updated) => {
            setClips((previous) =>
              previous.map((clip) =>
                clip.id === updated.id
                  ? {
                      ...clip,
                      start: updated.startTime,
                      end: updated.endTime,
                      captions: updated.captions,
                      exportPreset: updated.aspectRatio,
                    }
                  : clip
              )
            );
          }}
          onGenerateCaptions={async (style) => {
            if (editingClip) {
              const { data } = await supabase.functions.invoke("generate-captions", {
                body: { transcript: editingClip.transcript, clipStart: editingClip.start, clipEnd: editingClip.end, style },
              });
              return data?.captions || [];
            }
            return [];
          }}
        />
      </Suspense>
    </>
  );
}
