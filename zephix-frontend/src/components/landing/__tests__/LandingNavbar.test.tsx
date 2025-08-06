import { describe, it, expect } from 'vitest';
import { render, screen } from '../../../test/utils';
import userEvent from '@testing-library/user-event';
import { LandingNavbar } from '../LandingNavbar';

describe('LandingNavbar', () => {
  it('renders correctly with all UI elements', () => {
    render(<LandingNavbar />);
    
    // Check for main navigation elements
    expect(screen.getByText('Zephix')).toBeInTheDocument();
    expect(screen.getByText('AI Co-pilot')).toBeInTheDocument();
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Features')).toBeInTheDocument();
    expect(screen.getByText('How It Works')).toBeInTheDocument();
    expect(screen.getByText('Pricing')).toBeInTheDocument();
    expect(screen.getByText('Log in')).toBeInTheDocument();
    expect(screen.getByText('Get Started')).toBeInTheDocument();
  });

  it('has proper accessibility roles and labels', () => {
    render(<LandingNavbar />);
    
    // Check for proper navigation structure
    const navigation = screen.getByRole('navigation');
    expect(navigation).toBeInTheDocument();
    expect(navigation).toHaveAttribute('aria-label', 'Main navigation');
    
    // Check for accessible links
    const homeLink = screen.getByRole('link', { name: /zephix home/i });
    expect(homeLink).toBeInTheDocument();
    
    const featuresLink = screen.getByRole('link', { name: /view features/i });
    expect(featuresLink).toBeInTheDocument();
    
    const howItWorksLink = screen.getByRole('link', { name: /learn how it works/i });
    expect(howItWorksLink).toBeInTheDocument();
    
    const pricingLink = screen.getByRole('link', { name: /view pricing/i });
    expect(pricingLink).toBeInTheDocument();
    
    const loginLink = screen.getByRole('link', { name: /log in to your account/i });
    expect(loginLink).toBeInTheDocument();
    
    const getStartedLink = screen.getByRole('link', { name: /get started with zephix/i });
    expect(getStartedLink).toBeInTheDocument();
  });

  it('has proper heading structure', () => {
    render(<LandingNavbar />);
    
    // The navbar should not contain any heading elements as it's navigation
    const headings = screen.queryAllByRole('heading');
    expect(headings).toHaveLength(0);
  });

  it('has proper ARIA attributes', () => {
    render(<LandingNavbar />);
    
    // Check for decorative icons with aria-hidden
    const svgIcons = document.querySelectorAll('svg[aria-hidden="true"]');
    expect(svgIcons.length).toBeGreaterThan(0);
    
    // Check that all links have proper aria-labels
    const links = screen.getAllByRole('link');
    links.forEach(link => {
      expect(link).toHaveAttribute('aria-label');
    });
  });

  it('has proper keyboard navigation support', async () => {
    const user = userEvent.setup();
    
    render(<LandingNavbar />);
    
    // Tab through navigation elements
    await user.tab();
    const homeLink = screen.getByRole('link', { name: /zephix home/i });
    expect(homeLink).toHaveFocus();
    
    // Continue tabbing through other elements
    await user.tab();
    await user.tab();
    await user.tab();
    await user.tab();
    await user.tab();
    await user.tab();
    await user.tab();
  });

  it('renders responsive elements correctly', () => {
    render(<LandingNavbar />);
    
    // Check for responsive text elements
    const aiCoPilotText = screen.getByText('AI Co-pilot');
    expect(aiCoPilotText).toBeInTheDocument();
    
    // Check that the text has proper responsive classes
    expect(aiCoPilotText).toHaveClass('hidden', 'sm:inline-block');
  });

  it('has proper focus management', async () => {
    const user = userEvent.setup();
    
    render(<LandingNavbar />);
    
    // Focus should be managed properly
    const homeLink = screen.getByRole('link', { name: /zephix home/i });
    homeLink.focus();
    expect(homeLink).toHaveFocus();
  });

  it('has proper semantic structure', () => {
    render(<LandingNavbar />);
    
    // Check for proper header element
    const header = screen.getByRole('banner');
    expect(header).toBeInTheDocument();
    
    // Check that navigation is inside header
    const navigation = screen.getByRole('navigation');
    expect(header).toContainElement(navigation);
  });

  it('has proper color contrast and visual indicators', () => {
    render(<LandingNavbar />);
    
    // Check for proper hover states (these would be tested in visual regression tests)
    const navigationLinks = screen.getAllByRole('link').filter(link => 
      link.textContent === 'Home' || 
      link.textContent === 'Features' || 
      link.textContent === 'How It Works' || 
      link.textContent === 'Pricing' || 
      link.textContent === 'Log in'
    );
    
    navigationLinks.forEach(link => {
      expect(link).toHaveClass('hover:text-indigo-600');
    });
  });
});
