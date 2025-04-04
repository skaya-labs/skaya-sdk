import React from 'react';
import './component.css'; 

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