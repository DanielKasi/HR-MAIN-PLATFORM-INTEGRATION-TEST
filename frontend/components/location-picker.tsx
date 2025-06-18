"use client";

import type React from "react";

import {useState, useEffect, useRef} from "react";
import {MapPin, Loader2, Search} from "lucide-react";
import dynamic from "next/dynamic";

import {Input} from "@/components/ui/input";
import {Button} from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover";
import {cn} from "@/lib/utils";

// Dynamically import Leaflet components with no SSR to avoid hydration issues
const LeafletMap = dynamic(() => import("./leaflet-map"), {ssr: false});

interface LocationSuggestion {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
}

interface LocationData {
  name: string;
  lat: number;
  lng: number;
}

interface LocationPickerProps {
  value: string;
  onChange: (value: string) => void;
  onLocationSelect?: (location: LocationData) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function LocationPicker({
  value,
  onChange,
  onLocationSelect,
  placeholder = "Enter a location",
  className,
  disabled = false,
}: LocationPickerProps) {
  const [open, setOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null);
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Fetch location suggestions using OpenStreetMap Nominatim API
  const fetchSuggestions = async (query: string) => {
    if (!query || query.length < 2) {
      setSuggestions([]);

      return;
    }

    setIsLoading(true);
    try {
      // Using OpenStreetMap Nominatim API for geocoding
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`,
        {
          headers: {
            "Accept-Language": "en",
          },
        },
      );

      if (!response.ok) throw new Error("Failed to fetch location suggestions");

      const data = await response.json();

      const formattedSuggestions: LocationSuggestion[] = data.map((item: any, index: number) => ({
        id: index.toString(),
        name: item.display_name.split(",")[0],
        address: item.display_name,
        lat: Number.parseFloat(item.lat),
        lng: Number.parseFloat(item.lon),
      }));

      setSuggestions(formattedSuggestions);
    } catch (error) {
      console.error("Error fetching location suggestions:", error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;

    setInputValue(newValue);

    // Debounce API calls
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    debounceTimeout.current = setTimeout(() => {
      fetchSuggestions(newValue);
    }, 300);
  };

  const handleSelectLocation = (location: LocationSuggestion) => {
    setInputValue(location.name);
    onChange(location.name);
    setOpen(false);

    const locationData = {
      name: location.name,
      lat: location.lat,
      lng: location.lng,
    };

    setSelectedLocation(locationData);

    if (onLocationSelect) {
      onLocationSelect(locationData);
    }
  };

  const handleMapLocationSelect = (lat: number, lng: number) => {
    // Reverse geocode to get location name
    reverseGeocode(lat, lng);
  };

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
        {
          headers: {
            "Accept-Language": "en",
          },
        },
      );

      if (!response.ok) throw new Error("Failed to reverse geocode");

      const data = await response.json();
      const locationName = data.display_name.split(",")[0] || "Selected Location";

      setInputValue(locationName);
      onChange(locationName);

      const locationData = {
        name: locationName,
        lat,
        lng,
      };

      setSelectedLocation(locationData);

      if (onLocationSelect) {
        onLocationSelect(locationData);
      }

      setMapOpen(false);
    } catch (error) {
      console.error("Error reverse geocoding:", error);

      // Fallback to generic name if reverse geocoding fails
      const locationName = "Selected Location";

      setInputValue(locationName);
      onChange(locationName);

      const locationData = {
        name: locationName,
        lat,
        lng,
      };

      setSelectedLocation(locationData);

      if (onLocationSelect) {
        onLocationSelect(locationData);
      }
    }
  };

  const detectCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");

      return;
    }

    setIsDetectingLocation(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const {latitude, longitude} = position.coords;

          await reverseGeocode(latitude, longitude);
        } catch (error) {
          console.error("Error getting location:", error);
          alert("Could not determine your location");
        } finally {
          setIsDetectingLocation(false);
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
        alert(`Error getting your location: ${error.message}`);
        setIsDetectingLocation(false);
      },
      {enableHighAccuracy: true, timeout: 5000, maximumAge: 0},
    );
  };

  return (
    <div className={cn("relative flex w-full gap-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-8"
              disabled={disabled || isDetectingLocation}
              placeholder={placeholder}
              value={inputValue}
              onChange={handleInputChange}
              onClick={() => setOpen(true)}
            />
          </div>
        </PopoverTrigger>
        <PopoverContent align="start" className="p-0 w-[300px]" sideOffset={5}>
          <Command>
            <CommandInput
              placeholder="Search for a location..."
              value={inputValue}
              onValueChange={(value) => {
                setInputValue(value);
                fetchSuggestions(value);
              }}
            />
            <CommandList>
              {isLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  <CommandEmpty>No locations found</CommandEmpty>
                  <CommandGroup>
                    {suggestions.map((suggestion) => (
                      <CommandItem
                        key={suggestion.id}
                        value={suggestion.name}
                        onSelect={() => handleSelectLocation(suggestion)}
                      >
                        <MapPin className="mr-2 h-4 w-4" />
                        <div className="flex flex-col">
                          <span>{suggestion.name}</span>
                          <span className="text-xs text-muted-foreground truncate">
                            {suggestion.address}
                          </span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <Popover open={mapOpen} onOpenChange={setMapOpen}>
        <PopoverTrigger asChild>
          <Button
            disabled={disabled || isDetectingLocation}
            size="icon"
            title="Select on map"
            type="button"
            variant="outline"
          >
            <MapPin className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-[350px] p-0">
          <div className="p-2">
            <LeafletMap
              center={selectedLocation ? [selectedLocation.lat, selectedLocation.lng] : undefined}
              height={250}
              marker={selectedLocation ? [selectedLocation.lat, selectedLocation.lng] : undefined}
              onLocationSelect={handleMapLocationSelect}
            />
          </div>
        </PopoverContent>
      </Popover>

      <Button
        disabled={disabled || isDetectingLocation}
        size="icon"
        title="Use current location"
        type="button"
        variant="outline"
        onClick={detectCurrentLocation}
      >
        {isDetectingLocation ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <MapPin className="h-4 w-4 text-blue-500" />
        )}
      </Button>
    </div>
  );
}
