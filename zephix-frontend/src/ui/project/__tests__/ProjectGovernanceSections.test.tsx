import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { ReactNode } from "react";
import {
  ProjectApprovalsSection,
  ProjectPlanDependencyStrip,
  ProjectRaidSection,
  ProjectReportsSection,
} from "@/ui/project/ProjectSectionPlaceholders";

const listProjectApprovalsMock = vi.fn();
const getProjectApprovalReadinessMock = vi.fn();
const getProjectApprovalMock = vi.fn();
const submitProjectApprovalMock = vi.fn();
const decideProjectApprovalMock = vi.fn();
const listProjectRaidMock = vi.fn();
const createProjectRaidItemMock = vi.fn();
const listProjectReportsMock = vi.fn();
const createProjectReportMock = vi.fn();
const getProjectDependenciesMock = vi.fn();
const useAuthMock = vi.fn(() => ({ user: { platformRole: "MEMBER" } }));

vi.mock("@/features/projects/governance.api", () => ({
  listProjectApprovals: (...args: any[]) => listProjectApprovalsMock(...args),
  getProjectApprovalReadiness: (...args: any[]) => getProjectApprovalReadinessMock(...args),
  getProjectApproval: (...args: any[]) => getProjectApprovalMock(...args),
  submitProjectApproval: (...args: any[]) => submitProjectApprovalMock(...args),
  decideProjectApproval: (...args: any[]) => decideProjectApprovalMock(...args),
  listProjectRaid: (...args: any[]) => listProjectRaidMock(...args),
  createProjectRaidItem: (...args: any[]) => createProjectRaidItemMock(...args),
  listProjectReports: (...args: any[]) => listProjectReportsMock(...args),
  createProjectReport: (...args: any[]) => createProjectReportMock(...args),
  getProjectDependencies: (...args: any[]) => getProjectDependenciesMock(...args),
}));
vi.mock("@/state/AuthContext", () => ({
  useAuth: () => useAuthMock(),
}));

