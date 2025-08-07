import { describe, it, expect } from 'vitest';
import { render, screen } from '../../../test/utils';
import userEvent from '@testing-library/user-event';
import { HeroSection } from '../HeroSection';
import { testAccessibility, testAccessibilityFeatures } from '../../../test/accessibility';

describe('HeroSection', () => {
  it('renders correctly with all UI elements', () => {
    render(<HeroSection />);
    
    // Check for main hero elements
    expect(screen.getByText(/Transform Your BRDs into/)).toBeInTheDocument();
    expect(screen.getByText(/Actionable Project Plans/)).toBeInTheDocument();
    expect(screen.getByText(/Zephix uses advanced AI/)).toBeInTheDocument();
    expect(screen.getByText('Start Building')).toBeInTheDocument();
    expect(screen.getByText('Learn More')).toBeInTheDocument();
  });

  it('has proper accessibility roles and labels', () => {
    render(<HeroSection />);
    
    // Check for main heading
    const mainHeading = screen.getByRole('heading', { level: 1 });
    expect(mainHeading).toBeInTheDocument();
    expect(mainHeading).toHaveTextContent(/Transform Your BRDs into/);
    
    // Check for accessible links
    const startBuildingLink = screen.getByRole('link', { name: /start building your first project/i });
    expect(startBuildingLink).toBeInTheDocument();
    
    const learnMoreLink = screen.getByRole('link', { name: /learn more about features/i });
    expect(learnMoreLink).toBeInTheDocument();
  });

  it('has proper heading structure', () => {
    render(<HeroSection />);
    
    // Check for single h1 heading
    const headings = screen.getAllByRole('heading');
    expect(headings).toHaveLength(1);
  });

  it('has proper ARIA attributes', () => {
    render(<HeroSection />);
    
    // Check that all links have proper aria-labels
    const links = screen.getAllByRole('link');
    links.forEach(link => {
      expect(link).toHaveAttribute('aria-label');
    });
  });

  it('has proper keyboard navigation support', async () => {
    const user = userEvent.setup();
    
    render(<HeroSection />);
    
    // Tab to first link
    await user.tab();
    const startBuildingLink = screen.getByRole('link', { name: /start building your first project/i });
    expect(startBuildingLink).toHaveFocus();
    
    // Tab to second link
    await user.tab();
    const learnMoreLink = screen.getByRole('link', { name: /learn more about features/i });
    expect(learnMoreLink).toHaveFocus();
  });

  it('renders responsive elements correctly', () => {
    render(<HeroSection />);
    
    // Check for responsive text elements
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveClass('text-4xl', 'md:text-5xl', 'lg:text-6xl');
  });

  it('has proper focus management', async () => {
    const user = userEvent.setup();
    
    render(<HeroSection />);
    
    // Focus should be managed properly
    const startBuildingLink = screen.getByRole('link', { name: /start building your first project/i });
    startBuildingLink.focus();
    expect(startBuildingLink).toHaveFocus();
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
    
    // Check for proper hover states
    const startBuildingLink = screen.getByRole('link', { name: /start building your first project/i });
    expect(startBuildingLink).toHaveClass('hover:from-indigo-700', 'hover:to-blue-700');
    
    const learnMoreLink = screen.getByRole('link', { name: /learn more about features/i });
    expect(learnMoreLink).toHaveClass('hover:bg-yellow-300');
  });

  it('has proper text content and descriptions', () => {
    render(<HeroSection />);
    
    // Check for descriptive text
    const description = screen.getByText(/Zephix uses advanced AI to analyze/);
    expect(description).toBeInTheDocument();
    
    // Check that description provides context
    expect(description).toHaveTextContent(/Business Requirements Documents/);
  });

  it('has proper link destinations', () => {
    render(<HeroSection />);
    
    // Check that links point to correct destinations
    const startBuildingLink = screen.getByRole('link', { name: /start building your first project/i });
    expect(startBuildingLink).toHaveAttribute('href', '/dashboard');
    
    const learnMoreLink = screen.getByRole('link', { name: /learn more about features/i });
    expect(learnMoreLink).toHaveAttribute('href', '/#features');
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
    const startBuildingLink = screen.getByRole('link', { name: /start building your first project/i });
    expect(startBuildingLink).toHaveAttribute('aria-label', 'Start building your first project');
    
    const learnMoreLink = screen.getByRole('link', { name: /learn more about features/i });
    expect(learnMoreLink).toHaveAttribute('aria-label', 'Learn more about features');
  });
});
