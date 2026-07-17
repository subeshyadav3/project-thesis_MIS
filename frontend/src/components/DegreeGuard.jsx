import React from 'react';
import NotFound from '../pages/NotFound';

function DegreeGuard({ requiredDegreeType, children }) {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const degreeType = user?.program?.degreeType;

  if (degreeType && requiredDegreeType && degreeType !== requiredDegreeType) {
    return <NotFound />;
  }

  return children;
}

export default DegreeGuard;
