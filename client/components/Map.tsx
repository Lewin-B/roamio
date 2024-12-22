import React, { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import MapView, { Marker, PROVIDER_DEFAULT } from "react-native-maps";

import { useFetch } from "@/lib/fetch";

const placesAPI = process.env.EXPO_PUBLIC_PLACES_API_KEY;
const RADIUS_CONST = 50000;
const LATITUDE_DELTA = 0.04;
const LONGITUDE_DELTA = 0.04;

export interface Place {
  business_status: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
    viewport: {
      northeast: object; // Replace `object` with a more specific type if needed
      southwest: object; // Replace `object` with a more specific type if needed
    };
  };
  icon: string;
  icon_background_color: string;
  icon_mask_base_uri: string;
  name: string;
  photos?: Photo[]; // Optional because it may not always exist
  place_id: string;
  plus_code?: {
    compound_code: string;
    global_code: string;
  };
  rating?: number; // Optional because it may not always exist
  reference: string;
  scope: string;
  types: string[];
  user_ratings_total?: number; // Optional because it may not always exist
  vicinity: string;
  photoUrl?: string;
}

interface Photo {
  height: number;
  html_attributions: string[]; // Array of attribution strings
  photo_reference: string;
  width: number;
}

export const calculateRegion = ({
  userLatitude,
  userLongitude,
}: {
  userLatitude: number;
  userLongitude: number;
}) => {
  return {
    latitude: userLatitude,
    longitude: userLongitude,
    latitudeDelta: LONGITUDE_DELTA,
    longitudeDelta: LATITUDE_DELTA,
  };
};

export const fetchPhotoUrl = (photoReference: string): string => {
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photoReference}&key=${placesAPI}`;
};

export const updatePlace = (place: Place) => {
  console.log("Places: ", place);
  const photoReference = place.photos?.[0]?.photo_reference;
  return {
    ...place,
    photoUrl: photoReference ? fetchPhotoUrl(photoReference) : undefined,
  };
};

const Map = ({
  userLatitude,
  userLongitude,
  markerPress,
}: {
  userLatitude: number;
  userLongitude: number;
  markerPress: (place: Place | null) => void;
}) => {
  const region = calculateRegion({ userLatitude, userLongitude });

  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?keyword=cruise&location=${userLatitude},${userLongitude}&radius=${RADIUS_CONST}&key=${placesAPI}`;

  const { data, loading, error } = useFetch<any>(url);
  const [places, setPlaces] = useState<Place[]>();

  useEffect(() => {
    if (data) {
      const updatedPlaces = data.results.map((place: Place) =>
        updatePlace(place)
      );
      setPlaces(updatedPlaces);
    }
    if (error) {
      console.error("Error fetching places: ", error);
    }
  }, [data, error]);

  if (loading || (!userLatitude && !userLongitude))
    return (
      <View className="flex justify-between items-center w-full">
        <ActivityIndicator size="small" color="#000" />
      </View>
    );

  if (error)
    return (
      <View className="flex justify-between items-center w-full">
        <Text>Error: {error}</Text>
      </View>
    );

  return (
    <MapView
      provider={PROVIDER_DEFAULT}
      className="w-full h-[400px] rounded-2xl pb-10"
      tintColor="black"
      mapType="mutedStandard"
      showsPointsOfInterest={false}
      initialRegion={region}
      showsUserLocation={true}
      userInterfaceStyle="light"
    >
      {places?.map((place, index) => (
        <Marker
          key={place.place_id}
          coordinate={{
            latitude: place.geometry.location.lat,
            longitude: place.geometry.location.lng,
          }}
          tappable={true}
          title={place.name}
          onPress={() => {
            markerPress(place);
          }}
        />
      ))}
    </MapView>
  );
};

export default Map;
