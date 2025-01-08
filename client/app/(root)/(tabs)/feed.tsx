import { useUser } from "@clerk/clerk-expo";
import { router } from "expo-router";
import {
  CircleUser,
  MessageCircle,
  Heart,
  UserPlus,
} from "lucide-react-native";
import { Undo2 } from "lucide-react-native";
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

const ReviewCard = ({
  image,
  username,
  text_review,
  timestamp = "2h ago", // Added timestamp for better context
}: {
  image: string;
  username: string;
  text_review: string;
  timestamp: string;
}) => {
  const [liked, setLiked] = useState(false);

  return (
    <View className="bg-white mb-4 rounded-xl shadow-sm">
      {/* User Header */}
      <View className="p-4 flex-row items-center justify-between border-b border-gray-100">
        <View className="flex-row items-center gap-3">
          <Image
            className="w-10 h-10 rounded-full"
            source={{ uri: image || "https://via.placeholder.com/40" }}
          />
          <View>
            <Text className="font-semibold text-gray-900">{username}</Text>
            <Text className="text-xs text-gray-500">{timestamp}</Text>
          </View>
        </View>
        <TouchableOpacity>
          <View className="w-8 h-8 items-center justify-center rounded-full bg-gray-50">
            <Text className="text-gray-600">•••</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Review Content */}
      <View className="p-4">
        <Text className="text-gray-700 leading-relaxed">{text_review}</Text>
      </View>

      {/* Action Buttons */}
      <View className="flex-row items-center justify-between px-4 py-3 border-t border-gray-100">
        <View className="flex-row gap-6">
          <TouchableOpacity
            onPress={() => setLiked(!liked)}
            className="flex-row items-center gap-2"
          >
            <Heart
              size={20}
              color={liked ? "#ef4444" : "#6b7280"}
              fill={liked ? "#ef4444" : "none"}
            />
            <Text className="text-sm text-gray-600">Like</Text>
          </TouchableOpacity>
          <TouchableOpacity className="flex-row items-center gap-2">
            <MessageCircle size={20} color="#6b7280" />
            <Text className="text-sm text-gray-600">Comment</Text>
          </TouchableOpacity>
        </View>
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
        followedUser.reviews.forEach((review: Review) => {
          allReviews.push({
            ...review,
            image: "",
            username: followedUser.username, // Add username to identify reviewer
            user_id: followedUser.id, // Add userId to identify reviewer
          });
        });
      }
    });

    console.log("All user: ", allReviews);
    return allReviews;
  };

  const getUser = useCallback(async () => {
    setLoading(true);
    try {
      const userResponse = await fetchAPI(`/(api)/(profile)/${clerkUser?.id}`);
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
          <TouchableOpacity
            onPress={() => router.push("/(tabs)/profile")}
            className="w-10 h-10 items-center justify-center rounded-full bg-gray-100"
          >
            <CircleUser size={24} color="#4b5563" />
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
              <TouchableOpacity className="mt-4 bg-indigo-600 py-3 rounded-lg">
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
