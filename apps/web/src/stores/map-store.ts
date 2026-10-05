import { create } from 'zustand';
import {
  MAP_LAYER_IDS,
  STRESS_LAYER_KEYS,
  type MapLayerId,
  type StressLayerKey,
} from '@platform/shared-types';
import { MAP_DEFAULTS } from '@/lib/map/config';
import type { MapCell } from '@/lib/map/cells';

// Client/UI state for the map: viewport, current bounds (drives bbox-bounded queries),
// and layer visibility. Server data lives in TanStack Query, never here.

export interface Viewport {
  longitude: number;
  latitude: number;
  zoom: number;
}

export interface Bounds {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
}

interface MapState {
  viewport: Viewport;
  bounds: Bounds | null;
  visibleLayers: Record<MapLayerId, boolean>;
  activeStressLayer: StressLayerKey;
  selectedCell: MapCell | null;
  explainerOpen: boolean;
  /** Sticky: set when a cell request fails, cleared only when one succeeds. */
  liveUnavailable: boolean;
  setViewport: (viewport: Viewport) => void;
  setBounds: (bounds: Bounds) => void;
  toggleLayer: (id: MapLayerId) => void;
  setActiveStressLayer: (layer: StressLayerKey) => void;
  setSelectedCell: (cell: MapCell | null) => void;
  toggleExplainer: () => void;
  setExplainerOpen: (open: boolean) => void;
  setLiveUnavailable: (unavailable: boolean) => void;
}

export const useMapStore = create<MapState>((set) => ({
  viewport: {
    longitude: MAP_DEFAULTS.longitude,
    latitude: MAP_DEFAULTS.latitude,
    zoom: MAP_DEFAULTS.zoom,
  },
  bounds: null,
  selectedCell: null,
  explainerOpen: false,
  liveUnavailable: false,
  visibleLayers: {
    [MAP_LAYER_IDS.base]: true,
    [MAP_LAYER_IDS.heatmap]: false,
    [MAP_LAYER_IDS.hexagon]: true, // ESI H3 heatmap on by default
    [MAP_LAYER_IDS.hotspots]: false,
  },
  activeStressLayer: STRESS_LAYER_KEYS.esi,
  setViewport: (viewport) => set({ viewport }),
  setBounds: (bounds) => set({ bounds }),
  toggleLayer: (id) =>
    set((state) => ({
      visibleLayers: { ...state.visibleLayers, [id]: !state.visibleLayers[id] },
    })),
  setActiveStressLayer: (activeStressLayer) => set({ activeStressLayer }),
  setSelectedCell: (cell) => set({ selectedCell: cell }),
  toggleExplainer: () => set((state) => ({ explainerOpen: !state.explainerOpen })),
  setExplainerOpen: (open) => set({ explainerOpen: open }),
  setLiveUnavailable: (liveUnavailable) => set({ liveUnavailable }),
}));
