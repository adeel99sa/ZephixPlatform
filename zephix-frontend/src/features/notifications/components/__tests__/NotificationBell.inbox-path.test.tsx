import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { NotificationBell } from "@/features/notifications/components/NotificationBell";

const navigateMock = vi.fn();
const useUnreadCountMock = vi.fn(() => ({ data: 3 }));
const useNotificationsMock = vi.fn(() => ({
  data: {
    items: [
      {
        id: "n-1",
        title: "Task assigned",
        isRead: false,
        createdAt: new Date().toISOString(),
        priority: "normal",
        workspaceId: "w-1",
        data: { projectId: "p-1" },
      },
    ],
  },
}));
const useMarkAsReadMock = vi.fn(() => ({ mutate: vi.fn() }));
const useMarkAllAsReadMock = vi.fn(() => ({ mutate: vi.fn() }));

vi.mock("react-router-dom", async () => {
  const actual: any = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock("@/features/notifications/api/useNotifications", () => ({
  useUnreadCount: () => useUnreadCountMock(),
  useNotifications: () => useNotificationsMock(),
  useMarkAsRead: () => useMarkAsReadMock(),
  useMarkAllAsRead: () => useMarkAllAsReadMock(),
}));

describe("NotificationBell inbox handoff", () => {
  it("routes View All to /inbox", async () => {
    render(
      <MemoryRouter>
        <NotificationBell />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByTestId("notification-bell"));
    fireEvent.click(await screen.findByRole("button", { name: /view all/i }));

    expect(navigateMock).toHaveBeenCalledWith("/inbox");
  });
});

