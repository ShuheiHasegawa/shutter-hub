import { create } from 'zustand';

interface BottomNavigationState {
  isVisible: boolean;
  setIsVisible: (visible: boolean) => void;
}

export const useBottomNavigationStore = create<BottomNavigationState>(set => ({
  isVisible: true,
  setIsVisible: visible => set({ isVisible: visible }),
}));
