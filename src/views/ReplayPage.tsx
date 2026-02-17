import { useEffect, useRef } from "react";
import { MapView } from "../features/map/MapView";
import { useRoute, useStops } from "../features/shuttle/hooks";
import { useGpsReplay } from "../hooks/useGpsReplay";
import { trailLayer, trailsToGeoJson } from "../features/map/trail-layer";
import { Header } from "../components/Header";
import type maplibregl from "maplibre-gl";

/**
 * ReplayPage: plays back GPS data from CSV files on the map.
 * Access via #replay hash route.
 */
export function ReplayPage() {
    const { data: routeData } = useRoute();
    const { data: stopsData } = useStops();
    const { vehicles, trails, loading } = useGpsReplay();
    const mapRef = useRef<maplibregl.Map | null>(null);
    const trailInitialized = useRef(false);

    // Update the trail data on every frame
    useEffect(() => {
        const map = mapRef.current;
        if (!map || trails.length === 0) return;

        // Add trail source+layer if not yet present
        if (!trailInitialized.current && map.isStyleLoaded()) {
            if (!map.getSource("gps-trail")) {
                map.addSource("gps-trail", {
                    type: "geojson",
                    data: trailsToGeoJson(trails),
                });
                // Add below vehicles layer so trails don't cover vehicle icons
                map.addLayer(trailLayer, "vehicles");
            }
            trailInitialized.current = true;
        }

        // Update trail data
        const source = map.getSource("gps-trail") as maplibregl.GeoJSONSource | undefined;
        if (source) {
            source.setData(trailsToGeoJson(trails));
        }
    }, [trails]);

    return (
        <div className="relative h-screen w-screen overflow-hidden">
            <div className="h-full w-full">
                <MapView
                    route={routeData?.route}
                    stops={stopsData?.stops}
                    vehicles={vehicles}
                    onSelectStop={() => { }}
                    onSelectVehicle={() => { }}
                    onMapReady={(map) => { mapRef.current = map; }}
                />
            </div>

            <Header />

            {/* Loading indicator */}
            {loading && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
                    <div className="rounded-2xl bg-white/90 px-8 py-6 shadow-xl">
                        <div className="flex items-center gap-3">
                            <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                            <span className="text-sm font-medium text-gray-700">กำลังโหลดข้อมูล GPS...</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Legend */}
            {!loading && (
                <div className="absolute bottom-6 right-4 z-10 rounded-xl bg-white/90 px-4 py-3 shadow-lg backdrop-blur-sm border border-gray-100">
                    <div className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">GPS Replay</div>
                    <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2">
                            <div className="h-2.5 w-6 rounded-full" style={{ backgroundColor: "#3b82f6" }} />
                            <span className="text-xs text-gray-600">Tram 1</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="h-2.5 w-6 rounded-full" style={{ backgroundColor: "#f59e0b" }} />
                            <span className="text-xs text-gray-600">Tram 2</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="h-2.5 w-6 rounded-full" style={{ backgroundColor: "#10b981" }} />
                            <span className="text-xs text-gray-600">Tram 3</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
