import { createAppErrorFromResult, createNetworkOrBackendError } from "./app-errors/app-error-factory";
import { AppError } from "./app-errors/app-error";

// Stale keep-alive connections (e.g. browser↔Cloudflare) can drop a request before it reaches the server.
const NETWORK_RETRY_DELAYS_MS = [300, 900];

const fetchWithNetworkRetry = async (url: string, options: RequestInit): Promise<Response> => {
  const method = (options.method ?? "GET").toUpperCase();
  const retryable = method === "GET" || method === "HEAD";
  for (let attempt = 0; ; attempt++) {
    try {
      return await fetch(url, options);
    } catch (error) {
      if (!retryable || options.signal?.aborted || attempt >= NETWORK_RETRY_DELAYS_MS.length) throw error;
      await new Promise((resolve) => setTimeout(resolve, NETWORK_RETRY_DELAYS_MS[attempt]));
    }
  }
};

export const fetchWrapper = async <T>(
  url: string,
  requiresAuth: boolean,
  options: RequestInit = {},
  accessToken?: string,
  queryParams?: Record<string, string | number | boolean>,
  handleMissingRequiredSession?: () => void,
  handleError?: (error: Error) => void,
  expectBinary: boolean = false,
  backendBaseUrl?: string,
): Promise<T | null> => {
  const urlWithParams = queryParams
    ? `${url}${url.includes("?") ? "&" : "?"}${new URLSearchParams(
        Object.entries(queryParams).map(([key, value]) => [key, String(value)]),
      ).toString()}`
    : url;

  const finalUrl = urlWithParams;

  // Don't set Content-Type for FormData - let browser set it with boundary
  const isFormData = options.body instanceof FormData;
  const finalOptions: RequestInit = {
    ...options,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
      ...(options.headers || {}),
    },
  };

  if (requiresAuth && !accessToken) {
    handleMissingRequiredSession?.();
    return null;
  }

  try {
    const result = await fetchWithNetworkRetry(finalUrl, finalOptions);

    if (!result.ok) {
      const appError = await createAppErrorFromResult(result, backendBaseUrl);
      throw appError;
    }

    if (result.status === 204) {
      return null;
    }

    if (expectBinary) {
      return (await result.arrayBuffer()) as T;
    } else {
      return result.json();
    }
  } catch (caughtError: unknown) {
    let appError: AppError | null = null;
    if (caughtError instanceof AppError) {
      appError = caughtError;
    } else {
      appError = createNetworkOrBackendError(caughtError, finalUrl, backendBaseUrl);
    }

    if (handleError && appError) {
      handleError(appError);
      return null;
    } else {
      throw appError;
    }
  }
};
