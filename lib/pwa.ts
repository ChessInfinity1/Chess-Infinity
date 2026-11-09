export type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};
export type PackStatus = {
  ready: boolean;
  available: boolean;
  version: string;
  files?: number;
};
export function browserPlatform(ua: string, touchPoints = 0) {
  return /iPhone|iPad|iPod/.test(ua) ||
    (/Macintosh/.test(ua) && touchPoints > 1)
    ? "ios"
    : /Android/i.test(ua)
      ? "android"
      : "desktop";
}
export function isEmbeddedBrowser(ua: string) {
  return /; wv\)|\bwv\b|ChatGPT|FBAN|FBAV|Instagram/i.test(ua);
}
export function offlineWorkerMessage<T>(
  worker: ServiceWorker,
  type: string,
  onProgress?: (done: number, total: number) => void,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const channel = new MessageChannel();
    let timeout = setTimeout(() => {
      channel.port1.close();
      reject(
        new Error("The offline download timed out. Reconnect and try again."),
      );
    }, 60000);
    channel.port1.onmessage = (e) => {
      const data = e.data;
      if (data.type === "progress") {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          channel.port1.close();
          reject(
            new Error(
              "The offline download stopped responding. Reconnect and retry.",
            ),
          );
        }, 60000);
        onProgress?.(data.completed, data.total);
        return;
      }
      clearTimeout(timeout);
      channel.port1.close();
      if (data.error) reject(new Error(data.error));
      else resolve(data as T);
    };
    worker.postMessage({ type }, [channel.port2]);
  });
}
