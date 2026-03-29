import { describe, expect, it, beforeEach } from "vitest";
import { useTemplateCenterModalStore } from "../templateCenterModal.store";

describe("templateCenterModal.store", () => {
  beforeEach(() => {
    useTemplateCenterModalStore.setState({
      open: false,
      initialWorkspaceId: undefined,
    });
  });

  it("opens with optional workspace id and closes cleanly", () => {
    useTemplateCenterModalStore.getState().openTemplateCenter("ws-42");
    expect(useTemplateCenterModalStore.getState().open).toBe(true);
    expect(useTemplateCenterModalStore.getState().initialWorkspaceId).toBe("ws-42");

    useTemplateCenterModalStore.getState().closeTemplateCenter();
    expect(useTemplateCenterModalStore.getState().open).toBe(false);
    expect(useTemplateCenterModalStore.getState().initialWorkspaceId).toBeUndefined();
  });
});
