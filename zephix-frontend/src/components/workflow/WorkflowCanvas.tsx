import React, { useState, useCallback, useRef } from 'react';
import { 
  Plus, 
  ArrowRight, 
  Trash2, 
  Edit3,
  Zap,
  Shield,
  Folder,
  Inbox,
  CheckCircle
} from 'lucide-react';
import type { WorkflowStage, WorkflowTemplate } from '../../types/workflow';
import { Button } from '../ui/Button';

const STAGE_TYPE_CONFIG = {
  intake_stage: { 
    color: 'purple', 
    icon: Inbox, 
    bgClass: 'bg-purple-500/10 border-purple-500/20 hover:border-purple-500/40',
    textClass: 'text-purple-400',
    iconClass: 'text-purple-400'
  },
  project_phase: { 
    color: 'blue', 
    icon: Folder,
    bgClass: 'bg-blue-500/10 border-blue-500/20 hover:border-blue-500/40',
    textClass: 'text-blue-400',
    iconClass: 'text-blue-400'
  },
  approval_gate: { 
    color: 'amber', 
    icon: Shield,
    bgClass: 'bg-amber-500/10 border-amber-500/20 hover:border-amber-500/40',
    textClass: 'text-amber-400',
    iconClass: 'text-amber-400'
  },
  orr_section: { 
    color: 'green', 
    icon: CheckCircle,
    bgClass: 'bg-green-500/10 border-green-500/20 hover:border-green-500/40',
    textClass: 'text-green-400',
    iconClass: 'text-green-400'
  }
};

interface StageNodeProps {
  stage: WorkflowStage;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  onClick?: (stage: WorkflowStage) => void;
  onEdit?: (stage: WorkflowStage) => void;
  onDelete?: (stageId: string) => void;
  readonly?: boolean;
}

const StageNode: React.FC<StageNodeProps> = ({
  stage,
  index,
  isFirst,
  isLast,
  onClick,
  onEdit,
  onDelete,
  readonly = false
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const config = STAGE_TYPE_CONFIG[stage.type];
  const Icon = config.icon;

  const handleClick = () => {
    if (onClick) {
      onClick(stage);
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEdit) {
      onEdit(stage);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete && confirm(`Are you sure you want to delete the stage "${stage.name}"?`)) {
      onDelete(stage.id);
    }
  };

  return (
    <div 
      className="relative group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Stage Node */}
      <div
        onClick={handleClick}
        className={`
          relative border rounded-xl p-4 min-w-[200px] cursor-pointer transition-all duration-200
          ${config.bgClass}
          ${isHovered ? 'transform scale-105 shadow-lg' : ''}
        `}
      >
        {/* Stage Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Icon className={`w-5 h-5 ${config.iconClass}`} />
            <span className={`text-xs font-medium uppercase tracking-wide ${config.textClass}`}>
              {stage.type.replace('_', ' ')}
            </span>
          </div>
          
          {!readonly && isHovered && (
            <div className="flex items-center space-x-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleEdit}
                className="h-6 w-6 p-0 opacity-70 hover:opacity-100"
              >
                <Edit3 className="w-3 h-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDelete}
                className="h-6 w-6 p-0 opacity-70 hover:opacity-100 text-red-400 hover:text-red-300"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          )}
        </div>

        {/* Stage Name */}
        <h3 className="text-white font-semibold text-sm mb-2 line-clamp-2">
          {stage.name}
        </h3>

        {/* Stage Details */}
        <div className="flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center space-x-3">
            <span className={stage.required ? 'text-orange-400' : 'text-slate-400'}>
              {stage.required ? 'Required' : 'Optional'}
            </span>
            
            {stage.automations.length > 0 && (
              <div className="flex items-center space-x-1 text-blue-400">
                <Zap className="w-3 h-3" />
                <span>{stage.automations.length}</span>
              </div>
            )}
          </div>

          {stage.approvers.length > 0 && (
            <div className="flex items-center space-x-1 text-amber-400">
              <Shield className="w-3 h-3" />
              <span>{stage.approvers.length}</span>
            </div>
          )}
        </div>

        {/* Required Indicator */}
        {stage.required && (
          <div className="absolute -top-1 -right-1">
            <div className="w-3 h-3 bg-orange-500 rounded-full flex items-center justify-center">
              <CheckCircle className="w-2 h-2 text-white" />
            </div>
          </div>
        )}
      </div>

      {/* Index Badge */}
      <div className="absolute -top-2 -left-2 w-6 h-6 bg-slate-700 border border-slate-600 rounded-full flex items-center justify-center text-xs font-medium text-slate-300">
        {index + 1}
      </div>
    </div>
  );
};

interface DropZoneProps {
  onDrop: (stageType?: string) => void;
  isActive?: boolean;
}

const DropZone: React.FC<DropZoneProps> = ({ onDrop, isActive = false }) => {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const stageType = e.dataTransfer.getData('stageType');
    onDrop(stageType || undefined);
  };

  const handleClick = () => {
    onDrop();
  };

  return (
    <div
      className={`
        flex items-center justify-center min-h-[120px] border-2 border-dashed rounded-xl transition-all duration-200 cursor-pointer
        ${isDragOver 
          ? 'border-blue-400 bg-blue-500/10' 
          : 'border-slate-600 hover:border-slate-500 hover:bg-slate-800/50'
        }
      `}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      <div className="text-center">
        <Plus className="w-8 h-8 text-slate-500 mx-auto mb-2" />
        <p className="text-sm text-slate-400">
          {isDragOver ? 'Drop stage here' : 'Add new stage'}
        </p>
      </div>
    </div>
  );
};

