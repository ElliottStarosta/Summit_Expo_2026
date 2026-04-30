import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const VENUE_LAT = 45.3232;
const VENUE_LNG = -75.8947;

export default function SpaceMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      center: [VENUE_LAT, VENUE_LNG],
      zoom: 15,
      preferCanvas: true,
      zoomControl: false,
      attributionControl: false,
      inertia: false,
    });

    mapInstanceRef.current = map;

    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      {
        maxZoom: 18,
        updateWhenIdle: true,
        updateWhenZooming: false,
        keepBuffer: 2,
      },
    ).addTo(map);

    const icon = L.divIcon({
      html: `<div class="pi-marker">
        <div class="pi-marker__pulse"></div>
        <div class="pi-marker__pulse pi-marker__pulse--2"></div>
        <div class="pi-marker__core"><i class="fa-solid fa-rocket"></i></div>
      </div>`,
      className: "",
      iconSize: [48, 48],
      iconAnchor: [24, 24],
    });

    L.marker([VENUE_LAT, VENUE_LNG], { icon })
      .addTo(map)
      .bindPopup(
        `<div class="pi-popup">
          <p class="pi-popup__title">Earl of March S.S.</p>
          <p class="pi-popup__sub">Summit EXPO 2026</p>
        </div>`,
        { className: "pi-leaflet-popup" },
      );

    L.control.zoom({ position: "bottomright" }).addTo(map);
    L.control.attribution({ position: "bottomleft", prefix: false }).addTo(map);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  return (
    <div className="pi-map-frame">
      <div className="pi-map-hud">
        <span className="pi-map-hud__left">
          <i className="fa-solid fa-satellite pi-map-hud__icon" />
          LIVE MAP · KANATA ON
        </span>
        <span className="pi-map-hud__right">
          <i className="fa-solid fa-crosshairs" />
          {Math.abs(VENUE_LAT).toFixed(4)}°{VENUE_LAT >= 0 ? "N" : "S"} ·{" "}
          {Math.abs(VENUE_LNG).toFixed(4)}°{VENUE_LNG >= 0 ? "E" : "W"}
        </span>
      </div>
      <span className="pi-map-corner pi-map-corner--tl" />
      <span className="pi-map-corner pi-map-corner--tr" />
      <span className="pi-map-corner pi-map-corner--bl" />
      <span className="pi-map-corner pi-map-corner--br" />
      <div ref={mapRef} className="pi-map" />
    </div>
  );
}
