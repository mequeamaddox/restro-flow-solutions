export async function safeFetch(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  if (!res.ok) {
    const errorText = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status} ${res.statusText}: ${errorText}`);
  }
  return res;
}
