export type SaveFileResult = "saved" | "cancelled" | "needs-tap";

/**
 * Hands a generated file to the user without navigating the page.
 *
 * Inside the phone shell a plain download link opens the file in the WebView with no way
 * back, so touch devices get the system share sheet (Save to Files, AirDrop, mail) instead.
 * Share needs a fresh tap: after a slow fetch the browser may refuse it ("needs-tap"),
 * and the caller then offers a button that calls this again with the same file.
 */
export async function saveFile(file: File): Promise<SaveFileResult> {
  const touch = typeof window.matchMedia === "function" && window.matchMedia("(pointer: coarse)").matches;
  if (touch && typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return "saved";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return "cancelled";
      if (error instanceof DOMException && error.name === "NotAllowedError") return "needs-tap";
      throw error;
    }
  }

  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  return "saved";
}

/** Fetches a file from the app's own API (cookies included) as a named File. */
export async function fetchFile(url: string, fallbackName: string, init?: RequestInit): Promise<File> {
  const response = await fetch(url, { credentials: "same-origin", ...init });
  if (!response.ok) throw new Error("Couldn't prepare the file. Check your connection and try again.");
  const blob = await response.blob();
  const name = /filename="?([^";]+)"?/i.exec(response.headers.get("content-disposition") ?? "")?.[1] ?? fallbackName;
  return new File([blob], name, { type: blob.type || "application/octet-stream" });
}
