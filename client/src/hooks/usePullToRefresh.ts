import { useState, useCallback } from 'react';

interface PullToRefreshOptions {
  onRefresh: () => Promise<void> | void;
}

export const usePullToRefresh = ({ onRefresh }: PullToRefreshOptions) => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  }, [onRefresh, isRefreshing]);

  return { handleRefresh, isRefreshing };
};