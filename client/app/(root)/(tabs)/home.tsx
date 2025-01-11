import { useUser } from "@clerk/clerk-expo";
import { useAuth } from "@clerk/clerk-expo";
import * as Location from "expo-location";
import { router } from "expo-router";
import { useState, useEffect } from "react";
import { useMemo } from "react";
import {
  Text,
  View,
  TouchableOpacity,
  Image,
  ImageBackground,
} from "react-native";
import ReactNativeModal from "react-native-modal";
import { SafeAreaView } from "react-native-safe-area-context";

import type { Place } from "@/components/Map";

import CustomButton from "@/components/CustomButton";
import GoogleTextInput from "@/components/GoogleTextInput";
import Map from "@/components/Map";
import { icons } from "@/constants";
import { fetchAPI } from "@/lib/fetch";
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

      const result = fetchAPI(
        `${process.env.EXPO_PUBLIC_BACKEND_URL}/profile/update`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            clerk_id: user?.id,
            username: user?.username,
            bio: "",
            image_url: user?.imageUrl,
          }),
        }
      );

      setLatitude(location.coords?.latitude);
      setLongitude(location.coords?.longitude);
    })();
  }, []);

  const handleMarkerPress = async (place: Place | null) => {
    if (!place) {
      return;
    }
    setViewPlace(true);
    setSelectedPlace(place);
  };

  return (
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
          handlePress={handleMarkerPress}
        />
        <>
          <Text className="text-xl font-JakartaBold mt-5 mb-3">
            Your current location
          </Text>
          <Map
            userLatitude={latitude as number}
            userLongitude={longitude as number}
            markerPress={handleMarkerPress}
          />
        </>
      </>
      <ReactNativeModal isVisible={viewPlace}>
        <View className="px-7 py-9  min-h-[500px]">
          <ImageBackground
            source={{ uri: selectedPlace?.photoUrl }}
            className="flex  h-[300px]"
          >
            <View className="bg-black/50 px-3 py-2 flex flex-row justify-center align-top">
              <TouchableOpacity
                onPress={() => {
                  setViewPlace(false);
                }}
              ></TouchableOpacity>
              <Text className="text-2xl font-JakartaBold text-white text-center ">
                {selectedPlace?.name}
              </Text>
            </View>
          </ImageBackground>
          <View className="bg-white bg-opacity-70 p-2 flex-row justify-center">
            <CustomButton
              title="Review"
              onPress={() => {
                setViewPlace(false);
                router.navigate({
                  pathname: `/(root)/place-view`,
                  params: {
                    id: selectedPlace?.place_id,
                  },
                });
              }}
              className="w-[120px] mx-2"
            />
            <CustomButton
              title="Close"
              onPress={() => {
                setViewPlace(false);
              }}
              className="w-[120px] mx-2"
            />
          </View>
        </View>
      </ReactNativeModal>
    </SafeAreaView>
  );
};

export default Home;
