import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/shared/ui/components/ui/button';
import parse from 'html-react-parser';
import { splitHtmlIntoPages } from '../model/utils';
import { usePageNavigation } from '../hooks/usePageNavigation';
import { useTextHighlight } from '../hooks/useTextHighlight';

interface PagedTextProps {
    text?: string;
    maxColumnHeight?: number;
    onHeadingEncountered: (heading: string, href: string) => void;
    onNextChapter: () => void;
    onPrevChapter: () => void;
    initialPage?: number;
    isLoadingUseChapter?: boolean;
}

interface Page {
    left: string;
    right: string;
}

export default function PagedText({
    text = '',
    maxColumnHeight = 700,
    onHeadingEncountered,
    onNextChapter,
    onPrevChapter,
    initialPage = 0,
    isLoadingUseChapter,
}: PagedTextProps) {
    const [pages, setPages] = useState<Page[]>([]);
    const [pageHeadings, setPageHeadings] = useState<any>({});
    const isSplittingRef = useRef(false);

    // Используем кастомные хуки
    const { currentPage, contentRef, goToNextPage, goToPreviousPage } = usePageNavigation({
        pagesCount: pages.length,
        initialPage,
        onNextChapter,
        onPrevChapter,
    });

    const { selection, buttonRef, handleHighlight, getButtonStyle } = useTextHighlight();

    // Эффект для разбиения текста на страницы
    useEffect(() => {
        if (!text) {
            setPages([]);
            return;
        }

        if (isSplittingRef.current) {
            return;
        }
        isSplittingRef.current = true;

        splitHtmlIntoPages(text, maxColumnHeight)
            .then(({ pages: pagesResult, pageHeadings: headingsResult }) => {
                setPages(pagesResult);
                setPageHeadings(headingsResult);
                isSplittingRef.current = false;
            })
            .catch((error) => {
                console.error('Error splitting content:', error);
                isSplittingRef.current = false;
            });
    }, [text, maxColumnHeight]);

    // Эффект для отслеживания заголовков
    useEffect(() => {
        const headingsForCurrentPage = Object.entries(pageHeadings).filter(([key]) => {
            const [pageNum] = key.split('-');
            return pageNum === currentPage.toString();
        });

        if (headingsForCurrentPage.length > 0) {
            headingsForCurrentPage.forEach(([_, heading]) => {
                onHeadingEncountered(heading.title, heading.href);
            });
        }
    }, [currentPage, pageHeadings, onHeadingEncountered]);

    if (pages.length === 0 || isLoadingUseChapter) {
        return <div className="text-center p-4">Loading...</div>;
    }

    const currentPageContent = pages[currentPage];
    if (!currentPageContent) {
        return <div className="text-center p-4">Page not found</div>;
    }

    return (
        <div className="mx-auto p-10 relative" ref={contentRef}>
            {/* Кнопка выделения текста */}
            {selection.text && (
                <button
                    ref={buttonRef}
                    onClick={() => handleHighlight(pages, currentPage, setPages)}
                    style={getButtonStyle()}
                    className="px-4 py-1 bg-red-400 rounded-md border-2 border-black"
                >
                    Выделить
                </button>
            )}

            {/* Навигационные кнопки */}
            <div className="flex justify-between items-center mb-4">
                <Button onClick={goToPreviousPage} variant="outline" disabled={currentPage === 0}>
                    <ChevronLeft className="mr-2 h-4 w-4" /> Previous
                </Button>
                <span>
                    Page {currentPage + 1} of {pages.length}
                </span>
                <Button onClick={goToNextPage} variant="outline" disabled={currentPage === pages.length - 1}>
                    Next <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
            </div>

            {/* Контент страницы */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-[100px] px-[80px] text-[20px] relative font-segoeUI text-justify leading-[1.4rem]">
                <div className="left-column">{parse(currentPageContent.left || '')}</div>
                <div className="right-column">{parse(currentPageContent.right || '')}</div>
            </div>
        </div>
    );
}
