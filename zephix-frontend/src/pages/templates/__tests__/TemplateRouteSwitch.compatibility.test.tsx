import { describe, expect, it, vi, beforeEach } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { render, waitFor } from "@testing-library/react";
import TemplateRouteSwitch from "@/pages/templates/TemplateRouteSwitch";

const openTemplateCenterMock = vi.fn();

vi.mock("@/state/workspace.store", () => ({
  useWorkspaceStore: (selector: (s: { setActiveWorkspace: () => void }) => unknown) =>
    selector({
      setActiveWorkspace: vi.fn(),
    }),
}));

vi.mock("@/state/templateCenterModal.store", () => ({
  useTemplateCenterModalStore: (
    selector: (s: { openTemplateCenter: typeof openTemplateCenterMock }) => unknown,
  ) =>
    selector({
      openTemplateCenter: openTemplateCenterMock,
    }),
}));

describe("TemplateRouteSwitch (modal-only Template Center)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("invokes openTemplateCenter with workspaceId from query for /templates deep links", async () => {
    render(
      <MemoryRouter initialEntries={["/templates?workspaceId=ws-99"]}>
        <Routes>
          <Route path="/templates" element={<TemplateRouteSwitch />} />
          <Route path="/home" element={<div />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(openTemplateCenterMock).toHaveBeenCalledWith("ws-99");
    });
  });
});
