import {
  useCallback,
  useId,
  useMemo,
  useState,
  type FormEvent,
  type ReactElement,
} from "react";

import { SettingsPageHeader, SettingsSection } from "../components/ui";
import { SETTINGS_TABLE_SELECT_CLASS } from "../constants/memberRoles";

import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/form/Checkbox";
import { Input } from "@/components/ui/input/Input";
import { Modal } from "@/components/ui/overlay/Modal";
import { cn } from "@/lib/utils";

export type FieldTypeOption =
  | "Text"
  | "Number"
  | "Money"
  | "Dropdown"
  | "Date";

export type AppliesToKey = "projects" | "tasks" | "risks" | "gates";

export type CustomFieldRow = {
  id: string;
  fieldName: string;
  fieldType: FieldTypeOption;
  appliesToLabel: string;
  required: boolean;
};

const FIELD_TYPE_OPTIONS: FieldTypeOption[] = [
  "Text",
  "Number",
  "Money",
  "Dropdown",
  "Date",
];

const APPLIES_LABELS: Record<AppliesToKey, string> = {
  projects: "Projects",
  tasks: "Tasks",
  risks: "Risks",
  gates: "Gates",
};

const INITIAL_ROWS: CustomFieldRow[] = [
  {
    id: "cf-mock-1",
    fieldName: "Sponsor Sign-off",
    fieldType: "Dropdown",
    appliesToLabel: "Projects, Gates",
    required: true,
  },
  {
    id: "cf-mock-2",
    fieldName: "Budget Code",
    fieldType: "Text",
    appliesToLabel: "Projects",
    required: false,
  },
  {
    id: "cf-mock-3",
    fieldName: "Residual risk score",
    fieldType: "Number",
    appliesToLabel: "Risks",
    required: false,
  },
];

function rowsEqual(a: CustomFieldRow[], b: CustomFieldRow[]): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function formatAppliesTo(keys: AppliesToKey[]): string {
  return keys.map((k) => APPLIES_LABELS[k]).join(", ");
}

function newFieldId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `cf-local-${crypto.randomUUID()}`;
  }
  return `cf-local-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

type CreateFieldModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (row: Omit<CustomFieldRow, "id">) => void;
};

function CreateFieldModal({
  isOpen,
  onClose,
  onCreate,
}: CreateFieldModalProps): ReactElement {
  const formId = useId();
  const [fieldName, setFieldName] = useState("");
  const [fieldType, setFieldType] = useState<FieldTypeOption>("Text");
  const [applies, setApplies] = useState<Record<AppliesToKey, boolean>>({
    projects: false,
    tasks: false,
    risks: false,
    gates: false,
  });

  const reset = useCallback(() => {
    setFieldName("");
    setFieldType("Text");
    setApplies({
      projects: false,
      tasks: false,
      risks: false,
      gates: false,
    });
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [onClose, reset]);

  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      const name = fieldName.trim();
      const keys = (Object.keys(applies) as AppliesToKey[]).filter(
        (k) => applies[k],
      );
      if (!name || keys.length === 0) return;
      onCreate({
        fieldName: name,
        fieldType,
        appliesToLabel: formatAppliesTo(keys),
        required: false,
      });
      handleClose();
    },
    [applies, fieldName, fieldType, handleClose, onCreate],
  );

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create Field" size="md">
      <form id={formId} className="space-y-5" onSubmit={handleSubmit}>
        <p className="text-sm text-slate-600">
          Global field definitions apply workspace-wide. Template binding happens
          in the template builder.
        </p>
        <Input
          label="Field Name"
          value={fieldName}
          onChange={(e) => setFieldName(e.target.value)}
          placeholder="e.g. Capital approval ID"
          autoComplete="off"
        />
        <div className="space-y-2">
          <label
            htmlFor="create-field-type"
            className="text-sm font-medium text-slate-900"
          >
            Field Type
          </label>
          <select
            id="create-field-type"
            className={cn(SETTINGS_TABLE_SELECT_CLASS, "h-10 w-full max-w-md")}
            value={fieldType}
            onChange={(e) =>
              setFieldType(e.target.value as FieldTypeOption)
            }
            aria-label="Field type"
          >
            {FIELD_TYPE_OPTIONS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-slate-900">
            Applies To
          </legend>
          <p className="text-xs text-slate-500">
            Select which entities can carry this field.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {(Object.keys(APPLIES_LABELS) as AppliesToKey[]).map((key) => (
              <Checkbox
                key={key}
                id={`applies-${key}`}
                label={APPLIES_LABELS[key]}
                checked={applies[key]}
                onChange={(e) =>
                  setApplies((prev) => ({
                    ...prev,
                    [key]: e.target.checked,
                  }))
                }
              />
            ))}
          </div>
        </fieldset>
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <Button type="button" variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit">Add field</Button>
        </div>
      </form>
    </Modal>
  );
}

export default function CustomFieldsSettings(): ReactElement {
  const [rows, setRows] = useState<CustomFieldRow[]>(INITIAL_ROWS);
  const [saved, setSaved] = useState<CustomFieldRow[]>(INITIAL_ROWS);
  const [modalOpen, setModalOpen] = useState(false);

  const dirty = useMemo(() => !rowsEqual(rows, saved), [rows, saved]);

  const handleSave = useCallback(() => {
    setSaved([...rows]);
  }, [rows]);

  const handleCreate = useCallback((row: Omit<CustomFieldRow, "id">) => {
    setRows((prev) => [...prev, { ...row, id: newFieldId() }]);
  }, []);

  const handleDelete = useCallback((id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
  }, []);

  return (
    <div data-settings-custom-fields>
      <SettingsPageHeader
        title="Custom Fields"
        description="Define the global data fields available across projects, tasks, risks, and gates."
        actions={
          <Button type="button" onClick={() => setModalOpen(true)}>
            Create Field
          </Button>
        }
      />

      <SettingsSection title="Field catalog">
        <p className="mb-4 text-sm text-slate-600">
          Global schema only — fields are not attached to templates on this
          screen.
        </p>
        <div className="w-full overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Field name
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Type
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Applies to
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Required
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-slate-100 last:border-0"
                >
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {row.fieldName}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{row.fieldType}</td>
                  <td className="px-4 py-3 text-slate-700">
                    {row.appliesToLabel}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {row.required ? "Yes" : "No"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        className="text-sm font-medium text-slate-400 cursor-not-allowed underline decoration-dotted decoration-slate-300 underline-offset-2"
                        disabled
                        title="Inline editing is not available in this release. Add fields with Create Field or remove them with Delete."
                        aria-label="Edit disabled — inline field editing is not available yet"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
                        onClick={() => handleDelete(row.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Edit is not available yet — field definitions are add-only or removed
          with Delete until inline editing ships. Hover Edit for details.
        </p>
      </SettingsSection>

      <footer className="mt-10 flex justify-end border-t border-slate-200 pt-6">
        <Button type="button" disabled={!dirty} onClick={handleSave}>
          Save Changes
        </Button>
      </footer>

      <CreateFieldModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreate={handleCreate}
      />
    </div>
  );
}
