import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ActionSearchBar } from '../components/ui/ActionSearchBar';

const mockTalents = [
    {
        id: 'user_anil',
        uid: 'user_anil',
        name: 'Anil Timilsena',
        username: 'aniltimilsena',
        role: 'Actor / Director',
        location: 'Kathmandu',
        verified: true,
    },
    {
        id: 'user_dayahang',
        uid: 'user_dayahang',
        name: 'Dayahang Rai',
        username: 'dayahang',
        role: 'Lead Actor',
        location: 'Kathmandu',
        verified: true,
    },
    {
        id: 'user_bipin',
        uid: 'user_bipin',
        name: 'Bipin Karki',
        username: 'bipinkarki',
        role: 'Character Actor',
        location: 'Lalitpur',
        verified: true,
    }
];

vi.mock('@/features/profile/services/users', () => ({
    subscribeToTalents: (cb: any) => {
        cb(mockTalents);
        return () => {};
    },
}));

vi.mock('@/services/AuthService', () => ({
    AuthService: {
        getUserId: () => 'user_anil',
        getUser: () => ({ id: 'user_anil', email: 'aniltimilsena53@gmail.com' }),
    },
}));

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string) => key,
    }),
}));

vi.mock('@clerk/clerk-react', () => ({
    useUser: () => ({
        isSignedIn: true,
        user: { id: 'user_anil' },
    }),
    ClerkProvider: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('../components/ui/Avatar', () => ({
    default: () => <div data-testid="avatar-mock" />,
}));

vi.mock('@/lib/firebase', () => ({
    db: {},
}));

vi.mock('firebase/firestore', () => ({
    collection: vi.fn(),
    query: vi.fn(),
    limit: vi.fn(),
    getDocs: vi.fn().mockResolvedValue({ forEach: vi.fn(), docs: [] }),
}));

describe('ActionSearchBar Profile Search', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
    });

    it('displays matching profiles when searching, including current user profile', async () => {
        const onActionSelect = vi.fn();
        render(<ActionSearchBar onActionSelect={onActionSelect} />);

        const input = screen.getByPlaceholderText('ui.searchPlaceholder');
        fireEvent.focus(input);
        fireEvent.change(input, { target: { value: 'Anil' } });

        await waitFor(() => {
            expect(screen.getByText('Anil Timilsena')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Anil Timilsena'));
        expect(onActionSelect).toHaveBeenCalledWith('user_anil');
    });

    it('displays matching profile even if it exists in search history', async () => {
        // Pre-populate search history with Dayahang
        localStorage.setItem('nc_search_history_v3', JSON.stringify([
            { type: 'profile', value: 'user_dayahang', name: 'Dayahang Rai' }
        ]));

        const onActionSelect = vi.fn();
        render(<ActionSearchBar onActionSelect={onActionSelect} />);

        const input = screen.getByPlaceholderText('ui.searchPlaceholder');
        fireEvent.focus(input);
        fireEvent.change(input, { target: { value: 'Dayahang' } });

        await waitFor(() => {
            expect(screen.getByText('Dayahang Rai')).toBeInTheDocument();
        });
    });

    it('matches profile by username handle with or without @ symbol', async () => {
        render(<ActionSearchBar />);

        const input = screen.getByPlaceholderText('ui.searchPlaceholder');
        fireEvent.focus(input);
        fireEvent.change(input, { target: { value: '@bipinkarki' } });

        await waitFor(() => {
            expect(screen.getByText('Bipin Karki')).toBeInTheDocument();
        });
    });
});
