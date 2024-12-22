import { useUser } from "@clerk/clerk-expo";
import { useAuth } from "@clerk/clerk-expo";
import * as Location from "expo-location";
import { router } from "expo-router";
import { useState, useEffect } from "react";
import { Text, View, TouchableOpacity, Image, ScrollView } from "react-native";
import ReactNativeModal from "react-native-modal";
import { SafeAreaView } from "react-native-safe-area-context";

import type { Place } from "@/components/Map";

import CustomButton from "@/components/CustomButton";
import GoogleTextInput from "@/components/GoogleTextInput";
import Map from "@/components/Map";
import { icons } from "@/constants";
import { useFetch } from "@/lib/fetch";

const Home = () => {
  const { user } = useUser();
  const { signOut } = useAuth();

  const handleSignOut = () => {
    signOut();
    router.replace("/(auth)/sign-in");
  };

  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [latitude, setLatitude] = useState<number>();
  const [longitude, setLongitude] = useState<number>();
  const [viewPlace, setViewPlace] = useState<boolean>(false);
  const [selectedPlace, setSelectedPlace] = useState<Place>();

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setHasPermission(false);
        return;
      }

      let location = await Location.getCurrentPositionAsync({});

      setLatitude(location.coords?.latitude);
      setLongitude(location.coords?.longitude);
    })();
  }, []);

  const handleDestinationPress = (location: {
    latitude: number;
    longitude: number;
    address: string;
  }) => {
    console.log("Pressed");
  };

  const HandleMarkerPress = async (place: Place) => {
    console.log("Place: ", place.photoUrl);

    setViewPlace(true);
    setSelectedPlace(place);
  };

  return (
    <ScrollView>
      <SafeAreaView className="bg-general-500 p-5">
        <>
          <View className="flex flex-row items-center justify-between my-5">
            <Text className="text-2xl font-JakartaExtraBold">
              Welcome {user?.firstName}
            </Text>
            <TouchableOpacity
              onPress={handleSignOut}
              className="justify-center items-center w-10 h-10 rounded-full bg-white"
            >
              <Image source={icons.out} className="w-4 h-4" />
            </TouchableOpacity>
          </View>
          <GoogleTextInput
            icon={icons.search}
            containerStyle="bg-white shadow-md shadow-neutral-300"
            handlePress={handleDestinationPress}
          />
          <>
            <Text className="text-xl font-JakartaBold mt-5 mb-3">
              Your current location
            </Text>
            <Map
              userLatitude={latitude as number}
              userLongitude={longitude as number}
              markerPress={HandleMarkerPress}
            />
          </>
        </>
        <ReactNativeModal isVisible={viewPlace}>
          <View className="bg-white px-7 py-9 rounded-2xl min-h-[300px]">
            <Text className="text-3xl font-JakartaBold text-center">
              {selectedPlace?.name}
            </Text>
            <Image
              source={{ uri: selectedPlace?.photoUrl }}
              className="w-[250px] h-[250px] mx-auto my-5 rounded-lg"
            />
            <CustomButton
              title="Return"
              onPress={() => {
                setViewPlace(false);
              }}
              className="mt-5"
            />
          </View>
        </ReactNativeModal>
      </SafeAreaView>
    </ScrollView>
  );
};

export default Home;
