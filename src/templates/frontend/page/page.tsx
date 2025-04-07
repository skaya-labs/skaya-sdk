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
    <React.Component >
        {children || <p>Default page content</p>}
    </React.Component>
  );
};

export default Page;