import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      loading: false,
      error: null,
      guestUsageCount: 0,

      incrementGuestUsage: () => set((state) => ({ guestUsageCount: state.guestUsageCount + 1 })),


      login: async (email, password) => {
        set({ loading: true, error: null });
        try {
          const res = await axios.post('http://127.0.0.1:8000/api/auth/login', { email, password });
          const { access_token, user } = res.data;
          set({ 
            token: access_token, 
            user, 
            isAuthenticated: true, 
            loading: false 
          });
          return true;
        } catch (err) {
          set({ 
            error: err.response?.data?.detail || 'Login failed', 
            loading: false 
          });
          return false;
        }
      },

      register: async (username, email, password) => {
        set({ loading: true, error: null });
        try {
          const res = await axios.post('http://127.0.0.1:8000/api/auth/register', { username, email, password });
          const { access_token, user } = res.data;
          set({ 
            token: access_token, 
            user, 
            isAuthenticated: true, 
            loading: false 
          });
          return true;
        } catch (err) {
          set({ 
            error: err.response?.data?.detail || 'Registration failed', 
            loading: false 
          });
          return false;
        }
      },

      logout: () => {
        set({ user: null, token: null, isAuthenticated: false, error: null });
      },

      clearError: () => set({ error: null })
    }),
    {
      name: 'autothink-auth',
    }
  )
);

export default useAuthStore;
