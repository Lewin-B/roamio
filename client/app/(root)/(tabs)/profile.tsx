import React from "react";
import { useUser } from "@clerk/clerk-expo";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, ScrollView, Text, Image, TouchableOpacity } from "react-native";

const Profile = () => {
  // Access user info from Clerk
  const { user } = useUser();

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        className="px-4"
      >
        {/* Header */}
        <View className="mt-5 items-center">
          {/* Profile Picture */}
          <Image
            source={{ uri: user?.imageUrl }}
            className="w-24 h-24 rounded-full bg-gray-200"
          />

          {/* Username / Name */}
          <Text className="text-2xl font-JakartaBold mt-3">
            {user?.username ?? "Username"}
          </Text>

          {/* Additional info (optional) */}
          <Text className="text-base text-gray-500 mt-1">
            {user?.emailAddresses?.[0]?.emailAddress ?? "email@example.com"}
          </Text>
        </View>

        {/* Divider */}
        <View className="mt-5 mb-5 border-b border-gray-200" />

        {/* Other Profile Sections or Stats */}
        <View className="mt-3">
          <Text className="text-xl font-JakartaBold mb-2">About Me</Text>
          <Text className="text-sm text-gray-500">
            This is a placeholder for your bio or other details you'd like to
            share. Feel free to customize this section with anything you’d want
            your users to see about themselves or others.
          </Text>
        </View>

        {/* Example: Settings or Action Buttons */}
        <View className="mt-6 mb-5">
          <TouchableOpacity className="py-3 px-4 bg-gray-100 rounded-lg mb-3">
            <Text className="text-gray-700 font-JakartaMedium">Edit Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity className="py-3 px-4 bg-gray-100 rounded-lg">
            <Text className="text-gray-700 font-JakartaMedium">Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default Profile;
