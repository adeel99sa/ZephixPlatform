import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import api from '@/services/api';

interface Task {
  id: string;
  name: string;
  status: string;
  resourceImpactScore?: number;
  assignedResources?: string;
  priority: string;
  description?: string;
  dueDate?: string;
}

interface BoardViewProps {
  projectId: string;
  tasks: Task[];
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => Promise<void>;
}

export function BoardView({ projectId, tasks, onTaskUpdate }: BoardViewProps) {
  const [columns, setColumns] = useState({
    todo: [] as Task[],
    in_progress: [] as Task[],
    review: [] as Task[],
    done: [] as Task[]
  });

  useEffect(() => {
    // Group tasks by status
    const grouped = {
      todo: tasks.filter(t => t.status === 'todo' || t.status === 'pending'),
      in_progress: tasks.filter(t => t.status === 'in_progress' || t.status === 'in-progress'),
      review: tasks.filter(t => t.status === 'review'),
      done: tasks.filter(t => t.status === 'done' || t.status === 'completed')
    };
    setColumns(grouped);
  }, [tasks]);

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const { source, destination } = result;
    
    // Don't do anything if dropped in same location
    if (source.droppableId === destination.droppableId && 
        source.index === destination.index) {
      return;
    }

    // Get the task that was dragged
    const taskId = result.draggableId;
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    // Check for resource conflicts before allowing drop
    if (task.resourceImpactScore && task.resourceImpactScore > 100) {
      if (!window.confirm(`Warning: This task has ${task.resourceImpactScore}% resource allocation. Moving to ${destination.droppableId} may cause conflicts. Continue?`)) {
        return;
      }
    }

    // Update task status
    await onTaskUpdate(taskId, { status: destination.droppableId });
    
    // Update local state optimistically
    const newColumns = { ...columns };
    newColumns[source.droppableId as keyof typeof columns].splice(source.index, 1);
    newColumns[destination.droppableId as keyof typeof columns].splice(
      destination.index, 
      0, 
      { ...task, status: destination.droppableId }
    );
    setColumns(newColumns);
  };

  const getColumnColor = (status: string) => {
    switch(status) {
      case 'todo': return 'bg-gray-100';
      case 'in_progress': return 'bg-blue-100';
      case 'review': return 'bg-yellow-100';
      case 'done': return 'bg-green-100';
      default: return 'bg-gray-100';
    }
  };

  const getImpactBadgeColor = (score: number) => {
    if (score > 100) return 'bg-red-500 text-white';
    if (score > 80) return 'bg-yellow-500 text-white';
    return 'bg-green-500 text-white';
  };

  const getPriorityColor = (priority: string) => {
    switch(priority) {
      case 'high': return 'bg-red-100 text-red-700';
      case 'medium': return 'bg-yellow-100 text-yellow-700';
      case 'low': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto p-4">
        {Object.entries(columns).map(([columnId, columnTasks]) => (
          <div key={columnId} className="min-w-[300px]">
            <div className={`p-3 rounded-t-lg ${getColumnColor(columnId)}`}>
              <h3 className="font-semibold capitalize">
                {columnId.replace('_', ' ')} ({columnTasks.length})
              </h3>
            </div>
            
            <Droppable droppableId={columnId}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`min-h-[400px] p-2 bg-gray-50 ${
                    snapshot.isDraggingOver ? 'bg-blue-50' : ''
                  }`}
                >
                  {columnTasks.map((task, index) => (
                    <Draggable key={task.id} draggableId={task.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={`bg-white p-3 mb-2 rounded shadow ${
                            snapshot.isDragging ? 'opacity-50' : ''
                          }`}
                        >
                          <h4 className="font-medium mb-1">{task.name}</h4>
                          
                          {task.description && (
                            <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                              {task.description}
                            </p>
                          )}
                          
                          <div className="flex flex-wrap gap-1 mb-2">
                            {task.resourceImpactScore && (
                              <span className={`inline-block px-2 py-1 rounded text-xs ${
                                getImpactBadgeColor(task.resourceImpactScore)
                              }`}>
                                {task.resourceImpactScore}% allocated
                              </span>
                            )}
                            
                            <span className={`text-xs px-2 py-1 rounded ${
                              getPriorityColor(task.priority)
                            }`}>
                              {task.priority}
                            </span>
                          </div>
                          
                          {task.assignedResources && (
                            <p className="text-xs text-gray-600 mb-1">
                              👥 {task.assignedResources}
                            </p>
                          )}
                          
                          {task.dueDate && (
                            <p className="text-xs text-gray-500">
                              📅 Due: {new Date(task.dueDate).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
        ))}
      </div>
    </DragDropContext>
  );
}
