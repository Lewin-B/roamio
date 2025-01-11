import { useUser } from "@clerk/clerk-expo";
import { router } from "expo-router";
import { useLocalSearchParams } from "expo-router";
import {
  MapPin,
  Star,
  CircleUser,
  Heart,
  MessageCircle,
} from "lucide-react-native";
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
import Carousel from "react-native-reanimated-carousel";
import { SafeAreaView } from "react-native-safe-area-context";

import type { Place } from "@/components/Map";

import CustomButton from "@/components/CustomButton";
import { fetchPhotoUrl } from "@/components/Map";
import { icons } from "@/constants";
import { fetchAPI } from "@/lib/fetch";

export interface NeonPlace {
  id: number;
  name: string;
  place_id: string;
  avg_rating: number;
  image: string;
  location: string;
  ranking: number;
  types: string;
  formatted_address: string;
  website: string;
  reviews: Review[];
}

export interface Review {
  id: number;
  user_id: number;
  place_id: number;
  username: string;
  text_review: string;
  rating: number;
  image: string;
  place_name: string;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  clerk_id: string;
  reviews: Review[];
  image_url: string;
  followers: string;
  following: string;
}

interface Match {
  winner: number | null;
  loser: number | null;
  tie: (number | null)[];
}

const circles = [
  { color: "#4CAF50", description: "I liked it!" }, // Vibrant green
  { color: "#FFC107", description: "It was okay" }, // Warm amber
  { color: "#F44336", description: "I didn't like it" }, // Bright red
];

