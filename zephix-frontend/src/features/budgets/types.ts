export interface ProjectBudget {
  id: string;
  workspaceId: string;
  projectId: string;
  baselineBudget: string;
  revisedBudget: string;
  contingency: string;
  approvedChangeBudget: string;
  forecastAtCompletion: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateBudgetInput {
  baselineBudget?: string;
  revisedBudget?: string;
  contingency?: string;
  approvedChangeBudget?: string;
  forecastAtCompletion?: string;
}
