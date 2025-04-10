import React from 'react';
import './component.css'; 

export const Component : React.FC<{
  className?: string;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}> = ({
  className = '',
  children="",
  style={}
}) => {
  
  return (
    <div
      className={className}
      style={style}
    >
      Component 
      {children}
    </div >
  );
};

export default Component;