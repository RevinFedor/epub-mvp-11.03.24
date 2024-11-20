import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useGetBooksQuery, useUploadBookMutation, useDeleteBookMutation } from '../../model/booksApiSlice';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import BookList, { BookListSkeleton } from './BookList';
import BookDetails from './BookDetails';
import { FileUploader } from '@/shared/ui/FileUploader';

interface Book {
    _id: string;
    filePath: string;
    title: string;
    author: string;
    language: string;
    size: number;
    uploadDate: string;
    coverUrl: string | null;
    wordCount: number;
    lineCount: number;
}

const Library: React.FC = () => {
    const [selectedBook, setSelectedBook] = useState<Book | null>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [uploadError, setUploadError] = useState<string | undefined>(undefined);
    const [resetTrigger, setResetTrigger] = useState<number>(0);

    const { data: books, isLoading: isBooksLoading, error: booksError } = useGetBooksQuery();
    const [uploadBook, { isLoading: isUploading }] = useUploadBookMutation();
    const [deleteBook] = useDeleteBookMutation();

    const handleFileSelect = async (file: File) => {
        setUploadError(undefined); // Сбросить предыдущие ошибки при выборе нового файла

        const formData = new FormData();
        formData.append('book', file);

        try {
            const response = await uploadBook(formData).unwrap();
            console.log('Upload successful:', response);
            toast.success('Книга успешно загружена!');
            setResetTrigger((prev) => prev + 1); // Сброс FileUploader
        } catch (error) {
            console.error('Upload failed:', error);
            interface ApiError {
                data?: {
                    message?: string;
                };
                status?: number;
            }

            const isApiError = (error: unknown): error is ApiError => {
                return typeof error === 'object' && error !== null && 'data' in error;
            };

            if (isApiError(error) && error.data?.message) {
                setUploadError(`Не удалось загрузить книгу: ${error.data.message}`);
                toast.error(`Не удалось загрузить книгу: ${error.data.message}`);
            } else {
                setUploadError('Не удалось загрузить книгу.');
                toast.error('Не удалось загрузить книгу.');
            }
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await deleteBook(id).unwrap();
            setIsDrawerOpen(false);
            setSelectedBook(null);
            toast.success('Книга успешно удалена!');
        } catch (error: any) {
            console.error('Delete failed:', error);
            if (error.data && error.data.message) {
                toast.error(`Не удалось удалить книгу: ${error.data.message}`);
            } else {
                toast.error('Не удалось удалить книгу.');
            }
        }
    };

    const handleBookClick = (book: Book) => {
        setSelectedBook(book);
        setIsDrawerOpen(true);
    };

    return (
        <div className="container mx-auto p-4">
            {/* Компонент загрузки файла */}
            <FileUploader
                onFileSelect={handleFileSelect}
                loading={isUploading}
                error={uploadError}
                title="Загрузить книгу"
                acceptedFileTypes={{
                    'application/epub+zip': ['.epub'],
                }}
                maxFiles={1}
                maxSize={50 * 1024 * 1024} // Пример: 50MB
                dragActiveText="Отпустите файл здесь..."
                dragInactiveText="Перетащите файл сюда или кликните для выбора"
                loadingText="Загрузка и обработка файла..."
                className="mb-4"
                resetTrigger={resetTrigger} // Передаём триггер сброса
                size="large" // Значение по умолчанию
            />
            {/* Ошибка при получении книг */}
            {booksError && <p className="text-red-500 mb-4">Не удалось получить книги. Пожалуйста, попробуйте позже.</p>}

            {/* Список книг или скелетоны загрузки */}
            {isBooksLoading ? <BookListSkeleton /> : <BookList books={books || []} onBookClick={handleBookClick} />}

            {/* Детали выбранной книги */}
            {selectedBook && <BookDetails book={selectedBook} isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} onDelete={handleDelete} />}
            <ToastContainer />
        </div>
    );
};

export default Library;
