import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import MyWorkPage from "@/pages/my-work/MyWorkPage";

const navigateMock = vi.fn();
const requestGetMock = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual: any = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock("@/lib/api", () => ({
  request: {
    get: (...args: any[]) => requestGetMock(...args),
  },
}));

describe("MyWorkPage contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("clarifies distinction from inbox", async () => {
    requestGetMock.mockResolvedValue({
      version: 1,
      counts: {
        total: 0,
        overdue: 0,
        dueSoon7Days: 0,
        inProgress: 0,
        todo: 0,
        done: 0,
      },
      items: [],
    });
    render(
      <MemoryRouter initialEntries={["/my-tasks"]}>
        <MyWorkPage />
      </MemoryRouter>,
    );
    expect(
      await screen.findByText(/Inbox is for event triage, not task execution/i),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Open Inbox" }));
    expect(navigateMock).toHaveBeenCalledWith("/inbox");
  });

  it("deep-links row click to project task context", async () => {
    requestGetMock.mockResolvedValue({
      version: 1,
      counts: {
        total: 1,
        overdue: 0,
        dueSoon7Days: 0,
        inProgress: 1,
        todo: 0,
        done: 0,
      },
      items: [
        {
          id: "t-1",
          title: "Task 1",
          status: "in_progress",
          dueDate: null,
          updatedAt: new Date().toISOString(),
          projectId: "p-1",
          projectName: "Project 1",
          workspaceId: "w-1",
          workspaceName: "Workspace 1",
        },
      ],
    });
    render(
      <MemoryRouter initialEntries={["/my-tasks"]}>
        <MyWorkPage />
      </MemoryRouter>,
    );
    fireEvent.click(await screen.findByText("Task 1"));
    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith("/projects/p-1?view=list&taskId=t-1");
    });
  });
});

