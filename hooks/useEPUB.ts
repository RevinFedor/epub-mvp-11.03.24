import { useState, useEffect } from 'react';
import JSZip from 'jszip';
import DOMPurify from 'dompurify';
import { parseNavPoints, getFullImagePath } from '../model/utils'; // Вынесите функции в shared/utils
import { Chapter } from '../model/types';

const useEPUB = (bookFile: ArrayBuffer | null = null) => {
    const [chapters, setChapters] = useState<Chapter[]>([]);
    const [cssContent, setCssContent] = useState<string>('');
    const [images, setImages] = useState<Record<string, string>>({});
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadEpub = async () => {
            if (bookFile) {
                try {
                    const zip = await JSZip.loadAsync(bookFile);

                    // Загрузка TOC
                    const tocFile = zip.file(/toc\.ncx$/i)[0];
                    if (!tocFile) throw new Error('toc.ncx не найден');

                    const tocContent = await tocFile.async('string');
                    const parser = new DOMParser();
                    const tocDoc = parser.parseFromString(tocContent, 'application/xml');
                    const rootNavPoints = tocDoc.querySelectorAll('navMap > navPoint');
                    const newChapters = parseNavPoints(rootNavPoints);
                    setChapters(newChapters);

                    // Загрузка CSS
                    const cssFiles = Array.from(zip.file(/.*\.css$/i));
                    const cssContents = await Promise.all(cssFiles.map((file) => file.async('string')));
                    setCssContent(cssContents.join('\n'));

                    // Загрузка изображений
                    const imageFiles = Array.from(zip.file(/\.(png|jpg|jpeg|gif|svg)$/i));
                    const imageMap: Record<string, string> = {};
                    await Promise.all(
                        imageFiles.map(async (file) => {
                            const data = await file.async('base64');
                            const extensionMatch = file.name.match(/\.(png|jpg|jpeg|gif|svg)$/i);
                            const extension = extensionMatch ? extensionMatch[1].toLowerCase() : 'png';
                            const mimeType = extension === 'svg' ? 'image/svg+xml' : `image/${extension === 'jpg' ? 'jpeg' : extension}`;
                            const dataUri = `data:${mimeType};base64,${data}`;
                            imageMap[file.name] = dataUri;
                        })
                    );

                    setImages(imageMap);
                } catch (err) {
                    console.error('Ошибка при загрузке EPUB:', err);
                    setError(err.message);
                }
            }
        };

        loadEpub();
    }, [bookFile]);

    return { chapters, cssContent, images, error };
};

export default useEPUB;
