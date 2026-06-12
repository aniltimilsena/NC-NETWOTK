import React from 'react';
import CuratorSidebar from './CuratorSidebar';
import CuratorTopbar from './CuratorTopbar';

export default function CuratorLayout({ children, onNavigate, currentPage }: { children?: React.ReactNode; onNavigate: any; currentPage: any }) {
  return (
    <div className="flex min-h-screen bg-oc-bg">
      <CuratorSidebar onNavigate={onNavigate} currentPage={currentPage} />
      <main className="flex-1 ml-64 min-h-screen flex flex-col">
        <CuratorTopbar />
        <div className="flex-1">
          {children}
        </div>
      </main>
    </div>
  );
}
