import { create } from "zustand";

export interface ProjectElement {
  id: string;
  type: "chassis" | "wheel" | "axle";
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ProjectState {
  elements: ProjectElement[];
  selectedId: string | null;
  addElement: (type: "chassis" | "wheel" | "axle", x: number, y: number) => void;
  updateElement: (id: string, updates: Partial<ProjectElement>) => void;
  deleteElement: (id: string) => void;
  selectElement: (id: string | null) => void;
  clearElements: () => void;
}

let nextId = 1;

export const useProjectStore = create<ProjectState>((set) => ({
  elements: [],
  selectedId: null,
  
  addElement: (type, x, y) => {
    const id = `${type}_${nextId++}`;
    const newElement: ProjectElement = {
      id,
      type,
      name: type.charAt(0).toUpperCase() + type.slice(1),
      x,
      y,
      width: type === "chassis" ? 180 : type === "wheel" ? 50 : 100,
      height: type === "chassis" ? 80 : type === "wheel" ? 50 : 12,
    };
    
    set((state) => ({
      elements: [...state.elements, newElement],
      selectedId: id,
    }));
  },
  
  updateElement: (id, updates) => {
    set((state) => ({
      elements: state.elements.map((el) => 
        el.id === id ? { ...el, ...updates } : el
      ),
    }));
  },
  
  deleteElement: (id) => {
    set((state) => ({
      elements: state.elements.filter((el) => el.id !== id),
      selectedId: state.selectedId === id ? null : state.selectedId,
    }));
  },
  
  selectElement: (id) => {
    set({ selectedId: id });
  },
  
  clearElements: () => {
    set({ elements: [], selectedId: null });
  },
}));
