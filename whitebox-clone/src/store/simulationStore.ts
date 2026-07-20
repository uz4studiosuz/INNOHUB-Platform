import { create } from "zustand";

interface SimulationState {
  isRunning: boolean;
  speed: number;
  startSimulation: () => void;
  stopSimulation: () => void;
  setSpeed: (speed: number) => void;
}

export const useSimulationStore = create<SimulationState>((set) => ({
  isRunning: false,
  speed: 1.0,
  startSimulation: () => set({ isRunning: true }),
  stopSimulation: () => set({ isRunning: false }),
  setSpeed: (speed) => set({ speed }),
}));
