import { create } from "zustand";
import { persist } from "zustand/middleware";

import { SimulationResults } from "@/types/analytics";

export interface GenResponse {
  pure_key: number[];
  csprng_key: number[];
  hybrid_key: number[];
  shape: [number, number];
  bits_per_cell: number;
  used_mod?: number;
  grid_size?: number;
}

interface KolamState {
  keys: GenResponse | null;
  version: number | null;
  results: SimulationResults | null;
  
  setKeys: (keys: GenResponse | null) => void;
  setVersion: (version: number | null) => void;
  setResults: (results: SimulationResults | null) => void;
  clearResults: () => void;
  clearAll: () => void;
}

const useKolamStore = create(
  persist<KolamState>(
    (set) => ({
      keys: null,
      version: null,
      results: null,
      
      setKeys: (keys) => set({ keys }),
      setVersion: (version) => set({ version }),
      setResults: (results) => set({ results }),
      clearResults: () => set({ results: null }),
      clearAll: () => set({ keys: null, version: null, results: null }),
    }),
    {
      name: "kolam-fhss-store", // localStorage key
      version: 2, // Bump version for migration
    }
  )
);

export default useKolamStore;
