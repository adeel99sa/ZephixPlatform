import { api } from "@/lib/api";

export type Form = {
  id: string;
  workspaceId: string;
  title: string;
  schema: any;
  createdAt: string;
  updatedAt?: string;
};

export type CreateFormResponse = {
  data: {
    formId: string;
  };
};

export type GetFormResponse = {
  data: Form;
};

export type UpdateFormResponse = {
  data: Form;
};

export async function createForm(workspaceId: string, title: string): Promise<string> {
  const res = await api.post<CreateFormResponse>(`/workspaces/${workspaceId}/forms`, { title });
  // API interceptor unwraps { data: { formId } } to { formId }
  const formId = (res as any)?.data?.formId || (res as any)?.formId;

  if (!formId) {
    throw new Error("Form create returned no formId");
  }

  return formId;
}

export async function getForm(formId: string): Promise<Form> {
  const res = await api.get<GetFormResponse>(`/forms/${formId}`);
  // API interceptor unwraps { data: Form } to Form
  return res as any as Form;
}

export async function updateForm(formId: string, patch: { title?: string; schema?: any }): Promise<Form> {
  const res = await api.patch<UpdateFormResponse>(`/forms/${formId}`, patch);
  // API interceptor unwraps { data: Form } to Form
  return res as any as Form;
}
