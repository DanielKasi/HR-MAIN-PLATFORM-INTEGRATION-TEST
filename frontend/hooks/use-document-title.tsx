import { useEffect } from 'react';

import Head from 'next/head';

export function useDocumentTitle(title: string) {
    useEffect(() => {
        const originalTitle = document.title;
        document.title = title;
        return () => {
            document.title = originalTitle;
        };
    }, [title]);
}