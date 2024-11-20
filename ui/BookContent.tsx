import React, { useState, useEffect, useCallback } from 'react';
import { ChaptersPopup } from './ChaptersPopup';
import PagedText from './PagedText';
import { flattenChapters, getParentChapters } from '../model/utils';
import { Chapter } from '../model/types';

interface BookContentProps {
    chapters: Chapter[];
    cssContent: string;
    parsedChapters: Record<string, any>;
    duplicates: Record<string, string[]>;
}

const BookContent: React.FC<BookContentProps> = ({ chapters, cssContent, parsedChapters, duplicates }) => {
    const [currentChapter, setCurrentChapter] = useState<string>();
    const [isScrollingInPopup, setIsScrollingInPopup] = useState(false);
    const [initialPage, setInitialPage] = useState<number>(0);
    // Установка начальной главы
    useEffect(() => {
        if (chapters.length > 0 && !currentChapter) {
            setCurrentChapter(chapters[0].href);
        }
    }, [chapters]);

    // Получение контента текущей главы
    const getChapterContent = (href: string) => {
        const chapter = parsedChapters[href];
        if (!chapter) {
            console.warn(`Chapter content not found for href: ${href}`);
        }
        return chapter || null;
    };

    const currentChapterContent = currentChapter ? getChapterContent(currentChapter.split('#')[0]) : null;

    const handleHeadingEncountered = (chapterTitle: string, href: string) => {
        // const flatChapters = flattenChapters(chapters);
        // const chapter = flatChapters.find((ch) => ch.label === chapterTitle);
        if (href) {
            setCurrentChapter(href);
        }
    };

    const handleNextChapter = () => {
        const flatChapters = flattenChapters(chapters);
        const currentChapterIndex = flatChapters.findIndex((ch) => ch.href === currentChapter);

        if (currentChapterIndex !== -1 && currentChapterIndex < flatChapters.length - 1) {
            setInitialPage(0);
            setCurrentChapter(flatChapters[currentChapterIndex + 1].href);
        }
    };

    const handlePrevChapter = () => {
        const flatChapters = flattenChapters(chapters);
        const currentChapterIndex = flatChapters.findIndex((ch) => ch.href === currentChapter);

        if (currentChapterIndex > 0) {
            setInitialPage(-1);
            setCurrentChapter(flatChapters[currentChapterIndex - 1].href);
        }
    };

    const parentChapters = getParentChapters(chapters, currentChapter || '');

    return (
        <div className="book-reader" style={{ position: 'relative' }}>
            {cssContent && <style>{cssContent}</style>}

            <ChaptersPopup
                mockChapters={chapters}
                currentChapter={currentChapter}
                setCurrentChapter={setCurrentChapter}
                setIsScrollingInPopup={setIsScrollingInPopup}
            />

            <div className="current-chapter-title text-[12px] font-bold" style={{ margin: '0 20px', textAlign: 'center' }}>
                {parentChapters.map((chapter, index) => (
                    <span key={index}>
                        {chapter.label} {index < parentChapters.length - 1 ? ' » ' : ''}
                    </span>
                ))}
            </div>

            <PagedText
                text={currentChapterContent?.content}
                onHeadingEncountered={handleHeadingEncountered}
                onNextChapter={handleNextChapter}
                onPrevChapter={handlePrevChapter}
                initialPage={initialPage}
                isLoadingUseChapter={false}
            />
        </div>
    );
};

export default BookContent;
