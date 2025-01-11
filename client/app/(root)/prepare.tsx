import { useUser } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { View, Text, ActivityIndicator } from "react-native";

import { useFetch } from "@/lib/fetch";

const PrepareUser = () => {
  const { user } = useUser();
  const router = useRouter();

  const { data, error } = useFetch(
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

  // Navigate to home when data is received
  if (data) {
    router.push(`/(root)/(tabs)/home`);
  }
  // Show error state if something went wrong
  if (error) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-red-500 mb-2">Something went wrong</Text>
        <Text className="text-gray-500">Please try again later</Text>
      </View>
    );
  }

  // Loading state
  return (
    <View className="flex-1 items-center justify-center gap-4">
      <Text className="text-gray-700 text-lg">Preparing your account...</Text>
      <ActivityIndicator size="large" />
    </View>
  );
};

export default PrepareUser;
