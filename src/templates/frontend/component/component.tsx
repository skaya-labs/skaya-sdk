// Heading.tsx
import React from 'react';
import './Heading.css'; 
export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;
export type HeadingVariation = 'primary' | 'secondary' | 'error' | 'warning' | 'success' | 'info';

export const Component: React.FC<{
  className?: string;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}> = ({
  className = '',
  children="",
  style={}
}) => {
  const ComponentUi = `div`;
  
  return (
    <ComponentUi 
      className={className}
      style={style}
    >
      {children}
    </ComponentUi>
  );
};

export default Component;