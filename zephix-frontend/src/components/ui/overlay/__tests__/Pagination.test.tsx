import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Pagination } from '../Pagination';

describe('Pagination', () => {
  const defaultProps = {
    currentPage: 1,
    totalPages: 10,
    onPageChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders pagination controls', () => {
    render(<Pagination {...defaultProps} />);
    
    expect(screen.getByRole('navigation')).toBeInTheDocument();
    expect(screen.getByLabelText('Go to page 1')).toBeInTheDocument();
    expect(screen.getByLabelText('Go to next page')).toBeInTheDocument();
  });

  it('does not render when totalPages is 1', () => {
    render(<Pagination {...defaultProps} totalPages={1} />);
    
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });

  it('highlights current page', () => {
    render(<Pagination {...defaultProps} currentPage={3} />);
    
    const currentPageButton = screen.getByLabelText('Go to page 3');
    expect(currentPageButton).toHaveAttribute('aria-current', 'page');
    expect(currentPageButton).toHaveClass('bg-primary');
  });

  it('calls onPageChange when page is clicked', () => {
    render(<Pagination {...defaultProps} />);
    
    const page2Button = screen.getByLabelText('Go to page 2');
    fireEvent.click(page2Button);
    
    expect(defaultProps.onPageChange).toHaveBeenCalledWith(2);
  });

  it('handles keyboard navigation', () => {
    render(<Pagination {...defaultProps} />);
    
    const page2Button = screen.getByLabelText('Go to page 2');
    fireEvent.keyDown(page2Button, { key: 'Enter' });
    
    expect(defaultProps.onPageChange).toHaveBeenCalledWith(2);
  });

  it('disables previous button on first page', () => {
    render(<Pagination {...defaultProps} currentPage={1} />);
    
    const prevButton = screen.getByLabelText('Go to previous page');
    expect(prevButton).toBeDisabled();
  });

  it('disables next button on last page', () => {
    render(<Pagination {...defaultProps} currentPage={10} />);
    
    const nextButton = screen.getByLabelText('Go to next page');
    expect(nextButton).toBeDisabled();
  });

  it('shows ellipsis for large page counts', () => {
    render(<Pagination {...defaultProps} currentPage={5} maxVisiblePages={3} />);
    
    // Check for ellipsis icons (MoreHorizontal components)
    const ellipsisElements = document.querySelectorAll('.lucide-ellipsis');
    expect(ellipsisElements).toHaveLength(2); // Start and end ellipsis
  });

  it('shows first and last page buttons', () => {
    render(<Pagination {...defaultProps} currentPage={5} />);
    
    expect(screen.getByLabelText('Go to first page')).toBeInTheDocument();
    expect(screen.getByLabelText('Go to last page')).toBeInTheDocument();
  });

  it('hides first/last buttons when showFirstLast is false', () => {
    render(<Pagination {...defaultProps} showFirstLast={false} />);
    
    expect(screen.queryByLabelText('Go to first page')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Go to last page')).not.toBeInTheDocument();
  });

  it('hides prev/next buttons when showPrevNext is false', () => {
    render(<Pagination {...defaultProps} showPrevNext={false} />);
    
    expect(screen.queryByLabelText('Go to previous page')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Go to next page')).not.toBeInTheDocument();
  });

  it('has proper ARIA attributes', () => {
    render(<Pagination {...defaultProps} />);
    
    const nav = screen.getByRole('navigation');
    expect(nav).toHaveAttribute('aria-label', 'Pagination');
    
    const currentPageButton = screen.getByLabelText('Go to page 1');
    expect(currentPageButton).toHaveAttribute('aria-current', 'page');
  });
});
