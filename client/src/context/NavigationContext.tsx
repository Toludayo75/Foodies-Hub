import { createContext, useContext, useState, ReactNode } from 'react';

interface NavigationContextType {
  previousPage: string | null;
  setPreviousPage: (page: string) => void;
  navigateBack: () => string;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [previousPage, setPreviousPage] = useState<string | null>(null);

  const navigateBack = () => {
    // If we have a stored previous page, use it
    if (previousPage) {
      return previousPage;
    }

    // Default fallback routes based on current location
    const currentPath = window.location.pathname;
    const fallbackRoutes: Record<string, string> = {
      '/notifications': '/settings',
      '/addresses': '/settings',
      '/personal-info': '/settings',
      '/edit-profile': '/settings',
      '/help-center': '/settings',
      '/payment-method': '/settings'
    };

    return fallbackRoutes[currentPath] || '/home';
  };

  return (
    <NavigationContext.Provider value={{
      previousPage,
      setPreviousPage,
      navigateBack
    }}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
}