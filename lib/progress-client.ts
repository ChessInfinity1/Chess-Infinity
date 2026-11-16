export class ProgressRequestError extends Error {
  readonly status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}
export async function requestProgress(init: RequestInit = {}, fetcher: typeof fetch = fetch, timeoutMs = 12000): Promise<{version:number;data?:unknown}> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetcher("/api/progress", {...init,signal:controller.signal});
    if (!response.ok) {
      const message = response.status===409 ? "Save conflict · see settings"
        : response.status===401 ? "Sign in again to sync · device changes kept"
        : response.status===413 ? "Progress too large · export a backup in settings"
        : response.status===400 ? "Save needs attention · export a backup in settings"
        : "Cloud unavailable · changes queued";
      throw new ProgressRequestError(response.status,message);
    }
    const result = await response.json() as {version?:unknown;data?:unknown} | null;
    if (!result || typeof result.version !== "number" || !Number.isInteger(result.version) || result.version < 0) throw new ProgressRequestError(502,"Cloud returned an invalid save · changes queued");
    return {version:result.version,data:result.data};
  } catch(error) {
    if (controller.signal.aborted) throw new ProgressRequestError(0,"Connection timed out · changes queued");
    throw error;
  } finally { clearTimeout(timer); }
}
export function cacheProgress(key:string,value:unknown,storage?:Pick<Storage,"setItem">):boolean {
  try { (storage || localStorage).setItem(key,JSON.stringify(value)); return true; } catch { return false; }
}
export function cloudSaveStatus(pending:boolean,cached:boolean) {
  return pending ? (cached ? "Pending sync" : "Pending sync · device storage full") : cached ? "All changes saved" : "Cloud saved · device storage full";
}
