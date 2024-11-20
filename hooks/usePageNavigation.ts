import { useState, useEffect, useRef } from 'react';

interface UsePageNavigationProps {
    pagesCount: number;
    initialPage?: number;
    onNextChapter: () => void;
    onPrevChapter: () => void;
}

export const usePageNavigation = ({ pagesCount, initialPage = 0, onNextChapter, onPrevChapter }: UsePageNavigationProps) => {
    const [currentPage, setCurrentPage] = useState(initialPage);
    const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (pagesCount > 0) {
            if (initialPage === -1) {
                setCurrentPage(pagesCount - 1);
            } else {
                setCurrentPage(Math.min(initialPage, pagesCount - 1));
            }
        }
    }, [pagesCount, initialPage]);

    const goToNextPage = () => {
        if (currentPage === pagesCount - 1) {
            onNextChapter();
        } else {
            setCurrentPage((prev) => Math.min(pagesCount - 1, prev + 1));
        }
    };

    const goToPreviousPage = () => {
        if (currentPage === 0) {
            onPrevChapter();
        } else {
            setCurrentPage((prev) => Math.max(0, prev - 1));
        }
    };

    const handleWheel = (event: WheelEvent) => {
        event.preventDefault();

        if (scrollTimeoutRef.current) {
            clearTimeout(scrollTimeoutRef.current);
        }

        scrollTimeoutRef.current = setTimeout(() => {
            if (event.deltaY > 0) {
                goToNextPage();
            } else if (event.deltaY < 0) {
                goToPreviousPage();
            }
        }, 50);
    };

    useEffect(() => {
        const contentElement = contentRef.current;

        if (contentElement) {
            contentElement.addEventListener('wheel', handleWheel, { passive: false });
        }

        return () => {
            if (contentElement) {
                contentElement.removeEventListener('wheel', handleWheel);
            }
            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
            }
        };
    }, [currentPage, pagesCount]);

    return {
        currentPage,
        setCurrentPage,
        contentRef,
        goToNextPage,
        goToPreviousPage,
    };
};
