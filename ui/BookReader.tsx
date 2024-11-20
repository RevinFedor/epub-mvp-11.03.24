import React from 'react';
import { useParams } from 'react-router-dom';
import { useGetBookByIdQuery } from '../model/booksApiSlice';
import useEPUB from '../hooks/useEPUB';
import useChapterDuplicate from '../hooks/useChapterDuplicate';
import useParsedBook from '../hooks/useParsedBook';

import { extractChapterTitles } from '../model/utils';
import { Loader2 } from 'lucide-react';
import BookContent from './BookContent';

const BookReader: React.FC = () => {
    const { id } = useParams<{ id: string }>();

    // Загрузка файла книги
    const { data: bookFile, isLoading: isLoadingQuery, error: bookError } = useGetBookByIdQuery(id as string);

    // Получение базовой структуры книги
    const { chapters, cssContent, images, error: epubError } = useEPUB(bookFile);

    // Получение списка дубликатов глав
    const {
        duplicates,
        loading: isLoadingDuplicates,
        error: duplicatesError,
    } = useChapterDuplicate({
        bookFile,
        chapters,
    });

    // Парсинг всех глав книги
    const {
        parsedChapters,
        isParsingComplete,
        error: parseError,
    } = useParsedBook({
        bookFile,
        knownChapterTitles: chapters.length > 0 ? extractChapterTitles(chapters) : [],
        duplicates,
        images,
    });

    if (bookError || epubError || duplicatesError || parseError) {
        const errorMessage = bookError || epubError || duplicatesError || parseError;
        return <div>Error loading book: {errorMessage as string}</div>;
    }

    if (isLoadingQuery || !isParsingComplete || isLoadingDuplicates) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="animate-spin h-8 w-8" />
                <span className="ml-2">Loading book...</span>
            </div>
        );
    }

    return <BookContent chapters={chapters} cssContent={cssContent} parsedChapters={parsedChapters} duplicates={duplicates} />;
};

export default BookReader;
