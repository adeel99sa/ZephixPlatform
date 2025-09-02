import { useEffect, useState } from 'react';
import { Command } from 'cmdk';
import { useNavigate } from 'react-router-dom';
import { useProjectStore } from '../stores/projectStore';
import './CommandPalette.css';

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const createProject = useProjectStore(state => state.createProject);

  // Toggle with Cmd+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const handleCreateProject = async (name: string) => {
    const projectData = {
      name,
      description: '',
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      priority: 'medium',
      status: 'planning'
    };
    
    await createProject(projectData);
    setOpen(false);
    navigate('/projects');
  };

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label="Command Menu"
      className="command-dialog"
    >
      <Command.Input
        value={search}
        onValueChange={setSearch}
        placeholder="Type a command or search..."
      />
      
      <Command.List>
        <Command.Empty>
          {search && `Create project "${search}" — Press Enter`}
        </Command.Empty>

        {!search && (
          <>
            <Command.Group heading="Quick Actions">
              <Command.Item onSelect={() => navigate('/projects/new')}>
                <span>➕</span> New Project
              </Command.Item>
              <Command.Item onSelect={() => navigate('/projects')}>
                <span>📁</span> View Projects
              </Command.Item>
              <Command.Item onSelect={() => navigate('/dashboard')}>
                <span>📊</span> Dashboard
              </Command.Item>
            </Command.Group>

            <Command.Group heading="Templates">
              <Command.Item onSelect={() => console.log('Software template')}>
                <span>💻</span> Software Development
              </Command.Item>
              <Command.Item onSelect={() => console.log('Marketing template')}>
                <span>📢</span> Marketing Campaign
              </Command.Item>
              <Command.Item onSelect={() => console.log('Product template')}>
                <span>🚀</span> Product Launch
              </Command.Item>
            </Command.Group>
          </>
        )}

        {search && (
          <Command.Group heading="Actions">
            <Command.Item onSelect={() => handleCreateProject(search)}>
              Create project "{search}"
            </Command.Item>
            <Command.Item onSelect={() => navigate(`/search?q=${search}`)}>
              Search for "{search}"
            </Command.Item>
          </Command.Group>
        )}
      </Command.List>
    </Command.Dialog>
  );
}
