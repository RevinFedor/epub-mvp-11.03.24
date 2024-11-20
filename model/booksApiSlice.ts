import { api } from '@/app/api/apiSlice';
import JSZip from 'jszip';

export interface Book {
    _id: string;
    filePath: string;
    title?: string;
    creator?: string;
    description?: string;
}

export interface ParsedBook extends Omit<Book, '_id'> {
    title: string;
    creator: string;
    description: string;
    content: ArrayBuffer;
}

export const booksApi = api.injectEndpoints({
    endpoints: (builder) => ({
        getBooks: builder.query<Book[], void>({
            query: () => 'books',
            providesTags: ['Books'],
        }),
        getBookById: builder.query<ArrayBuffer, string>({
            query: (id) => ({
                url: `http://localhost:3500/api/books/${id}`,
                responseHandler: (response) => response.arrayBuffer(), // Обработка ответа как ArrayBuffer
            }),
        }),

        getBookContent: builder.query<ParsedBook, string>({
            query: (filePath) => ({
                url: 'http://localhost:3500' + filePath,
                responseHandler: (response) => response.arrayBuffer(),
            }),
            transformResponse: async (content: ArrayBuffer, _, filePath) => {
                const zip = await JSZip.loadAsync(content);
                const metadataFile = zip.file('OEBPS/content.opf') || zip.file('content.opf');
                const metadataContent = metadataFile ? await metadataFile.async('text') : '';

                const parser = new DOMParser();
                const metadataDoc = parser.parseFromString(metadataContent, 'application/xml');
                const title = metadataDoc.querySelector('title')?.textContent || 'Unknown Title';
                const creator = metadataDoc.querySelector('creator')?.textContent || 'Unknown Author';
                const description = metadataDoc.querySelector('description')?.textContent || 'No description available';

                return {
                    title,
                    creator,
                    description,
                    content,
                    filePath,
                };
            },
        }),
        uploadBook: builder.mutation<void, FormData>({
            query: (formData) => ({
                url: 'books',
                method: 'POST',
                body: formData,
            }),
            invalidatesTags: ['Books'],
        }),
        deleteBook: builder.mutation<void, string>({
            query: (id) => ({
                url: `books/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['Books'],
        }),
    }),
});

export const { useGetBooksQuery, useUploadBookMutation, useDeleteBookMutation, useGetBookByIdQuery, useGetBookContentQuery } = booksApi;
