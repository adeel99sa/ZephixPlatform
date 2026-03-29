import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";

import { ProjectTemplateCenterModal } from "@/features/templates/components/ProjectTemplateCenterModal";

const listTemplatesMock = vi.fn();
const getTemplateDetailMock = vi.fn();
const createProjectFromTemplateMock = vi.fn();
const createProjectMock = vi.fn();
const listWorkspacesMock = vi.fn();

vi.mock("@/features/templates/api", () => ({
  listTemplates: (...args: any[]) => listTemplatesMock(...args),
  getTemplateDetail: (...args: any[]) => getTemplateDetailMock(...args),
  createProjectFromTemplate: (...args: any[]) => createProjectFromTemplateMock(...args),
}));

vi.mock("@/features/projects/api", () => ({
  createProject: (...args: any[]) => createProjectMock(...args),
}));

vi.mock("@/features/workspaces/api", () => ({
  listWorkspaces: (...args: any[]) => listWorkspacesMock(...args),
}));

const PERSISTED_TEMPLATE_ID = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";

describe("project template center modal workflow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listTemplatesMock.mockResolvedValue([
      {
        id: PERSISTED_TEMPLATE_ID,
        name: "Software Sprint",
        description: "Seeded software delivery template",
        templateVersion: 1,
        category: "Software Development",
        complexity: "medium",
        includedViews: ["list", "board"],
        includedFields: ["owner", "priority"],
        includedStatuses: ["TODO", "IN_PROGRESS", "DONE"],
        structureType: "phased",
        defaultImportOptions: {
          includeViews: true,
          includeTasks: true,
          includePhases: true,
          includeMilestones: true,
          includeCustomFields: false,
          includeDependencies: false,
          remapDates: true,
        },
        executionConfiguration: {
          views: ["list"],
          fields: ["owner"],
          statuses: ["TODO"],
          structureType: "phased",
          documents: [],
          taskLayout: "phased",
        },
        governanceConfiguration: {
          capacityPolicy: "baseline",
          budgetPolicy: "baseline",
          requiredArtifacts: [],
          riskModel: "default",
          phaseGates: [],
          approvalRules: [],
          auditRequirements: [],
          methodologyMapping: "default",
        },
        seedTasks: [{ name: "Task A" }],
      },
    ]);
    getTemplateDetailMock.mockResolvedValue({
      id: PERSISTED_TEMPLATE_ID,
      name: "Software Sprint",
      description: "Seeded software delivery template",
      templateVersion: 1,
      category: "Software Development",
      complexity: "medium",
      includedViews: ["list", "board"],
      includedFields: ["owner", "priority"],
      includedStatuses: ["TODO", "IN_PROGRESS", "DONE"],
      structureType: "phased",
      defaultImportOptions: {
        includeViews: true,
        includeTasks: true,
        includePhases: true,
        includeMilestones: true,
        includeCustomFields: false,
        includeDependencies: false,
        remapDates: true,
      },
      executionConfiguration: {
        views: ["list"],
        fields: ["owner"],
        statuses: ["TODO"],
        structureType: "phased",
        documents: [],
        taskLayout: "phased",
      },
      governanceConfiguration: {
        capacityPolicy: "baseline",
        budgetPolicy: "baseline",
        requiredArtifacts: [],
        riskModel: "default",
        phaseGates: [],
        approvalRules: [],
        auditRequirements: [],
        methodologyMapping: "default",
      },
      seedTasks: [{ name: "Task A" }],
    });
    listWorkspacesMock.mockResolvedValue([{ id: "ws-1", name: "Alpha Workspace" }]);
    createProjectFromTemplateMock.mockResolvedValue({ id: "p-1", workspaceId: "ws-1" });
    createProjectMock.mockResolvedValue({ id: "p-scratch" });
  });

  it("runs catalog -> detail -> import -> submit flow", async () => {
    const onSuccess = vi.fn();
    render(
      <ProjectTemplateCenterModal
        open
        initialWorkspaceId="ws-1"
        onClose={() => {}}
        onSuccess={onSuccess}
      />,
    );

    expect(
      await screen.findByRole("heading", { name: /template center/i }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Software Development" }));
    fireEvent.click(await screen.findByText("Software Sprint"));
    expect(await screen.findByRole("heading", { name: "Use Template" })).toBeInTheDocument();
    expect(screen.getByText("Destination workspace")).toBeInTheDocument();

    const workspaceSelect = screen
      .getByText("Destination workspace")
      .closest("label")
      ?.querySelector("select");
    expect(workspaceSelect).toBeTruthy();
    fireEvent.change(workspaceSelect!, { target: { value: "ws-1" } });

    fireEvent.change(screen.getByPlaceholderText("Enter project name"), {
      target: { value: "Sprint rollout" },
    });

    const useTemplateButtons = screen.getAllByRole("button", { name: "Use Template" });
    fireEvent.click(useTemplateButtons[useTemplateButtons.length - 1]);
    await waitFor(() => {
      expect(createProjectFromTemplateMock).toHaveBeenCalled();
      expect(onSuccess).toHaveBeenCalledWith({ projectId: "p-1", workspaceId: "ws-1" });
    });
  });

  it("resets to catalog after close and reopen", async () => {
    const Host = () => {
      const [open, setOpen] = useState(true);
      return (
        <>
          <button onClick={() => setOpen(true)}>open</button>
          <ProjectTemplateCenterModal
            open={open}
            initialWorkspaceId="ws-1"
            onClose={() => setOpen(false)}
            onSuccess={() => {}}
          />
        </>
      );
    };

    render(<Host />);
    fireEvent.click(await screen.findByRole("button", { name: "Software Development" }));
    fireEvent.click(await screen.findByText("Software Sprint"));
    expect(await screen.findByRole("heading", { name: "Use Template" })).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Close template center"));
    fireEvent.click(screen.getByText("open"));
    expect(
      await screen.findByPlaceholderText("Search by template name or description"),
    ).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Use Template" })).not.toBeInTheDocument();
  });
});

