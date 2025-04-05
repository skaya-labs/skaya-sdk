import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import  Component from './component';

describe('Component', () => {
  it('renders children', () => {
    render(<Component>Sample Text</Component>);
    expect(screen.getByText('Sample Text')).toBeInTheDocument();
  });

  it('applies className and style', () => {
    const { container } = render(
      <Component className="my-class" style={{ color: 'green' }}>
        Styled Text
      </Component>
    );
    const element = container.firstChild as HTMLElement;
    expect(element.className).toContain('my-class');
    expect(element).toHaveStyle({ color: 'green' });
  });
});