interface WorkflowCanvasProps {
  template: WorkflowTemplate | null;
  onStageClick?: (stage: WorkflowStage) => void;
  onStageUpdate?: (stage: WorkflowStage) => void;
  onStageAdd?: (stage: Partial<WorkflowStage>) => void;
  onStageDelete?: (stageId: string) => void;
  readonly?: boolean;
}

export const WorkflowCanvas: React.FC<WorkflowCanvasProps> = ({
  template,
  onStageClick,
  onStageUpdate,
  onStageAdd,
  onStageDelete,
  readonly = false
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);

  const handleStageAdd = useCallback((stageType?: string) => {
    if (onStageAdd) {
      onStageAdd({
        type: stageType as any || 'project_phase',
        name: 'New Stage',
        required: true,
      });
    }
  }, [onStageAdd]);

  const stages = template?.configuration.stages || [];

  if (!template) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Folder className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-300 mb-2">No Template Selected</h3>
          <p className="text-slate-500">Create or select a workflow template to get started.</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={canvasRef} className="h-full">
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-8 min-h-[600px]">
        {/* Workflow Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">Workflow Stages</h2>
            {!readonly && (
              <Button
                onClick={() => handleStageAdd()}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Stage
              </Button>
            )}
          </div>
          
          {template.description && (
            <p className="text-slate-400 text-sm">{template.description}</p>
          )}
        </div>

        {/* Workflow Flow */}
        <div className="space-y-6">
          {/* Start Node */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 bg-green-500/10 border border-green-500/20 px-4 py-2 rounded-full">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-green-400 text-sm font-medium">Start</span>
            </div>
            
            {stages.length > 0 && (
              <ArrowRight className="w-5 h-5 text-slate-600" />
            )}
          </div>

          {/* Stages */}
          {stages.length === 0 ? (
            !readonly && (
              <div className="py-8">
                <DropZone onDrop={handleStageAdd} />
              </div>
            )
          ) : (
            <div className="space-y-6">
              {stages.map((stage, index) => (
                <React.Fragment key={stage.id}>
                  <div className="flex items-center space-x-4">
                    <StageNode
                      stage={stage}
                      index={index}
                      isFirst={index === 0}
                      isLast={index === stages.length - 1}
                      onClick={onStageClick}
                      onEdit={onStageClick}
                      onDelete={onStageDelete}
                      readonly={readonly}
                    />
                    
                    {index < stages.length - 1 && (
                      <ArrowRight className="w-5 h-5 text-slate-600" />
                    )}
                  </div>

                  {/* Add stage between existing stages */}
                  {!readonly && index < stages.length - 1 && (
                    <div className="flex justify-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleStageAdd()}
                        className="text-slate-500 hover:text-slate-300 border border-dashed border-slate-600 hover:border-slate-500"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Stage
                      </Button>
                    </div>
                  )}
                </React.Fragment>
              ))}

              {/* Add stage at end */}
              {!readonly && (
                <div className="flex items-center space-x-4">
                  <ArrowRight className="w-5 h-5 text-slate-600" />
                  <div className="flex-1">
                    <DropZone onDrop={handleStageAdd} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* End Node */}
          {stages.length > 0 && (
            <div className="flex items-center space-x-4">
              <ArrowRight className="w-5 h-5 text-slate-600" />
              <div className="flex items-center space-x-2 bg-blue-500/10 border border-blue-500/20 px-4 py-2 rounded-full">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-blue-400 text-sm font-medium">Complete</span>
              </div>
            </div>
          )}
        </div>

        {/* Workflow Summary */}
        {stages.length > 0 && (
          <div className="mt-8 pt-6 border-t border-slate-700">
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-white">{stages.length}</div>
                <div className="text-sm text-slate-400">Total Stages</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-400">
                  {stages.filter(s => s.required).length}
                </div>
                <div className="text-sm text-slate-400">Required</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-400">
                  {stages.reduce((sum, s) => sum + s.automations.length, 0)}
                </div>
                <div className="text-sm text-slate-400">Automations</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-amber-400">
                  {stages.reduce((sum, s) => sum + s.approvers.length, 0)}
                </div>
                <div className="text-sm text-slate-400">Approvers</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
