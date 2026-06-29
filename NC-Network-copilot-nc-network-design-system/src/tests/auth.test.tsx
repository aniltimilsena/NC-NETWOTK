import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SignIn from '../pages/SignIn';
import { signInUser } from '../services/auth';

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  Link: ({ children, to }: any) => <a href={to}>{children}</a>,
}));

// Mock framer-motion using Proxy to automatically mock all motion elements (e.g. motion.h2, motion.p, motion.div)
vi.mock('framer-motion', () => {
  const motionProxy = new Proxy({}, {
    get: (target, prop) => {
      return ({ children, ...props }: any) => {
        const { initial, animate, transition, exit, whileHover, whileTap, ...validProps } = props;
        const Element = prop as any;
        return <Element {...validProps}>{children}</Element>;
      };
    }
  });
  return {
    motion: motionProxy,
    AnimatePresence: ({ children }: any) => <>{children}</>,
  };
});

// Mock Firebase APIs used in component
vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(),
  getRedirectResult: vi.fn(() => Promise.resolve(null)),
  signInWithEmailAndPassword: vi.fn(),
  signInWithPopup: vi.fn(),
  signInWithRedirect: vi.fn(),
  signInWithCustomToken: vi.fn(),
}));

vi.mock('../lib/firebase', () => ({
  auth: {},
  googleProvider: {},
  db: {},
}));

// Mock custom auth services
vi.mock('../services/auth', () => ({
  signInUser: vi.fn(),
  ensureUserProfile: vi.fn(),
  logoutUser: vi.fn(),
  sendPasswordReset: vi.fn(),
}));

// Mock security utilities
vi.mock('../utils/security', () => ({
  logLoginAttempt: vi.fn(() => Promise.resolve({ suspicious: false })),
}));

describe('Authentication', () => {
  const onNavigateMock = vi.fn();
  const showAlertMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('shows error for wrong credentials', async () => {
    // Mock failure response with generic message
    vi.mocked(signInUser).mockResolvedValue({
      user: null,
      error: 'Invalid credentials. Please check your email and password.',
    });

    render(<SignIn onNavigate={onNavigateMock} showAlert={showAlertMock} />);

    // Fill credentials
    fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
      target: { value: 'wrong@email.com' }
    });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'wrongpassword' }
    });

    // Click submit
    fireEvent.click(screen.getByRole('button', { name: /^Sign In$/ }));

    // Assert generic error is displayed using regex (since UI appends attempts remaining suffix)
    await waitFor(() => {
      expect(screen.getByText(/Invalid credentials\. Please check your email and password\./i)).toBeInTheDocument();
    });

    // Assert that the service was called with the correct parameters
    expect(signInUser).toHaveBeenCalledWith('wrong@email.com', 'wrongpassword');
  });

  it('never shows which field is wrong', async () => {
    // When both incorrect password and email are supplied, the error message should be identical
    vi.mocked(signInUser).mockResolvedValue({
      user: null,
      error: 'Invalid credentials. Please check your email and password.',
    });

    // 1. Test wrong email path
    const { unmount } = render(<SignIn onNavigate={onNavigateMock} showAlert={showAlertMock} />);
    fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
      target: { value: 'wrong-email@email.com' }
    });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'somepassword123' }
    });
    fireEvent.click(screen.getByRole('button', { name: /^Sign In$/ }));
    
    await waitFor(() => {
      expect(screen.getByText(/Invalid credentials\. Please check your email and password\./i)).toBeInTheDocument();
    });

    unmount();

    // 2. Test correct email but wrong password path
    render(<SignIn onNavigate={onNavigateMock} showAlert={showAlertMock} />);
    fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
      target: { value: 'correct-email@email.com' }
    });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'wrongpassword' }
    });
    fireEvent.click(screen.getByRole('button', { name: /^Sign In$/ }));

    await waitFor(() => {
      expect(screen.getByText(/Invalid credentials\. Please check your email and password\./i)).toBeInTheDocument();
    });
  });
});
