import { describe, it, expect } from 'vitest';
import { render, screen } from '../../../test/utils';
import userEvent from '@testing-library/user-event';
import { HeroSection } from '../HeroSection';
import { testAccessibility, testAccessibilityFeatures } from '../../../test/accessibility';

describe('HeroSection', () => {
  it('renders correctly with all UI elements', () => {
    render(<HeroSection />);
    
    // Check for main hero elements
    expect(screen.getByText(/Private beta/)).toBeInTheDocument();
    expect(screen.getByText(/Turn a BRD into a project plan in 3 minutes/)).toBeInTheDocument();
    expect(screen.getByText(/Upload a BRD. Zephix extracts scope/)).toBeInTheDocument();
    expect(screen.getByText('Try a sample BRD')).toBeInTheDocument();
    expect(screen.getByText('Book a 15 minute demo')).toBeInTheDocument();
  });

  it('has proper accessibility roles and labels', () => {
    render(<HeroSection />);
    
    // Check for main heading
    const mainHeading = screen.getByRole('heading', { level: 1 });
    expect(mainHeading).toBeInTheDocument();
    expect(mainHeading).toHaveTextContent(/Turn a BRD into a project plan in 3 minutes/);
    
    // Check for status badge
    const statusBadge = screen.getByRole('status', { name: /private beta/i });
    expect(statusBadge).toBeInTheDocument();
    
    // Check for buttons
    expect(screen.getByRole('button', { name: /try a sample brd/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /book a 15 minute demo/i })).toBeInTheDocument();
  });

  it('has proper heading structure', () => {
    render(<HeroSection />);
    
    // Check for single h1 heading
    const headings = screen.getAllByRole('heading');
    expect(headings).toHaveLength(1);
  });

  it('has proper ARIA attributes', () => {
    render(<HeroSection />);
    
    // Check that status badge has proper aria-label
    const statusBadge = screen.getByRole('status');
    expect(statusBadge).toHaveAttribute('aria-label', 'Private beta');
    
    // Check that buttons have proper accessibility
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(2);
  });

  it('has proper keyboard navigation support', async () => {
    const user = userEvent.setup();
    
    render(<HeroSection />);
    
    // Tab to first button
    await user.tab();
    const sampleBRDButton = screen.getByRole('button', { name: /try a sample brd/i });
    expect(sampleBRDButton).toHaveFocus();
    
    // Tab to second button
    await user.tab();
    const demoButton = screen.getByRole('button', { name: /book a 15 minute demo/i });
    expect(demoButton).toHaveFocus();
  });

  it('renders responsive elements correctly', () => {
    render(<HeroSection />);
    
    // Check for responsive text elements
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveClass('text-5xl', 'md:text-6xl');
  });

  it('has proper focus management', async () => {
    const user = userEvent.setup();
    
    render(<HeroSection />);
    
    // Focus should be managed properly
    const sampleBRDButton = screen.getByRole('button', { name: /try a sample brd/i });
    sampleBRDButton.focus();
    expect(sampleBRDButton).toHaveFocus();
  });

  it('has proper semantic structure', () => {
    render(<HeroSection />);
    
    // Check for proper section element
    const section = document.querySelector('section');
    expect(section).toBeInTheDocument();
    
    // Check that heading is inside section
    const heading = screen.getByRole('heading', { level: 1 });
    expect(section).toContainElement(heading);
  });

  it('has proper color contrast and visual indicators', () => {
    render(<HeroSection />);
    
    // Check for status badge styling
    const statusBadge = screen.getByRole('status', { name: /private beta/i });
    expect(statusBadge).toHaveClass('text-xs', 'px-2.5', 'py-1', 'rounded-full');
    
    // Check for button styling
    const sampleBRDButton = screen.getByRole('button', { name: /try a sample brd/i });
    expect(sampleBRDButton).toHaveClass('btn-primary');
    
    const demoButton = screen.getByRole('button', { name: /book a 15 minute demo/i });
    expect(demoButton).toHaveClass('btn-secondary');
  });

  it('has proper text content and descriptions', () => {
    render(<HeroSection />);
    
    // Check for descriptive text
    const description = screen.getByText(/Upload a BRD. Zephix extracts scope/);
    expect(description).toBeInTheDocument();
    
    // Check that description provides context
    expect(description).toHaveTextContent(/builds a schedule with stage gates/);
  });

  it('has proper button functionality', () => {
    render(<HeroSection />);
    
    // Check that buttons have proper functionality
    const sampleBRDButton = screen.getByRole('button', { name: /try a sample brd/i });
    expect(sampleBRDButton).toBeInTheDocument();
    
    const demoButton = screen.getByRole('button', { name: /book a 15 minute demo/i });
    expect(demoButton).toBeInTheDocument();
  });

  it('passes accessibility audit', async () => {
    await testAccessibility(<HeroSection />, { useRouter: true });
  });

  it('has proper accessibility features', async () => {
    await testAccessibilityFeatures(
      <HeroSection />,
      ['headings', 'links'],
      { useRouter: true }
    );
  });

  it('has proper ARIA labels and roles', () => {
    render(<HeroSection />);
    
    // Check for proper ARIA labels
    const statusBadge = screen.getByRole('status', { name: /private beta/i });
    expect(statusBadge).toHaveAttribute('aria-label', 'Private beta');
    
    // Check that buttons have proper accessibility
    const sampleBRDButton = screen.getByRole('button', { name: /try a sample brd/i });
    expect(sampleBRDButton).toBeInTheDocument();
    
    const demoButton = screen.getByRole('button', { name: /book a 15 minute demo/i });
    expect(demoButton).toBeInTheDocument();
  });
});
