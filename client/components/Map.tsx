import React, { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import MapView, { Marker, PROVIDER_DEFAULT } from "react-native-maps";

import { useFetch } from "@/lib/fetch";

const placesAPI = process.env.EXPO_PUBLIC_PLACES_API_KEY;
const RADIUS_CONST = 50000;
const LATITUDE_DELTA = 0.04;
const LONGITUDE_DELTA = 0.04;

interface Place {
  place_id: string;
  name: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
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

const Map = ({
  userLatitude,
  userLongitude,
}: {
  userLatitude: number;
  userLongitude: number;
}) => {
  const region = calculateRegion({ userLatitude, userLongitude });

  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?keyword=cruise&location=${userLatitude},${userLongitude}&radius=${RADIUS_CONST}&key=${placesAPI}`;

  const { data, loading, error } = useFetch<any>(url);
  const [places, setPlaces] = useState<Place[]>();

  useEffect(() => {
    if (data) {
      setPlaces(data?.results);
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
      className="w-full h-full rounded-2xl"
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
          onPress={}
        />
      ))}
    </MapView>
  );
};

export default Map;
