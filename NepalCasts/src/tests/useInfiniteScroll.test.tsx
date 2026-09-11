import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';

function TestComponent({ onLoadMore, hasMore, isLoading }: { onLoadMore: () => void; hasMore: boolean; isLoading?: boolean }) {
    const sentinelRef = useInfiniteScroll({ onLoadMore, hasMore, isLoading });
    return <div ref={sentinelRef} data-testid="sentinel" />;
}

describe('useInfiniteScroll hook', () => {
    let observeMock: any;
    let disconnectMock: any;
    let observerCallback: (entries: any[]) => void;

    beforeEach(() => {
        observeMock = vi.fn();
        disconnectMock = vi.fn();
        
        class MockIntersectionObserver {
            observe = observeMock;
            disconnect = disconnectMock;
            unobserve = vi.fn();
            constructor(callback: (entries: any[]) => void) {
                observerCallback = callback;
            }
        }

        globalThis.IntersectionObserver = MockIntersectionObserver as any;
    });

    it('attaches IntersectionObserver when hasMore is true', () => {
        const onLoadMore = vi.fn();
        render(<TestComponent onLoadMore={onLoadMore} hasMore={true} />);

        expect(observeMock).toHaveBeenCalled();
    });

    it('does not observe when hasMore is false', () => {
        const onLoadMore = vi.fn();
        render(<TestComponent onLoadMore={onLoadMore} hasMore={false} />);

        expect(observeMock).not.toHaveBeenCalled();
    });

    it('calls onLoadMore when sentinel intersects and not loading', () => {
        const onLoadMore = vi.fn();
        render(<TestComponent onLoadMore={onLoadMore} hasMore={true} isLoading={false} />);

        // Simulate sentinel intersecting
        observerCallback([{ isIntersecting: true }]);
        expect(onLoadMore).toHaveBeenCalledTimes(1);
    });

    it('does not call onLoadMore when intersecting if isLoading is true', () => {
        const onLoadMore = vi.fn();
        render(<TestComponent onLoadMore={onLoadMore} hasMore={true} isLoading={true} />);

        observerCallback([{ isIntersecting: true }]);
        expect(onLoadMore).not.toHaveBeenCalled();
    });

    it('disconnects observer on unmount', () => {
        const onLoadMore = vi.fn();
        const { unmount } = render(<TestComponent onLoadMore={onLoadMore} hasMore={true} />);

        unmount();
        expect(disconnectMock).toHaveBeenCalled();
    });
});
