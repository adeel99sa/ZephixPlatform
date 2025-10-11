import React from 'react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useDraggable, useDroppable, useSensor, useSensors } from '@dnd-kit/core';

// Simple draggable item
const DraggableItem: React.FC<{ id: string; children: React.ReactNode }> = ({ id, children }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`p-4 bg-blue-500 text-white rounded cursor-pointer ${isDragging ? 'opacity-50' : ''}`}
    >
      {children}
    </div>
  );
};

// Simple droppable area
const DroppableArea: React.FC<{ id: string; children: React.ReactNode }> = ({ id, children }) => {
  const { isOver, setNodeRef } = useDroppable({
    id,
  });

  return (
    <div
      ref={setNodeRef}
      className={`p-8 border-2 border-dashed rounded ${isOver ? 'border-green-500 bg-green-100' : 'border-gray-300'}`}
    >
      {children}
    </div>
  );
};

const DndTest: React.FC = () => {
  const [activeId, setActiveId] = React.useState<string | null>(null);
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    
    if (over) {
      console.log(`Dropped ${active.id} onto ${over.id}`);
    }
  };

  return (
    <div className="p-8">
      <h2 className="text-xl font-bold mb-4">DnD Test</h2>
      
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-2">Draggable Items</h3>
            <div className="flex space-x-4">
              <DraggableItem id="item-1">Item 1</DraggableItem>
              <DraggableItem id="item-2">Item 2</DraggableItem>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-2">Drop Zones</h3>
            <div className="grid grid-cols-2 gap-4">
              <DroppableArea id="zone-1">
                <p>Drop Zone 1</p>
              </DroppableArea>
              <DroppableArea id="zone-2">
                <p>Drop Zone 2</p>
              </DroppableArea>
            </div>
          </div>
        </div>
        
        <DragOverlay>
          {activeId ? (
            <div className="p-4 bg-blue-500 text-white rounded">
              Dragging {activeId}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
};

export default DndTest;
