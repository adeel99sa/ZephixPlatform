import { describe, it, expect } from 'vitest';
import { render, screen } from '../../../test/utils';
import userEvent from '@testing-library/user-event';
import { HowItWorksSection } from '../HowItWorksSection';

describe('HowItWorksSection', () => {
  it('renders correctly with all UI elements', () => {
    render(<HowItWorksSection />);
    
    // Check for main section elements
    expect(screen.getByText('How Zephix Works')).toBeInTheDocument();
    expect(screen.getByText(/From upload to execution in just three simple steps/)).toBeInTheDocument();
    
    // Check for all step titles
    expect(screen.getByText('Upload Your Document')).toBeInTheDocument();
    expect(screen.getByText('AI Analysis & Planning')).toBeInTheDocument();
    expect(screen.getByText('Review & Execute')).toBeInTheDocument();
    
    // Check for step descriptions
    expect(screen.getByText(/Drag & drop your document/)).toBeInTheDocument();
    expect(screen.getByText(/Our AI engine builds a full project plan/)).toBeInTheDocument();
    expect(screen.getByText(/Tweak, assign, and launch your project/)).toBeInTheDocument();
  });

  it('has proper accessibility roles and labels', () => {
    render(<HowItWorksSection />);
    
    // Check for main heading
    const mainHeading = screen.getByRole('heading', { level: 2 });
    expect(mainHeading).toBeInTheDocument();
    expect(mainHeading).toHaveAttribute('id', 'how-it-works-heading');
    
    // Check for step headings
    const stepHeadings = screen.getAllByRole('heading', { level: 3 });
    expect(stepHeadings).toHaveLength(3);
    
    // Check for article roles
    const articles = screen.getAllByRole('article');
    expect(articles).toHaveLength(3);
  });

  it('has proper heading structure', () => {
    render(<HowItWorksSection />);
    
    // Check for proper heading hierarchy
    const headings = screen.getAllByRole('heading');
    expect(headings).toHaveLength(4); // 1 h2 + 3 h3
    
    const h2Headings = screen.getAllByRole('heading', { level: 2 });
    expect(h2Headings).toHaveLength(1);
    
    const h3Headings = screen.getAllByRole('heading', { level: 3 });
    expect(h3Headings).toHaveLength(3);
  });

  it('has proper ARIA attributes', () => {
    render(<HowItWorksSection />);
    
    // Check that articles have proper aria-labelledby
    const articles = screen.getAllByRole('article');
    articles.forEach((article, index) => {
      const expectedId = `step-${index + 1}`;
      expect(article).toHaveAttribute('aria-labelledby', expectedId);
    });
    
    // Check for step numbers with proper IDs
    const stepHeadings = screen.getAllByRole('heading', { level: 3 });
    stepHeadings.forEach((heading, index) => {
      const expectedId = `step-${index + 1}`;
      expect(heading).toHaveAttribute('id', expectedId);
    });
  });

  it('has proper keyboard navigation support', async () => {
    const user = userEvent.setup();
    
    render(<HowItWorksSection />);
    
    // Tab through all interactive elements
    await user.tab();
    await user.tab();
    await user.tab();
  });

  it('renders responsive elements correctly', () => {
    render(<HowItWorksSection />);
    
    // Check for responsive grid layout
    const grid = document.querySelector('.grid');
    expect(grid).toHaveClass('sm:grid-cols-3');
  });

  it('has proper semantic structure', () => {
    render(<HowItWorksSection />);
    
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

  it('has proper step numbering', () => {
    render(<HowItWorksSection />);
    
    // Check that step numbers are present and accessible
    const stepNumbers = screen.getAllByText(/^[1-3]$/);
    expect(stepNumbers).toHaveLength(3);
    
    // Check that step numbers are in proper containers
    stepNumbers.forEach((number, index) => {
      const container = number.closest('div');
      expect(container).toHaveClass('mx-auto', 'flex', 'h-16', 'w-16');
      expect(container).toHaveAttribute('aria-hidden', 'true');
    });
  });

  it('has proper text content and descriptions', () => {
    render(<HowItWorksSection />);
    
    // Check for descriptive text
    const description = screen.getByText(/From upload to execution in just three simple steps/);
    expect(description).toBeInTheDocument();
    
    // Check that description provides context
    expect(description).toHaveTextContent(/three simple steps/);
  });

  it('has proper step organization', () => {
    render(<HowItWorksSection />);
    
    // Check that each step has number, title, and description
          const stepTitles = ['Upload Your Document', 'AI Analysis & Planning', 'Review & Execute'];
    
    stepTitles.forEach((title, index) => {
      const stepHeading = screen.getByText(title);
      expect(stepHeading).toBeInTheDocument();
      
      // Check that the heading is properly associated with its article
      const article = stepHeading.closest('[role="article"]');
      expect(article).toBeInTheDocument();
      
      // Check that the step number is present
      const stepNumber = screen.getByText((index + 1).toString());
      expect(stepNumber).toBeInTheDocument();
    });
  });

  it('has proper visual hierarchy', () => {
    render(<HowItWorksSection />);
    
    // Check that step numbers are visually distinct
    const stepNumbers = screen.getAllByText(/^[1-3]$/);
    stepNumbers.forEach(number => {
      const container = number.closest('div');
      expect(container).toHaveClass('bg-indigo-600', 'text-white');
    });
  });

  it('has proper background styling', () => {
    render(<HowItWorksSection />);
    
    // Check for proper background styling
    const section = document.querySelector('section');
    expect(section).toHaveClass('bg-gray-50');
  });
});
