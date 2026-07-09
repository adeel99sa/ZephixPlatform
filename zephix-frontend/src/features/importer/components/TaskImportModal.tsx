import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, CheckCircle2, FileUp, Loader2, Upload } from 'lucide-react';

import { Modal } from '@/components/ui/overlay/Modal';
import { Button } from '@/components/ui/button/Button';
import {
  analyzeCsvFile,
  executeCsvImport,
  validateCsvFileClient,
} from '../importer.api';
import {
  importErrorMessage,
  isFileTokenExpiredError,
  SKIP_REASON_COPY,
} from '../importer.errors';
import {
  applyPresetMapping,
  buildApiMapping,
  createEmptyUiMapping,
  groupSkippedByReason,
  isTitleMapped,
  sampleValueForColumn,
} from '../importer.mapping';
import {
  IMPORT_MAPPING_FIELDS,
  type AnalyzeCsvResult,
  type ExecuteCsvResult,
  type ImportMappingField,
  type ImportUiMapping,
} from '../importer.types';

type ImportStep = 'upload' | 'mapping' | 'dry-run' | 'executing' | 'result';

type Props = {
  open: boolean;
  onClose: () => void;
  projectId: string;
  workspaceId: string;
  onImportComplete: () => void;
};

export function TaskImportModal({
  open,
  onClose,
  projectId,
  workspaceId,
  onImportComplete,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<ImportStep>('upload');
  const [analyzeResult, setAnalyzeResult] = useState<AnalyzeCsvResult | null>(null);
  const [uiMapping, setUiMapping] = useState<ImportUiMapping>(createEmptyUiMapping);
  const [dryRunResult, setDryRunResult] = useState<ExecuteCsvResult | null>(null);
  const [executeResult, setExecuteResult] = useState<ExecuteCsvResult | null>(null);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [tokenExpiredNotice, setTokenExpiredNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const resetState = useCallback(() => {
    setStep('upload');
    setAnalyzeResult(null);
    setUiMapping(createEmptyUiMapping());
    setDryRunResult(null);
    setExecuteResult(null);
    setInlineError(null);
    setTokenExpiredNotice(null);
    setBusy(false);
    setDragActive(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  useEffect(() => {
    if (!open) {
      resetState();
    }
  }, [open, resetState]);

  const handleTokenExpiry = useCallback(() => {
    setTokenExpiredNotice(
      'Your upload session expired after 30 minutes. Upload the CSV again to continue.',
    );
    setAnalyzeResult(null);
    setDryRunResult(null);
    setExecuteResult(null);
    setUiMapping(createEmptyUiMapping());
    setStep('upload');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const processFile = useCallback(
    async (file: File) => {
      setInlineError(null);
      setTokenExpiredNotice(null);

      const clientError = validateCsvFileClient(file);
      if (clientError) {
        setInlineError(clientError);
        return;
      }

      setBusy(true);
      try {
        const result = await analyzeCsvFile(file, workspaceId);
        setAnalyzeResult(result);
        setUiMapping(applyPresetMapping(result));
        setStep('mapping');
      } catch (err) {
        setInlineError(importErrorMessage(err));
      } finally {
        setBusy(false);
      }
    },
    [workspaceId],
  );

  const runDryRun = useCallback(async () => {
    if (!analyzeResult) return;
    const mapping = buildApiMapping(uiMapping);
    if (!mapping) {
      setInlineError('Map the Title column before continuing.');
      return;
    }

    setInlineError(null);
    setBusy(true);
    try {
      const result = await executeCsvImport({
        projectId,
        workspaceId,
        mapping,
        dryRun: true,
        fileToken: analyzeResult.fileToken,
      });
      setDryRunResult(result);
      setStep('dry-run');
    } catch (err) {
      if (isFileTokenExpiredError(err)) {
        handleTokenExpiry();
        return;
      }
      setInlineError(importErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }, [analyzeResult, uiMapping, projectId, workspaceId, handleTokenExpiry]);

  const runExecute = useCallback(async () => {
    if (!analyzeResult || !dryRunResult) return;
    const mapping = buildApiMapping(uiMapping);
    if (!mapping) return;

    setInlineError(null);
    setStep('executing');
    setBusy(true);
    try {
      const result = await executeCsvImport({
        projectId,
        workspaceId,
        mapping,
        dryRun: false,
        fileToken: analyzeResult.fileToken,
      });
      setExecuteResult(result);
      setStep('result');
    } catch (err) {
      if (isFileTokenExpiredError(err)) {
        handleTokenExpiry();
        return;
      }
      setInlineError(
        'Import could not be completed. No tasks were created — try again or upload a fresh CSV.',
      );
      setStep('dry-run');
    } finally {
      setBusy(false);
    }
  }, [
    analyzeResult,
    dryRunResult,
    uiMapping,
    projectId,
    workspaceId,
    handleTokenExpiry,
  ]);

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void processFile(file);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void processFile(file);
  };

  const setMappingField = (field: ImportMappingField, value: string) => {
    setUiMapping((prev) => ({
      ...prev,
      [field]: value === '' ? null : Number(value),
    }));
  };

  const handleViewTasks = () => {
    onImportComplete();
    onClose();
  };

  if (!open || typeof document === 'undefined') return null;

  const title =
    step === 'upload'
      ? 'Import tasks'
      : step === 'mapping'
        ? 'Map columns'
        : step === 'dry-run' || step === 'executing'
          ? 'Review import'
          : 'Import complete';

  return createPortal(
    <div data-testid="task-import-modal">
      <Modal
        isOpen={open}
        onClose={onClose}
        title={title}
        size="lg"
        closeOnOverlayClick={!busy}
        contentClassName="space-y-4"
      >
        {tokenExpiredNotice ? (
          <div
            className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
            data-testid="import-token-expired"
          >
            {tokenExpiredNotice}
          </div>
        ) : null}

        {inlineError ? (
          <div
            className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
            data-testid="import-inline-error"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>{inlineError}</span>
          </div>
        ) : null}

        {step === 'upload' ? (
          <UploadStep
            busy={busy}
            dragActive={dragActive}
            fileInputRef={fileInputRef}
            onBrowse={() => fileInputRef.current?.click()}
            onDragEnter={() => setDragActive(true)}
            onDragLeave={() => setDragActive(false)}
            onDrop={onDrop}
            onFileInputChange={onFileInputChange}
          />
        ) : null}

        {step === 'mapping' && analyzeResult ? (
          <MappingStep
            analyze={analyzeResult}
            mapping={uiMapping}
            onChange={setMappingField}
          />
        ) : null}

        {(step === 'dry-run' || step === 'executing') && dryRunResult ? (
          <DryRunStep result={dryRunResult} executing={step === 'executing' || busy} />
        ) : null}

        {step === 'result' && executeResult ? (
          <ResultStep result={executeResult} dryRun={dryRunResult} />
        ) : null}

        <div className="flex items-center justify-between gap-3 border-t border-slate-200 pt-4">
          <div className="text-xs text-slate-500">
            {analyzeResult ? `${analyzeResult.rowCount} rows detected` : 'CSV only · 5 MB max'}
          </div>
          <div className="flex items-center gap-2">
            {step === 'mapping' ? (
              <>
                <Button variant="outline" onClick={() => setStep('upload')} disabled={busy}>
                  Back
                </Button>
                <Button
                  onClick={() => void runDryRun()}
                  disabled={busy || !isTitleMapped(uiMapping)}
                  data-testid="import-mapping-next"
                >
                  Next
                </Button>
              </>
            ) : null}

            {step === 'dry-run' && dryRunResult ? (
              <>
                <Button variant="outline" onClick={() => setStep('mapping')} disabled={busy}>
                  Back
                </Button>
                <Button
                  onClick={() => void runExecute()}
                  disabled={busy || dryRunResult.importable === 0}
                  data-testid="import-execute-button"
                >
                  Import {dryRunResult.importable} task{dryRunResult.importable === 1 ? '' : 's'}
                </Button>
              </>
            ) : null}

            {step === 'result' ? (
              <Button onClick={handleViewTasks} data-testid="import-view-tasks">
                View tasks
              </Button>
            ) : null}

            {step === 'upload' || step === 'executing' ? (
              <Button variant="outline" onClick={onClose} disabled={busy}>
                Cancel
              </Button>
            ) : null}
          </div>
        </div>
      </Modal>
    </div>,
    document.body,
  );
}

function UploadStep({
  busy,
  dragActive,
  fileInputRef,
  onBrowse,
  onDragEnter,
  onDragLeave,
  onDrop,
  onFileInputChange,
}: {
  busy: boolean;
  dragActive: boolean;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onBrowse: () => void;
  onDragEnter: () => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onFileInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600">
        Upload a CSV export from ClickUp, Asana, or any spreadsheet with a header row.
      </p>
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') onBrowse();
        }}
        onDragEnter={(e) => {
          e.preventDefault();
          onDragEnter();
        }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={(e) => {
          e.preventDefault();
          onDragLeave();
        }}
        onDrop={onDrop}
        onClick={onBrowse}
        data-testid="import-dropzone"
        className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors ${
          dragActive
            ? 'border-indigo-400 bg-indigo-50'
            : 'border-slate-300 bg-slate-50 hover:border-indigo-300 hover:bg-indigo-50/40'
        }`}
      >
        {busy ? (
          <Loader2 className="mb-2 h-8 w-8 animate-spin text-indigo-600" aria-hidden />
        ) : (
          <Upload className="mb-2 h-8 w-8 text-slate-400" aria-hidden />
        )}
        <p className="text-sm font-medium text-slate-800">
          {busy ? 'Analyzing file…' : 'Drag and drop a CSV file'}
        </p>
        <p className="mt-1 text-xs text-slate-500">or click to browse · 5 MB max</p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={onFileInputChange}
          data-testid="import-file-input"
        />
      </div>
    </div>
  );
}

function MappingStep({
  analyze,
  mapping,
  onChange,
}: {
  analyze: AnalyzeCsvResult;
  mapping: ImportUiMapping;
  onChange: (field: ImportMappingField, value: string) => void;
}) {
  return (
    <div className="space-y-4" data-testid="import-mapping-step">
      {analyze.detectedPreset !== 'generic' ? (
        <p className="text-sm text-slate-600">
          Detected {analyze.detectedPreset === 'clickup' ? 'ClickUp' : 'Asana'} export — columns
          were pre-mapped where possible.
        </p>
      ) : null}

      <div className="space-y-3">
        {IMPORT_MAPPING_FIELDS.map((field) => (
          <div key={field.key} className="grid gap-1 sm:grid-cols-[140px_1fr] sm:items-start">
            <label
              htmlFor={`import-map-${field.key}`}
              className="text-sm font-medium text-slate-700"
            >
              {field.label}
              {field.required ? <span className="text-red-600"> *</span> : null}
            </label>
            <div>
              <select
                id={`import-map-${field.key}`}
                value={mapping[field.key] ?? ''}
                onChange={(e) => onChange(field.key, e.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
                data-testid={`import-map-${field.key}`}
              >
                <option value="">— Not mapped —</option>
                {analyze.columns.map((col, index) => (
                  <option key={`${col}-${index}`} value={index}>
                    {col}
                  </option>
                ))}
              </select>
              <p
                className="mt-1 text-xs text-slate-500"
                data-testid={`import-map-preview-${field.key}`}
              >
                Sample: {sampleValueForColumn(analyze.sampleRows, mapping[field.key])}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DryRunStep({
  result,
  executing,
}: {
  result: ExecuteCsvResult;
  executing: boolean;
}) {
  const grouped = groupSkippedByReason(result.skipped);

  return (
    <div className="space-y-4" data-testid="import-dry-run-step">
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm text-slate-800">
          <span className="font-semibold">{result.importable}</span> of{' '}
          <span className="font-semibold">{result.totalRows}</span> rows will import as tasks.
        </p>
      </div>

      {grouped.size > 0 ? (
        <div className="space-y-3">
          <p className="text-sm font-medium text-slate-700">Rows with adjustments</p>
          {Array.from(grouped.entries()).map(([reason, rows]) => (
            <div
              key={reason}
              className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2"
              data-testid={`import-skip-group-${reason}`}
            >
              <p className="text-sm text-amber-900">
                {SKIP_REASON_COPY[reason] ?? reason}
              </p>
              <p className="mt-1 text-xs text-amber-800">Rows: {rows.join(', ')}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-600">No adjustments needed — ready to import.</p>
      )}

      {executing ? (
        <div className="flex items-center gap-2 text-sm text-slate-600" data-testid="import-executing">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Importing tasks…
        </div>
      ) : null}
    </div>
  );
}

function ResultStep({
  result,
  dryRun,
}: {
  result: ExecuteCsvResult;
  dryRun: ExecuteCsvResult | null;
}) {
  const grouped = groupSkippedByReason(dryRun?.skipped ?? result.skipped);

  return (
    <div className="space-y-4" data-testid="import-result-step">
      <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4">
        <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" aria-hidden />
        <div>
          <p className="font-medium text-green-900">
            Created {result.created} task{result.created === 1 ? '' : 's'}
          </p>
          {grouped.size > 0 ? (
            <p className="mt-1 text-sm text-green-800">
              Some rows used defaults (see recap below).
            </p>
          ) : null}
        </div>
      </div>

      {grouped.size > 0 ? (
        <div className="space-y-2">
          {Array.from(grouped.entries()).map(([reason, rows]) => (
            <div key={reason} className="text-sm text-slate-600">
              <FileUp className="mr-1 inline h-3.5 w-3.5" aria-hidden />
              {SKIP_REASON_COPY[reason] ?? reason} — rows {rows.join(', ')}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
