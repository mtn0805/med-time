import { createContext, useContext, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Role, User } from '@medtime/shared';
import { api, RequestError } from './api';
interface AuthValue {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  login: (data: { email: string; password: string; role: Role }) => Promise<User>;
  register: (data: {
    name: string;
    email: string;
    phone: string;
    password: string;
  }) => Promise<User>;
  logout: () => Promise<void>;
}
const AuthContext = createContext<AuthValue | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ['auth'],
    queryFn: async () => {
      try {
        return await api.get<User>('/auth/me');
      } catch (error) {
        if (error instanceof RequestError && error.status === 401) return null;
        throw error;
      }
    },
    retry: false,
    staleTime: 60_000,
  });
  // Keep the observed auth query alive when changing identities. Removing it
  // disconnects AuthProvider from the new cached session until the next mount.
  const updateSession = async (user: User | null) => {
    // Also cancel requests started while authentication was in progress so an
    // older /auth/me response cannot overwrite the newly established identity.
    await client.cancelQueries();
    client.removeQueries({
      predicate: (cachedQuery) => cachedQuery.queryKey[0] !== 'auth',
    });
    client.setQueryData<User | null>(['auth'], user);
  };
  const establish = async (authenticate: () => Promise<User>) => {
    await client.cancelQueries();
    const user = await authenticate();
    await updateSession(user);
    return user;
  };
  const value: AuthValue = {
    user: query.data || null,
    isLoading: query.isPending,
    error: query.error,
    login: (data) => establish(() => api.post('/auth/login', data)),
    register: (data) => establish(() => api.post('/auth/register', data)),
    logout: async () => {
      await client.cancelQueries();
      await api.post('/auth/logout');
      await updateSession(null);
    },
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('AuthProvider missing');
  return context;
}

export const dashboardPath = (role: Role) =>
  role === 'patient' ? '/my-appointments' : role === 'doctor' ? '/schedule' : '/admin';
