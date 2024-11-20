import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/shared/ui/components/ui/card';
import { Skeleton } from '@/shared/ui/components/ui/skeleton';
import { Button } from '@/shared/ui/components/ui/button';

interface Book {
    _id: string;
    filePath: string;
    title: string;
    author: string;
    language: string;
    size: number;
    coverUrl: string | null;
    wordCount: number;
    lineCount: number;
}

interface BookListProps {
    books: Book[];
    onBookClick: (book: Book) => void;
}

export const BookListSkeleton: React.FC = () => {
    const skeletonItems = Array.from({ length: 10 });

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {skeletonItems.map((_, index) => (
                <Card key={index} className="p-4 w-[185px]">
                    <Skeleton className="w-full h-[220px] mb-2" />
                    <Skeleton className="h-4 w-3/4 mt-2" />
                    <Skeleton className="h-6 w-1/2 mt-4" />
                </Card>
            ))}
        </div>
    );
};

const BookList: React.FC<BookListProps> = ({ books, onBookClick }) => {
    // Функция для обрезки заголовка до 120 символов
    const truncateTitle = (title: string, maxLength: number) => {
        return title.length > maxLength ? `${title.substring(0, maxLength - 3)}...` : title;
    };

    return (
        <div className="flex flex-wrap justify-between">
            {books.map((book) => (
                <div key={book._id} className="relative group cursor-pointer">
                    <div className="">
                        <div className="p-4 w-[185px] text-center">
                            {/* Обложка книги */}
                            <div onClick={() => onBookClick(book)}>
                                <div className=" shadow-lg hover:shadow-xl transition-shadow duration-300">
                                    {' '}
                                    {book.coverUrl ? (
                                        <img
                                            src={`http://localhost:3500${book.coverUrl}`}
                                            alt={book.title}
                                            className="w-full h-[220px] object-cover mb-2"
                                            loading="lazy"
                                        />
                                    ) : (
                                        <div className="w-full h-[220px] bg-gray-200 flex items-center justify-center mb-2">
                                            <span className="text-sm text-gray-500 text-center px-2">{truncateTitle(book.title, 120)}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            {/* Заголовок книги */}
                            <p className="text-sm max-w-[120ch] overflow-hidden whitespace-nowrap text-ellipsis" title={book.title}>
                                {truncateTitle(book.title, 120)}
                            </p>
                        </div>
                    </div>

                    {/* Оверлей при наведении */}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition-opacity duration-300 flex items-center justify-center">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-center flex flex-col">
                            <Button
                                onClick={() => onBookClick(book)}
                                className="mb-12 inline-block bg-secondary text-secondary-foreground py-1 px-1   rounded hover:bg-secondary-dark transition-colors"
                            >
                                Info
                            </Button>
                            {/* <Link
                                to={`/LibraryZip/${book._id}`}
                                className=" inline-block bg-primary text-primary-foreground py-1 px-3 rounded hover:bg-primary-dark transition-colors"
                            >
                                Open book
                            </Link> */}
                            <Link
                                to={`/Library/${book._id}`}
                                className=" inline-block bg-primary text-primary-foreground py-1 px-3 rounded hover:bg-primary-dark transition-colors"
                            >
                                Open book
                            </Link>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default BookList;
