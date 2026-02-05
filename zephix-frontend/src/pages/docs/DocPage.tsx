import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { api, unwrapApiData } from '@/lib/api';

type Doc = {
  id: string;
  workspaceId: string;
  projectId: string | null;
  title: string;
  content: string | null;
  createdAt: string;
  updatedAt: string;
};

export default function DocPage() {
  const { workspaceId, docId } = useParams();
  const [doc, setDoc] = useState<Doc | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workspaceId || !docId) return;
    load(workspaceId, docId);
  }, [workspaceId, docId]);

  async function load(wid: string, did: string) {
    setLoading(true);
    try {
      const res = await api.get(`/workspaces/${wid}/docs/${did}`);
      const data = unwrapApiData<Doc>(res.data);
      setDoc(data || null);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.message || 'Failed to load doc');
      setDoc(null);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="p-6">Loading...</div>;
  if (!doc) return <div className="p-6">Doc not found</div>;

  return (
    <div className="p-6">
      <div className="text-2xl font-semibold">{doc.title}</div>
      <div className="mt-4 text-sm text-gray-600">Workspace doc</div>
    </div>
  );
}
