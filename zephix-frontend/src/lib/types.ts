export type ID = string;

export interface Workspace { 
  id: ID; 
  name: string; 
  slug: string; 
}

export interface Project { 
  id: ID; 
  name: string; 
  workspaceId: ID; 
  folderCount?: number; 
}

export interface Folder { 
  id: ID; 
  name: string; 
  projectId: ID; 
}