const relativeTime = (dateString: string) => {
  const now = new Date();
  const past = new Date(dateString);
  const diffInSeconds = Math.floor((now - past) / 1000);

  // Less than a minute
  if (diffInSeconds < 60) {
    return "just now";
  }

  // Less than an hour
  if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes}m ago`;
  }

  // Less than a day
  if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours}h ago`;
  }

  // Less than a week
  if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days}d ago`;
  }

  // Less than a month
  if (diffInSeconds < 2592000) {
    const weeks = Math.floor(diffInSeconds / 604800);
    return `${weeks}w ago`;
  }

  // Format as date if older
  return past.toLocaleDateString();
};

const ReviewCard = ({
  image,
  username,
  updated_at,
  text_review,
}: {
  image: string;
  username: string;
  text_review: string;
  updated_at: string;
}) => {
  return (
    <View className="bg-white mb-5 rounded-xl shadow-sm">
      {/* User Header */}
      <View className="p-5 flex-row items-center justify-between border-b border-gray-100">
        <View className="flex-row items-center gap-3">
          <Image
            className="w-11 h-11 rounded-full"
            source={{ uri: image || "https://via.placeholder.com/44" }}
          />
          <View className="w-3/4">
            <Text className="font-semibold text-gray-900">{username}</Text>
            <Text className="text-xs text-gray-500">
              {relativeTime(updated_at)}
            </Text>
          </View>
        </View>
      </View>

      {/* Review Content */}
      <View className="p-5">
        <Text className="text-gray-700 leading-relaxed">{text_review}</Text>
      </View>
    </View>
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
  const [matches, setMatches] = useState<Match[]>([]);
  const [rightBound, setRightBound] = useState<number>(0);
  const [text, setText] = useState<string>("");
  const { id: preId } = useLocalSearchParams();
  const [placeReview, setPlaceReview] = useState<Review | null>(null);
  const { user } = useUser();

  const toggleRating = (index: number) => {
    console.log("Check bounds: ", leftBound, rightBound);
    console.log("Matches: ", matches);
    console.log("Full user: ", fullUser);
    setSelectedRating(index);
  };

  const calibrateSearch = (
    result: string,
    teamOne: number | null,
    teamTwo: number | null
  ) => {
    const mid = Math.floor(leftBound + rightBound) / 2;
    let match: Match = { winner: null, loser: null, tie: [] };
    if (result === "win") {
      setLeftBound(mid + 1);
      match = {
        winner: teamOne,
        loser: teamTwo,
        tie: [],
      };
    } else if (result === "loss") {
      setRightBound(mid - 1);
      match = {
        winner: teamTwo,
        loser: teamOne,
        tie: [],
      };
    } else {
      setLeftBound(mid + 1);
      match = {
        winner: null,
        loser: null,
        tie: [teamOne, teamTwo],
      };
    }

    const newMatches = matches;
    newMatches.push(match);
    setMatches(newMatches);
  };

  const handleSubmit = async () => {
    const newMatches = matches;
    if (selectedRating === 0) {
      const match = { winner: currentPlace?.id || null, loser: null, tie: [] };
      newMatches.push(match);
    } else if (selectedRating === 1) {
      const match = {
        winner: null,
        loser: null,
        tie: currentPlace?.id ? [currentPlace.id || null] : [],
      };
      newMatches.push(match);
    } else if (selectedRating === 2) {
      const match = { winner: null, loser: currentPlace?.id || null, tie: [] };
      newMatches.push(match);
    } else {
      alert("Please give a rating to the place");
      return;
    }

    const apiInfo = {
      user_id: fullUser?.id,
      place_id: currentPlace?.id,
      matches: newMatches,
      text_review: text,
      username: fullUser?.username,
      review_id: placeReview ? placeReview.id : null,
      image: fullUser?.image_url,
    };

    console.log("Api Info: ", apiInfo);

    try {
      const rawResponse = await fetch(
        `${process.env.EXPO_PUBLIC_BACKEND_URL ?? ""}/process-matches`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(apiInfo), // Ensure the body is stringified
        }
      );

      const textResponse = await rawResponse.text(); // Read raw text
      console.log("Raw Backend Response:", textResponse);

      if (!rawResponse.ok) {
        throw new Error(
          `HTTP error! status: ${rawResponse.status}, body: ${textResponse}`
        );
      }

      const jsonResponse = JSON.parse(textResponse); // Parse JSON manually
      console.log("Parsed Response:", jsonResponse);
    } catch (error) {
      console.error("Error during API call:", error);
    }
  };

  const id = String(preId ?? "");

  const getPlace = useCallback(
    async (id: string) => {
      setLoading(true);
      try {
        console.log("user: ", user);
        const result = await fetchAPI(
          `${process.env.EXPO_PUBLIC_BACKEND_URL}/places/${id}`
        );

        console.log("Result: ", result.data);
        if (result.data.length === 0) {
          // Fetch detailed place info from Google API
          const url = `https://maps.googleapis.com/maps/api/place/details/json?placeid=${id}&key=${process.env.EXPO_PUBLIC_PLACES_API_KEY ?? ""}`;
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
          const insertResult = await fetchAPI(
            `${process.env.EXPO_PUBLIC_BACKEND_URL}/places/create`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
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
            }
          );

          console.log("Inserted place into the database: ", insertResult);
          setCurrentPlace(insertResult.data);

          const userResult = await fetchAPI(
            `${process.env.EXPO_PUBLIC_BACKEND_URL}/profile/${user?.id}`
          );

          if (!userResult) {
            setError(true);
            return;
          }

          // Calibrate Bin search index
          setLeftBound(0);
          setRightBound(userResult.data[0].reviews.length);

          // Set full user with filtered reviews
          setFullUser(userResult.data[0]);
        } else {
          console.log("Place found in database: ", result.data);
          setCurrentPlace(result.data[0]);

          const userResult = await fetchAPI(
            `${process.env.EXPO_PUBLIC_BACKEND_URL}/profile/${user?.id}`
          );

          if (!userResult) {
            setError(true);
            return;
          }

          const foundReview = userResult.data[0].reviews.find(
            (review: Review) => review.place_id === result.data[0]?.id
          );

          setPlaceReview(foundReview);

          // filter reviews
          const filteredReviews = userResult.data[0].reviews.filter(
            (review: Review) => review.place_id !== result.data[0]?.id
          );

          console.log("filteredReviews: ", filteredReviews.length);

          // Calibrate Bin search index
          setLeftBound(0);
          setRightBound(filteredReviews.length - 1);

          // Set full user with filtered reviews
          setFullUser({
            ...userResult.data[0],
            reviews: filteredReviews,
          });
        }
      } catch (error) {
        console.error("Error fetching or inserting place:", error);
        setError(true);
      }
      setLoading(false);
    },
    [setCurrentPlace, user?.id]
  );

  useEffect(() => {
    if (id) {
      console.log("Fetching place...");
      getPlace(id);
    }
  }, [id, getPlace]);

  useEffect(() => {
    console.log("Rating: ", currentPlace?.avg_rating);
    console.log("Reviews Check: ", fullUser);
    console.log("Left Bound: ", leftBound);
    console.log("Right Bound: ", rightBound);
    if (!currentPlace?.avg_rating) {
      setRatingColor("white");
    } else if (Number(currentPlace?.avg_rating) <= 3.0) {
      setRatingColor("#FFC107");
    } else if (Number(currentPlace?.avg_rating) >= 7.0) {
      setRatingColor("#4CAF50");
    } else {
      setRatingColor("#FFC107");
    }
  }, [currentPlace?.avg_rating, ratingColor, setRatingColor]);

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
    <ScrollView className="bg-white">
      <SafeAreaView>
        {/* Hero Section with Parallax Image */}
        <ImageBackground
          source={{ uri: currentPlace?.image }}
          className="h-[450px]"
        >
          <View className="flex-1 bg-gradient-to-b from-black/40 via-transparent to-black/70">
            {/* Header */}
            <View className="px-4 py-3 flex-row items-center justify-between">
              <TouchableOpacity
                onPress={() => router.back()}
                className="p-2 rounded-full bg-black/30 backdrop-blur"
              >
                <Image
                  source={icons.backArrow}
                  className="w-6 h-6 tint-white"
                />
              </TouchableOpacity>
              <View className="flex-row gap-3">
                <TouchableOpacity
                  onPress={() => router.push("/(tabs)/profile")}
                  className="p-2 rounded-full bg-black/30 backdrop-blur"
                >
                  <CircleUser size={24} color="white" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Title Section - Bottom of Hero */}
            <View className="mt-auto p-4">
              <Text className="text-4xl font-JakartaBold text-white/90 mb-2 shadow-lg">
                {currentPlace?.name}
              </Text>
              <View className="flex-row items-center gap-2 mb-2">
                <MapPin size={16} color="white" />
                <Text className="text-white/90 font-JakartaMedium">
                  {currentPlace?.formatted_address}
                </Text>
              </View>
              <View className="flex-row flex-wrap gap-2">
                {currentPlace?.types?.split(" · ").map((type) => (
                  <View
                    key={type}
                    className="bg-white/20 rounded-full px-3 py-1"
                  >
                    <Text className="text-white/90 text-sm font-JakartaMedium">
                      {type}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </ImageBackground>

        {/* Ratings Cards */}
        <View className="px-4 -mt-2">
          <View className="bg-white rounded-2xl shadow-lg p-4 mb-6">
            <View className="flex-row justify-between mb-4">
              <View className="items-center flex-1">
                <Text className="text-3xl font-JakartaBold text-gray-900 mb-1">
                  {currentPlace?.avg_rating
                    ? Math.round(currentPlace?.avg_rating * 10) / 10
                    : "N/A"}
                </Text>
                <Text className="text-sm font-JakartaMedium text-gray-500">
                  Roamio Rating
                </Text>
              </View>
              <View className="w-px bg-gray-200" />
              <View className="items-center flex-1">
                <View className="flex-row items-center gap-1">
                  <Star size={20} color="#FFB800" fill="#FFB800" />
                  <Text className="text-3xl font-JakartaBold text-gray-900">
                    {placeReview && placeReview.rating !== 0
                      ? Math.round(placeReview.rating * 10) / 10
                      : "--"}
                  </Text>
                </View>
                <Text className="text-sm font-JakartaMedium text-gray-500">
                  Your Rating
                </Text>
              </View>
              <View className="w-px bg-gray-200" />
              <View className="items-center flex-1">
                <Text className="text-3xl font-JakartaBold text-gray-900 mb-1">
                  #{currentPlace?.ranking || "--"}
                </Text>
                <Text className="text-sm font-JakartaMedium text-gray-500">
                  Ranking
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Reviews Section */}
        <View className="px-4 mb-6">
          <View className="flex-row justify-center items-center mb-4">
            <Text className="text-xl font-JakartaBold text-gray-900">
              Reviews
            </Text>
          </View>

          {(currentPlace?.reviews?.length ?? 0) > 1 ? (
            <Carousel
              height={200}
              width={320}
              loop
              autoPlay
              data={currentPlace?.reviews || []}
              renderItem={({ item }) => (
                <View className="mr-4">
                  <ReviewCard key={item.username} {...item} />
                </View>
              )}
            />
          ) : currentPlace?.reviews?.length === 1 ? (
            <View className="px-1 flex items-center justify-center">
              <ReviewCard {...currentPlace.reviews[0]} />
            </View>
          ) : (
            <View className="bg-gray-50 rounded-xl p-6 items-center">
              <Text className="text-gray-500 text-center mb-2">
                No reviews yet
              </Text>
              <Text className="text-sm text-gray-400 text-center">
                Be the first to share your experience!
              </Text>
            </View>
          )}
        </View>

        {/* Add Review FAB */}
        <FAB
          className="absolute bottom-8 right-6"
          icon="plus"
          color="white"
          style={{ backgroundColor: "#111827" }}
          onPress={() => setReviewModal(true)}
        />

        {/* Review Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={reviewModal}
          onRequestClose={() => setReviewModal(false)}
        >
          <View className="flex-1 bg-black/50">
            <View className="mt-auto bg-white rounded-t-3xl">
              <View className="w-12 h-1 bg-gray-300 rounded-full mx-auto mt-4 mb-2" />

              <View className="p-6">
                <Text className="text-2xl text-center font-JakartaBold mb-6">
                  Rate Your Experience
                </Text>

                <View className="flex-row justify-center space-x-4 mb-8">
                  {circles.map((circle, index) => (
                    <TouchableOpacity
                      key={index}
                      onPress={() => toggleRating(index)}
                      className="h-16 w-16 rounded-2xl items-center justify-center shadow-sm"
                      style={{
                        backgroundColor:
                          selectedRating === index ? circle.color : "white",
                        borderWidth: 2,
                        borderColor: circle.color,
                      }}
                    >
                      <Text
                        className={`text-2xl font-bold ${selectedRating === index ? "text-white" : "text-gray-400"}`}
                      >
                        {index + 1}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {selectedRating !== -1 && leftBound <= rightBound && (
                  <View className="bg-gray-50 rounded-2xl p-4 mb-6">
                    <Text className="text-lg text-center font-JakartaBold mb-4">
                      Quick Compare
                    </Text>
                    <View className="flex-row justify-between">
                      <TouchableOpacity
                        onPress={() =>
                          calibrateSearch(
                            "win",
                            currentPlace?.id || null,
                            fullUser?.reviews[
                              Math.floor((leftBound + rightBound) / 2)
                            ].place_id || null
                          )
                        }
                        className="w-[45%] p-4 rounded-xl bg-white shadow-sm"
                      >
                        <Text className="font-JakartaMedium text-center">
                          {currentPlace?.name}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() =>
                          calibrateSearch(
                            "loss",
                            currentPlace?.id || null,
                            fullUser?.reviews[
                              Math.floor((leftBound + rightBound) / 2)
                            ].place_id || null
                          )
                        }
                        className="w-[45%] p-4 rounded-xl bg-white shadow-sm"
                      >
                        <Text className="font-JakartaMedium text-center">
                          {
                            fullUser?.reviews[
                              Math.floor((leftBound + rightBound) / 2)
                            ].place_name
                          }
                        </Text>
                      </TouchableOpacity>
                    </View>
                    <CustomButton
                      className="mt-4"
                      title="Equal"
                      onPress={() =>
                        calibrateSearch(
                          "draw",
                          currentPlace?.id || null,
                          fullUser?.reviews[
                            Math.floor((leftBound + rightBound) / 2)
                          ].place_id || null
                        )
                      }
                    />
                  </View>
                )}

                {selectedRating !== -1 && (
                  <TextInput
                    className="bg-gray-50 rounded-xl p-4 min-h-[120px] text-gray-800 mb-6"
                    placeholder="What made this place special? (optional)"
                    multiline
                    numberOfLines={4}
                    value={text}
                    onChangeText={setText}
                  />
                )}

                <View className="flex-row justify-between">
                  <TouchableOpacity
                    onPress={() => {
                      setReviewModal(false);
                      setSelectedRating(-1);
                      setMatches([]);
                      setLeftBound(0);
                      setRightBound(
                        fullUser?.reviews?.length
                          ? fullUser?.reviews?.length - 1
                          : 0
                      );
                      setText("");
                    }}
                    className="w-[48%] py-3 rounded-xl bg-gray-100"
                  >
                    <Text className="text-center font-JakartaMedium text-gray-900">
                      Cancel
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      handleSubmit();
                      setReviewModal(false);
                      setSelectedRating(-1);
                      setMatches([]);
                      setLeftBound(0);
                      setRightBound(
                        fullUser?.reviews?.length
                          ? fullUser?.reviews?.length - 1
                          : 0
                      );
                      setText("");
                    }}
                    className="w-[48%] py-3 rounded-xl bg-gray-900"
                  >
                    <Text className="text-center font-JakartaMedium text-white">
                      Post Review
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </ScrollView>
  );
};

export default PlaceView;
