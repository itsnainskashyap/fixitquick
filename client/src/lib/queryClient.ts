import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
  customHeaders?: Record<string, string>,
): Promise<any> {
  const authHeaders = getAuthHeaders();
  const headers: Record<string, string> = {
    ...(data ? { "Content-Type": "application/json" } : {}),
    ...authHeaders,
    ...customHeaders,
  };

  // Enhanced logging for development debugging
  if (import.meta.env.DEV) {
    const hasAuthToken = !!localStorage.getItem('accessToken');
    console.log('🔐 API Request:', { 
      method, 
      url, 
      hasAuthToken,
      hasData: !!data 
    });
  }

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  // Enhanced error handling for auth issues
  if (res.status === 401) {
    console.warn('🚨 Authentication failed for:', url);
    
    // Only clear tokens if this was an authentication-related endpoint
    // Don't clear tokens for general 401s on other endpoints
    if (url.includes('/api/auth/') || url.includes('/login') || url.includes('/verify')) {
      console.log('🧹 Clearing invalid auth tokens for auth endpoint');
      localStorage.removeItem('accessToken');
    }
    
    // In development, provide helpful debugging info
    if (import.meta.env.DEV) {
      console.log('💡 Dev tip: If using dev auth, ensure ALLOW_DEV_AUTH=true is set');
      console.log('💡 Available dev endpoints: POST /api/dev/login/:userId');
    }
  }

  await throwIfResNotOk(res);
  
  // Parse JSON response for consistent API contract
  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return await res.json();
  }
  
  // For non-JSON responses, return the response text
  return await res.text();
}

// Utility function for when raw Response object is needed
export async function apiRequestRaw(
  method: string,
  url: string,
  data?: unknown | undefined,
  customHeaders?: Record<string, string>,
): Promise<Response> {
  const authHeaders = getAuthHeaders();
  const headers: Record<string, string> = {
    ...(data ? { "Content-Type": "application/json" } : {}),
    ...authHeaders,
    ...customHeaders,
  };

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

// Helper function to get auth headers consistently
function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  
  // Add Bearer token if available (for SMS auth users)
  const accessToken = localStorage.getItem('accessToken');
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }
  
  return headers;
}

// Enhanced fetch function with consistent auth handling
export async function authenticatedFetch(
  url: string, 
  options: RequestInit = {}
): Promise<Response> {
  const authHeaders = getAuthHeaders();
  
  const enhancedOptions: RequestInit = {
    ...options,
    headers: {
      ...authHeaders,
      ...options.headers,
    },
    credentials: "include",
  };
  
  return fetch(url, enhancedOptions);
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = queryKey.join("/") as string;
    
    // Use the enhanced fetch with consistent auth handling
    const res = await authenticatedFetch(url);

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
