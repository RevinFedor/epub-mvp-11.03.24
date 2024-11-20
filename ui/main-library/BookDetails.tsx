import React from 'react';
import { Button } from '@/shared/ui/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/shared/ui/components/ui/sheet';
import { ScrollArea } from '@/shared/ui/components/ui/scroll-area';

interface Book {
    _id: string;
    filePath: string;
    title: string;
    description: string;
    author: string;
    language: string;
    size: number;
    uploadDate: string;
    coverUrl: string | null;
    wordCount: number;
    lineCount: number;
}

interface BookDetailsProps {
    book: Book;
    isOpen: boolean;
    onClose: () => void;
    onDelete: (id: string) => void;
}

const BookDetails: React.FC<BookDetailsProps> = ({ book, isOpen, onClose, onDelete }) => {
    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent>
                <SheetHeader>
                    <SheetTitle>{book.title}</SheetTitle>
                    <SheetDescription>Автор: {book.author}</SheetDescription>
                </SheetHeader>
                <ScrollArea className="h-[calc(100vh-200px)] mt-4">
                    {book.coverUrl ? (
                        <img
                            src={`http://localhost:3500${book.coverUrl}`}
                            alt={book.title}
                            className="w-full h-[220px] object-cover mb-2"
                            loading="lazy"
                        />
                    ) : (
                        <div className="w-full h-[220px] bg-gray-200 flex items-center justify-center mb-2">
                            <span className="text-sm text-gray-500 text-center px-2">{book.title}</span>
                        </div>
                    )}
                    {/* Дополнительная информация */}
                    <div className="mt-4 space-y-2">
                        <p>
                            <strong>Автор:</strong> {book.author}
                        </p>
                        <p>
                            <strong>Язык:</strong> {book.language}
                        </p>
                        <p>
                            <strong>Размер:</strong> {(book.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                        <p>
                            <strong>Дата загрузки:</strong> {new Date(book.uploadDate).toLocaleDateString()}
                        </p>
                        <p>
                            <strong>Количество слов:</strong> {book.wordCount}
                        </p>
                        <p>
                            <strong>Количество строк:</strong> {book.lineCount}
                        </p>
                        <p>
                            <strong>Описание:</strong> {book.description}
                        </p>
                        {/* Добавьте другие поля по необходимости */}
                    </div>
                </ScrollArea>
                <div className="flex justify-between mt-4">
                    <a href={`http://localhost:3500${book.filePath}`} target="_blank" rel="noopener noreferrer">
                        <Button>Скачать</Button>
                    </a>
                    <Button variant="destructive" onClick={() => onDelete(book._id)}>
                        Удалить
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
};

export default BookDetails;
