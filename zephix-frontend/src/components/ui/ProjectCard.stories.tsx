import type { Meta, StoryObj } from '@storybook/react';
import { ProjectCard } from './ProjectCard';

const meta: Meta<typeof ProjectCard> = {
  title: 'UI/ProjectCard',
  component: ProjectCard,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A card component for displaying project information with status indicators and actions.',
      },
    },
  },
  argTypes: {
    project: {
      control: 'object',
      description: 'The project data to display',
    },
    onView: { action: 'view' },
    onEdit: { action: 'edit' },
    onDelete: { action: 'delete' },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

const mockProject = {
  id: '1',
  name: 'E-commerce Platform',
  description: 'A modern e-commerce platform built with React and Node.js',
  status: 'active',
  category: 'Web Development',
  createdAt: '2024-01-15',
  updatedAt: '2024-01-20',
  teamMembers: [
    { id: '1', name: 'John Doe', role: 'Lead Developer' },
    { id: '2', name: 'Jane Smith', role: 'UI/UX Designer' },
  ],
};

export const Default: Story = {
  args: {
    project: mockProject,
  },
};

export const ActiveProject: Story = {
  args: {
    project: {
      ...mockProject,
      status: 'active',
      name: 'Active Project',
    },
  },
};

export const InactiveProject: Story = {
  args: {
    project: {
      ...mockProject,
      status: 'inactive',
      name: 'Inactive Project',
    },
  },
};

export const CompletedProject: Story = {
  args: {
    project: {
      ...mockProject,
      status: 'completed',
      name: 'Completed Project',
    },
  },
};

export const LongDescription: Story = {
  args: {
    project: {
      ...mockProject,
      name: 'Project with Long Description',
      description: 'This is a very long project description that demonstrates how the ProjectCard component handles text overflow and wrapping. It includes multiple sentences to show the full capabilities of the component.',
    },
  },
};

export const NoDescription: Story = {
  args: {
    project: {
      ...mockProject,
      name: 'Project Without Description',
      description: '',
    },
  },
};

export const LargeTeam: Story = {
  args: {
    project: {
      ...mockProject,
      name: 'Large Team Project',
      teamMembers: [
        { id: '1', name: 'John Doe', role: 'Lead Developer' },
        { id: '2', name: 'Jane Smith', role: 'UI/UX Designer' },
        { id: '3', name: 'Mike Johnson', role: 'Backend Developer' },
        { id: '4', name: 'Sarah Wilson', role: 'QA Engineer' },
        { id: '5', name: 'Tom Brown', role: 'DevOps Engineer' },
      ],
    },
  },
};

export const NoTeamMembers: Story = {
  args: {
    project: {
      ...mockProject,
      name: 'Solo Project',
      teamMembers: [],
    },
  },
};

export const DifferentCategories: Story = {
  render: () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <ProjectCard
        project={{
          ...mockProject,
          name: 'Web Development',
          category: 'Web Development',
          status: 'active',
        }}
      />
      <ProjectCard
        project={{
          ...mockProject,
          name: 'Mobile App',
          category: 'Mobile Development',
          status: 'active',
        }}
      />
      <ProjectCard
        project={{
          ...mockProject,
          name: 'Data Analysis',
          category: 'Data Science',
          status: 'active',
        }}
      />
      <ProjectCard
        project={{
          ...mockProject,
          name: 'AI Project',
          category: 'Machine Learning',
          status: 'active',
        }}
      />
      <ProjectCard
        project={{
          ...mockProject,
          name: 'Design System',
          category: 'Design',
          status: 'active',
        }}
      />
      <ProjectCard
        project={{
          ...mockProject,
          name: 'API Service',
          category: 'Backend Development',
          status: 'active',
        }}
      />
    </div>
  ),
};

export const AllStatuses: Story = {
  render: () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <ProjectCard
        project={{
          ...mockProject,
          name: 'Active Project',
          status: 'active',
        }}
      />
      <ProjectCard
        project={{
          ...mockProject,
          name: 'Inactive Project',
          status: 'inactive',
        }}
      />
      <ProjectCard
        project={{
          ...mockProject,
          name: 'Completed Project',
          status: 'completed',
        }}
      />
    </div>
  ),
};

export const Interactive: Story = {
  args: {
    project: mockProject,
    onView: (project) => console.log('View project:', project),
    onEdit: (project) => console.log('Edit project:', project),
    onDelete: (project) => console.log('Delete project:', project),
  },
};

export const Loading: Story = {
  args: {
    project: mockProject,
    loading: true,
  },
};

export const Compact: Story = {
  args: {
    project: mockProject,
    compact: true,
  },
};

export const WithCustomActions: Story = {
  args: {
    project: mockProject,
    onView: (project) => console.log('View project:', project),
    onEdit: (project) => console.log('Edit project:', project),
    onDelete: (project) => console.log('Delete project:', project),
    customActions: [
      {
        label: 'Archive',
        onClick: (project) => console.log('Archive project:', project),
        variant: 'outline',
      },
      {
        label: 'Share',
        onClick: (project) => console.log('Share project:', project),
        variant: 'ghost',
      },
    ],
  },
};
