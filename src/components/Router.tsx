import { useState, useEffect } from 'react';

type Page = 'landing' | 'auth' | 'top5' | 'recommendations' | 'upcoming' | 'profile';

interface RouterContextType {
  currentPage: Page;
  navigate: (page: Page) => void;
  pageData: any;
  setPageData: (data: any) => void;
}

export const routerContext = {
  currentPage: 'landing' as Page,
  navigate: (_page: Page) => {},
  pageData: null as any,
  setPageData: (_data: any) => {}
};

export function useRouter(): RouterContextType {
  const [currentPage, setCurrentPage] = useState<Page>('landing');
  const [pageData, setPageData] = useState<any>(null);

  useEffect(() => {
    routerContext.currentPage = currentPage;
    routerContext.navigate = setCurrentPage;
    routerContext.pageData = pageData;
    routerContext.setPageData = setPageData;
  }, [currentPage, pageData]);

  return {
    currentPage,
    navigate: setCurrentPage,
    pageData,
    setPageData
  };
}
