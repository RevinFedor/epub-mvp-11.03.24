import JSZip from 'jszip';
import { Chapter } from './types';
import DOMPurify from 'dompurify';

//! построить иерархическую структуру глав книги
export const parseNavPoints = (navPoints: NodeListOf<Element>, currentLevel: number = 1): Chapter[] => {
    const chapters: Chapter[] = [];

    navPoints.forEach((navPoint) => {
        const label = navPoint.querySelector('navLabel > text')?.textContent || 'Глава';
        const href = navPoint.querySelector('content')?.getAttribute('src') || '';

        const chapter: Chapter = {
            label,
            href,
            cfi: '',
            level: currentLevel,
            children: [],
        };

        const childNavPoints = navPoint.querySelectorAll(':scope > navPoint');
        if (childNavPoints.length > 0) {
            chapter.children = parseNavPoints(childNavPoints, currentLevel + 1);
        }

        chapters.push(chapter);
    });

    return chapters;
};

//!  формирование полного пути к изображению внутри EPUB-файла
export const getFullImagePath = (baseHref: string, src: string): string => {
    if (src.startsWith('OPS/')) {
        return src;
    }

    const chapterPath = baseHref.substring(0, baseHref.lastIndexOf('/') + 1);
    const fullPath = chapterPath + src;

    if (!fullPath.startsWith('OPS/')) {
        return 'OPS/' + fullPath;
    }

    return fullPath;
};

//! преобразования иерахической сстуркты в плоский список
export const flattenChapters = (chapters: Chapter[]): Chapter[] => {
    const flat: Chapter[] = [];
    const traverse = (chapterList: Chapter[]) => {
        chapterList.forEach((chapter) => {
            flat.push(chapter);
            if (chapter.children && chapter.children.length > 0) {
                traverse(chapter.children);
            }
        });
    };
    traverse(chapters);
    return flat;
};

//! Функция для получения всех родительских глав
export const getParentChapters = (chapters: Chapter[], href: string): Chapter[] => {
    const parents: Chapter[] = [];

    const findChapter = (chapterList: Chapter[], currentHref: string, ancestors: Chapter[] = []): boolean => {
        for (const chapter of chapterList) {
            const newAncestors = [...ancestors, chapter];
            if (chapter.href === currentHref) {
                parents.push(...newAncestors);
                return true;
            }

            if (chapter.children && chapter.children.length > 0) {
                const found = findChapter(chapter.children, currentHref, newAncestors);
                if (found) {
                    return true;
                }
            }
        }
        return false;
    };

    findChapter(chapters, href);
    return parents;
};

//! функция для обработки изображений заранее
export const waitForImages = (container: HTMLElement): Promise<void> => {
    const images = container.querySelectorAll('img');
    const promises = Array.from(images).map((img) => {
        if (img.complete) return Promise.resolve();
        return new Promise<void>((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
        });
    });
    return Promise.all(promises).then(() => {});
};

//! Рекурсивная функция для сбора всех элементов
export const collectElements = (node: Node, elements: HTMLElement[]) => {
    if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;

        if (['P', 'H1', 'H2', 'H3', 'IMG', 'DIV', 'FIGURE', 'SECTION', 'ARTICLE'].includes(el.tagName)) {
            elements.push(el);

            return;
        }
        el.childNodes.forEach((child) => collectElements(child, elements));
    }
};

//! Функция для оценки высоты элемента
export const estimateElementHeight = (el: HTMLElement): number => {
    const tempContainer = document.createElement('div');
    tempContainer.style.visibility = 'hidden';
    tempContainer.style.position = 'absolute';
    tempContainer.style.top = '0';
    tempContainer.style.left = '0';
    tempContainer.style.width = '780px'; //! Убедитесь, что это соответствует реальной ширине столбца

    const clone = el.cloneNode(true) as HTMLElement;

    // Для изображений задаём фиксированные размеры или получаем реальные
    if (clone.tagName === 'IMG') {
        const img = clone as HTMLImageElement;
        if (!img.height || img.height === 0) {
            img.style.height = '200px';
        }

        img.style.width = '100%';
        img.style.objectFit = 'contain';
        img.style.display = 'block';
    }

    tempContainer.appendChild(clone);
    document.body.appendChild(tempContainer);
    const height = tempContainer.offsetHeight;
    document.body.removeChild(tempContainer);
    return height;
};

