import { useUser } from "@clerk/clerk-expo";
import { router } from "expo-router";
import { CircleUser, UserPlus } from "lucide-react-native";
import { MapPin } from "lucide-react-native";
import { useState, useCallback, useEffect } from "react";
import { ActivityIndicator } from "react-native";
import {
  Text,
  View,
  Image,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Review, User } from "../place-view";

import FollowerModal from "@/components/follow-view";
import { fetchAPI } from "@/lib/fetch";

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
  text_review,
  timestamp,
  place_name,
}: {
  image: string;
  username: string;
  text_review: string;
  timestamp: string;
  place_name: string;
}) => {
  const time = relativeTime(timestamp);

  return (
    <View className="bg-white mb-4 rounded-xl shadow-sm overflow-hidden">
      {/* User Header */}
      <View className="p-4 flex-row items-center justify-between">
        <View className="flex-row items-center gap-3">
          <Image
            className="w-11 h-11 rounded-full border border-gray-100"
            source={{ uri: image || "https://via.placeholder.com/40" }}
          />
          <View className="flex-1">
            <View className="flex-row items-center gap-2">
              <Text className="font-semibold text-gray-900">{username}</Text>
              <Text className="text-xs text-gray-400">•</Text>
              <Text className="text-xs text-gray-400">{time}</Text>
            </View>
            <View className="flex-row items-center gap-1 px-2 py-1 bg-gray-50 rounded-md self-start mt-1">
              <MapPin size={14} color="#6b7280" />
              <Text className="text-gray-600 text-sm font-medium">
                {place_name}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Review Content */}
      <View className="px-4 pb-4">
        <Text className="text-gray-700 leading-relaxed text-base">
          {text_review}
        </Text>
      </View>
    </View>
  );
};

const Feed = () => {
  const { user: clerkUser } = useUser();
  const [user, setUser] = useState<User | undefined>();
  const [followingReviews, setFollowingReviews] = useState<Review[]>();
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [followVisible, setFollowVisible] = useState<boolean>(false);

  const processFollowingReviews = (userData: any) => {
    if (!userData?.following) return [];

    const allReviews: Review[] = [];

    console.log("User Data: ", userData);

    userData.following.forEach((followedUser: any) => {
      if (followedUser.reviews) {
        console.log("Followed User Reviews: ", followedUser.reviews);
        followedUser.reviews.forEach((review: Review) => {
          allReviews.push({
            ...review,
            image: review.image,
            username: followedUser.username,
            user_id: followedUser.id,
          });
        });
      }
    });

    allReviews.sort((a, b) => {
      const dateA = new Date(a.updated_at).getTime();
      const dateB = new Date(b.updated_at).getTime();
      return dateB - dateA;
    });

    console.log("All user: ", allReviews);
    return allReviews;
  };

  const getUser = useCallback(async () => {
    setLoading(true);
    try {
      const userResponse = await fetchAPI(
        `${process.env.EXPO_PUBLIC_BACKEND_URL}/profile/${clerkUser?.id}`
      );
      console.log("user response: ", userResponse.data[0].following);
      if (userResponse?.data[0]) {
        setUser(userResponse.data[0]);
      }
      const processedReviews = processFollowingReviews(userResponse.data[0]);
      setFollowingReviews(processedReviews);
      console.log("Processed Reviews: ", processedReviews);
    } catch (err) {
      console.error("Error fetching or inserting place:", err);
      setError(true);
    }
    setLoading(false);
  }, [clerkUser?.id]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await getUser();
    setRefreshing(false);
  }, [getUser]);

  useEffect(() => {
    getUser();
  }, [getUser]);

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50 p-4">
        <Text className="text-red-500 text-lg font-medium mb-2">Oops!</Text>
        <Text className="text-gray-600 text-center">
          Something went wrong. Please try again later.
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="px-4 py-3 flex-row items-center justify-between bg-white border-b border-gray-200">
        <Text className="text-2xl font-bold text-gray-900">Your Feed</Text>
        <View className="flex-row space-x-3">
          <TouchableOpacity
            onPress={() => setFollowVisible(true)}
            className="w-10 h-10 items-center justify-center rounded-full bg-gray-100"
          >
            <UserPlus size={24} color="#4b5563" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View className="p-4">
          {followingReviews?.length || -1 > 0 ? (
            followingReviews?.map((review, index) => (
              <ReviewCard
                key={`${review.id}-${index}`}
                image={review.image}
                username={review.username}
                text_review={review.text_review}
                place_name={review.place_name}
                timestamp={review.updated_at}
              />
            ))
          ) : (
            <View className="mt-8 p-6 bg-white rounded-xl shadow-sm">
              <View className="items-center mb-4">
                <CircleUser size={48} color="#9ca3af" />
              </View>
              <Text className="text-gray-900 text-lg font-semibold text-center mb-2">
                No reviews yet
              </Text>
              <Text className="text-gray-500 text-center">
                Follow some friends to see their latest reviews and
                recommendations in your feed.
              </Text>
              <TouchableOpacity
                onPress={() => setFollowVisible(true)}
                className="mt-4 bg-indigo-600 py-3 rounded-lg"
              >
                <Text className="text-white text-center font-medium">
                  Find Friends to Follow
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
      <FollowerModal
        visible={followVisible}
        onClose={() => setFollowVisible(false)}
        user={user}
      />
    </SafeAreaView>
  );
};

export default Feed;
