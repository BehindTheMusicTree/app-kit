declare global {
  interface Window {
    onYouTubeIframeAPIReady?: () => void;
  }
}

/**
 * Loads the YouTube IFrame Player API script exactly once per page and resolves with the
 * `window.YT` namespace it installs. Safe to call repeatedly/concurrently — all callers share the
 * same in-flight/resolved promise.
 */
let apiPromise: Promise<typeof YT> | null = null;

export function loadYoutubeIframeApi(): Promise<typeof YT> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("YouTube IFrame API can only be loaded in the browser"));
  }

  if (window.YT?.Player) {
    return Promise.resolve(window.YT);
  }

  if (apiPromise) {
    return apiPromise;
  }

  apiPromise = new Promise((resolve) => {
    const previousCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previousCallback?.();
      resolve(window.YT);
    };

    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(script);
  });

  return apiPromise;
}
