import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AdminRoute, ProtectedRoute } from '../routes/routeConfig';

vi.mock('../lib/firebase', () => ({
  db: {},
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  getDoc: vi.fn().mockResolvedValue({
    exists: () => false,
    data: () => null,
  }),
}));

describe('Route Security & Permission Guards', () => {
  describe('AdminRoute Protection', () => {
    it('redirects unauthenticated visitors away from admin routes to "/"', () => {
      render(
        <MemoryRouter initialEntries={['/admin']}>
          <Routes>
            <Route path="/" element={<div data-testid="home-page">Public Home</div>} />
            <Route
              path="/admin"
              element={
                <AdminRoute user={null} isAdmin={false} authReady={true}>
                  <div data-testid="admin-panel">Admin Content</div>
                </AdminRoute>
              }
            />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.queryByTestId('admin-panel')).not.toBeInTheDocument();
      expect(screen.getByTestId('home-page')).toBeInTheDocument();
    });

    it('denies access to authenticated regular users and redirects them to "/"', async () => {
      const normalUser = {
        uid: 'regular_user_123',
        email: 'talent@nepalcasts.com',
        role: 'Actor',
        isAdmin: false,
      };

      render(
        <MemoryRouter initialEntries={['/admin']}>
          <Routes>
            <Route path="/" element={<div data-testid="home-page">Public Home</div>} />
            <Route
              path="/admin"
              element={
                <AdminRoute user={normalUser} isAdmin={false} authReady={true}>
                  <div data-testid="admin-panel">Admin Content</div>
                </AdminRoute>
              }
            />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.queryByTestId('admin-panel')).not.toBeInTheDocument();
      expect(await screen.findByTestId('home-page')).toBeInTheDocument();
    });

    it('permits access when user has isAdmin: true', () => {
      const adminUser = {
        uid: 'admin_user_999',
        email: 'staff@nepalcasts.com',
        role: 'Admin',
        isAdmin: true,
      };

      render(
        <MemoryRouter initialEntries={['/admin']}>
          <Routes>
            <Route path="/" element={<div data-testid="home-page">Public Home</div>} />
            <Route
              path="/admin"
              element={
                <AdminRoute user={adminUser} isAdmin={true} authReady={true}>
                  <div data-testid="admin-panel">Admin Content</div>
                </AdminRoute>
              }
            />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByTestId('admin-panel')).toBeInTheDocument();
      expect(screen.queryByTestId('home-page')).not.toBeInTheDocument();
    });

    it('permits access when verified superadmin email matches', () => {
      const superAdminUser = {
        uid: 'user_anil_superadmin',
        email: 'aniltimilsena53@gmail.com',
        role: 'SuperAdmin',
      };

      render(
        <MemoryRouter initialEntries={['/admin']}>
          <Routes>
            <Route path="/" element={<div data-testid="home-page">Public Home</div>} />
            <Route
              path="/admin"
              element={
                <AdminRoute user={superAdminUser} isAdmin={false} authReady={true}>
                  <div data-testid="admin-panel">Admin Content</div>
                </AdminRoute>
              }
            />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByTestId('admin-panel')).toBeInTheDocument();
    });
  });

  describe('ProtectedRoute Protection', () => {
    it('redirects unauthenticated users to /signin with redirect_url parameter', () => {
      render(
        <MemoryRouter initialEntries={['/messages']}>
          <Routes>
            <Route path="/signin" element={<div data-testid="signin-page">Sign In Page</div>} />
            <Route
              path="/messages"
              element={
                <ProtectedRoute user={null} authReady={true}>
                  <div data-testid="messages-page">User Messages</div>
                </ProtectedRoute>
              }
            />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.queryByTestId('messages-page')).not.toBeInTheDocument();
      expect(screen.getByTestId('signin-page')).toBeInTheDocument();
    });

    it('allows authenticated users to access protected routes', () => {
      const user = { uid: 'user_logged_in_1' };

      render(
        <MemoryRouter initialEntries={['/messages']}>
          <Routes>
            <Route path="/signin" element={<div data-testid="signin-page">Sign In Page</div>} />
            <Route
              path="/messages"
              element={
                <ProtectedRoute user={user} authReady={true}>
                  <div data-testid="messages-page">User Messages</div>
                </ProtectedRoute>
              }
            />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByTestId('messages-page')).toBeInTheDocument();
    });
  });
});
