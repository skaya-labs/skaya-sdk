import React from 'react';
import './page.css'; // CSS Modules recommended

/**
 * @description Reusable page layout with optional title and content
 */
export const Page : React.FC< {
  children?: React.ReactNode;
}> = ({
  children,
}) => {
  return (
    <div
    >
      Default Page Content 
      {children}
    </div >
  );
};

export default Page;