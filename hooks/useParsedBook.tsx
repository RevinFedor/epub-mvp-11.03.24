import { useState, useEffect, useCallback } from 'react';
import JSZip from 'jszip';
import DOMPurify from 'dompurify';
import { getFullImagePath } from '../model/utils';

interface ParsedChapter {
    href: string;
    content: string;
    headings: HeadingInfo[];
}

interface HeadingInfo {
    tag: string;
    text: string;
    index: number;
}
interface PageHeading {
    label: string;
    href: string;
}
interface UseParsedBookProps {
    bookFile: ArrayBuffer | null | undefined;
    knownChapterTitles: PageHeading[];
    duplicates: Record<string, string[]>;
    images: Record<string, string>;
}

interface UseParsedBookReturn {
    parsedChapters: Record<string, ParsedChapter>;
    isParsingComplete: boolean;
    error: string | null;
}

//! оптимизированный вариант
const extractAndLogHeadings = (body: HTMLElement, knownChapterTitles: PageHeading[]): HeadingInfo[] => {
    const candidateHeadings: HeadingInfo[] = [];
    let index = 0;

    // Нормализация текста с сохранением числовых префиксов
    const normalizeText = (text: string): string => {
        return text
            .replace(/\s+/g, ' ')
            .replace(/[\n\r]/g, ' ')
            .replace(/&nbsp;/g, ' ')
            .trim()
            .toLowerCase();
    };

    // Проверка является ли элемент потенциальным заголовком
    const isHeaderElement = (element: Element): boolean => {
        // Проверяем теги заголовков
        if (/^h[1-6]$/i.test(element.tagName)) {
            return true;
        }

        // Проверяем классы title
        if (element.classList.contains('title') || /^title[1-6]$/.test(element.className)) {
            return true;
        }

        // Проверяем специальные классы (может быть специфично для вашей книги)
        if (element.classList.contains('calibre2') || element.classList.contains('chapter')) {
            return true;
        }

        return false;
    };

    // Извлечение текста с учетом разделенных заголовков
    const extractHeaderText = (element: Element): string => {
        const texts: string[] = [];
        let currentText = '';

        // Собираем текст из всех дочерних узлов
        element.childNodes.forEach((node) => {
            if (node.nodeType === Node.TEXT_NODE && node.textContent) {
                currentText += node.textContent;
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                const el = node as Element;
                if (el.tagName === 'BR') {
                    if (currentText.trim()) {
                        texts.push(currentText.trim());
                    }
                    currentText = '';
                } else {
                    currentText += el.textContent || '';
                }
            }
        });

        if (currentText.trim()) {
            texts.push(currentText.trim());
        }

        return texts.join(' ');
    };

    // Вычисление схожести строк (упрощенная версия для производительности)
    const calculateSimpleSimilarity = (str1: string, str2: string): number => {
        const s1 = normalizeText(str1);
        const s2 = normalizeText(str2);

        // Точное совпадение
        if (s1 === s2) return 1;

        // Содержит как подстроку
        if (s1.includes(s2) || s2.includes(s1)) {
            const longerLength = Math.max(s1.length, s2.length);
            const shorterLength = Math.min(s1.length, s2.length);
            return shorterLength / longerLength;
        }

        // Обработка числовых префиксов
        const num1 = s1.match(/^\d+\.\s*/);
        const num2 = s2.match(/^\d+\.\s*/);
        if (num1 && num2 && num1[0] === num2[0]) {
            // Если числовые префиксы совпадают, сравниваем остаток текста
            const text1 = s1.replace(/^\d+\.\s*/, '');
            const text2 = s2.replace(/^\d+\.\s*/, '');
            if (text1.includes(text2) || text2.includes(text1)) {
                return 0.9;
            }
        }

        return 0;
    };

    const traverseDom = (element: Element) => {
        // Проверяем только потенциальные заголовки
        if (isHeaderElement(element)) {
            const headerText = extractHeaderText(element);
            const normalizedHeaderText = normalizeText(headerText);

            // Проверяем совпадения с известными заголовками
            for (let i = 0; i < knownChapterTitles.length; i++) {
                const similarity = calculateSimpleSimilarity(normalizedHeaderText, normalizeText(knownChapterTitles[i].label));

                if (similarity > 0.8) {
                    candidateHeadings.push({
                        tag: element.tagName,
                        text: headerText,
                        index: index++,
                    });

                    element.setAttribute('data-chapter-title', knownChapterTitles[i].label);
                    element.setAttribute('data-chapter-href', knownChapterTitles[i].href);

                    break;
                }
            }
        }

        Array.from(element.children).forEach((child) => traverseDom(child));
    };

    traverseDom(body);
    return candidateHeadings;
};

