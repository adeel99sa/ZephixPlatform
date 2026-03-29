import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import AdministrationDataManagementPage from "@/features/administration/pages/AdministrationDataManagementPage";

vi.mock("@/features/administration/api/administration.api", () => ({
  administrationApi: {
    getDataManagementSummary: vi.fn().mockResolvedValue({
      storage: { usedBytes: 2048, effectiveBytes: 3072 },
      retention: { attachmentRetentionDays: 30, policySource: "plan_entitlement" },
      residency: { dataRegion: "us-east-1" },
      cleanup: {
        expiredAttachmentPurgeAvailable: true,
        mode: "read_only",
        reason: "Cleanup trigger is available by backend contract but not exposed as destructive Admin UI control in this phase.",
      },
    }),
    getDataManagementExports: vi.fn().mockResolvedValue({
      items: [],
      mode: "read_only",
      reason: "No admin-governed export job contracts are configured in this phase.",
    }),
    getDataManagementRetention: vi.fn().mockResolvedValue({
      attachmentRetentionDays: 30,
      policySource: "plan_entitlement",
      mode: "read_only",
    }),
  },
}));

describe("administration data management contract", () => {
  it("renders source-backed governance summary with read-only sections", async () => {
    render(<AdministrationDataManagementPage />);
    expect(await screen.findByRole("heading", { name: "Data Management" })).toBeInTheDocument();
    expect(screen.getByText(/Read-only in this phase/i)).toBeInTheDocument();
    expect(screen.getByText("us-east-1")).toBeInTheDocument();
    expect(screen.getByText(/Attachment retention source/i)).toBeInTheDocument();
    expect(screen.getByText(/No admin export jobs configured/i)).toBeInTheDocument();
    expect(screen.getByText(/Cleanup trigger is available by backend contract/i)).toBeInTheDocument();
  });
});
