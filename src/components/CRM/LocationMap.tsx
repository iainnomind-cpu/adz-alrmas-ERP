import { useState, useEffect, useCallback, useRef } from 'react';
import { GoogleMap, useJsApiLoader, MarkerF } from '@react-google-maps/api';
import { Loader2, MapPin } from 'lucide-react';

interface LocationMapProps {
    address: string;
    latitude: number | null;
    longitude: number | null;
    onLocationChange: (lat: number, lng: number) => void;
    apiKey: string;
    readOnly?: boolean;
}

const containerStyle = {
    width: '100%',
    height: '400px'
};

const defaultCenter = {
    lat: 19.4326, // Mexico City
    lng: -99.1332
};

const libraries: ("places" | "drawing" | "geometry" | "visualization")[] = ['places'];

export function LocationMap({ address, latitude, longitude, onLocationChange, apiKey, readOnly = false }: LocationMapProps) {
    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: apiKey,
        libraries: libraries // Use static reference
    });

    const [map, setMap] = useState<google.maps.Map | null>(null);
    const [markerPosition, setMarkerPosition] = useState<google.maps.LatLngLiteral>(defaultCenter);
    const [geocodeError, setGeocodeError] = useState<string | null>(null);
    const geocoder = useRef<google.maps.Geocoder | null>(null);

    // Initialize marker position from props
    useEffect(() => {
        if (latitude && longitude) {
            setMarkerPosition({ lat: latitude, lng: longitude });
        }
    }, [latitude, longitude]);

    // Initialize geocoder once API is loaded
    useEffect(() => {
        if (isLoaded && !geocoder.current) {
            geocoder.current = new google.maps.Geocoder();
        }
    }, [isLoaded]);

    // Geocode address when it changes and no manual coordinates are set (or minimal changes)
    useEffect(() => {
        if (isLoaded && address && geocoder.current) {
            // Only geocode if we don't have specific coordinates OR if we want to auto-update
            // For now, let's auto-update if the address changes significantly, 
            // but we might want to be careful not to overwrite manual marker drags if the address is just being typed.
            // A common pattern is to only geocode if the user explicitly asks, or debounce it heavily.
            // Here we will debounce it.

            const timer = setTimeout(() => {
                setGeocodeError(null); // Clear previous errors
                geocoder.current?.geocode({ address: address }, (results, status) => {
                    if (status === 'OK' && results && results[0]) {
                        const location = results[0].geometry.location;
                        const newLat = location.lat();
                        const newLng = location.lng();

                        setMarkerPosition({ lat: newLat, lng: newLng });
                        if (!readOnly) {
                            onLocationChange(newLat, newLng);
                        }

                        if (map) {
                            map.panTo(location);
                            map.setZoom(17);
                        }
                    } else {
                        console.warn('Geocode failed:', status);
                        if (status === 'REQUEST_DENIED') {
                            setGeocodeError('API de Geocodificación no habilitada o clave inválida.');
                        } else if (status === 'ZERO_RESULTS') {
                            setGeocodeError('No se encontró la dirección.');
                        } else {
                            setGeocodeError(`Error al buscar dirección: ${status}`);
                        }
                    }
                });
            }, 1000); // Reduced delay to 1s

            return () => clearTimeout(timer);
        }
    }, [address, isLoaded, map, onLocationChange, readOnly]);

    const onLoad = useCallback((map: google.maps.Map) => {
        setMap(map);
    }, []);

    const onUnmount = useCallback(() => {
        setMap(null);
    }, []);

    const onMarkerDragEnd = useCallback((e: google.maps.MapMouseEvent) => {
        if (!readOnly && e.latLng) {
            const newLat = e.latLng.lat();
            const newLng = e.latLng.lng();
            setMarkerPosition({ lat: newLat, lng: newLng });
            onLocationChange(newLat, newLng);
        }
    }, [onLocationChange, readOnly]);

    if (!isLoaded) {
        return (
            <div className="w-full h-[400px] bg-gray-100 rounded-lg flex items-center justify-center">
                <div className="flex flex-col items-center gap-2 text-gray-500">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    <span>Cargando mapa...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            <div className="w-full rounded-lg overflow-hidden border border-gray-300 shadow-sm relative">
                <GoogleMap
                    mapContainerStyle={containerStyle}
                    center={markerPosition}
                    zoom={15}
                    onLoad={onLoad}
                    onUnmount={onUnmount}
                    options={{
                        streetViewControl: false,
                        mapTypeControl: false,
                        fullscreenControl: true,
                        draggable: true,
                        zoomControl: true,
                        gestureHandling: 'greedy'
                    }}
                >
                    <MarkerF
                        position={markerPosition}
                        draggable={!readOnly}
                        onDragEnd={onMarkerDragEnd}
                        animation={google.maps.Animation.DROP}
                    />
                </GoogleMap>

                {geocodeError && !readOnly && (
                    <div className="absolute bottom-8 left-2 right-2 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative z-10">
                        <strong className="font-bold">Error de Geocodificación: </strong>
                        <span className="block sm:inline">{geocodeError}</span>
                    </div>
                )}
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
                <MapPin className="w-3 h-3" />
                <span>
                    Lat: {markerPosition.lat.toFixed(6)}, Lng: {markerPosition.lng.toFixed(6)}
                </span>
            </div>
        </div>
    );
}


