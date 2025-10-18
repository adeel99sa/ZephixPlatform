import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DataTable, Column } from '../DataTable';

interface TestData {
  id: string;
  name: string;
  status: string;
  value: number;
}

const testData: TestData[] = [
  { id: '1', name: 'Item 1', status: 'active', value: 100 },
  { id: '2', name: 'Item 2', status: 'inactive', value: 200 },
  { id: '3', name: 'Item 3', status: 'active', value: 150 },
];

const testColumns: Column<TestData>[] = [
  { id: 'name', header: 'Name', accessor: 'name', sortable: true },
  { id: 'status', header: 'Status', accessor: 'status', sortable: true },
  { id: 'value', header: 'Value', accessor: 'value', sortable: true },
];

describe('DataTable', () => {
  it('renders table with data', () => {
    render(<DataTable columns={testColumns} data={testData} />);
    
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Value')).toBeInTheDocument();
    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
    expect(screen.getByText('Item 3')).toBeInTheDocument();
  });

  it('renders empty state when no data', () => {
    render(<DataTable columns={testColumns} data={[]} />);
    
    expect(screen.getByText('No data available')).toBeInTheDocument();
  });

  it('renders custom empty message', () => {
    render(
      <DataTable 
        columns={testColumns} 
        data={[]} 
        emptyMessage="No items found" 
      />
    );
    
    expect(screen.getByText('No items found')).toBeInTheDocument();
  });

  it('handles sorting when column header is clicked', () => {
    const onSortChange = vi.fn();
    render(
      <DataTable 
        columns={testColumns} 
        data={testData} 
        onSortChange={onSortChange}
      />
    );
    
    const nameHeader = screen.getByText('Name');
    fireEvent.click(nameHeader);
    
    expect(onSortChange).toHaveBeenCalledWith('name', 'asc');
  });

  it('toggles sort direction on subsequent clicks', () => {
    const onSortChange = vi.fn();
    render(
      <DataTable 
        columns={testColumns} 
        data={testData} 
        onSortChange={onSortChange}
      />
    );
    
    const nameHeader = screen.getByText('Name');
    fireEvent.click(nameHeader);
    fireEvent.click(nameHeader);
    
    expect(onSortChange).toHaveBeenCalledWith('name', 'desc');
  });

  it('handles keyboard navigation for sorting', () => {
    const onSortChange = vi.fn();
    render(
      <DataTable 
        columns={testColumns} 
        data={testData} 
        onSortChange={onSortChange}
      />
    );
    
    const nameHeader = screen.getByText('Name');
    nameHeader.focus();
    fireEvent.keyDown(nameHeader, { key: 'Enter' });
    
    expect(onSortChange).toHaveBeenCalledWith('name', 'asc');
  });

  it('handles space key for sorting', () => {
    const onSortChange = vi.fn();
    render(
      <DataTable 
        columns={testColumns} 
        data={testData} 
        onSortChange={onSortChange}
      />
    );
    
    const nameHeader = screen.getByText('Name');
    nameHeader.focus();
    fireEvent.keyDown(nameHeader, { key: ' ' });
    
    expect(onSortChange).toHaveBeenCalledWith('name', 'asc');
  });

  it('filters data based on filter text', () => {
    render(
      <DataTable 
        columns={testColumns} 
        data={testData} 
        filterText="Item 1"
      />
    );
    
    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.queryByText('Item 2')).not.toBeInTheDocument();
    expect(screen.queryByText('Item 3')).not.toBeInTheDocument();
  });

  it('renders pagination when provided', () => {
    const pagination = {
      page: 1,
      pageSize: 2,
      total: 3,
      onPageChange: vi.fn(),
    };
    
    render(
      <DataTable 
        columns={testColumns} 
        data={testData} 
        pagination={pagination}
      />
    );
    
    expect(screen.getByText('Showing 1 to 2 of 3 results')).toBeInTheDocument();
    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
    expect(screen.getByText('Previous')).toBeInTheDocument();
    expect(screen.getByText('Next')).toBeInTheDocument();
  });

  it('disables previous button on first page', () => {
    const pagination = {
      page: 1,
      pageSize: 2,
      total: 3,
      onPageChange: vi.fn(),
    };
    
    render(
      <DataTable 
        columns={testColumns} 
        data={testData} 
        pagination={pagination}
      />
    );
    
    const prevButton = screen.getByText('Previous');
    expect(prevButton).toBeDisabled();
  });

  it('disables next button on last page', () => {
    const pagination = {
      page: 2,
      pageSize: 2,
      total: 3,
      onPageChange: vi.fn(),
    };
    
    render(
      <DataTable 
        columns={testColumns} 
        data={testData} 
        pagination={pagination}
      />
    );
    
    const nextButton = screen.getByText('Next');
    expect(nextButton).toBeDisabled();
  });

  it('calls onPageChange when pagination buttons are clicked', () => {
    const onPageChange = vi.fn();
    const pagination = {
      page: 1,
      pageSize: 2,
      total: 3,
      onPageChange,
    };
    
    render(
      <DataTable 
        columns={testColumns} 
        data={testData} 
        pagination={pagination}
      />
    );
    
    const nextButton = screen.getByText('Next');
    fireEvent.click(nextButton);
    
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('renders loading state', () => {
    render(
      <DataTable 
        columns={testColumns} 
        data={[]} 
        loading={true}
      />
    );
    
    // Check for loading skeleton elements
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
    // Should not show table content when loading
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('applies custom caption', () => {
    render(
      <DataTable 
        columns={testColumns} 
        data={testData} 
        caption="Test table caption"
      />
    );
    
    const caption = screen.getByText('Test table caption');
    expect(caption).toBeInTheDocument();
    expect(caption).toHaveClass('sr-only');
  });

  it('handles function accessor', () => {
    const columnsWithFunction: Column<TestData>[] = [
      { 
        id: 'display', 
        header: 'Display', 
        accessor: (row) => `${row.name} (${row.status})`
      },
    ];
    
    render(
      <DataTable 
        columns={columnsWithFunction} 
        data={testData} 
      />
    );
    
    expect(screen.getByText('Item 1 (active)')).toBeInTheDocument();
    expect(screen.getByText('Item 2 (inactive)')).toBeInTheDocument();
    expect(screen.getByText('Item 3 (active)')).toBeInTheDocument();
  });
});
