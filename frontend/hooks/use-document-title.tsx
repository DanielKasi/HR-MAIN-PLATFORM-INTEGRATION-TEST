import { useEffect } from 'react';


export function useDocumentTitle(title: string) {
    useEffect(() => {
        const originalTitle = document.title;
        document.title = 'PERACOSOFT -  ' + title.toUpperCase();
        return () => {
            document.title = originalTitle;
        };
    }, [title]);
}

