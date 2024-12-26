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
}

const reviews = [
  {
    name: "Jack",
    username: "@jack",
    body: "I've never seen anything like this before. It's amazing. I love it.",
    img: "https://avatar.vercel.sh/jack",
  },
  {
    name: "Jill",
    username: "@jill",
    body: "I don't know what to say. I'm speechless. This is amazing.",
    img: "https://avatar.vercel.sh/jill",
  },
  {
    name: "John",
    username: "@john",
    body: "I'm at a loss for words. This is amazing. I love it.",
    img: "https://avatar.vercel.sh/john",
  },
  {
    name: "Jane",
    username: "@jane",
    body: "I'm at a loss for words. This is amazing. I love it.",
    img: "https://avatar.vercel.sh/jane",
  },
  {
    name: "Jenny",
    username: "@jenny",
    body: "I'm at a loss for words. This is amazing. I love it.",
    img: "https://avatar.vercel.sh/jenny",
  },
  {
    name: "James",
    username: "@james",
    body: "I'm at a loss for words. This is amazing. I love it.",
    img: "https://avatar.vercel.sh/james",
  },
];

const firstRow = reviews.slice(0, reviews.length / 2);
const secondRow = reviews.slice(reviews.length / 2);

const googlePlacesApiKey = process.env.EXPO_PUBLIC_PLACES_API_KEY ?? "";

const ReviewCard = ({
  img,
  name,
  username,
  body,
}: {
  img: string;
  name: string;
  username: string;
  body: string;
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
          source={{ uri: img }}
          alt=""
        />
        <View className="flex flex-col">
          <Text className="text-sm font-medium dark:text-white">{name}</Text>
          <Text className="text-xs font-medium dark:text-white/40">
            {username}
          </Text>
        </View>
      </View>
      <Text className="mt-2 text-sm">{body}</Text>
    </TouchableOpacity>
  );
};

const PlaceView = () => {
  const [currentPlace, setCurrentPlace] = useState<NeonPlace | null>(null);
  const [ratingColor, setRatingColor] = useState<string>("white");
  const { id: preId } = useLocalSearchParams();

  const id = String(preId ?? "");

  const getPlace = useCallback(
    async (id: string) => {
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
      }
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
              <View
                className="w-14 h-14 rounded-full flex items-center justify-center mx-3"
                style={{ backgroundColor: ratingColor }}
              >
                <Text className="text-white text-2xl font-JakartaBold">
                  {currentPlace?.rating}
                </Text>
              </View>
            </View>
          </ImageBackground>
        </View>
        <View className="flex ">
          <View className="flex flex-row justify-evenly items-center">
            <View className="flex items-center">
              <Text className="text-2xl font-JakartaBold text-black">
                Place Ranking
              </Text>
              <View className="flex h-28 w-28 items-center justify-center">
                <Text className="text-4xl font-JakartaBold">
                  # {currentPlace?.ranking}
                </Text>
              </View>
            </View>
          </View>
          <View className="relative flex w-full items-center justify-center overflow-hidden rounded-lg  bg-background md:shadow-xl">
            <Marquee>
              <View className="flex flex-row mx-2">
                {reviews.map((review) => (
                  <ReviewCard key={review.username} {...review} />
                ))}
              </View>
            </Marquee>
          </View>
        </View>
      </SafeAreaView>
    </ScrollView>
  );
};

export default PlaceView;
