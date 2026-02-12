import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { EmptyStateCard, EmptyStateVariant } from '../EmptyStateCard';
import { Inbox, FolderKanban, ListChecks, Users } from 'lucide-react';

describe('EmptyStateCard', () => {
  it('renders title and description', () => {
    render(
      <EmptyStateCard title="No projects" description="Create your first project" />,
    );
    expect(screen.getByText('No projects')).toBeInTheDocument();
    expect(screen.getByText('Create your first project')).toBeInTheDocument();
  });

  it('renders action button for admins', () => {
    const onClick = vi.fn();
    render(
      <EmptyStateCard
        title="No projects"
        description="Get started"
        action={{ label: 'Create Project', onClick }}
      />,
    );
    const btn = screen.getByTestId('empty-state-action');
    expect(btn).toHaveTextContent('Create Project');
    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders read-only message when no action', () => {
    render(
      <EmptyStateCard
        title="No projects"
        description="Nothing here"
        readOnlyMessage="Ask an admin to create a project"
      />,
    );
    expect(screen.getByTestId('empty-state-readonly')).toHaveTextContent(
      'Ask an admin to create a project',
    );
  });

  it.each<EmptyStateVariant>(['default', 'projects', 'tasks', 'inbox', 'members'])(
    'renders variant: %s',
    (variant) => {
      render(
        <EmptyStateCard
          title={`Empty ${variant}`}
          description="Description"
          variant={variant}
        />,
      );
      const card = screen.getByTestId('empty-state-card');
      expect(card).toHaveAttribute('data-variant', variant);
    },
  );

  it('accepts custom icon', () => {
    render(
      <EmptyStateCard
        title="No inbox items"
        description="You're all caught up"
        icon={Inbox}
        variant="inbox"
      />,
    );
    expect(screen.getByTestId('empty-state-card')).toBeInTheDocument();
  });
});
