export type DocumentInstanceSummaryDto = {
  id: string;
  projectId: string;
  docKey: string;
  title: string;
  status: string;
  version: number;
  ownerUserId?: string | null;
  reviewerUserId?: string | null;
  updatedAt: string;
};

export type DocumentLatestDto = {
  id: string;
  projectId: string;
  docKey: string;
  title: string;
  status: string;
  version: number;
  content?: any | null;
  externalUrl?: string | null;
  fileStorageKey?: string | null;
  changeSummary?: string | null;
  updatedAt: string;
};

export type DocumentHistoryItemDto = {
  version: number;
  status: string;
  changeSummary?: string | null;
  createdAt: string;
  createdBy?: string | null;
};
