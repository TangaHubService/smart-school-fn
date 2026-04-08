const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

export type PublicHealthInfo = {
  status: string;
  version: string | null;
  commit: string | null;
  buildTime: string | null;
  deployRegion: string | null;
  uptimeSec: number;
  db: string;
  activeRefreshSessions: number;
  nodeEnv: string;
};

type HealthEnvelope = { data: PublicHealthInfo | null; error?: { code: string; message: string } | null };

export async function fetchPublicHealthInfo(): Promise<PublicHealthInfo> {
  const response = await fetch(`${API_BASE_URL}/health/info`);
  const json = (await response.json()) as HealthEnvelope;
  if (!response.ok || !json.data) {
    throw new Error(json.error?.message ?? 'Could not load platform health info');
  }
  return json.data;
}
