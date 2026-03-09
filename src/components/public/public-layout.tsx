import { Outlet } from 'react-router-dom';

import { PublicFooter } from './public-footer';
import { PublicHeader } from './public-header';

export function PublicLayout() {
  return (
    <div className="min-h-screen bg-transparent">
      <PublicHeader />
      <Outlet />
      <PublicFooter />
    </div>
  );
}
