/**
 * Template Structure Editor
 * MVP: Edit phases and tasks without drag-and-drop
 */

import { useState } from 'react';
import { TemplateStructureDto, PhaseDto, TaskDto } from '@/features/templates/templates.api';

interface TemplateStructureEditorProps {
  structure: TemplateStructureDto;
  onChange: (structure: TemplateStructureDto) => void;
  onSave: () => void;
  saving?: boolean;
  error?: string | null;
}

export function TemplateStructureEditor({
  structure,
  onChange,
  onSave,
  saving = false,
  error = null,
}: TemplateStructureEditorProps) {
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const validate = (): boolean => {
    const errors: string[] = [];

    if (!structure.phases || structure.phases.length === 0) {
      errors.push('At least one phase is required');
    }

    structure.phases?.forEach((phase, phaseIdx) => {
      if (!phase.name || phase.name.trim() === '') {
        errors.push(`Phase ${phaseIdx + 1}: Name is required`);
      }
      if (!phase.reportingKey || phase.reportingKey.trim() === '') {
        errors.push(`Phase ${phaseIdx + 1}: Reporting key is required`);
      }
      if (!phase.tasks || phase.tasks.length === 0) {
        errors.push(`Phase ${phaseIdx + 1}: At least one task is required`);
      }
      phase.tasks?.forEach((task, taskIdx) => {
        if (!task.title || task.title.trim() === '') {
          errors.push(`Phase ${phaseIdx + 1}, Task ${taskIdx + 1}: Title is required`);
        }
      });
    });

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleSave = () => {
    if (validate()) {
      onSave();
    }
  };

  const addPhase = () => {
    const newPhase: PhaseDto = {
      name: `Phase ${(structure.phases?.length || 0) + 1}`,
      reportingKey: `PHASE_${(structure.phases?.length || 0) + 1}`,
      sortOrder: (structure.phases?.length || 0) + 1,
      tasks: [
        {
          title: 'Task 1',
          status: 'TODO',
          sortOrder: 1,
        },
      ],
    };
    onChange({
      phases: [...(structure.phases || []), newPhase],
    });
  };

  const removePhase = (phaseIndex: number) => {
    if (structure.phases && structure.phases.length > 1) {
      const newPhases = structure.phases.filter((_, idx) => idx !== phaseIndex);
      // Reorder sortOrder
      newPhases.forEach((phase, idx) => {
        phase.sortOrder = idx + 1;
      });
      onChange({ phases: newPhases });
    }
  };

  const updatePhase = (phaseIndex: number, updates: Partial<PhaseDto>) => {
    if (!structure.phases) return;
    const newPhases = [...structure.phases];
    newPhases[phaseIndex] = { ...newPhases[phaseIndex], ...updates };
    onChange({ phases: newPhases });
  };

  const addTask = (phaseIndex: number) => {
    if (!structure.phases) return;
    const phase = structure.phases[phaseIndex];
    const newTask: TaskDto = {
      title: `Task ${(phase.tasks?.length || 0) + 1}`,
      status: 'TODO',
      sortOrder: (phase.tasks?.length || 0) + 1,
    };
    const newPhases = [...structure.phases];
    newPhases[phaseIndex] = {
      ...phase,
      tasks: [...(phase.tasks || []), newTask],
    };
    onChange({ phases: newPhases });
  };

  const removeTask = (phaseIndex: number, taskIndex: number) => {
    if (!structure.phases) return;
    const phase = structure.phases[phaseIndex];
    if (phase.tasks && phase.tasks.length > 1) {
      const newTasks = phase.tasks.filter((_, idx) => idx !== taskIndex);
      // Reorder sortOrder
      newTasks.forEach((task, idx) => {
        task.sortOrder = idx + 1;
      });
      const newPhases = [...structure.phases];
      newPhases[phaseIndex] = {
        ...phase,
        tasks: newTasks,
      };
      onChange({ phases: newPhases });
    }
  };

  const updateTask = (phaseIndex: number, taskIndex: number, updates: Partial<TaskDto>) => {
    if (!structure.phases) return;
    const phase = structure.phases[phaseIndex];
    if (!phase.tasks) return;
    const newTasks = [...phase.tasks];
    newTasks[taskIndex] = { ...newTasks[taskIndex], ...updates };
    const newPhases = [...structure.phases];
    newPhases[phaseIndex] = {
      ...phase,
      tasks: newTasks,
    };
    onChange({ phases: newPhases });
  };

  return (
    <div className="space-y-4">
      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <p className="text-sm font-medium text-red-800 mb-1">Validation Errors:</p>
          <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
            {validationErrors.map((error, idx) => (
              <li key={idx}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Error from save */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Phases */}
      <div className="space-y-4">
        {structure.phases?.map((phase, phaseIdx) => (
          <div key={phaseIdx} className="bg-white border border-gray-200 rounded-lg p-4">
            {/* Phase Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phase Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={phase.name}
                    onChange={(e) => updatePhase(phaseIdx, { name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Phase name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reporting Key <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={phase.reportingKey || ''}
                    onChange={(e) => updatePhase(phaseIdx, { reportingKey: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="PLAN, EXECUTE, etc."
                  />
                </div>
              </div>
              <button
                onClick={() => removePhase(phaseIdx)}
                disabled={structure.phases && structure.phases.length <= 1}
                className="ml-4 px-3 py-2 text-sm text-red-600 hover:text-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Remove Phase
              </button>
            </div>

            {/* Tasks */}
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">Tasks</label>
                <button
                  onClick={() => addTask(phaseIdx)}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  + Add Task
                </button>
              </div>

              {phase.tasks?.map((task, taskIdx) => (
                <div key={taskIdx} className="flex items-start gap-2 p-2 bg-gray-50 rounded border border-gray-200">
                  <div className="flex-1 space-y-2">
                    <input
                      type="text"
                      value={task.title}
                      onChange={(e) => updateTask(phaseIdx, taskIdx, { title: e.target.value })}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Task title"
                    />
                    <select
                      value={task.status || 'TODO'}
                      onChange={(e) =>
                        updateTask(phaseIdx, taskIdx, {
                          status: e.target.value as 'TODO' | 'IN_PROGRESS' | 'DONE',
                        })
                      }
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="TODO">TODO</option>
                      <option value="IN_PROGRESS">IN_PROGRESS</option>
                      <option value="DONE">DONE</option>
                    </select>
                  </div>
                  <button
                    onClick={() => removeTask(phaseIdx, taskIdx)}
                    disabled={phase.tasks && phase.tasks.length <= 1}
                    className="px-2 py-1 text-xs text-red-600 hover:text-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Add Phase Button */}
      <button
        onClick={addPhase}
        className="w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:border-blue-500 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        + Add Phase
      </button>

      {/* Save Button */}
      <div className="flex justify-end pt-4 border-t">
        <button
          onClick={handleSave}
          disabled={saving || validationErrors.length > 0}
          className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Save Structure'}
        </button>
      </div>
    </div>
  );
}
