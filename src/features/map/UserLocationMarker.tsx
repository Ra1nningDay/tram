import { MapMarker, MarkerContent } from "@/components/ui/map";
import type { UserLocation } from "@/hooks/useUserLocation";
import "./user-location.css";

type UserLocationMarkerProps = {
  location: UserLocation;
};

export function UserLocationMarker({ location }: UserLocationMarkerProps) {
  return (
    <MapMarker
      longitude={location.longitude}
      latitude={location.latitude}
    >
      <MarkerContent>
        <div className="user-location-marker">
          <div className="user-location-ring" />
          <div className="user-location-center" />
        </div>
      </MarkerContent>
    </MapMarker>
  );
}
