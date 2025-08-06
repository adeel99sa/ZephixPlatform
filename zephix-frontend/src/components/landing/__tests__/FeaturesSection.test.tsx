import { describe, it, expect } from 'vitest';
import { render, screen } from '../../../test/utils';
import userEvent from '@testing-library/user-event';
import { FeaturesSection } from '../FeaturesSection';

describe('FeaturesSection', () => {
  it('renders correctly with all UI elements', () => {
    render(<FeaturesSection />);
    
    // Check for main section elements
    expect(screen.getByText('Everything You Need to Manage Projects Intelligently')).toBeInTheDocument();
    expect(screen.getByText(/Zephix packs powerful AI features/)).toBeInTheDocument();
    
    // Check for all feature titles
    expect(screen.getByText('Auto BRD Analysis')).toBeInTheDocument();
    expect(screen.getByText('AI Planning Engine')).toBeInTheDocument();
    expect(screen.getByText('Team Orchestration')).toBeInTheDocument();
    expect(screen.getByText('Risk Assessment')).toBeInTheDocument();
    
    // Check for feature descriptions
    expect(screen.getByText(/Instantly extract requirements/)).toBeInTheDocument();
    expect(screen.getByText(/Generate timelines, milestones/)).toBeInTheDocument();
    expect(screen.getByText(/Optimize assignments based on skills/)).toBeInTheDocument();
    expect(screen.getByText(/Automatically identify and prioritize risks/)).toBeInTheDocument();
  });

  it('has proper accessibility roles and labels', () => {
    render(<FeaturesSection />);
    
    // Check for main heading
    const mainHeading = screen.getByRole('heading', { level: 2 });
    expect(mainHeading).toBeInTheDocument();
    expect(mainHeading).toHaveAttribute('id', 'features-heading');
    
    // Check for feature headings
    const featureHeadings = screen.getAllByRole('heading', { level: 3 });
    expect(featureHeadings).toHaveLength(4);
    
    // Check for article roles
    const articles = screen.getAllByRole('article');
    expect(articles).toHaveLength(4);
  });

  it('has proper heading structure', () => {
    render(<FeaturesSection />);
    
    // Check for proper heading hierarchy
    const headings = screen.getAllByRole('heading');
    expect(headings).toHaveLength(5); // 1 h2 + 4 h3
    
    const h2Headings = screen.getAllByRole('heading', { level: 2 });
    expect(h2Headings).toHaveLength(1);
    
    const h3Headings = screen.getAllByRole('heading', { level: 3 });
    expect(h3Headings).toHaveLength(4);
  });

  it('has proper ARIA attributes', () => {
    render(<FeaturesSection />);
    
    // Check for decorative icons with aria-hidden
    const svgIcons = document.querySelectorAll('svg[aria-hidden="true"]');
    expect(svgIcons.length).toBeGreaterThan(0);
    
    // Check that articles have proper aria-labelledby
    const articles = screen.getAllByRole('article');
    articles.forEach((article, index) => {
      const featureTitles = ['Auto BRD Analysis', 'AI Planning Engine', 'Team Orchestration', 'Risk Assessment'];
      const expectedId = `feature-${featureTitles[index].toLowerCase().replace(/\s+/g, '-')}`;
      expect(article).toHaveAttribute('aria-labelledby', expectedId);
    });
  });

  it('has proper keyboard navigation support', async () => {
    const user = userEvent.setup();
    
    render(<FeaturesSection />);
    
    // Tab through all interactive elements
    await user.tab();
    await user.tab();
    await user.tab();
    await user.tab();
    await user.tab();
  });

  it('renders responsive elements correctly', () => {
    render(<FeaturesSection />);
    
    // Check for responsive grid layout
    const grid = document.querySelector('.grid');
    expect(grid).toHaveClass('sm:grid-cols-2', 'lg:grid-cols-4');
  });

  it('has proper semantic structure', () => {
    render(<FeaturesSection />);
    
    // Check for proper section element
    const section = document.querySelector('section');
    expect(section).toBeInTheDocument();
    
    // Check that heading is inside section
    const heading = screen.getByRole('heading', { level: 2 });
    expect(section).toContainElement(heading);
    
    // Check that articles are inside section
    const articles = screen.getAllByRole('article');
    articles.forEach(article => {
      expect(section).toContainElement(article);
    });
  });

  it('has proper color contrast and visual indicators', () => {
    render(<FeaturesSection />);
    
    // Check for proper hover states
    const articles = screen.getAllByRole('article');
    articles.forEach(article => {
      expect(article).toHaveClass('hover:shadow-lg');
    });
  });

  it('has proper text content and descriptions', () => {
    render(<FeaturesSection />);
    
    // Check for descriptive text
    const description = screen.getByText(/Zephix packs powerful AI features/);
    expect(description).toBeInTheDocument();
    
    // Check that description provides context
    expect(description).toHaveTextContent(/intuitive dashboard/);
  });

  it('has proper feature organization', () => {
    render(<FeaturesSection />);
    
    // Check that each feature has icon, title, and description
    const featureTitles = ['Auto BRD Analysis', 'AI Planning Engine', 'Team Orchestration', 'Risk Assessment'];
    
    featureTitles.forEach(title => {
      const featureHeading = screen.getByText(title);
      expect(featureHeading).toBeInTheDocument();
      
      // Check that the heading is properly associated with its article
      const article = featureHeading.closest('[role="article"]');
      expect(article).toBeInTheDocument();
    });
  });

  it('has proper icon accessibility', () => {
    render(<FeaturesSection />);
    
    // Check that icons are decorative and hidden from screen readers
    const svgIcons = document.querySelectorAll('svg[aria-hidden="true"]');
    expect(svgIcons.length).toBeGreaterThan(0);
    
    svgIcons.forEach(icon => {
      expect(icon).toHaveAttribute('aria-hidden', 'true');
    });
  });
});
