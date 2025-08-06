import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import type { ReactElement } from 'react';
import { renderWithRouter } from './router-wrapper';

// Extend expect with jest-axe matchers
expect.extend(toHaveNoViolations);

/**
 * Helper function to test component accessibility
 * @param component - The React component to test
 * @param options - Additional options for the test
 */
export const testAccessibility = async (
  component: ReactElement,
  options?: {
    name?: string;
    skip?: boolean;
    useRouter?: boolean;
  }
) => {
  if (options?.skip) {
    return;
  }

  const { container } = options?.useRouter 
    ? renderWithRouter(component)
    : render(component);
  const results = await axe(container);
  
  expect(results).toHaveNoViolations();
};

/**
 * Helper function to test component accessibility with custom rules
 * @param component - The React component to test
 * @param rules - Custom axe rules to include/exclude
 */
export const testAccessibilityWithRules = async (
  component: ReactElement,
  rules?: {
    included?: string[];
    excluded?: string[];
  },
  options?: {
    useRouter?: boolean;
  }
) => {
  const { container } = options?.useRouter 
    ? renderWithRouter(component)
    : render(component);
  const results = await axe(container, {
    rules: {
      ...(rules?.included && {
        ...rules.included.reduce((acc, rule) => ({ ...acc, [rule]: { enabled: true } }), {})
      }),
      ...(rules?.excluded && {
        ...rules.excluded.reduce((acc, rule) => ({ ...acc, [rule]: { enabled: false } }), {})
      })
    }
  });
  
  expect(results).toHaveNoViolations();
};

/**
 * Helper function to test specific accessibility features
 * @param component - The React component to test
 * @param features - Array of accessibility features to test
 */
export const testAccessibilityFeatures = async (
  component: ReactElement,
  features: Array<'landmarks' | 'headings' | 'buttons' | 'links' | 'forms' | 'images' | 'lists'>,
  options?: {
    useRouter?: boolean;
  }
) => {
  const { container } = options?.useRouter 
    ? renderWithRouter(component)
    : render(component);
  
  // Test specific features
  if (features.includes('landmarks')) {
    const landmarks = container.querySelectorAll('main, nav, header, footer, aside, section[role="main"], section[role="navigation"], section[role="banner"], section[role="contentinfo"], section[role="complementary"]');
    expect(landmarks.length).toBeGreaterThan(0);
  }
  
  if (features.includes('headings')) {
    const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6, [role="heading"]');
    expect(headings.length).toBeGreaterThan(0);
  }
  
  if (features.includes('buttons')) {
    const buttons = container.querySelectorAll('button, [role="button"]');
    buttons.forEach(button => {
      expect(button).toHaveAttribute('aria-label');
    });
  }
  
  if (features.includes('links')) {
    const links = container.querySelectorAll('a[href]');
    links.forEach(link => {
      expect(link).toHaveAttribute('aria-label');
    });
  }
  
  if (features.includes('images')) {
    const images = container.querySelectorAll('img');
    images.forEach(img => {
      expect(img).toHaveAttribute('alt');
    });
  }
  
  if (features.includes('forms')) {
    const formElements = container.querySelectorAll('input, select, textarea');
    formElements.forEach(element => {
      const id = element.getAttribute('id');
      const label = element.getAttribute('aria-label');
      const labelledBy = element.getAttribute('aria-labelledby');
      expect(id || label || labelledBy).toBeTruthy();
    });
  }
  
  if (features.includes('lists')) {
    const lists = container.querySelectorAll('ul, ol, [role="list"]');
    lists.forEach(list => {
      const listItems = list.querySelectorAll('li, [role="listitem"]');
      expect(listItems.length).toBeGreaterThan(0);
    });
  }
};
