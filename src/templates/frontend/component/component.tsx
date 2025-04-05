// Heading.tsx
import React from 'react';
import './Heading.css'; 
export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;
export type HeadingVariation = 'primary' | 'secondary' | 'error' | 'warning' | 'success' | 'info';

export const component: React.FC<{
  className?: string;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}> = ({
  className = '',
  children="",
  style={}
}) => {
  
  return (
    <React.Component 
      className={className}
      style={style}
    >
      {children}
    </React.Component >
  );
};

export default component;