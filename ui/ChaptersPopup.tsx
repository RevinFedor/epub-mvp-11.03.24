import { useState } from 'react';
import { ChevronRight, ChevronDown, AlignLeft } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/components/ui/popover';

interface Chapter {
    label: string;
    href: string;
    cfi: string;
    level: number;
    children?: Chapter[];
}

interface ChaptersPopupProps {
    mockChapters: Chapter[];
    currentChapter: string;
    setCurrentChapter: (href: string) => void;
    setIsScrollingInPopup: (isScrolling: boolean) => void; // Новый пропс для передачи состояния скролла
}

export const ChaptersPopup = ({ mockChapters, currentChapter, setCurrentChapter, setIsScrollingInPopup }: ChaptersPopupProps) => {
    const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());

    const toggleChapter = (href: string) => {
        setExpandedChapters((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(href)) {
                newSet.delete(href);
            } else {
                newSet.add(href);
            }
            return newSet;
        });
    };

    const handleScroll = () => {
        setIsScrollingInPopup(true);
    };

    const handleMouseLeave = () => {
        setIsScrollingInPopup(false);
    };

    const renderChapter = (chapter: Chapter, parentExpanded: boolean = true) => {
        const isExpanded = expandedChapters.has(chapter.href);
        const hasChildren = chapter.children && chapter.children.length > 0;

        if (!parentExpanded && chapter.level !== 1) return null;

        return (
            <div key={chapter.href} className="w-full">
                <div
                    onClick={() => setCurrentChapter(chapter.href)}
                    className={`flex items-center p-2 cursor-pointer hover:bg-slate-100 ${currentChapter === chapter.href ? 'bg-slate-200' : ''}`}
                    style={{
                        paddingLeft: `${chapter.level * 12}px`,
                    }}
                >
                    {hasChildren ? (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                toggleChapter(chapter.href);
                            }}
                            className="mr-2 flex items-center justify-center w-4 h-4 focus:outline-none"
                            aria-expanded={isExpanded}
                            aria-label={isExpanded ? 'Свернуть раздел' : 'Развернуть раздел'}
                        >
                            {isExpanded ? <ChevronDown className="w-4 h-4 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 flex-shrink-0" />}
                        </button>
                    ) : (
                        // Заполнитель для выравнивания
                        <span className="mr-2 w-4 h-4 inline-block"></span>
                    )}
                    <span className="truncate">{chapter.label}</span>
                </div>
                {isExpanded && hasChildren && <div>{chapter.children!.map((subChapter) => renderChapter(subChapter, isExpanded))}</div>}
            </div>
        );
    };

    return (
        <Popover>
            <PopoverTrigger>
                <AlignLeft className="ml-4" />
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0">
                <div className="h-[400px] overflow-y-auto overflow-x-hidden hide-scrollbar" onScroll={handleScroll} onMouseLeave={handleMouseLeave}>
                    {mockChapters.map((chapter) => renderChapter(chapter))}
                </div>
            </PopoverContent>
        </Popover>
    );
};