const useParsedBook = ({ bookFile, knownChapterTitles, duplicates, images }: UseParsedBookProps): UseParsedBookReturn => {
    const [parsedChapters, setParsedChapters] = useState<Record<string, ParsedChapter>>({});
    const [isParsingComplete, setIsParsingComplete] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const parseChapter = async (zip: JSZip, href: string): Promise<ParsedChapter | null> => {
        try {
            const baseHref = href.split('#')[0];
            let chapterFile = zip.file(`OPS/${baseHref}`);

            if (!chapterFile) {
                const availableFiles = Object.keys(zip.files);
                const similarFile = availableFiles.find((file) => file.toLowerCase() === baseHref.toLowerCase());
                if (similarFile) {
                    chapterFile = zip.file(similarFile);
                } else {
                    throw new Error(`Chapter file not found: ${baseHref}`);
                }
            }

            let contentFile = await chapterFile.async('string');
            contentFile = contentFile.replace(/<\?xml.*?\?>\s*/g, '');

            const parser = new DOMParser();
            const doc = parser.parseFromString(contentFile, 'application/xhtml+xml');
            const body = doc.body;

            if (!body) {
                throw new Error('The <body> tag was not found in the chapter content.');
            }

            const imagesInContent = body.querySelectorAll('img, image');
            imagesInContent.forEach((imgElement) => {
                const src = imgElement.getAttribute('src') || imgElement.getAttributeNS('http://www.w3.org/1999/xlink', 'href');
                if (src) {
                    const imagePath = getFullImagePath(baseHref, src);
                    const imageUri = images[imagePath] || images[src];

                    if (imageUri) {
                        if (imgElement instanceof HTMLImageElement || imgElement instanceof SVGImageElement) {
                            if (imgElement instanceof HTMLImageElement) {
                                imgElement.setAttribute('src', imageUri);
                            } else {
                                imgElement.setAttributeNS('http://www.w3.org/1999/xlink', 'href', imageUri);
                            }

                            imgElement.style.display = 'block';
                            imgElement.style.marginLeft = 'auto';
                            imgElement.style.marginRight = 'auto';
                            imgElement.style.maxWidth = '100%';
                            imgElement.style.height = 'auto';
                        }
                    }
                }
            });

            const headings = extractAndLogHeadings(body, knownChapterTitles);
            const content = DOMPurify.sanitize(body.outerHTML);

            return {
                href,
                content,
                headings,
            };
        } catch (err) {
            console.error(`Error parsing chapter ${href}:`, err);
            return null;
        }
    };

    useEffect(() => {
        const parseBook = async () => {
            if (!bookFile || isParsingComplete) {
                return;
            }

            try {
                const zip = await JSZip.loadAsync(bookFile);

                const chapterFiles = Object.keys(zip.files).filter((filename) => filename.endsWith('.html') || filename.endsWith('.xhtml'));

                const chapterMap: Record<string, ParsedChapter> = {};

                for (const filename of chapterFiles) {
                    const href = filename.replace('OPS/', '');
                    const parsed = await parseChapter(zip, href);
                    if (parsed) {
                        chapterMap[href] = parsed;
                    }
                }

                setParsedChapters(chapterMap);
                setIsParsingComplete(true);
            } catch (err: any) {
                console.error('Error parsing book:', err);
                setError(err.message || 'Error parsing book');
                setIsParsingComplete(true);
            }
        };

        parseBook();
    }, [bookFile, knownChapterTitles, duplicates, images]);

    return {
        parsedChapters,
        isParsingComplete,
        error,
    };
};

export default useParsedBook;
