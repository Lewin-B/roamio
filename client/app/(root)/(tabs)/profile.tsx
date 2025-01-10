import { useUser } from "@clerk/clerk-expo";
import React, { useState } from "react";
import { View, ScrollView, Text, Image, TouchableOpacity, TextInput, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFetch } from "@/lib/fetch";
import * as ImagePicker from 'expo-image-picker';

const Profile = () => {
  const { user } = useUser();
  const [refreshKey, setRefreshKey] = useState(0); // Add this to force refresh
  const { data: userResult } = useFetch(`/(api)/(profile)/${user?.id}?refresh=${refreshKey}`);
  
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [newUsername, setNewUsername] = useState(userResult?.[0]?.username ?? user?.username);
  const [newBio, setNewBio] = useState(userResult?.[0]?.bio ?? "");

  const followersCount = userResult?.[0]?.followers?.length ?? 0;
  const followingCount = userResult?.[0]?.following?.length ?? 0;

  const handleUpdateProfile = async (updates: { username?: string; bio?: string; image_url?: string }) => {
    try {
      const response = await fetch(`/(api)/(profile)/update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clerk_id: user?.id,
          ...updates,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      // Refresh the profile data by incrementing refreshKey
      setRefreshKey(prev => prev + 1);
      return true;
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile');
      return false;
    }
  };

  const handleEditProfilePicture = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      if (!result.canceled) {
        // Here you would typically upload the image to your storage service
        // and get back a URL. For now, we'll just simulate it:
        const imageUrl = result.assets[0].uri;
        const success = await handleUpdateProfile({ image_url: imageUrl });
        if (success) {
          Alert.alert('Success', 'Profile picture updated!');
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile picture');
    }
  };

  const handleSaveUsername = async () => {
    if (newUsername && newUsername.trim()) {
      const success = await handleUpdateProfile({ username: newUsername });
      if (success) {
        setIsEditingUsername(false);
      }
    }
  };

  const handleSaveBio = async () => {
    const success = await handleUpdateProfile({ bio: newBio });
    if (success) {
      setIsEditingBio(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        className="px-4"
      >
        {/* Profile Picture Section */}
        <View className="mt-5 items-center">
          <View className="relative">
            <Image
              source={{ uri: userResult?.[0]?.image_url ?? user?.imageUrl }}
              className="w-24 h-24 rounded-full bg-gray-200"
            />
            <TouchableOpacity
              onPress={handleEditProfilePicture}
              className="absolute bottom-0 right-0 bg-gray-100 p-2 rounded-full"
            >
              <Ionicons name="camera" size={20} color="black" />
            </TouchableOpacity>
          </View>

          {/* Username Section */}
          <View className="mt-3">
            {isEditingUsername ? (
              <View className="flex-row items-center">
                <TextInput
                  value={newUsername}
                  onChangeText={setNewUsername}
                  className="text-2xl font-JakartaBold border-b border-gray-300 px-2"
                  autoFocus
                />
                <TouchableOpacity
                  onPress={handleSaveUsername}
                  className="ml-2 bg-gray-100 p-2 rounded-full"
                >
                  <Ionicons name="checkmark" size={16} color="black" />
                </TouchableOpacity>
              </View>
            ) : (
              <View className="flex-row items-center">
                <Text className="text-2xl font-JakartaBold">
                  {userResult?.[0]?.username ?? user?.username ?? "Username"}
                </Text>
                <TouchableOpacity
                  onPress={() => setIsEditingUsername(true)}
                  className="ml-2 bg-gray-100 p-1 rounded-full"
                >
                  <Ionicons name="pencil" size={16} color="black" />
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Followers/Following Count */}
          <View className="mt-6 mb-3 flex-row justify-between w-full px-10">
            <View className="items-center">
              <Text className="text-lg font-JakartaBold">{followersCount}</Text>
              <Text className="text-sm text-gray-500">Followers</Text>
            </View>
            <View className="items-center">
              <Text className="text-lg font-JakartaBold">{followingCount}</Text>
              <Text className="text-sm text-gray-500">Following</Text>
            </View>
          </View>
        </View>

        {/* Divider */}
        <View className="mt-5 mb-5 border-b border-gray-200" />

        {/* About Me Section */}
        <View className="mt-3">
          <View className="flex-row justify-between items-center">
            <Text className="text-xl font-JakartaBold">About Me</Text>
            {!isEditingBio && (
              <TouchableOpacity
                onPress={() => setIsEditingBio(true)}
                className="bg-gray-100 p-1 rounded-full"
              >
                <Ionicons name="pencil" size={16} color="black" />
              </TouchableOpacity>
            )}
          </View>
          {isEditingBio ? (
            <View className="mt-2">
              <TextInput
                value={newBio}
                onChangeText={setNewBio}
                multiline
                className="text-sm text-gray-500 border border-gray-300 p-2 rounded"
                autoFocus
              />
              <TouchableOpacity
                onPress={handleSaveBio}
                className="mt-2 bg-gray-100 p-2 rounded-full self-end"
              >
                <Ionicons name="checkmark" size={16} color="black" />
              </TouchableOpacity>
            </View>
          ) : (
            <Text className="text-sm text-gray-500 mt-2">
              {userResult?.[0]?.bio ?? "Tell us about yourself!"}
            </Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default Profile;