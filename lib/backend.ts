export const backendUrl = () => {
  if (process.env.ENABLE_LEGACY_BACKEND !== "true") return "";
  return (process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "").replace(/\/$/, "");
};

export async function postToBackend<T>(path: string, body: unknown): Promise<T | null> {
  const base = backendUrl();
  if (!base) return null;

  try {
    const response = await fetch(`${base}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store"
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.detail || data?.error || `Backend retornou ${response.status}`);
    return data as T;
  } catch {
    return null;
  }
}

export async function getFromBackend<T>(path: string): Promise<T | null> {
  const base = backendUrl();
  if (!base) return null;

  try {
    const response = await fetch(`${base}${path}`, { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.detail || data?.error || `Backend retornou ${response.status}`);
    return data as T;
  } catch {
    return null;
  }
}

export function absolutizeBackendUrls<T>(value: T): T {
  const base = backendUrl();
  if (!base) return value;
  if (typeof value === "string") {
    return (value.startsWith("/") ? `${base}${value}` : value) as T;
  }
  if (Array.isArray(value)) {
    return value.map((item) => absolutizeBackendUrls(item)) as T;
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, absolutizeBackendUrls(item)])
    ) as T;
  }
  return value;
}
