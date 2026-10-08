import { useEffect, useRef } from 'react';
import { Circle, CircleMarker, MapContainer, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { AdminLiveLocation, Coords, DangerZone, ZoneReport } from '../types';
import { MAP_CONFIG, USER_COLOR, ZONE_TYPE_COLORS } from '../utils/mapConfig';

function Recenter({ coords }: { coords: Coords }) {
  const map = useMap();
  useEffect(() => { map.flyTo([coords.latitude, coords.longitude], map.getZoom(), { duration: 0.8 }); }, [coords.latitude, coords.longitude, map]);
  return null;
}

function MapClickPicker({ onChooseLocation }: { onChooseLocation: (coords: Coords) => void }) {
  useMapEvents({ click(event) { onChooseLocation({ latitude: event.latlng.lat, longitude: event.latlng.lng }); } });
  return null;
}

function FitAdminMarkers({ zones, pendingReports, people }: { zones: DangerZone[]; pendingReports: ZoneReport[]; people: AdminLiveLocation[] }) {
  const map = useMap();
  const fitted = useRef(false);
  useEffect(() => {
    if (fitted.current) return;
    const timer = window.setTimeout(() => {
      const points: [number, number][] = [
        ...zones.map((item) => [item.latitude, item.longitude] as [number, number]),
        ...pendingReports.map((item) => [item.latitude, item.longitude] as [number, number]),
        ...people.map((item) => [item.latitude, item.longitude] as [number, number]),
      ];
      if (!points.length) return;
      if (points.length === 1) map.setView(points[0], 13);
      else map.fitBounds(points, { padding: [28, 28], maxZoom: 13 });
      fitted.current = true;
    }, 350);
    return () => window.clearTimeout(timer);
  }, [map, zones, pendingReports, people]);
  return null;
}

export default function SafetyMap({
  coords,
  zones,
  fallbackCenter,
  draftLocation,
  onChooseLocation,
  pendingReports = [],
  people = [],
  fitMarkers = false,
}: {
  coords: Coords | null;
  zones: DangerZone[];
  fallbackCenter: Coords;
  draftLocation?: Coords | null;
  onChooseLocation?: (coords: Coords) => void;
  pendingReports?: ZoneReport[];
  people?: AdminLiveLocation[];
  fitMarkers?: boolean;
}) {
  const center = coords ?? fallbackCenter;
  return (
    <MapContainer center={[center.latitude, center.longitude]} zoom={MAP_CONFIG.defaultZoom} className="size-full" aria-label="Safety map">
      <TileLayer url={MAP_CONFIG.tileUrl} attribution={MAP_CONFIG.attribution} />
      {onChooseLocation && <MapClickPicker onChooseLocation={onChooseLocation} />}
      {fitMarkers && <FitAdminMarkers zones={zones} pendingReports={pendingReports} people={people} />}
      {zones.map((zone) => {
        const color = ZONE_TYPE_COLORS[zone.zoneType];
        const label = zone.zoneType === 'SAFE' ? 'User-marked safe place; not verified'
          : zone.source === 'admin_approved' ? 'Admin-approved danger area' : zone.source === 'admin_manual' ? 'Administrator-managed danger area' : 'Danger area';
        return <Circle key={zone.id} center={[zone.latitude, zone.longitude]} radius={zone.radius} pathOptions={{ color, fillColor: color, fillOpacity: 0.2, weight: 2 }}>
          <Tooltip sticky>{zone.name} - {label}</Tooltip>
        </Circle>;
      })}
      {pendingReports.filter((report) => report.status === 'PENDING').map((report) => <CircleMarker key={'pending-' + report.id} center={[report.latitude, report.longitude]} radius={8} pathOptions={{ color: '#fff', weight: 2, fillColor: '#d88924', fillOpacity: 1 }}>
        <Tooltip>{report.name} - Waiting for administrator review</Tooltip>
      </CircleMarker>)}
      {people.map((person) => <CircleMarker key={'person-' + person.userId} center={[person.latitude, person.longitude]} radius={8} pathOptions={{ color: '#fff', weight: 2, fillColor: '#2879b8', fillOpacity: 1 }}>
        <Tooltip>{person.name} - sharing location · updated {new Date(person.updatedAt.replace(' ', 'T') + (person.updatedAt.endsWith('Z') ? '' : 'Z')).toLocaleTimeString()}</Tooltip>
      </CircleMarker>)}
      {draftLocation && <CircleMarker center={[draftLocation.latitude, draftLocation.longitude]} radius={8} pathOptions={{ color: '#fff', weight: 3, fillColor: '#d88924', fillOpacity: 1 }}>
        <Tooltip>Selected place location</Tooltip>
      </CircleMarker>}
      {coords && <CircleMarker center={[coords.latitude, coords.longitude]} radius={9} pathOptions={{ color: '#fff', weight: 3, fillColor: USER_COLOR, fillOpacity: 1 }}>
        <Tooltip>You are here</Tooltip>
      </CircleMarker>}
      {coords && <Recenter coords={coords} />}
    </MapContainer>
  );
}