//! Функция для распределения текста по страцниам
export async function splitHtmlIntoPages(html: string, maxHeight: number): Promise<{ pages: any[]; pageHeadings: any }> {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    await waitForImages(tempDiv); // complite full html

    const allElements: HTMLElement[] = [];
    tempDiv.childNodes.forEach((child) => collectElements(child, allElements)); // every element

    const pagesArray: any[] = [];

    const pageHeadings: any = {};

    let currentPageContent: any = { left: '', right: '' };

    let currentColumnHeight = [0, 0];

    let currentColumn = 0;

    let currentPageIndex = 0;

    for (const element of allElements) {
        const elHeight = estimateElementHeight(element);

        if (elHeight > maxHeight) {
            console.warn(`Element <${element.tagName.toLowerCase()}> exceeds max height and will be skipped.`);
            continue;
        }

        if (currentColumnHeight[currentColumn] + elHeight > maxHeight) {
            if (currentColumn === 0 && currentColumnHeight[1] === 0) {
                currentColumn = 1;
            } else {
                pagesArray.push(currentPageContent);

                currentPageContent = { left: '', right: '' };

                currentColumnHeight = [0, 0];

                currentColumn = 0;

                currentPageIndex++;
            }
        }

        if (element.hasAttribute('data-chapter-title') || element.getAttribute('data-chapter-href')) {
            const title = element.getAttribute('data-chapter-title');
            const href = element.getAttribute('data-chapter-href') || '';

            // Получаем текущий индекс для заголовка
            let headingIndex = 0;
            while (pageHeadings[`${currentPageIndex}-${headingIndex}`]) {
                headingIndex++;
            }

            if (title) {
                // Используем составной ключ: номер_страницы-номер_заголовка
                pageHeadings[`${currentPageIndex}-${headingIndex}`] = {
                    title,
                    href,
                };
            }
        }

        const htmlString = element.outerHTML || element.innerHTML || '';
        currentPageContent[currentColumn === 0 ? 'left' : 'right'] += htmlString;
        currentColumnHeight[currentColumn] += elHeight;
    }

    if (currentPageContent.left || currentPageContent.right) {
        pagesArray.push(currentPageContent);
    }

    return {
        pages: pagesArray,
        pageHeadings,
    };
}

//! получаем content для главы
export const loadChapterContent = async (bookFile: ArrayBuffer, href: string): Promise<string | null> => {
    try {
        const zip = await JSZip.loadAsync(bookFile);
        const [hrefSplit] = href.split('#');
        const baseHref = hrefSplit;
        let chapterFile = zip.file(`OPS/${baseHref}`);

        if (!chapterFile) {
            const availableFiles = Object.keys(zip.files);
            const similarFile = availableFiles.find((file) => file.toLowerCase() === baseHref.toLowerCase());
            if (similarFile) {
                chapterFile = zip.file(similarFile);
            } else {
                return null;
            }
        }

        let chapterContent = await chapterFile.async('string');

        chapterContent = chapterContent.replace(/<\?xml.*?\?>\s*/g, '');

        // Очищаем содержимое
        const parser = new DOMParser();
        const doc = parser.parseFromString(chapterContent, 'application/xhtml+xml');
        const body = doc.body;

        if (!body) {
            console.warn('Тег <body> не найден в содержимом главы.');
            return null;
        }

        // Сериализуем содержимое
        const serializer = new XMLSerializer();
        let sanitizedContent = serializer.serializeToString(body);
        sanitizedContent = DOMPurify.sanitize(sanitizedContent);
        return sanitizedContent;
    } catch (err) {
        console.error('Ошибка при загрузке содержимого главы:', err);
        return null;
    }
};

//! Вычисляет SHA-256 хеш для заданной строки для сравнения дубликатов
export const computeHash = async (content: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

    return hashHex;
};

//! извлечение заголовков глав
export const extractChapterTitles = (chapters: Chapter[]) => {
    const titles: {
        label: string;
        href: string;
    }[] = [];

    const extractTitlesRecursively = (chapterList: Chapter[]) => {
        chapterList.forEach((chapter) => {
            titles.push({
                label: chapter.label,
                href: chapter.href,
            });

            if (chapter.children && chapter.children.length > 0) {
                extractTitlesRecursively(chapter.children);
            }
        });
    };

    extractTitlesRecursively(chapters);

    return titles;
};