function renderAtProject(element: ReactNode) {
  return render(
    <MemoryRouter initialEntries={["/projects/p-1/approvals"]}>
      <Routes>
        <Route path="/projects/:projectId/approvals" element={element} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ProjectGovernanceSections", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders approvals table and opens detail", async () => {
    listProjectApprovalsMock.mockResolvedValue({
      items: [
        {
          id: "a1",
          phase: "Planning Gate",
          approvalType: "phase_gate",
          status: "DRAFT",
          requestorUserId: "u1",
          submittedAt: null,
          decidedAt: null,
        },
      ],
    });
    getProjectApprovalReadinessMock.mockResolvedValue({
      items: [{ approvalId: "a1", ready: false, blockingReasons: ["Missing evidence"] }],
    });
    getProjectApprovalMock.mockResolvedValue({
      id: "a1",
      phase: "Planning Gate",
      status: "DRAFT",
      requestorUserId: "u1",
      approvers: [],
      linkedEvidence: [],
      blockingReasons: ["Missing evidence"],
      missingApprovers: [],
      missingEvidence: ["1 required document(s) still missing"],
      openDependencies: [],
      history: [],
    });

    renderAtProject(<ProjectApprovalsSection />);
    expect(await screen.findByText("Approvals Governance Queue")).toBeInTheDocument();
    expect((await screen.findAllByText("Blocked")).length).toBeGreaterThan(0);
    expect(await screen.findByText("1")).toBeInTheDocument();
    fireEvent.click(await screen.findByText("Open"));
    expect(await screen.findByText(/Approval overview/i)).toBeInTheDocument();
    expect(await screen.findByText(/Required evidence/i)).toBeInTheDocument();
    expect(await screen.findByText(/Missing approvers/i)).toBeInTheDocument();
    expect(await screen.findByText(/Open dependencies/i)).toBeInTheDocument();
    expect(await screen.findByText(/Decision history/i)).toBeInTheDocument();
  });

  it("renders approvals empty state", async () => {
    listProjectApprovalsMock.mockResolvedValue({ items: [] });
    getProjectApprovalReadinessMock.mockResolvedValue({ items: [] });
    renderAtProject(<ProjectApprovalsSection />);
    expect(await screen.findByText("No approvals yet for this project")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create approval request" })).toBeInTheDocument();
  });

  it("shows submit failure message inline", async () => {
    listProjectApprovalsMock.mockResolvedValue({
      items: [{ id: "a1", phase: "Planning Gate", approvalType: "phase_gate", status: "DRAFT", requestorUserId: "u1", submittedAt: null, decidedAt: null }],
    });
    getProjectApprovalReadinessMock.mockResolvedValue({
      items: [{ approvalId: "a1", ready: false, blockingReasons: ["Open dependency"] }],
    });
    getProjectApprovalMock.mockResolvedValue({
      id: "a1",
      phase: "Planning Gate",
      status: "DRAFT",
      requestorUserId: "u1",
      approvers: [],
      linkedEvidence: [],
      blockingReasons: [],
      missingApprovers: [],
      missingEvidence: [],
      openDependencies: [],
      history: [],
    });
    submitProjectApprovalMock.mockRejectedValue({
      response: { data: { message: { message: "Approval cannot be submitted", blockingReasons: ["Open task dependencies"] } } },
    });

    renderAtProject(<ProjectApprovalsSection />);
    fireEvent.click(await screen.findByText("Open"));
    fireEvent.click(await screen.findByRole("button", { name: "Submit" }));
    expect(await screen.findByText(/Approval cannot be submitted/i)).toBeInTheDocument();
  });

  it("filters RAID by type and shows per-filter empty state", async () => {
    listProjectRaidMock.mockResolvedValue({
      items: [
        {
          id: "r1",
          source: "risk",
          type: "RISK",
          title: "Supplier delay",
          description: null,
          status: "OPEN",
          ownerUserId: null,
          severity: "HIGH",
          dueDate: null,
          linkedTaskCount: 0,
          linkedDocCount: 0,
          updatedAt: new Date().toISOString(),
        },
      ],
    });

    renderAtProject(<ProjectRaidSection />);
    expect(await screen.findByText("RAID Register")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Actions" }));
    expect(screen.queryByText("Supplier delay")).not.toBeInTheDocument();
    expect(screen.getByText("No actions")).toBeInTheDocument();
  });

  it("renders reports empty state and create action", async () => {
    listProjectReportsMock.mockResolvedValue({ items: [] });
    createProjectReportMock.mockResolvedValue({
      id: "rep-1",
      title: "Weekly report",
      phase: "Execution",
      overallStatus: "AMBER",
      scheduleStatus: "AMBER",
      resourceStatus: "GREEN",
      executiveSummary: "",
      currentActivities: "",
      nextWeekActivities: "",
      helpNeeded: "",
    });

    renderAtProject(<ProjectReportsSection />);
    expect(await screen.findByText("No reports yet for this project")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Create Report" }));
    await waitFor(() => {
      expect(createProjectReportMock).toHaveBeenCalled();
    });
  });

  it("shows dependency strip counts", async () => {
    getProjectDependenciesMock.mockResolvedValue({
      blockedCount: 2,
      dependencies: [{ id: "d1" }, { id: "d2" }],
    });
    getProjectApprovalReadinessMock.mockResolvedValue({
      items: [{ approvalId: "a-1", status: "not_ready" }],
    });
    renderAtProject(<ProjectPlanDependencyStrip />);
    expect(await screen.findByText(/Open dependencies: 2/)).toBeInTheDocument();
    expect(await screen.findByText(/Blocked tasks: 2/)).toBeInTheDocument();
    expect(await screen.findByText(/Approval readiness: 1 not ready/)).toBeInTheDocument();
  });

  it("disables mutation actions in viewer mode", async () => {
    useAuthMock.mockReturnValue({ user: { platformRole: "VIEWER" } });
    listProjectReportsMock.mockResolvedValue({ items: [] });
    renderAtProject(<ProjectReportsSection />);
    const createButton = await screen.findByRole("button", { name: "Create Report" });
    expect(createButton).toBeDisabled();
    useAuthMock.mockReturnValue({ user: { platformRole: "MEMBER" } });
  });
});
