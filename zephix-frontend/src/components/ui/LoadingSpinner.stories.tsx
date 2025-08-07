import type { Meta, StoryObj } from '@storybook/react';
import { LoadingSpinner } from './LoadingSpinner';

const meta: Meta<typeof LoadingSpinner> = {
  title: 'UI/LoadingSpinner',
  component: LoadingSpinner,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A customizable loading spinner component with different sizes and variants.',
      },
    },
  },
  argTypes: {
    size: {
      control: { type: 'select' },
      options: ['sm', 'md', 'lg', 'xl'],
      description: 'The size of the spinner',
    },
    color: {
      control: { type: 'select' },
      options: ['primary', 'secondary', 'white', 'gray'],
      description: 'The color of the spinner',
    },
    text: {
      control: { type: 'text' },
      description: 'Optional text to display below the spinner',
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Small: Story = {
  args: {
    size: 'sm',
  },
};

export const Medium: Story = {
  args: {
    size: 'md',
  },
};

export const Large: Story = {
  args: {
    size: 'lg',
  },
};

export const ExtraLarge: Story = {
  args: {
    size: 'xl',
  },
};

export const WithText: Story = {
  args: {
    size: 'md',
    text: 'Loading...',
  },
};

export const Primary: Story = {
  args: {
    size: 'md',
    color: 'primary',
  },
};

export const Secondary: Story = {
  args: {
    size: 'md',
    color: 'secondary',
  },
};

export const White: Story = {
  args: {
    size: 'md',
    color: 'white',
  },
  parameters: {
    backgrounds: {
      default: 'dark',
    },
  },
};

export const Gray: Story = {
  args: {
    size: 'md',
    color: 'gray',
  },
};

export const AllSizes: Story = {
  render: () => (
    <div className="flex items-center gap-8">
      <div className="text-center">
        <LoadingSpinner size="sm" />
        <p className="text-xs text-gray-500 mt-2">Small</p>
      </div>
      <div className="text-center">
        <LoadingSpinner size="md" />
        <p className="text-xs text-gray-500 mt-2">Medium</p>
      </div>
      <div className="text-center">
        <LoadingSpinner size="lg" />
        <p className="text-xs text-gray-500 mt-2">Large</p>
      </div>
      <div className="text-center">
        <LoadingSpinner size="xl" />
        <p className="text-xs text-gray-500 mt-2">Extra Large</p>
      </div>
    </div>
  ),
};

export const AllColors: Story = {
  render: () => (
    <div className="flex items-center gap-8">
      <div className="text-center">
        <LoadingSpinner color="primary" />
        <p className="text-xs text-gray-500 mt-2">Primary</p>
      </div>
      <div className="text-center">
        <LoadingSpinner color="secondary" />
        <p className="text-xs text-gray-500 mt-2">Secondary</p>
      </div>
      <div className="text-center">
        <LoadingSpinner color="gray" />
        <p className="text-xs text-gray-500 mt-2">Gray</p>
      </div>
      <div className="text-center bg-gray-800 p-4 rounded">
        <LoadingSpinner color="white" />
        <p className="text-xs text-white mt-2">White</p>
      </div>
    </div>
  ),
};

export const WithCustomText: Story = {
  render: () => (
    <div className="space-y-4">
      <LoadingSpinner size="lg" text="Loading your data..." />
      <LoadingSpinner size="md" text="Processing..." />
      <LoadingSpinner size="sm" text="Please wait..." />
    </div>
  ),
};

export const InContext: Story = {
  render: () => (
    <div className="w-96 p-6 border rounded-lg">
      <h3 className="text-lg font-semibold mb-4">Loading Dashboard</h3>
      <div className="flex items-center justify-center py-8">
        <LoadingSpinner size="lg" text="Preparing your dashboard..." />
      </div>
    </div>
  ),
};
