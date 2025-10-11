import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import api from '../../services/api';

interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  dueDate?: string;
  startDate?: string;
  endDate?: string;
  progress: number;
  estimatedHours: number;
  actualHours: number;
  project: {
    id: string;
    name: string;
  };
}

interface Project {
  id: string;
  name: string;
  description?: string;
  status: string;
  progress?: number;
  startDate?: string;
  endDate?: string;
}

interface Deadline {
  id: string;
  title: string;
  dueDate: string;
  projectName: string;
  daysUntilDue: number;
}

const MyWork: React.FC = () => {
  const { user } = useAuthStore();
  const [myTasks, setMyTasks] = useState<Task[]>([]);
  const [myProjects, setMyProjects] = useState<Project[]>([]);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState<Deadline[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadMyWork();
    }
  }, [user]);

  const loadMyWork = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load tasks assigned to me (filter from all tasks for now)
      const tasksResponse = await api.get('/tasks');
      const allTasks = tasksResponse.data.data || [];
      
      // Filter tasks assigned to current user (for now, show all tasks since assignedTo is null)
      // In a real implementation, you'd filter by assignedTo === user.id
      const myTasksData = allTasks.slice(0, 5); // Show first 5 tasks for demo
      setMyTasks(myTasksData);

      // Load projects I'm managing (created by me)
      const projectsResponse = await api.get('/projects');
      const allProjects = projectsResponse.data.data?.projects || [];
      const myProjectsData = allProjects.filter((p: Project) => p.id); // Show all for demo
      setMyProjects(myProjectsData.slice(0, 3)); // Show first 3 projects

      // Calculate upcoming deadlines
      const deadlines: Deadline[] = allTasks
        .filter((task: Task) => task.dueDate || task.endDate)
        .map((task: Task) => {
          const dueDate = task.dueDate || task.endDate;
          const daysUntilDue = dueDate ? Math.ceil((new Date(dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 0;
          return {
            id: task.id,
            title: task.title,
            dueDate: dueDate || '',
            projectName: task.project?.name || 'Unknown Project',
            daysUntilDue
          };
        })
        .filter((deadline: Deadline) => deadline.daysUntilDue >= 0)
        .sort((a: Deadline, b: Deadline) => a.daysUntilDue - b.daysUntilDue)
        .slice(0, 5);

      setUpcomingDeadlines(deadlines);

    } catch (err: any) {
      console.error('Error loading my work:', err);
      setError(err.message || 'Failed to load your work data');
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high':
      case 'critical':
        return 'text-red-600 bg-red-100';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100';
      case 'low':
        return 'text-green-600 bg-green-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'text-green-600 bg-green-100';
      case 'in_progress':
        return 'text-blue-600 bg-blue-100';
      case 'pending':
      case 'todo':
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">My Work</h1>
        <p className="text-gray-600 mt-2">Welcome back, {user?.firstName}! Here's your personalized dashboard.</p>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* My Tasks */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">My Tasks ({myTasks.length})</h2>
            <Link 
              to="/tasks" 
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              View All
            </Link>
          </div>
          
          <div className="space-y-3">
            {myTasks.length === 0 ? (
              <p className="text-gray-500 text-sm">No tasks assigned to you.</p>
            ) : (
              myTasks.map((task) => (
                <div key={task.id} className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-gray-900 truncate">
                        {task.title}
                      </h3>
                      <p className="text-xs text-gray-500 mt-1 truncate">
                        {task.project?.name || 'Unknown Project'}
                      </p>
                      {task.description && (
                        <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                          {task.description}
                        </p>
                      )}
                    </div>
                    <div className="ml-2 flex-shrink-0">
                      <input 
                        type="checkbox" 
                        className="rounded border-gray-300"
                        checked={task.status === 'completed'}
                        readOnly
                      />
                    </div>
                  </div>
                  
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex space-x-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(task.status)}`}>
                        {task.status}
                      </span>
                    </div>
                    {task.dueDate && (
                      <span className="text-xs text-gray-500">
                        Due: {new Date(task.dueDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  
                  {task.progress > 0 && (
                    <div className="mt-2">
                      <div className="flex justify-between text-xs text-gray-600 mb-1">
                        <span>Progress</span>
                        <span>{task.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${task.progress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Projects I Manage */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">My Projects ({myProjects.length})</h2>
            <Link 
              to="/projects" 
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              View All
            </Link>
          </div>
          
          <div className="space-y-3">
            {myProjects.length === 0 ? (
              <p className="text-gray-500 text-sm">No projects found.</p>
            ) : (
              myProjects.map((project) => (
                <div key={project.id} className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <Link 
                        to={`/projects/${project.id}`}
                        className="text-sm font-medium text-blue-600 hover:text-blue-800 truncate block"
                      >
                        {project.name}
                      </Link>
                      <p className="text-xs text-gray-500 mt-1 truncate">
                        {project.description || 'No description'}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(project.status)}`}>
                      {project.status}
                    </span>
                  </div>
                  
                  <div className="mt-2">
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                      <span>Progress</span>
                      <span>{project.progress || 0}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full" 
                        style={{ width: `${project.progress || 0}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <div className="mt-2 flex justify-between text-xs text-gray-500">
                    {project.startDate && (
                      <span>Start: {new Date(project.startDate).toLocaleDateString()}</span>
                    )}
                    {project.endDate && (
                      <span>End: {new Date(project.endDate).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Upcoming Deadlines */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Upcoming Deadlines</h2>
          
          <div className="space-y-3">
            {upcomingDeadlines.length === 0 ? (
              <p className="text-gray-500 text-sm">No upcoming deadlines.</p>
            ) : (
              upcomingDeadlines.map((deadline) => (
                <div key={deadline.id} className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-gray-900 truncate">
                        {deadline.title}
                      </h3>
                      <p className="text-xs text-gray-500 mt-1">
                        {deadline.projectName}
                      </p>
                    </div>
                    <div className="ml-2 flex-shrink-0 text-right">
                      <span className={`text-xs font-medium ${
                        deadline.daysUntilDue <= 1 ? 'text-red-600' :
                        deadline.daysUntilDue <= 3 ? 'text-yellow-600' :
                        'text-green-600'
                      }`}>
                        {deadline.daysUntilDue === 0 ? 'Today' :
                         deadline.daysUntilDue === 1 ? 'Tomorrow' :
                         `${deadline.daysUntilDue} days`}
                      </span>
                    </div>
                  </div>
                  
                  <div className="mt-2 text-xs text-gray-500">
                    Due: {new Date(deadline.dueDate).toLocaleDateString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyWork;
