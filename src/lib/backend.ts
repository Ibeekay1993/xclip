const DEFAULT_API_URL = "https://clip-c2yu.onrender.com";

export const API_URL =
  (import.meta.env.VITE_API_URL as string | undefined)?.trim() || DEFAULT_API_URL;

export type ExportClipRequest = {
  videoUrl: string;
  start: number;
  end: number;
  captions?: boolean;
  preset?: string;
  clipNumber?: number;
  title?: string;
};

export async function exportClipFromBackend(request: ExportClipRequest): Promise<Blob> {
  const response = await fetch(`${API_URL}/export`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      videoUrl: request.videoUrl,
      video_url: request.videoUrl,
      url: request.videoUrl,
      source_url: request.videoUrl,
      start: request.start,
      start_time: request.start,
      end: request.end,
      end_time: request.end,
      captions: request.captions ?? false,
      add_subtitles: request.captions ?? false,
      preset: request.preset ?? "9:16",
      export_preset: request.preset ?? "9:16",
      clipNumber: request.clipNumber ?? 1,
      clip_number: request.clipNumber ?? 1,
      title: request.title ?? "",
    }),
  });

  const contentType = response.headers.get("content-type") || "";

  if (!response.ok) {
    if (contentType.includes("application/json")) {
      const data = await response.json().catch(() => null);
      throw new Error(data?.error || `Export failed with status ${response.status}`);
    }

    const text = await response.text().catch(() => "");
    throw new Error(text || `Export failed with status ${response.status}`);
  }

  if (contentType.includes("application/json")) {
    const data = await response.json();
    if (data?.error) throw new Error(data.error);
    const downloadUrl = data?.downloadUrl || data?.download_url || data?.file_url;
    if (downloadUrl) {
      const fileResponse = await fetch(downloadUrl);
      if (!fileResponse.ok) throw new Error(`Download URL failed with status ${fileResponse.status}`);
      return fileResponse.blob();
    }
    throw new Error("Export API returned JSON instead of a video file.");
  }

  return response.blob();
}
