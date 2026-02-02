import { useMemo, useState } from "react";
import { MapView } from "../features/map/MapView";
import { useRoute, useStops, useVehicles, useStopEtas } from "../features/shuttle/hooks";
import { useVehicleAnimation } from "../hooks/useVehicleAnimation";
import { StopPopup } from "../components/StopPopup";
import { VehiclePopup } from "../components/VehiclePopup";
import { StatusBanner } from "../components/StatusBanner";
import { Header } from "../components/Header";
import { MapLegend } from "../components/MapLegend";
import type { Stop, Vehicle } from "../features/shuttle/api";

export function MapPage() {
  const { data: routeData } = useRoute();
  const { data: stopsData } = useStops();
  // Use animated vehicles instead of static mock data
  const animatedVehicles = useVehicleAnimation(true);

  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);

  const { data: etasData } = useStopEtas(selectedStopId ?? undefined);

  const selectedStop: Stop | undefined = useMemo(() => {
    return stopsData?.stops.find((stop) => stop.id === selectedStopId);
  }, [stopsData, selectedStopId]);

  const selectedVehicle: Vehicle | undefined = useMemo(() => {
    return animatedVehicles.find((vehicle) => vehicle.id === selectedVehicleId);
  }, [animatedVehicles, selectedVehicleId]);

  const showStale = animatedVehicles.some((v) => v.status === "delayed" || v.status === "offline");

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      {/* Map */}
      <div className="h-full w-full">
        <MapView
          route={routeData?.route}
          stops={stopsData?.stops}
          vehicles={animatedVehicles}
          onSelectStop={(id) => {
            setSelectedStopId(id);
            setSelectedVehicleId(null);
          }}
          onSelectVehicle={(id) => {
            setSelectedVehicleId(id);
            setSelectedStopId(null);
          }}
        />
      </div>

      {/* Header - Top Left */}
      <Header />

      {/* Status Banner - Top Center */}
      {showStale ? <StatusBanner message="stale" /> : null}

      {/* Legend - Bottom Left */}
      <MapLegend />

      {/* Vehicle Popup - Bottom Sheet on Mobile, Floating on Desktop */}
      {selectedVehicle ? (
        <div className="fixed bottom-0 left-0 right-0 z-50 md:absolute md:bottom-8 md:left-1/2 md:-translate-x-1/2 md:w-auto md:right-auto pointer-events-none">
          <div className="pointer-events-auto">
            <VehiclePopup vehicle={selectedVehicle} />
          </div>
        </div>
      ) : null}

      {/* Stop Popup - Bottom Sheet on Mobile, Floating on Desktop */}
      {selectedStop && etasData ? (
        <div className="fixed bottom-0 left-0 right-0 z-50 md:absolute md:bottom-8 md:left-1/2 md:-translate-x-1/2 md:w-auto md:right-auto pointer-events-none">
          <div className="pointer-events-auto">
            <StopPopup stop={selectedStop} etas={etasData.etas} />
          </div>
        </div>
      ) : null}
    </div>
  );
}