import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
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
        AnimatePresence: ({ children }: any) => <>{children}</>,
    };
});

describe('Authentication - SignIn Page', () => {
    const onNavigateMock = vi.fn();
    const showAlertMock = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

    it('renders the Clerk SignIn component and layout elements', () => {
        render(<SignIn onNavigate={onNavigateMock} showAlert={showAlertMock} />);

        expect(screen.getByText('Remember me')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /forgot password\?/i })).toBeInTheDocument();
        expect(screen.getByText('Continue with Google')).toBeInTheDocument();
    });

    it('navigates to forgot password page when clicking Forgot Password', () => {
        render(<SignIn onNavigate={onNavigateMock} showAlert={showAlertMock} />);

        const forgotBtn = screen.getByRole('button', { name: /forgot password\?/i });
        fireEvent.click(forgotBtn);

        expect(mockNavigate).toHaveBeenCalledWith('/forgot-password');
    });

    it('navigates to signup page when clicking Create account', () => {
        render(<SignIn onNavigate={onNavigateMock} showAlert={showAlertMock} />);

        const createAccountBtn = screen.getByRole('button', { name: /sign up|create account/i });
        fireEvent.click(createAccountBtn);

        expect(mockNavigate).toHaveBeenCalledWith('/signup');
    });
});

