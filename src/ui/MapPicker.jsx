import {useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useSceneStore } from '../store/scene-store.js';

export default function MapPicker(){
    const containerRef = useRef(null);
    const mapRef = useRef(null);
    const origin = useSceneStore((s) => s.origin);
    const setOrigin = useSceneStore((s) => s.setOrigin);

    useEffect(()=>{
        const map = new maplibregl.Map({
            container: containerRef.current,
            style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
            center: [origin.lng, origin.lat],
            zoom: 15,
        });

        mapRef.current = map;

        const marker = new maplibregl.Marker({ color: '#6366f1' })
            .setLngLat([origin.lng, origin.lat])
            .addTo(map);

            map.on('click', (e) => {
                marker.setLngLat(e.lngLat);
                setOrigin({ lng: e.lngLat.lng, lat: e.lngLat.lat });
                });

                return () => map.remove();
    }, []);

    return <div ref={containerRef} style={{ width: '100%', height: 240, borderRadius: 8 }} />;

}