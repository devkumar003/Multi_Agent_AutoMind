import { useAuth, useUser } from '@clerk/clerk-react';
import { useState, useEffect } from 'react';

const useAuthStore = () => {
    const { getToken, isSignedIn, signOut } = useAuth();
    const { user: clerkUser } = useUser();
    const [token, setToken] = useState(null);

    useEffect(() => {
        let isMounted = true;
        if (isSignedIn) {
            getToken().then(t => {
                if (isMounted) setToken(t);
            });
        } else {
            setToken(null);
        }
        return () => { isMounted = false; };
    }, [isSignedIn, getToken]);

    // Map Clerk user to the expected legacy user format
    const user = clerkUser ? {
        id: clerkUser.id,
        username: clerkUser.username || clerkUser.firstName || 'User',
        email: clerkUser.primaryEmailAddress?.emailAddress,
        is_admin: 1 // hardcoded to 1 for now to allow admin access as per previous fallback behavior
    } : null;

    return {
        token,
        user,
        isAuthenticated: isSignedIn,
        guestUsageCount: 0,
        incrementGuestUsage: () => {},
        logout: () => signOut()
    };
};

export default useAuthStore;
