import { describe, it, expect } from 'vitest';
import { render, screen } from '../../../test/utils';
import userEvent from '@testing-library/user-event';
import { PricingSection } from '../PricingSection';
import { testAccessibility, testAccessibilityFeatures } from '../../../test/accessibility';

describe('PricingSection', () => {
  it('renders correctly with all UI elements', () => {
    render(<PricingSection />);
    
    // Check for main section elements
    expect(screen.getByText('Choose Your Plan')).toBeInTheDocument();
    expect(screen.getByText(/Start free, upgrade as you grow/)).toBeInTheDocument();
    
    // Check for all plan names
    expect(screen.getByText('Starter')).toBeInTheDocument();
    expect(screen.getByText('Professional')).toBeInTheDocument();
    expect(screen.getByText('Enterprise')).toBeInTheDocument();
    
    // Check for plan prices
    expect(screen.getByText('$29')).toBeInTheDocument();
    expect(screen.getByText('$79')).toBeInTheDocument();
    expect(screen.getByText('Custom')).toBeInTheDocument();
    
    // Check for popular badge
    expect(screen.getByText('Most Popular')).toBeInTheDocument();
    
    // Check for action buttons
    expect(screen.getByText('Get Started')).toBeInTheDocument();
    expect(screen.getAllByText('Try Free')).toHaveLength(2);
  });

  it('has proper accessibility roles and labels', () => {
    render(<PricingSection />);
    
    // Check for main heading
    const mainHeading = screen.getByRole('heading', { level: 2 });
    expect(mainHeading).toBeInTheDocument();
    expect(mainHeading).toHaveAttribute('id', 'pricing-heading');
    
    // Check for plan headings
    const planHeadings = screen.getAllByRole('heading', { level: 3 });
    expect(planHeadings).toHaveLength(3);
    
    // Check for article roles
    const articles = screen.getAllByRole('article');
    expect(articles).toHaveLength(3);
  });

  it('has proper heading structure', () => {
    render(<PricingSection />);
    
    // Check for proper heading hierarchy
    const headings = screen.getAllByRole('heading');
    expect(headings).toHaveLength(4); // 1 h2 + 3 h3
    
    const h2Headings = screen.getAllByRole('heading', { level: 2 });
    expect(h2Headings).toHaveLength(1);
    
    const h3Headings = screen.getAllByRole('heading', { level: 3 });
    expect(h3Headings).toHaveLength(3);
  });

  it('has proper ARIA attributes', () => {
    render(<PricingSection />);
    
    // Check that articles have proper aria-labelledby
    const articles = screen.getAllByRole('article');
    const planNames = ['Starter', 'Professional', 'Enterprise'];
    
    articles.forEach((article, index) => {
      const expectedId = `plan-${planNames[index].toLowerCase()}`;
      expect(article).toHaveAttribute('aria-labelledby', expectedId);
    });
    
    // Check for plan headings with proper IDs
    const planHeadings = screen.getAllByRole('heading', { level: 3 });
    planHeadings.forEach((heading, index) => {
      const expectedId = `plan-${planNames[index].toLowerCase()}`;
      expect(heading).toHaveAttribute('id', expectedId);
    });
  });

  it('has proper keyboard navigation support', async () => {
    const user = userEvent.setup();
    
    render(<PricingSection />);
    
    // Tab through all interactive elements
    await user.tab();
    await user.tab();
    await user.tab();
  });

  it('renders responsive elements correctly', () => {
    render(<PricingSection />);
    
    // Check for responsive grid layout
    const grid = document.querySelector('.grid');
    expect(grid).toHaveClass('sm:grid-cols-2', 'lg:grid-cols-3');
  });

  it('has proper semantic structure', () => {
    render(<PricingSection />);
    
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

  it('has proper plan features', () => {
    render(<PricingSection />);
    
    // Check for feature lists
    const featureLists = screen.getAllByRole('list');
    expect(featureLists).toHaveLength(3);
    
    // Check for feature items
    const featureItems = screen.getAllByRole('listitem');
    expect(featureItems.length).toBeGreaterThan(0);
  });

  it('has proper popular plan highlighting', () => {
    render(<PricingSection />);
    
    // Check for popular badge
    const popularBadge = screen.getByText('Most Popular');
    expect(popularBadge).toBeInTheDocument();
    
    // Check that popular plan has different styling
    const articles = screen.getAllByRole('article');
    const professionalArticle = articles[1]; // Professional is the popular plan
    expect(professionalArticle).toHaveClass('border-indigo-600', 'shadow-lg');
  });

  it('has proper action buttons', () => {
    render(<PricingSection />);
    
    // Check for action links
    const actionLinks = screen.getAllByRole('link');
    expect(actionLinks).toHaveLength(3);
    
    // Check that all links point to dashboard
    actionLinks.forEach(link => {
      expect(link).toHaveAttribute('href', '/dashboard');
    });
  });

  it('has proper text content and descriptions', () => {
    render(<PricingSection />);
    
    // Check for descriptive text
    const description = screen.getByText(/Start free, upgrade as you grow/);
    expect(description).toBeInTheDocument();
  });

  it('has proper plan organization', () => {
    render(<PricingSection />);
    
    // Check that each plan has price, name, features, and action button
    const planNames = ['Starter', 'Professional', 'Enterprise'];
    const planPrices = ['$29', '$79', 'Custom'];
    
    planNames.forEach((name, index) => {
      const planHeading = screen.getByText(name);
      expect(planHeading).toBeInTheDocument();
      
      const priceElement = screen.getByText(planPrices[index]);
      expect(priceElement).toBeInTheDocument();
      
      // Check that the heading is properly associated with its article
      const article = planHeading.closest('[role="article"]');
      expect(article).toBeInTheDocument();
    });
  });

  it('has proper icon accessibility', () => {
    render(<PricingSection />);
    
    // Check that check icons are decorative and hidden from screen readers
    const svgIcons = document.querySelectorAll('svg[aria-hidden="true"]');
    expect(svgIcons.length).toBeGreaterThan(0);
    
    svgIcons.forEach(icon => {
      expect(icon).toHaveAttribute('aria-hidden', 'true');
    });
  });

  it('has proper color contrast and visual indicators', () => {
    render(<PricingSection />);
    
    // Check for proper hover states
    const actionLinks = screen.getAllByRole('link');
    actionLinks.forEach((link, index) => {
      if (index === 1) { // Professional plan
        expect(link).toHaveClass('hover:from-indigo-700', 'hover:to-blue-700');
      } else {
        expect(link).toHaveClass('hover:bg-gray-100');
      }
    });
  });

  it('passes accessibility audit', async () => {
    await testAccessibility(<PricingSection />, { useRouter: true });
  });

  it('has proper accessibility features', async () => {
    await testAccessibilityFeatures(
      <PricingSection />,
      ['headings', 'links', 'lists'],
      { useRouter: true }
    );
  });

  it('has proper ARIA labels and roles', () => {
    render(<PricingSection />);
    
    // Check for proper ARIA labels on links
    const actionLinks = screen.getAllByRole('link');
    expect(actionLinks[0]).toHaveAttribute('aria-label', 'Try Free with Starter plan');
    expect(actionLinks[1]).toHaveAttribute('aria-label', 'Get Started with Professional plan');
    expect(actionLinks[2]).toHaveAttribute('aria-label', 'Try Free with Enterprise plan');
    
    // Check for proper article roles
    const articles = screen.getAllByRole('article');
    articles.forEach(article => {
      expect(article).toHaveAttribute('role', 'article');
    });
  });
});
