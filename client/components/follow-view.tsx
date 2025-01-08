import { Undo2 } from "lucide-react-native";
import { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  SafeAreaView,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
} from "react-native";
import SearchBar from "react-native-dynamic-search-bar";

import type { User } from "@/app/(root)/place-view";

import { fetchAPI } from "@/lib/fetch";

// Custom debounce hook
const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

const FollowerModal = ({
  visible,
  onClose,
  user,
}: {
  visible: boolean;
  onClose: () => void;
  user: User | undefined;
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const debouncedSearchQuery = useDebounce(searchQuery, 500); // 500ms delay

  const [suggestions] = useState<User[]>([
    {
      id: 1,
      username: "@johndoe",
      clerk_id: "asdlkfja;lskdfj",
      email: "",
      reviews: [],
      image: "",
      followers: "",
      following: "",
    },
    {
      id: 2,
      username: "@janesmith",
      clerk_id: "alsdfj;asldfj;a",
      email: "a",
      reviews: [],
      image: "",
      followers: "",
      following: "",
    },
    {
      id: 3,
      clerk_id: "asdfk;ja",
      username: "@mikej",
      email: "",
      reviews: [],
      image: "",
      followers: "",
      following: "",
    },
  ]);

  const handleFollow = async (follower: User) => {
    try {
      const followResult = await fetchAPI(
        `${process.env.EXPO_PUBLIC_BACKEND_URL}/users/${user?.id}/follow/${follower.id}`,
        { method: "POST" }
      );

      alert(`followed ${follower.username}`);
      setSearchResults([]);
      setSearchQuery("");
      console.log(followResult);
    } catch (err) {
      alert("Unable to follow");
    }
  };

  const handleUnfollow = async (followee: User) => {
    try {
      const unfollowResult = await fetchAPI(
        `${process.env.EXPO_PUBLIC_BACKEND_URL}/users/${user?.id}/unfollow/${followee.id}`,
        { method: "POST" }
      );

      alert(`unfollowed ${followee.username}`);
      setSearchResults([]);
      setSearchQuery("");
      console.log("Unfollow Result: ", unfollowResult);
    } catch (err) {
      alert("Unable to unfollow");
    }
  };

  const isFollowing = (newUser: User) => {
    console.log("New followers: ", newUser.followers);
    const followers: User[] = JSON.parse(newUser.followers || "[]");
    console.log("User: ", user);

    // Iterate through the followers and check for a matching ID
    return followers.some((follower) => follower.id === user?.id);
  };

  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setLoading(true);
      const searchResult = await fetchAPI(
        `${process.env.EXPO_PUBLIC_BACKEND_URL}/users/search?username=${query}`
      );
      setSearchResults(searchResult || []);
      console.log("Search Result: ", searchResult);
    } catch (error) {
      console.error("Search error:", error);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Effect to trigger search when debounced query changes
  useEffect(() => {
    handleSearch(debouncedSearchQuery);
  }, [debouncedSearchQuery, handleSearch]);

  const handleSearchInputChange = (text: string) => {
    setSearchQuery(text);
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
  };

  const displayUsers = searchQuery ? searchResults : suggestions;

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-white">
        <SafeAreaView className="flex-1">
          <View className="px-4 py-2 border-b border-gray-100">
            <View className="flex-row items-start space-x-4">
              <TouchableOpacity onPress={onClose} className="ml-2 p-2">
                <Undo2 size={24} color="#6b7280" />
              </TouchableOpacity>
              <SearchBar
                placeholder="Search here"
                onChangeText={handleSearchInputChange}
                onClearPress={handleClearSearch}
                autoFocus={true}
                className="flex-1"
                value={searchQuery}
              />
            </View>
          </View>

          <ScrollView className="flex-1">
            <View className="p-4 border-t border-gray-100">
              {loading ? (
                <View className="py-4">
                  <Text className="text-gray-500 text-center">
                    Searching...
                  </Text>
                </View>
              ) : (
                <>
                  <Text className="text-lg font-semibold text-gray-900 mb-2">
                    {searchQuery ? "Search Results" : "Suggested Users"}
                  </Text>
                  {displayUsers.length > 0 ? (
                    displayUsers.map((user) => (
                      <TouchableOpacity
                        key={user.id}
                        className="flex-row items-center justify-between py-3"
                      >
                        <View className="flex-row items-center">
                          <Image
                            source={{ uri: user.image }}
                            className="w-10 h-10 rounded-full"
                          />
                          <View className="ml-3">
                            <Text className="text-gray-500">
                              {user.username}
                            </Text>
                          </View>
                        </View>
                        <TouchableOpacity
                          onPress={() =>
                            isFollowing(user)
                              ? handleUnfollow(user)
                              : handleFollow(user)
                          }
                          className={`px-4 py-2 rounded-full ${
                            isFollowing(user) ? "bg-green-600" : "bg-indigo-600"
                          }`}
                        >
                          <Text className="text-white font-medium">
                            {isFollowing(user) ? "Following" : "Follow"}
                          </Text>
                        </TouchableOpacity>
                      </TouchableOpacity>
                    ))
                  ) : (
                    <Text className="text-gray-500 text-center py-4">
                      No users found
                    </Text>
                  )}
                </>
              )}
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

export default FollowerModal;