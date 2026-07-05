import { createContext, useContext } from 'react';

export interface UserContextType {
  user: any; 
  updateAvatar: (newUrl: string | null) => Promise<void>;
  deleteAvatar: () => Promise<void>;
}

export const UserContext = createContext<UserContextType | null>(null);

export const useUserContext = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUserContext must be used within a UserProvider');
  }
  return context;
};
