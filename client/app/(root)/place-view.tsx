import { Marquee } from "@animatereactnative/marquee";
import { router } from "expo-router";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState, useCallback } from "react";
import React from "react";
import {
  Text,
  View,
  Image,
  TouchableOpacity,
  ImageBackground,
  ScrollView,
} from "react-native";
import { ActivityIndicator } from "react-native";
import ReactNativeModal from "react-native-modal";
import { FAB } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import type { Place } from "@/components/Map";

import { fetchPhotoUrl } from "@/components/Map";
import { icons } from "@/constants";
import { cn } from "@/lib/cn";
import { fetchAPI } from "@/lib/fetch";

interface NeonPlace {
  name: string;
  place_id: string;
  rating: number;
  image: string;
  location: string;
  ranking: number;
  types: string;
  formatted_address: string;
  website: string;
  reviews: Review[];
}

interface Review {
  userId: string;
  placeId: string;
  username: string;
  text_review: string;
  rating: number;
  image: string;
}

const googlePlacesApiKey = process.env.EXPO_PUBLIC_PLACES_API_KEY ?? "";

const ReviewCard = ({
  image,
  username,
  text_review,
}: {
  image: string;
  username: string;
  text_review: string;
}) => {
  return (
    <TouchableOpacity
      className={cn(
        "relative w-64 cursor-pointer overflow-hidden rounded-xl border p-4 mx-2",
        // light styles
        "border-gray-950/[.1] bg-gray-950/[.01] hover:bg-gray-950/[.05]",
        // dark styles
        "dark:border-gray-50/[.1] dark:bg-gray-50/[.10] dark:hover:bg-gray-50/[.15]"
      )}
    >
      <View className="flex flex-row items-center gap-2">
        <Image
          className="rounded-full"
          style={{ width: 32, height: 32 }}
          source={{ uri: image }}
          alt=""
        />
        <View className="flex flex-col">
          <Text className="text-sm font-medium dark:text-white">
            {username}
          </Text>
          <Text className="text-xs font-medium dark:text-white/40">
            {username}
          </Text>
        </View>
      </View>
      <Text className="mt-2 text-sm">{text_review}</Text>
    </TouchableOpacity>
  );
};

