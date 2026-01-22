# React Hooks

Custom React hooks for state management and data fetching.

## Directory Structure
- auth/ - Authentication and user hooks
- chat/ - Chat and conversation hooks
- organization/ - Organization management hooks
- ui/ - UI state and interaction hooks

## Hook Patterns

### Basic Custom Hook
```typescript
import { useState, useEffect } from 'react';

export function useCustomHook(param: string) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const result = await apiCall(param);
        setData(result);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, [param]);
  
  return { data, loading, error };
}
```

### With SWR
```typescript
import useSWR from 'swr';

export function useUser(userId: string) {
  const { data, error, mutate } = useSWR(
    userId ? `/api/users/${userId}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // 1 minute
    }
  );
  
  return {
    user: data,
    loading: !error && !data,
    error,
    refresh: mutate
  };
}
```

## Authentication Hooks

### useAuth
```typescript
// hooks/auth/useAuth.ts
export function useAuth() {
  const { userId, sessionId, org_id } = useClerkAuth();
  const { user, loading } = useUser(userId);
  
  const hasRole = useCallback((role: string) => {
    return user?.roles?.includes(role) ?? false;
  }, [user]);
  
  const hasPermission = useCallback((permission: string) => {
    return user?.permissions?.includes(permission) ?? false;
  }, [user]);
  
  return {
    user,
    userId,
    org_id,
    loading,
    isAuthenticated: !!userId,
    hasRole,
    hasPermission
  };
}
```

### useCurrentUser
```typescript
export function useCurrentUser() {
  const { userId } = useAuth();
  
  return useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUserProfile(userId),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
```

## Chat Hooks

### useConversations
```typescript
// hooks/chat/useConversations.ts
export function useConversations(options?: ConversationOptions) {
  const { userId, org_id } = useAuth();
  
  const {
    data: conversations,
    loading,
    error,
    mutate
  } = useSWR(
    ['conversations', userId, org_id, options],
    () => fetchConversations({ userId, org_id, ...options })
  );
  
  const createConversation = useCallback(async (title: string) => {
    const newConv = await api.createConversation({ title, userId, org_id });
    mutate([...conversations, newConv]);
    return newConv;
  }, [conversations, mutate, userId, org_id]);
  
  return {
    conversations,
    loading,
    error,
    createConversation,
    refresh: mutate
  };
}
```

### useMessages
```typescript
export function useMessages(conversationId: string) {
  const [optimisticMessages, setOptimisticMessages] = useState([]);
  
  const { data: messages, mutate } = useSWR(
    conversationId ? ['messages', conversationId] : null,
    () => fetchMessages(conversationId),
    {
      refreshInterval: 0,
      revalidateOnFocus: false
    }
  );
  
  const sendMessage = useCallback(async (content: string) => {
    // Optimistic update
    const tempMessage = {
      id: `temp-${Date.now()}`,
      content,
      role: 'user',
      created_at: new Date()
    };
    
    setOptimisticMessages(prev => [...prev, tempMessage]);
    
    try {
      const newMessage = await api.sendMessage(conversationId, content);
      mutate();
    } catch (error) {
      // Remove optimistic message on error
      setOptimisticMessages(prev => 
        prev.filter(m => m.id !== tempMessage.id)
      );
      throw error;
    }
  }, [conversationId, mutate]);
  
  return {
    messages: [...(messages || []), ...optimisticMessages],
    sendMessage,
    loading: !messages
  };
}
```

## Organization Hooks

### useOrganization
```typescript
// hooks/organization/useOrganization.ts
export function useOrganization(org_id?: string) {
  const { org_id: currentorg_id } = useAuth();
  const targetorg_id = org_id || currentorg_id;
  
  const { data, loading, error } = useQuery({
    queryKey: ['organization', targetorg_id],
    queryFn: () => fetchOrganization(targetorg_id),
    enabled: !!targetorg_id
  });
  
  return {
    organization: data,
    loading,
    error,
    isCurrentOrg: targetorg_id === currentorg_id
  };
}
```

### useInvites
```typescript
export function useInvites(org_id: string) {
  const { data: invites, mutate } = useSWR(
    ['invites', org_id],
    () => fetchInvites(org_id)
  );
  
  const sendInvite = async (email: string, role: string) => {
    const invite = await api.createInvite({ email, role, org_id });
    mutate([...invites, invite]);
    return invite;
  };
  
  const revokeInvite = async (inviteId: string) => {
    await api.revokeInvite(inviteId);
    mutate(invites.filter(i => i.id !== inviteId));
  };
  
  return {
    invites,
    sendInvite,
    revokeInvite,
    loading: !invites
  };
}
```

## UI Hooks

### useDebounce
```typescript
// hooks/ui/useDebounce.ts
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    return () => clearTimeout(handler);
  }, [value, delay]);
  
  return debouncedValue;
}
```

### useLocalStorage
```typescript
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      return initialValue;
    }
  });
  
  const setValue = (value: T) => {
    try {
      setStoredValue(value);
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Error saving to localStorage:`, error);
    }
  };
  
  return [storedValue, setValue];
}
```

### useInfiniteScroll
```typescript
export function useInfiniteScroll(callback: () => void) {
  const observer = useRef<IntersectionObserver>();
  
  const lastElementRef = useCallback((node: HTMLElement) => {
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        callback();
      }
    });
    
    if (node) observer.current.observe(node);
  }, [callback]);
  
  return lastElementRef;
}
```

## Performance Patterns

### Memoization
```typescript
export function useExpensiveComputation(data: any[]) {
  return useMemo(() => {
    // Expensive computation
    return data.reduce((acc, item) => {
      return performExpensiveOperation(acc, item);
    }, {});
  }, [data]);
}
```

### Cleanup
```typescript
export function useEventListener(event: string, handler: Function) {
  useEffect(() => {
    window.addEventListener(event, handler);
    
    return () => {
      window.removeEventListener(event, handler);
    };
  }, [event, handler]);
}
```

## Testing Hooks
```typescript
// Using @testing-library/react-hooks
import { renderHook, act } from '@testing-library/react-hooks';

test('useCounter increments', () => {
  const { result } = renderHook(() => useCounter());
  
  act(() => {
    result.current.increment();
  });
  
  expect(result.current.count).toBe(1);
});
```

## Best Practices
- Keep hooks focused on single responsibility
- Use proper dependency arrays
- Handle cleanup in useEffect
- Provide loading and error states
- Use optimistic updates for better UX
- Memoize expensive computations
- Test hooks in isolation

## Common Commands
```bash
npm test hooks              # Test custom hooks
npm run lint               # Check hook rules
npm run type-check         # TypeScript validation
```