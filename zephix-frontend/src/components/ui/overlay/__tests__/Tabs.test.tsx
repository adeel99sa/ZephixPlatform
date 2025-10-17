import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Tabs } from '../Tabs';

const testItems = [
  { id: 'tab1', label: 'Tab 1', content: <div>Content 1</div> },
  { id: 'tab2', label: 'Tab 2', content: <div>Content 2</div> },
  { id: 'tab3', label: 'Tab 3', content: <div>Content 3</div>, disabled: true },
];

describe('Tabs', () => {
  it('renders tabs with content', () => {
    render(<Tabs items={testItems} />);
    
    expect(screen.getByRole('tablist')).toBeInTheDocument();
    expect(screen.getByText('Tab 1')).toBeInTheDocument();
    expect(screen.getByText('Tab 2')).toBeInTheDocument();
    expect(screen.getByText('Tab 3')).toBeInTheDocument();
    expect(screen.getByText('Content 1')).toBeInTheDocument();
  });

  it('activates first enabled tab by default', () => {
    render(<Tabs items={testItems} />);
    
    const tab1 = screen.getByRole('tab', { name: 'Tab 1' });
    expect(tab1).toHaveAttribute('aria-selected', 'true');
    expect(tab1).toHaveAttribute('tabIndex', '0');
  });

  it('activates specified default tab', () => {
    render(<Tabs items={testItems} defaultActiveTab="tab2" />);
    
    const tab2 = screen.getByRole('tab', { name: 'Tab 2' });
    expect(tab2).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Content 2')).toBeInTheDocument();
  });

  it('changes active tab when clicked', () => {
    render(<Tabs items={testItems} />);
    
    const tab2 = screen.getByRole('tab', { name: 'Tab 2' });
    fireEvent.click(tab2);
    
    expect(tab2).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Content 2')).toBeInTheDocument();
  });

  it('calls onTabChange when tab is clicked', () => {
    const onTabChange = vi.fn();
    render(<Tabs items={testItems} onTabChange={onTabChange} />);
    
    const tab2 = screen.getByRole('tab', { name: 'Tab 2' });
    fireEvent.click(tab2);
    
    expect(onTabChange).toHaveBeenCalledWith('tab2');
  });

  it('handles arrow key navigation', () => {
    render(<Tabs items={testItems} />);
    
    const tab1 = screen.getByRole('tab', { name: 'Tab 1' });
    tab1.focus();
    
    // Arrow right should move to next tab
    fireEvent.keyDown(tab1, { key: 'ArrowRight' });
    const tab2 = screen.getByRole('tab', { name: 'Tab 2' });
    expect(tab2).toHaveAttribute('aria-selected', 'true');
    
    // Arrow left should move to previous tab
    fireEvent.keyDown(tab2, { key: 'ArrowLeft' });
    expect(tab1).toHaveAttribute('aria-selected', 'true');
  });

  it('handles Home and End key navigation', () => {
    render(<Tabs items={testItems} />);
    
    const tab2 = screen.getByRole('tab', { name: 'Tab 2' });
    tab2.focus();
    
    // Home should move to first tab
    fireEvent.keyDown(tab2, { key: 'Home' });
    const tab1 = screen.getByRole('tab', { name: 'Tab 1' });
    expect(tab1).toHaveAttribute('aria-selected', 'true');
    
    // End should move to last enabled tab
    fireEvent.keyDown(tab1, { key: 'End' });
    expect(tab2).toHaveAttribute('aria-selected', 'true');
  });

  it('skips disabled tabs in navigation', () => {
    render(<Tabs items={testItems} />);
    
    const tab2 = screen.getByRole('tab', { name: 'Tab 2' });
    tab2.focus();
    
    // Arrow right should skip disabled tab3 and wrap to tab1
    fireEvent.keyDown(tab2, { key: 'ArrowRight' });
    const tab1 = screen.getByRole('tab', { name: 'Tab 1' });
    expect(tab1).toHaveAttribute('aria-selected', 'true');
  });

  it('disables disabled tabs', () => {
    render(<Tabs items={testItems} />);
    
    const tab3 = screen.getByRole('tab', { name: 'Tab 3' });
    expect(tab3).toHaveAttribute('aria-disabled', 'true');
    expect(tab3).toBeDisabled();
  });

  it('has proper ARIA attributes', () => {
    render(<Tabs items={testItems} />);
    
    const tablist = screen.getByRole('tablist');
    expect(tablist).toHaveAttribute('aria-label', 'Tabs');
    
    const tab1 = screen.getByRole('tab', { name: 'Tab 1' });
    expect(tab1).toHaveAttribute('aria-controls', 'tabpanel-tab1');
    
    const tabpanel = screen.getByRole('tabpanel');
    expect(tabpanel).toHaveAttribute('aria-labelledby', 'tab-tab1');
  });
});
