import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Project = {
  id: string;
  name: string;
  // extend with fields you display
};

export function useProjects() {
  const [data, setData] = useState<Project[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ status: number; message: string } | null>(null);

  async function fetchProjects() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/projects");
      const payload = res.data?.data ?? res.data;
      setData(Array.isArray(payload) ? payload : []);
    } catch (e: any) {
      setError({ status: e.status ?? 0, message: e.message ?? "Failed to load projects" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchProjects(); }, []);

  return { data, loading, error, refetch: fetchProjects };
}
