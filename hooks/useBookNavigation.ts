import React, { useState, useCallback, useEffect } from 'react';
import { Chapter } from '../model/types';
import { flattenChapters } from '../model/utils';

interface ParseState {
    isInitialParsing: boolean;
    currentHash: string;
    previousHash: string;
    visitedHeadings: Set<string>;
}

interface UseBookNavigationProps {
    chapters: Chapter[];
    currentChapter: string | undefined;
    parsedChapters: Record<string, any>;
    onChapterChange: (href: string) => void;
}

export const useBookNavigation = ({ chapters, currentChapter, parsedChapters, onChapterChange }: UseBookNavigationProps) => {
    const [parseState, setParseState] = useState<ParseState>({
        isInitialParsing: true,
        currentHash: '',
        previousHash: '',
        visitedHeadings: new Set(),
    });

    // Генерируем хеш для главы, чтобы отслеживать изменения
    const getChapterHash = useCallback((chapterContent: string | undefined) => {
        if (!chapterContent) return '';
        return chapterContent.slice(0, 100); // Используем первые 100 символов как хеш
    }, []);

    // Обновляем состояние парсинга при изменении главы
    useEffect(() => {
        if (currentChapter && parsedChapters[currentChapter]) {
            const newHash = getChapterHash(parsedChapters[currentChapter].content);

            setParseState((prev) => ({
                ...prev,
                currentHash: newHash,
                previousHash: prev.currentHash,
                isInitialParsing: false,
            }));
        }
    }, [currentChapter, parsedChapters, getChapterHash]);

    // Обработчик обнаружения заголовка
    const handleHeadingEncountered = useCallback(
        (chapterTitle: string) => {
            if (parseState.isInitialParsing) {
                return; // Игнорируем заголовки во время начального парсинга
            }

            // Проверяем, не обрабатывали ли мы уже этот заголовок
            if (parseState.visitedHeadings.has(chapterTitle)) {
                return;
            }

            const flatChapters = flattenChapters(chapters);
            const chapter = flatChapters.find((ch) => ch.label === chapterTitle);

            if (chapter && chapter.href !== currentChapter && chapter.level === 1) {
                const targetChapterContent = parsedChapters[chapter.href]?.content;
                const newHash = getChapterHash(targetChapterContent);

                // Проверяем, что мы не переходим на ту же самую главу
                if (newHash !== parseState.currentHash) {
                    setParseState((prev) => ({
                        ...prev,
                        visitedHeadings: prev.visitedHeadings.add(chapterTitle),
                    }));
                    onChapterChange(chapter.href);
                }
            }
        },
        [
            chapters,
            currentChapter,
            parsedChapters,
            parseState.currentHash,
            parseState.isInitialParsing,
            parseState.visitedHeadings,
            onChapterChange,
            getChapterHash,
        ]
    );

    // Сброс состояния при смене книги или главного компонента
    const resetNavigation = useCallback(() => {
        setParseState({
            isInitialParsing: true,
            currentHash: '',
            previousHash: '',
            visitedHeadings: new Set(),
        });
    }, []);

    return {
        handleHeadingEncountered,
        resetNavigation,
        isInitialParsing: parseState.isInitialParsing,
    };
};
