import React, { useEffect, useState } from 'react';
import { Command } from 'cmdk';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { createTask as createWorkTask } from '@/features/work-management/workTasks.api';

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  // Listen for cmd+k
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const createTask = async () => {
    const projectId = prompt('Project ID:');
    if (!projectId?.trim()) return;
    const taskName = prompt('Task name:');
    if (taskName?.trim()) {
      try {
        await createWorkTask({ projectId: projectId.trim(), title: taskName.trim() });
        toast.success('Task created successfully');
        setOpen(false);
      } catch (error) {
        toast.error('Failed to create task');
      }
    }
  };

  const createProject = () => {
    setOpen(false);
    navigate('/templates');
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center pt-20 z-50">
      <Command className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
        <Command.Input
          value={search}
          onValueChange={setSearch}
          placeholder="Type a command or search..."
          className="w-full px-4 py-3 border-b focus:outline-none"
        />

        <Command.List className="max-h-96 overflow-auto p-2">
          <Command.Group heading="Quick Actions">
            <Command.Item onSelect={createTask} className="px-3 py-2 hover:bg-gray-100 cursor-pointer rounded">
              <div className="flex items-center gap-2">
                <span className="text-lg">+</span>
                <span>Create Task</span>
              </div>
            </Command.Item>
            <Command.Item onSelect={createProject} className="px-3 py-2 hover:bg-gray-100 cursor-pointer rounded">
              <div className="flex items-center gap-2">
                <span className="text-lg">+</span>
                <span>Create Project</span>
              </div>
            </Command.Item>
          </Command.Group>

          <Command.Group heading="Navigate">
            <Command.Item onSelect={() => { navigate('/dashboard'); setOpen(false); }} className="px-3 py-2 hover:bg-gray-100 cursor-pointer rounded">
              <div className="flex items-center gap-2">
                <span>📊</span>
                <span>Go to Dashboard</span>
              </div>
            </Command.Item>
            <Command.Item onSelect={() => { navigate('/projects'); setOpen(false); }} className="px-3 py-2 hover:bg-gray-100 cursor-pointer rounded">
              <div className="flex items-center gap-2">
                <span>📁</span>
                <span>Go to Projects</span>
              </div>
            </Command.Item>
            <Command.Item onSelect={() => { navigate('/resources'); setOpen(false); }} className="px-3 py-2 hover:bg-gray-100 cursor-pointer rounded">
              <div className="flex items-center gap-2">
                <span>👥</span>
                <span>Go to Resources</span>
              </div>
            </Command.Item>
            <Command.Item onSelect={() => { navigate('/analytics'); setOpen(false); }} className="px-3 py-2 hover:bg-gray-100 cursor-pointer rounded">
              <div className="flex items-center gap-2">
                <span>📈</span>
                <span>Go to Analytics</span>
              </div>
            </Command.Item>
            <Command.Item onSelect={() => { navigate('/settings'); setOpen(false); }} className="px-3 py-2 hover:bg-gray-100 cursor-pointer rounded">
              <div className="flex items-center gap-2">
                <span>⚙️</span>
                <span>Go to Settings</span>
              </div>
            </Command.Item>
          </Command.Group>
        </Command.List>
      </Command>
    </div>
  );
}
