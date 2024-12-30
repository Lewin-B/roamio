import { Marquee } from "@animatereactnative/marquee";
import { useUser } from "@clerk/clerk-expo";
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
  Modal,
  TextInput,
} from "react-native";
import { ActivityIndicator } from "react-native-paper";
import { FAB } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import type { Place } from "@/components/Map";

import CustomButton from "@/components/CustomButton";
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
  name: string;
}

interface User {
  id: number;
  name: string;
  email: string;
  clerk_id: string;
  reviews: Review[];
}

const circles = [
  { color: "#1ce125", description: "I liked it!" },
  { color: "yellow", description: "It was mid" },
  { color: "red", description: "It didn't like it" },
];

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
  const [fullUser, setFullUser] = useState<User | null>(null);
  const [currentPlace, setCurrentPlace] = useState<NeonPlace | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<boolean>(false);
  const [reviewModal, setReviewModal] = useState<boolean>(false);
  const [ratingColor, setRatingColor] = useState<string>("white");
  const [selectedRating, setSelectedRating] = useState<number>(-1);
  const [leftBound, setLeftBound] = useState<number>(0);
  const [wins, setWins] = useState<number>(0);
  const [draws, setDraws] = useState<number>(0);
  const [losses, setLosses] = useState<number>(0);
  const [rightBound, setRightBound] = useState<number>(0);
  const [text, setText] = useState<string>("");
  const { id: preId } = useLocalSearchParams();
  const { user } = useUser();

  const toggleRating = (index: number) => {
    setSelectedRating(index);
  };

  const calibrateSearch = (win: boolean, draw: boolean, loss: boolean) => {
    const mid = Math.floor(leftBound + rightBound) / 2;
    if (win) {
      setLeftBound(mid + 1);
      setWins(wins + 1);
    }
    if (draw) {
      setLeftBound(mid + 1);
      setDraws(draws + 1);
    }
    if (loss) {
      setRightBound(mid - 1);
      setLosses(losses + 1);
    }
  };

  const handleSubmit = () => {
    // Send API info
    let totalWins = wins;
    let totalDraws = draws;
    let totalLosses = losses;

    if (selectedRating === 0) {
      totalWins += 1;
    } else if (selectedRating === 1) {
      totalDraws += 1;
    } else if (selectedRating === 2) {
      totalLosses += 1;
    } else {
      alert("Please give a rating to the place");
    }

    const apiInfo = {
      place_info: currentPlace,
      wins: totalWins,
      draws: totalDraws,
      losses: totalLosses,
      text_review: text,
    };

    console.log("info: ", apiInfo);
  };

  const id = String(preId ?? "");

  const getPlace = useCallback(
    async (id: string) => {
      setLoading(true);
      try {
        const userResult = await fetchAPI(`/(api)/(profile)/${user?.id}`);

        if (!userResult) {
          setError(true);
          return;
        }

        // Calibrate Bin search index
        setLeftBound(0);
        setRightBound(userResult.data[0].reviews.length - 1);

        setFullUser(userResult.data[0]);

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
      <View className="flex-1 justify-center items-center">
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
          <View className="relative flex w-full items-center justify-center overflow-hidden rounded-lg bg-background md:shadow-xl my-3">
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
                {currentPlace?.reviews?.length ? (
                  currentPlace.reviews.map((review) => (
                    <ReviewCard key={review.username} {...review} />
                  ))
                ) : (
                  <Text>No reviews available</Text>
                )}
              </View>
            )}
          </View>
        </View>
        <FAB
          className="absolute bottom-0 bg-gray-950/[.01] border-gray-950/[.1] rounded-full right-4"
          icon="plus"
          onPress={() => setReviewModal(true)}
        />
        <Modal
          animationType="fade"
          transparent={true}
          visible={reviewModal}
          onRequestClose={() => setReviewModal(false)}
        >
          <View className="flex-1 bg-black bg-opacity-50 items-center justify-center">
            <View className="bg-white rounded-lg shadow-lg p-6 w-full">
              <Text className="text-xl text-center font-semibold mb-4 text-gray-900">
                How was it?
              </Text>

              <View className="flex-row justify-center space-x-8 mb-6">
                {circles.map((circle, index) => (
                  <TouchableOpacity
                    key={index}
                    className="h-12 w-12 rounded-full border-2 flex items-center justify-center"
                    style={{ backgroundColor: circle.color }}
                    onPress={() => toggleRating(index)}
                  >
                    {selectedRating === index && (
                      <Text className="text-white text-lg font-bold">✓</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {selectedRating !== -1 && leftBound <= rightBound && (
              <View className="bg-white rounded-lg shadow-lg p-6 w-full mt-2  flex-col justify-center items-center">
                <Text className="text-xl text-center font-semibold mb-4 text-gray-900">
                  Which place did you enjoy more?
                </Text>
                <View className="flex-row justify-evenly items-center space-x-7 ">
                  <TouchableOpacity
                    onPress={() => calibrateSearch(true, false, false)}
                    className="h-[125px] w-[125px] border p-4 rounded-md bg-gray-950/[.01] flex justify-center"
                  >
                    <Text className="font-medium">{currentPlace?.name}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => calibrateSearch(false, false, true)}
                    className="h-[125px] w-[125px] border p-4 rounded-md bg-gray-950/[.01] flex justify-center"
                  >
                    <Text className="font-medium">
                      {
                        fullUser?.reviews[
                          Math.floor((leftBound + rightBound) / 2)
                        ].name
                      }
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {selectedRating !== -1 && (
              <View className="bg-white rounded-lg shadow-lg p-4 w-full mt-2">
                <TextInput
                  className="border border-gray-950 min-h-[150px] rounded-lg p-3 w-full text-gray-800"
                  placeholder="Share your thoughts here..."
                  multiline
                  numberOfLines={4}
                  value={text}
                  onChangeText={(newText) => setText(newText)}
                />
              </View>
            )}

            <View className="flex-row justify-center mt-2">
              <CustomButton
                title="Review"
                onPress={() => {
                  handleSubmit();
                }}
                className="w-[120px] mx-2"
              />
              <CustomButton
                title="Cancel"
                onPress={() => {
                  setReviewModal(false);
                  setSelectedRating(-1);
                  setLosses(0);
                  setWins(0);
                  setDraws(0);
                  setText("");
                }}
                className="w-[120px] mx-2"
              />
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </ScrollView>
  );
};

export default PlaceView;
