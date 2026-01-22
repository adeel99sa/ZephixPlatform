import { api } from "@/lib/api";

export type Doc = {
  id: string;
  workspaceId: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
};

export type CreateDocResponse = {
  data: {
    docId: string;
  };
};

export type GetDocResponse = {
  data: Doc;
};

export type UpdateDocResponse = {
  data: Doc;
};

export async function createDoc(workspaceId: string, title: string): Promise<string> {
  const res = await api.post<CreateDocResponse>(`/workspaces/${workspaceId}/docs`, { title });
  // API interceptor unwraps { data: { docId } } to { docId }
  const docId = (res as any)?.data?.docId || (res as any)?.docId;

  if (!docId) {
    throw new Error("Doc create returned no docId");
  }

  return docId;
}

export async function getDoc(docId: string): Promise<Doc> {
  const res = await api.get<GetDocResponse>(`/docs/${docId}`);
  // API interceptor unwraps { data: Doc } to Doc
  return res as any as Doc;
}

export async function updateDoc(docId: string, patch: { title?: string; content?: string }): Promise<Doc> {
  const res = await api.patch<UpdateDocResponse>(`/docs/${docId}`, patch);
  // API interceptor unwraps { data: Doc } to Doc
  return res as any as Doc;
}
