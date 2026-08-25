import { create } from "zustand";

export const useAuthStore = create((set) => ({
  user: null,
  profile: null,
  loading: true,

  setAuth: (user, profile) => {
    set({ user, profile, loading: false });
  },
  
  setLoading: (loading) => set({ loading }),
  
  clearAuth: () => 
    set({ user: null, profile: null, loading: false }),

  hasRole: (allowedRoles) => {
    const state = useAuthStore.getState();
    if (!state.profile) return false;
    
    // admin has superuser permissions bypass
    if (state.profile.role === "admin") return true;
    
    return allowedRoles.includes(state.profile.role);
  }
}));
