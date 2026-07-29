import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useSceneStore } from '../store/scene-store.js';

/**
 * MAP PICKER — Modal map to select the 3D scene origin.
 * @param {{ open: boolean, onClose: () => void }} props
 */
export default function MapPicker({ open, onClose, onConfirm }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const origin = useSceneStore((s) => s.origin);
  const setOrigin = useSceneStore((s) => s.setOrigin);

  const [localCoords, setLocalCoords] = useState(origin);

  useEffect(() => {
    if (!open || !containerRef.current) return;

    setLocalCoords(origin);

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
      center: [origin.lng, origin.lat],
      zoom: 15,
    });

    mapRef.current = map;

    map.addControl(new maplibregl.NavigationControl(), 'top-right');

    const marker = new maplibregl.Marker({ color: '#6366f1', draggable: true })
      .setLngLat([origin.lng, origin.lat])
      .addTo(map);

    const updateCoords = (lngLat) => {
      const next = { lng: lngLat.lng, lat: lngLat.lat };
      setLocalCoords(next);
    //   setOrigin(next);
    };

    marker.on('dragend', () => {
      const lngLat = marker.getLngLat();
      updateCoords(lngLat);
    });

    map.on('click', (e) => {
      marker.setLngLat(e.lngLat);
      updateCoords(e.lngLat);
    });

    const timer = setTimeout(() => {
      map.resize();
    }, 100);

    return () => {
      clearTimeout(timer);
      map.remove();
      mapRef.current = null;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div>
            <h2 className="text-base font-semibold text-white">Select Location</h2>
            <p className="text-xs text-slate-400">Click or drag the pin to set the 3D scene center</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs text-slate-300 transition"
          >
            ✕
          </button>
        </div>

        {/* Map View */}
        <div className="relative h-[360px] w-full bg-slate-950">
          <div ref={containerRef} className="w-full h-full" />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-800 bg-slate-900/90">
          <div className="font-mono text-xs text-slate-300">
            Lat: {localCoords.lat.toFixed(5)} | Lng: {localCoords.lng.toFixed(5)}
          </div>
          <button
            onClick={() => onConfirm(localCoords)}
            className="rounded-lg bg-accent hover:bg-accent-hover px-4 py-2 text-xs font-medium text-white transition"
          >
            Confirm Location
          </button>
        </div>
      </div>
    </div>
  );
}