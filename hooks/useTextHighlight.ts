import { useState, useRef, useEffect } from 'react';

interface Selection {
    text: string;
    range: Range | null;
    rect: DOMRect | null;
}

export const useTextHighlight = () => {
    const [selection, setSelection] = useState<Selection>({
        text: '',
        range: null,
        rect: null,
    });
    const buttonRef = useRef<HTMLButtonElement>(null);

    const handleSelectionChange = () => {
        const sel = window.getSelection();
        if (sel && sel.toString().trim().length > 0) {
            const range = sel.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            setSelection({
                text: sel.toString(),
                range: range,
                rect: rect,
            });
        } else {
            setSelection({ text: '', range: null, rect: null });
        }
    };

    const handleHighlight = (pages: any[], currentPage: number, setPages: (pages: any[]) => void) => {
        if (selection.range) {
            const containsImage = selection.range.cloneContents().querySelector('img') !== null;
            if (containsImage) {
                alert('Выделение содержит изображение. Выделение текста не выполнено.');
                window.getSelection()?.removeAllRanges();
                setSelection({ text: '', range: null, rect: null });
                return;
            }

            const selectedText = selection.text;
            const highlightedText = `<span class="highlight">${selectedText}</span>`;
            const escapeRegExp = (string: string) => {
                return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            };

            const container = window.getSelection()?.anchorNode?.parentElement;
            let column = container?.closest('.left-column') ? 'left' : 'right';

            const regex = new RegExp(`(${escapeRegExp(selectedText)})`, 'i');

            setPages((prevPages) => {
                const newPages = [...prevPages];
                const currentContent = newPages[currentPage][column];
                newPages[currentPage] = {
                    ...newPages[currentPage],
                    [column]: currentContent.replace(regex, highlightedText),
                };
                return newPages;
            });

            window.getSelection()?.removeAllRanges();
            setSelection({ text: '', range: null, rect: null });
        }
    };

    useEffect(() => {
        document.addEventListener('mouseup', handleSelectionChange);
        document.addEventListener('keyup', handleSelectionChange);

        return () => {
            document.removeEventListener('mouseup', handleSelectionChange);
            document.removeEventListener('keyup', handleSelectionChange);
        };
    }, []);

    const getButtonStyle = () => {
        if (selection.rect) {
            const { top, left, width } = selection.rect;
            return {
                position: 'absolute' as 'absolute',
                top: top - 170,
                left: left + width / 2,
                transform: 'translateX(-50%)',
                zIndex: 1000,
            };
        }
        return { display: 'none' };
    };

    return {
        selection,
        buttonRef,
        handleHighlight,
        getButtonStyle,
    };
};
