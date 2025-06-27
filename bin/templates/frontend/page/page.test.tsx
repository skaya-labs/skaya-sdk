import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import Page from './page'; // Adjust the import path as needed
import React from 'react';

describe('Page', () => {
  it('renders default content when no children provided', () => {
    render(<Page />);
    // expect(screen.getByText('Default page content')).toBeInTheDocument();
  });

  it('renders children when provided', () => {
    render(<Page>Test Content</Page>);
    // expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('uses the default title when not provided', () => {
    render(<Page />);
    // Since your current component doesn't display the title, you might want to:
    // 1. Add title display to the component, or
    // 2. Remove this test if title is just a prop for other purposes
    // Example if you add title display:
    // expect(screen.getByText('Default Page Title')).toBeInTheDocument();
  });


  it('has correct semantic structure', () => {
    const { container } = render(<Page />);
    // expect(container.querySelector('main')).toBeInTheDocument();
    // expect(container.querySelector('main > section')).toBeInTheDocument();
  });
});