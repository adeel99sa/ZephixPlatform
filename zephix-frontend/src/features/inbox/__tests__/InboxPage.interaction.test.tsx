import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import InboxPage from "@/pages/InboxPage";

const listMock = vi.fn();
const getMock = vi.fn();
const markReadMock = vi.fn();
const clearMock = vi.fn();
const laterMock = vi.fn();
const filterOptionsMock = vi.fn();
const getProjectApprovalReadinessMock = vi.fn();
const navigateMock = vi.fn();
const useAuthMock = vi.fn(() => ({ user: { platformRole: "MEMBER" } }));

vi.mock("@/features/inbox/api", () => ({
  inboxApi: {
    list: (...args: any[]) => listMock(...args),
    get: (...args: any[]) => getMock(...args),
    markRead: (...args: any[]) => markReadMock(...args),
    clear: (...args: any[]) => clearMock(...args),
    later: (...args: any[]) => laterMock(...args),
    filterOptions: (...args: any[]) => filterOptionsMock(...args),
  },
}));

vi.mock("@/state/AuthContext", () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock("@/features/projects/governance.api", () => ({
  getProjectApprovalReadiness: (...args: any[]) =>
    getProjectApprovalReadinessMock(...args),
}));

vi.mock("react-router-dom", async () => {
  const actual: any = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

describe("InboxPage interactions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthMock.mockReturnValue({ user: { platformRole: "MEMBER" } });
    filterOptionsMock.mockResolvedValue({
      types: ["approval_request", "task_assignment"],
      severities: ["low", "medium", "high"],
      statuses: ["unread", "read", "later", "cleared"],
      projects: [{ id: "p-1", name: "Project 1" }],
    });
    listMock.mockResolvedValue({
      items: [
        {
          id: "i-1",
          tab: "primary",
          type: "approval_request",
          title: "Approval required",
          summary: "Phase gate pending",
          sourceProjectId: "p-1",
          sourceProjectName: "Project 1",
          sourceWorkspaceId: "w-1",
          sourceSurface: "Approvals",
          time: new Date().toISOString(),
          status: "unread",
          severity: "high",
          read: false,
          actionRequired: true,
          availableActions: ["open_source", "mark_read", "move_later", "clear"],
          deepLink: "/projects/p-1/approvals",
          metadata: {},
        },
      ],
      total: 1,
    });
    getMock.mockResolvedValue({
      id: "i-1",
      tab: "primary",
      type: "approval_request",
      title: "Approval required",
      summary: "Phase gate pending",
      sourceProjectId: "p-1",
      sourceProjectName: "Project 1",
      sourceWorkspaceId: "w-1",
      sourceSurface: "Approvals",
      time: new Date().toISOString(),
      status: "unread",
      severity: "high",
      read: false,
      actionRequired: true,
      availableActions: ["open_source", "mark_read", "move_later", "clear"],
      deepLink: "/projects/p-1/approvals",
      metadata: {},
    });
    markReadMock.mockResolvedValue({ success: true });
    clearMock.mockResolvedValue({ success: true });
    laterMock.mockResolvedValue({ success: true, deferredUntil: new Date().toISOString() });
    getProjectApprovalReadinessMock.mockResolvedValue({
      items: [{ approvalId: "a-1", status: "not_ready", blockingReasons: ["Open dependency"] }],
    });
  });

  function renderPage() {
    return render(
      <MemoryRouter initialEntries={["/inbox"]}>
        <InboxPage />
      </MemoryRouter>,
    );
  }

  it("renders tabs and opens detail panel on item click", async () => {
    renderPage();
    expect(await screen.findByText("Priority")).toBeInTheDocument();
    expect(screen.getByText("Activity")).toBeInTheDocument();
    fireEvent.click(await screen.findByText("Approval required"));
    await waitFor(() => expect(getMock).toHaveBeenCalledWith("i-1"));
    expect(await screen.findByText("Event summary")).toBeInTheDocument();
  });

  it("switches tabs and applies filters", async () => {
    renderPage();
    fireEvent.click(await screen.findByText("Activity"));
    await waitFor(() => {
      expect(listMock).toHaveBeenCalledWith(expect.objectContaining({ tab: "other" }));
    });

    fireEvent.change(screen.getByLabelText("Type"), { target: { value: "task_assignment" } });
    await waitFor(() => {
      expect(listMock).toHaveBeenCalledWith(
        expect.objectContaining({ type: "task_assignment" }),
      );
    });
  });

  it("shows per-tab empty state", async () => {
    listMock.mockResolvedValue({ items: [], total: 0 });
    renderPage();
    expect(await screen.findByText("No priority items")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Activity/i }));
    expect(await screen.findByText("No activity items")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Snoozed/i }));
    expect(await screen.findByText("No snoozed items")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Resolved/i }));
    expect(await screen.findByText("No resolved items")).toBeInTheDocument();
  });

  it("shows filtered-results empty state and clear-filters action", async () => {
    listMock.mockResolvedValue({ items: [], total: 0 });
    renderPage();

    fireEvent.change(screen.getByLabelText("Type"), { target: { value: "task_assignment" } });
    expect(await screen.findByText("No matching inbox items")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    await waitFor(() => {
      expect(screen.getByLabelText("Type")).toHaveValue("all");
    });
  });

  it("calls item action handlers from detail panel", async () => {
    listMock.mockResolvedValue({
      items: [
        {
          id: "i-1",
          tab: "primary",
          type: "approval_request",
          title: "Approval required",
          summary: "Phase gate pending",
          sourceProjectId: "p-1",
          sourceProjectName: "Project 1",
          sourceWorkspaceId: "w-1",
          sourceSurface: "Approvals",
          time: new Date().toISOString(),
          status: "unread",
          severity: "high",
          read: false,
          actionRequired: true,
          availableActions: ["open_source", "mark_read", "move_later", "clear"],
          deepLink: "/projects/p-1/approvals",
          metadata: {},
        },
      ],
      total: 1,
    });
    renderPage();
    fireEvent.click(await screen.findByText("Approval required"));
    await waitFor(() => expect(getMock).toHaveBeenCalledWith("i-1"));
    fireEvent.click(await screen.findByRole("button", { name: "Mark read" }));
    await waitFor(() => expect(markReadMock).toHaveBeenCalledWith("i-1"));

    fireEvent.click(await screen.findByRole("button", { name: "Snooze" }));
    await waitFor(() => expect(laterMock).toHaveBeenCalledWith("i-1"));

    fireEvent.click(await screen.findByRole("button", { name: "Clear" }));
    await waitFor(() => expect(clearMock).toHaveBeenCalledWith("i-1"));
  });

  it("viewer gets read-only action bar", async () => {
    useAuthMock.mockReturnValue({ user: { platformRole: "VIEWER" } });
    renderPage();
    fireEvent.click(await screen.findByText("Approval required"));
    await waitFor(() => expect(getMock).toHaveBeenCalledWith("i-1"));
    expect(screen.queryByRole("button", { name: "Mark read" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Snooze" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Clear" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open source object" })).toBeInTheDocument();
  });

  it("does not trigger unrelated template modal content", async () => {
    renderPage();
    expect(await screen.findByTestId("inbox-page")).toBeInTheDocument();
    expect(screen.queryByText(/Template Center/i)).not.toBeInTheDocument();
  });

  it("keeps unread items first when unread-first is enabled", async () => {
    listMock.mockResolvedValue({
      items: [
        {
          id: "i-read",
          tab: "primary",
          type: "system_alert",
          title: "Read item",
          summary: null,
          sourceProjectId: null,
          sourceProjectName: null,
          sourceWorkspaceId: "w-1",
          sourceSurface: "System",
          time: new Date().toISOString(),
          status: "read",
          severity: "low",
          read: true,
          actionRequired: false,
          availableActions: ["open_source"],
          deepLink: "/home",
          metadata: {},
        },
        {
          id: "i-unread",
          tab: "primary",
          type: "task_assignment",
          title: "Unread item",
          summary: null,
          sourceProjectId: "p-1",
          sourceProjectName: "Project 1",
          sourceWorkspaceId: "w-1",
          sourceSurface: "Execution",
          time: new Date().toISOString(),
          status: "unread",
          severity: "medium",
          read: false,
          actionRequired: true,
          availableActions: ["open_source", "mark_read"],
          deepLink: "/projects/p-1?view=list&taskId=t-1",
          metadata: {},
        },
      ],
      total: 2,
    });
    renderPage();
    const unread = await screen.findByText("Unread item");
    const read = await screen.findByText("Read item");
    expect(unread).toBeInTheDocument();
    expect(read).toBeInTheDocument();
    expect(
      unread.compareDocumentPosition(read) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("opens source object using inbox deep link", async () => {
    renderPage();
    fireEvent.click(await screen.findByText("Approval required"));
    await screen.findByText("Event summary");
    fireEvent.click(screen.getByRole("button", { name: "Open source object" }));
    expect(navigateMock).toHaveBeenCalledWith("/projects/p-1/approvals");
  });

  it("clears selected detail when clear action removes item from current tab", async () => {
    listMock
      .mockResolvedValueOnce({
        items: [
          {
            id: "i-1",
            tab: "primary",
            type: "approval_request",
            title: "Approval required",
            summary: "Phase gate pending",
            sourceProjectId: "p-1",
            sourceProjectName: "Project 1",
            sourceWorkspaceId: "w-1",
            sourceSurface: "Approvals",
            time: new Date().toISOString(),
            status: "unread",
            severity: "high",
            read: false,
            actionRequired: true,
            availableActions: ["open_source", "mark_read", "move_later", "clear"],
            deepLink: "/projects/p-1/approvals",
            metadata: {},
          },
        ],
        total: 1,
      })
      .mockResolvedValueOnce({
        items: [
          {
            id: "i-1",
            tab: "primary",
            type: "approval_request",
            title: "Approval required",
            summary: "Phase gate pending",
            sourceProjectId: "p-1",
            sourceProjectName: "Project 1",
            sourceWorkspaceId: "w-1",
            sourceSurface: "Approvals",
            time: new Date().toISOString(),
            status: "unread",
            severity: "high",
            read: false,
            actionRequired: true,
            availableActions: ["open_source", "mark_read", "move_later", "clear"],
            deepLink: "/projects/p-1/approvals",
            metadata: {},
          },
        ],
        total: 1,
      })
      .mockResolvedValueOnce({
        items: [],
        total: 0,
      })
      .mockResolvedValueOnce({
        items: [],
        total: 0,
      });

    renderPage();
    fireEvent.click(await screen.findByText("Approval required"));
    await screen.findByText("Event summary");
    fireEvent.click(screen.getByRole("button", { name: "Clear" }));

    expect(await screen.findByText("Select an inbox item")).toBeInTheDocument();
  });
});

