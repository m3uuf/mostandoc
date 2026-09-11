import { QueryClient, QueryFunction } from "@tanstack/react-query";

export class ApiError extends Error {
  status: number;
  upgrade: boolean;
  constructor(status: number, message: string, upgrade = false) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.upgrade = upgrade;
  }
}

const GENERIC_ERROR = "حدث خطأ غير متوقع، حاول مرة أخرى";

/** Turns a failed response into an ApiError carrying the server's Arabic `message` (never raw JSON). */
async function throwIfResNotOk(res: Response) {
  if (res.ok) return;
  let message = GENERIC_ERROR;
  let upgrade = false;
  const text = await res.text();
  if (text) {
    try {
      const data = JSON.parse(text) as { message?: string; upgrade?: boolean };
      if (data.message) message = data.message;
      upgrade = Boolean(data.upgrade);
    } catch {
      message = res.status >= 500 ? GENERIC_ERROR : text;
    }
  }
  throw new ApiError(res.status, message, upgrade);
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
