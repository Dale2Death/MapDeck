import type { Player } from "../player/player";

/** Ask the browser to share this tab, ready for recording. Must run on a click. */
export async function requestTabCapture(): Promise<MediaStream> {
  return navigator.mediaDevices.getDisplayMedia({
    video: { frameRate: 30 },
    audio: false,
    preferCurrentTab: true,
    selfBrowserSurface: "include",
  } as DisplayMediaStreamOptions);
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Play the whole presentation hands-free while recording the tab.
 * Returns a WebM (or MP4, depending on the browser) video.
 */
export async function recordPlayback(player: Player, stream: MediaStream, stepMs: number): Promise<Blob> {
  const type = ["video/webm;codecs=vp9", "video/webm", "video/mp4"].find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
  const rec = new MediaRecorder(stream, type ? { mimeType: type, videoBitsPerSecond: 6_000_000 } : undefined);
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const stopped = new Promise<void>((r) => (rec.onstop = () => r()));
  player.go(0);
  await wait(800);
  rec.start(1000);
  await wait(1500);
  const ended = new Promise<void>((r) => stream.getVideoTracks()[0]?.addEventListener("ended", () => r()));
  await Promise.race([player.autoplay(stepMs), ended]);
  await wait(2000);
  player.autoplay(0);
  if (rec.state !== "inactive") rec.stop();
  await stopped;
  stream.getTracks().forEach((t) => t.stop());
  return new Blob(chunks, { type: type.split(";")[0] || "video/webm" });
}
