// contexts/ClerkAuthContext.tsx
import React, { createContext, useContext } from "react";
import { useUser, useAuth as useClerkAuth } from '@clerk/nextjs';

interface AuthContextProps {
    user: any | null;
    isUserLoaded: boolean;
    isSignedIn: boolean;
    signOut: () => void;
}

const AuthContext = createContext<AuthContextProps>({
    user: null,
    isUserLoaded: false,
    isSignedIn: false,
    signOut: () => { },
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    const { user, isLoaded } = useUser();
    const { isSignedIn, signOut } = useClerkAuth();

    return (
        <AuthContext.Provider value={{
            user,
            isUserLoaded: isLoaded,
            isSignedIn: Boolean(isSignedIn),
            signOut
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
