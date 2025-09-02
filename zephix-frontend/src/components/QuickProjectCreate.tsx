import { useState } from 'react';
import { useProjectStore } from '../stores/projectStore';

export function QuickProjectCreate({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const createProject = useProjectStore(state => state.createProject);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    await createProject({
      name,
      description,
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      priority: 'medium',
      status: 'planning'
    });
    
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 space-y-4">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Project name"
        className="w-full px-3 py-2 border rounded-lg"
        autoFocus
        required
      />
      
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description (optional)"
        className="w-full px-3 py-2 border rounded-lg"
        rows={3}
      />
      
      <div className="flex gap-2">
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg"
        >
          Create Project
        </button>
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 border rounded-lg"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
