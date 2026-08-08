import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useSceneStore } from '../store/scene-store.js';

/**
 * MAP PICKER — Enterprise Location Selection Modal.
 * Integrates MapLibre GL with Nominatim OpenStreetMap geocoding.
 * 
 * @param {{ open: boolean, onClose: () => void, onConfirm: (coords: { lat: number, lng: number, name?: string }) => void }} props
 */
export default function MapPicker({ open, onClose, onConfirm }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const origin = useSceneStore((s) => s.origin);
  const originName = useSceneStore((s) => s.originName);

  const [localCoords, setLocalCoords] = useState(origin);
  const [localName, setLocalName] = useState(originName || origin.name || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);

  useEffect(() => {
    if (!open || !containerRef.current) return;

    setLocalCoords(origin);
    setLocalName(originName || origin.name || '');
    setSearchResults([]);
    setSearchQuery('');

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
      center: [origin.lng, origin.lat],
      zoom: 15,
    });

    mapRef.current = map;

    map.addControl(new maplibregl.NavigationControl(), 'top-right');

    const marker = new maplibregl.Marker({ color: '#38bdf8', draggable: true })
      .setLngLat([origin.lng, origin.lat])
      .addTo(map);

    markerRef.current = marker;

    const updateCoords = (lngLat) => {
      const next = { lng: lngLat.lng, lat: lngLat.lat };
      setLocalCoords((prev) => ({ ...prev, ...next }));
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
      markerRef.current = null;
    };
  }, [open]);

  async function handleSearch(e) {
    e?.preventDefault();
    const query = searchQuery.trim();
    if (!query || searching) return;

    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`
      );
      const data = await res.json();
      setSearchResults(data || []);
    } catch (err) {
      console.error('Location search failed:', err);
    } finally {
      setSearching(false);
    }
  }

  function handleSelectResult(result) {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);

    if (!isNaN(lat) && !isNaN(lng)) {
      const shortName = result.display_name.split(',')[0].trim();
      const next = { lat, lng, name: shortName };
      setLocalCoords(next);
      setLocalName(shortName);

      if (mapRef.current) {
        mapRef.current.flyTo({ center: [lng, lat], zoom: 16 });
      }
      if (markerRef.current) {
        markerRef.current.setLngLat([lng, lat]);
      }
      setSearchResults([]);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-[#0b0f19] border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-heading font-semibold text-white">Geographic Location Center</h2>
              <p className="text-[11px] text-slate-400">Search a place name or drag the pin to set the 3D scene origin</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg bg-white/5 hover:bg-white/10 p-1.5 text-slate-400 hover:text-white transition"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative z-20 px-6 py-3 border-b border-white/10 bg-slate-900/90">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search location (e.g. 'CSUSB', 'Times Square', 'London Eye')..."
                className="w-full rounded-xl border border-white/10 bg-slate-950 pl-9 pr-3.5 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400/30 transition"
              />
            </div>
            <button
              type="submit"
              disabled={searching || !searchQuery.trim()}
              className="rounded-xl bg-sky-500 hover:bg-sky-400 px-4 py-2 text-xs font-medium text-white transition disabled:opacity-50 flex items-center gap-1.5 shadow-sm shadow-sky-500/20"
            >
              {searching ? 'Searching...' : 'Search Location'}
            </button>
          </form>

          {/* Search Dropdown Results */}
          {searchResults.length > 0 && (
            <div className="absolute left-6 right-6 top-full mt-1.5 max-h-52 overflow-y-auto rounded-xl border border-white/10 bg-[#0f172a] shadow-2xl z-30 divide-y divide-white/[0.06]">
              {searchResults.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectResult(item)}
                  className="w-full text-left px-4 py-2.5 text-xs text-slate-300 hover:bg-sky-500/10 hover:text-white transition flex items-center gap-2 group"
                >
                  <svg className="h-3.5 w-3.5 text-sky-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  </svg>
                  <span className="truncate">{item.display_name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Map View */}
        <div className="relative h-[360px] w-full bg-slate-950">
          <div ref={containerRef} className="w-full h-full" />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-white/10 bg-slate-950/90">
          <div className="flex items-center gap-2">
            {localName && (
              <span className="rounded-md bg-sky-500/10 px-2 py-1 text-xs font-semibold text-sky-400 border border-sky-500/20">
                {localName}
              </span>
            )}
            <span className="font-mono text-[11px] text-slate-400">
              {localCoords.lat.toFixed(5)}°, {localCoords.lng.toFixed(5)}°
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="rounded-xl border border-white/10 bg-slate-900 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              onClick={() => onConfirm({ ...localCoords, name: localName || localCoords.name || '' })}
              className="rounded-xl bg-sky-500 hover:bg-sky-400 px-4 py-2 text-xs font-semibold text-white transition shadow-md shadow-sky-500/20"
            >
              Confirm Selected Location
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}