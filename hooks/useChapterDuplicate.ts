import { useState, useEffect } from 'react';
import { loadChapterContent, computeHash, flattenChapters } from '../model/utils';
import { Chapter } from '../model/types';

interface useChapterDuplicateProps {
    bookFile: ArrayBuffer | null | undefined;
    chapters: Chapter[];
}

interface useChapterDuplicateReturn {
    duplicates: Record<string, string[]>; // хеш и список href
    loading: boolean;
    error: string | null;
}

const useChapterDuplicate = ({ bookFile = null, chapters }: useChapterDuplicateProps): useChapterDuplicateReturn => {
    const [duplicates, setDuplicates] = useState<Record<string, string[]>>({});
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const findDuplicates = async () => {
            if (!bookFile || chapters.length === 0) {
                setError('EPUB файл или список глав не предоставлены.');
                return;
            }

            setLoading(true);
            setError(null);

            try {
                const flatChapters = flattenChapters(chapters);
                const hashMap: Record<string, string[]> = {};

                for (const chapter of flatChapters) {
                    const href = chapter.href;
                    const content = await loadChapterContent(bookFile, href);
                    if (content) {
                        const hash = await computeHash(content);
                        if (hashMap[hash]) {
                            hashMap[hash].push(href);
                        } else {
                            hashMap[hash] = [href];
                        }
                    } else {
                        console.warn(`Содержимое главы не загружено: ${href}`);
                    }
                }

                // Фильтруем только те хеши, у которых более одной главы
                const duplicatesFound: Record<string, string[]> = {};
                Object.entries(hashMap).forEach(([hash, hrefs]) => {
                    if (hrefs.length > 1) {
                        duplicatesFound[hash] = hrefs;
                    }
                });

                setDuplicates(duplicatesFound);

                // if (Object.keys(duplicatesFound).length === 0) {
                //     console.log('Дублирующиеся главы не найдены.');
                // } else {
                //     console.log('Найдены дублирующиеся главы:', duplicatesFound);
                // }
            } catch (err: any) {
                console.error('Ошибка при поиске дублирующихся глав:', err);
                setError(err.message || 'Неизвестная ошибка');
            } finally {
                setLoading(false);
            }
        };

        findDuplicates();
    }, [bookFile, chapters]);

    return { duplicates, loading, error };
};

export default useChapterDuplicate;
