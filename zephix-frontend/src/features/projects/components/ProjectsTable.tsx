import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useProjectsList, Project, ProjectsListParams } from '../api/useProjects';
import { Card, CardBody, CardHeader } from '@/components/ui/card/Card';
import { Button } from '@/components/ui/button/Button';
import { Input } from '@/components/ui/input/Input';
import { Skeleton } from '@/components/ui/feedback/Skeleton';
import { ErrorBanner } from '@/components/ui/feedback/ErrorBanner';

interface ProjectsTableProps {
  initialParams?: ProjectsListParams;
  onProjectClick?: (project: Project) => void;
}

const statusColors = {
  planning: 'bg-blue-100 text-blue-800',
  active: 'bg-green-100 text-green-800',
  'on-hold': 'bg-yellow-100 text-yellow-800',
  completed: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-red-100 text-red-800',
};

const statusLabels = {
  planning: 'Planning',
  active: 'Active',
  'on-hold': 'On Hold',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export const ProjectsTable: React.FC<ProjectsTableProps> = ({ 
  initialParams = {},
  onProjectClick 
}) => {
  const [params, setParams] = useState<ProjectsListParams>({
    page: 1,
    pageSize: 20,
    ...initialParams,
  });

  const [searchTerm, setSearchTerm] = useState(params.search || '');
  const [statusFilter, setStatusFilter] = useState(params.status || '');
  const [ownerFilter, setOwnerFilter] = useState(params.owner || '');

  const { data, isLoading, error, refetch } = useProjectsList(params);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setParams(prev => ({ ...prev, search: value, page: 1 }));
  };

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value);
    setParams(prev => ({ ...prev, status: value, page: 1 }));
  };

  const handleOwnerFilter = (value: string) => {
    setOwnerFilter(value);
    setParams(prev => ({ ...prev, owner: value, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setParams(prev => ({ ...prev, page }));
  };

  const handleProjectClick = (project: Project) => {
    if (onProjectClick) {
      onProjectClick(project);
    }
  };

  const projects = data?.items || [];
  const totalPages = data?.totalPages || 0;
  const currentPage = data?.page || 1;

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (isLoading) {
    return (
      <Card>
        <CardBody>
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-64 w-full" />
            <div className="flex justify-between">
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-8 w-32" />
            </div>
          </div>
        </CardBody>
      </Card>
    );
  }

  if (error) {
    return (
      <ErrorBanner
        description="Failed to load projects"
        onRetry={() => refetch()}
        retryLabel="Retry"
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => handleStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="">All Status</option>
              {Object.entries(statusLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <Input
              placeholder="Filter by owner..."
              value={ownerFilter}
              onChange={(e) => handleOwnerFilter(e.target.value)}
              className="w-40"
            />
          </div>
        </div>
      </CardHeader>
      <CardBody>
        {projects.length === 0 ? (
          <div className="text-center py-8">
            <h3 className="text-lg font-medium text-muted-foreground mb-2">
              No projects found
            </h3>
            <p className="text-muted-foreground">
              {searchTerm || statusFilter || ownerFilter
                ? 'Try adjusting your filters'
                : 'Create your first project to get started'
              }
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Key</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Name</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Owner</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Start</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">End</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Progress</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Budget</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((project) => (
                    <tr
                      key={project.id}
                      className="border-b hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleProjectClick(project)}
                    >
                      <td className="py-3 px-4">
                        <Link
                          to={`/projects/${project.id}`}
                          className="text-primary hover:text-primary/80 font-medium"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {project.key}
                        </Link>
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          <div className="font-medium">{project.name}</div>
                          {project.description && (
                            <div className="text-sm text-muted-foreground truncate max-w-xs">
                              {project.description}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded text-sm ${statusColors[project.status]}`}>
                          {statusLabels[project.status]}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm">{project.ownerName}</td>
                      <td className="py-3 px-4 text-sm">{formatDate(project.startDate)}</td>
                      <td className="py-3 px-4 text-sm">{formatDate(project.endDate)}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-500 h-2 rounded-full"
                              style={{ width: `${project.progressPct}%` }}
                            />
                          </div>
                          <span className="text-sm text-muted-foreground w-12">
                            {project.progressPct}%
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm">
                        <div>
                          <div>{formatCurrency(project.budgetUsed)}</div>
                          <div className="text-muted-foreground">
                            of {formatCurrency(project.budgetTotal)}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Showing {((currentPage - 1) * (params.pageSize || 20)) + 1} to{' '}
                  {Math.min(currentPage * (params.pageSize || 20), data?.total || 0)} of{' '}
                  {data?.total || 0} projects
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage <= 1}
                  >
                    Previous
                  </Button>
                  <span className="px-3 py-1 text-sm">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage >= totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardBody>
    </Card>
  );
};
