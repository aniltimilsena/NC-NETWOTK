import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SignIn from '../features/auth/SignIn';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', () => ({
    useNavigate: () => mockNavigate,
    Link: ({ children, to }: any) => <a href={to}>{children}</a>,
}));

vi.mock('@clerk/clerk-react', () => ({
    SignIn: ({ signUpUrl }: any) => (
        <div data-testid="clerk-sign-in-mock">
            <span>Clerk SignIn Component</span>
            <a href={signUpUrl}>Clerk Sign Up</a>
        </div>
    ),
    ClerkProvider: ({ children }: any) => <div>{children}</div>,
    useClerk: () => ({
        signOut: vi.fn(),
    }),
    useUser: () => ({
        isSignedIn: false,
        user: null,
    }),
    useSignIn: () => ({
        isLoaded: true,
        signIn: { create: vi.fn() },
        setActive: vi.fn(),
    }),
}));

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
        m: motionProxy,
        AnimatePresence: ({ children }: any) => <>{children}</>,
        LazyMotion: ({ children }: any) => <>{children}</>,
        domAnimation: {},
    };
});

describe('Authentication - SignIn Page', () => {
    const onNavigateMock = vi.fn();
    const showAlertMock = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

    it('renders the SignIn form and layout elements', () => {
        render(<SignIn onNavigate={onNavigateMock} showAlert={showAlertMock} />);

        expect(screen.getByText(/Terms of Service/i)).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /forgot password\?/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument();
    });

    it('navigates to forgot password page when clicking Forgot Password', () => {
        render(<SignIn onNavigate={onNavigateMock} showAlert={showAlertMock} />);

        const forgotLink = screen.getByRole('link', { name: /forgot password\?/i });
        expect(forgotLink).toHaveAttribute('href', '/forgot-password');
    });

    it('navigates to signup page when clicking Create account', () => {
        render(<SignIn onNavigate={onNavigateMock} showAlert={showAlertMock} />);

        const signUpLink = screen.getByRole('link', { name: /sign up/i });
        expect(signUpLink).toHaveAttribute('href', '/signup');
    });
});