const PlaceView = () => {
  const [currentPlace, setCurrentPlace] = useState<NeonPlace | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<boolean>(false);
  const [reviewModal, setReviewModal] = useState<boolean>(false);
  const [ratingColor, setRatingColor] = useState<string>("white");
  const { id: preId } = useLocalSearchParams();

  const id = String(preId ?? "");

  const getPlace = useCallback(
    async (id: string) => {
      setLoading(true);
      try {
        const result = await fetchAPI(`/(api)/(places)/${id}`);
        if (result.data.length === 0) {
          // Fetch detailed place info from Google API
          const url = `https://maps.googleapis.com/maps/api/place/details/json?placeid=${id}&key=${googlePlacesApiKey}`;
          const response = await fetchAPI(url);
          const place = response.result as Place;
          console.log("Place Keys: ", Object.keys(place));

          if (!place) {
            console.error("Place not found in Google API");
            return;
          }

          console.log("Place fetched from Google API: ", place);
          console.log("Place Keys: ", Object.keys(place));

          // Insert the place into the database
          const insertResult = await fetchAPI("/(api)/(places)/create", {
            method: "POST",
            body: JSON.stringify({
              place_id: id,
              location: `${place.geometry.location.lat},${place.geometry.location.lng}`,
              image: place.photos?.[0]?.photo_reference
                ? fetchPhotoUrl(place.photos[0].photo_reference)
                : undefined,
              name: place.name,
              website: place.website,
              formatted_address: place.formatted_address,
              types: place.types.join(" · "),
            }),
          });

          console.log("Inserted place into the database: ", insertResult);
          setCurrentPlace(insertResult.data);
        } else {
          console.log("Place found in database: ", result.data);
          setCurrentPlace(result.data[0]);
        }
      } catch (error) {
        console.error("Error fetching or inserting place:", error);
        setError(true);
      }
      setLoading(false);
    },
    [setCurrentPlace]
  );

  useEffect(() => {
    if (id) {
      console.log("Fetching place...");
      getPlace(id);
    }
  }, [id, getPlace]);

  useEffect(() => {
    console.log("Rating: ", currentPlace?.rating);
    if (!currentPlace?.rating) {
      setRatingColor("white");
    } else if (Number(currentPlace?.rating) <= 3.0) {
      setRatingColor("red");
    } else if (Number(currentPlace?.rating) >= 7.0) {
      setRatingColor("#1ce125");
    } else {
      setRatingColor("yellow");
    }
    console.log("Rating Color: ", ratingColor);
  }, [currentPlace?.rating, ratingColor, setRatingColor]);

  if (loading) {
    return (
      <View>
        <ActivityIndicator />
      </View>
    );
  }

  if (error) {
    return (
      <View>
        <Text>Error</Text>
      </View>
    );
  }

  return (
    <ScrollView>
      <SafeAreaView>
        <View className="bg-white/10 px-3 py-2 flex flex-row justify-between fixed">
          <TouchableOpacity
            onPress={() => {
              router.back();
            }}
          >
            <Image source={icons.backArrow} />
          </TouchableOpacity>
          <Text className="text-2xl font-JakartaExtraBold pt-2">Roamio</Text>
          <TouchableOpacity
            onPress={() => {
              router.push("/(root)/(tabs)/profile");
            }}
          >
            <Image className="h-[45px]" source={icons.person} />
          </TouchableOpacity>
        </View>
        <View>
          <ImageBackground
            source={{ uri: currentPlace?.image }}
            className="flex justify-end h-[300px]"
          >
            <View className="flex flex-row justify-between items-center">
              <Text className="text-3xl font-JakartaBold text-white mb-5">
                {currentPlace?.name}
              </Text>
            </View>
          </ImageBackground>
        </View>
        <View className="flex my-3">
          <View className="flex flex-col justify-evenly items-center">
            <View className="flex items-center border border-gray-950/[.1] bg-gray-950/[.01] p-2 rounded-lg">
              <View className="flex-row justify-start">
                <Text className="text-4xl font-medium">
                  {currentPlace?.formatted_address}
                </Text>
              </View>
              <Text className="text-md font-medium text-black">
                {currentPlace?.types}
              </Text>
            </View>
          </View>
          <View className="flex flex-row justify-evenly">
            <View className="flex flex-col justify-center items-center">
              <Text className="text-lg font-medium">Rating</Text>
              <View
                className="w-16 h-16 rounded-full flex items-center justify-center mx-3"
                style={{ backgroundColor: ratingColor }}
              >
                <Text className="text-white text-2xl font-JakartaBold">
                  {currentPlace?.rating}
                </Text>
              </View>
            </View>
            <View className="flex flex-col justify-center items-center">
              <Text className="text-lg font-medium">Ranking</Text>
              <View className="w-16 h-16 rounded-full flex items-center justify-center mx-3 bg-gray-950/[.01]">
                <Text className="text-black text-2xl font-JakartaBold">
                  # {currentPlace?.ranking}
                </Text>
              </View>
            </View>
            <View className="flex flex-col justify-center items-center">
              <Text className="text-lg font-medium">Misc.</Text>
              <View className="w-16 h-16 rounded-full flex items-center justify-center mx-3 border-gray-950/[.1] bg-gray-950/[.01]">
                <Text className="text-black text-2xl font-JakartaBold">
                  {currentPlace?.rating}
                </Text>
              </View>
            </View>
          </View>
          <View className="relative flex w-full items-center justify-center overflow-hidden rounded-lg  bg-background md:shadow-xl my-3">
            {(currentPlace?.reviews?.length ?? 0) > 1 ? (
              <Marquee>
                <View className="flex flex-row mx-2">
                  {currentPlace?.reviews.map((review) => (
                    <ReviewCard key={review.username} {...review} />
                  ))}
                </View>
              </Marquee>
            ) : (
              <View className="flex flex-row mx-2">
                {currentPlace?.reviews.map((review) => (
                  <ReviewCard key={review.username} {...review} />
                ))}
              </View>
            )}
          </View>
        </View>
        <FAB
          className="absolute bottom-0 bg-gray-950/[.01] border-gray-950/[.1] rounded-full right-4"
          icon="plus"
          onPress={() => setReviewModal(true)}
        />
      </SafeAreaView>
    </ScrollView>
  );
};

export default PlaceView;
