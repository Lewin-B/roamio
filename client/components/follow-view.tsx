import { Undo2 } from "lucide-react-native";
import { useState, useCallback } from "react";
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

const FollowerModal = ({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) => {
  const [suggestions] = useState([
    {
      id: 1,
      name: "John Doe",
      username: "@johndoe",
      image: "/api/placeholder/40/40",
    },
    {
      id: 2,
      name: "Jane Smith",
      username: "@janesmith",
      image: "/api/placeholder/40/40",
    },
    {
      id: 3,
      name: "Mike Johnson",
      username: "@mikej",
      image: "/api/placeholder/40/40",
    },
  ]);

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
                onChangeText={(text) => console.log(text)}
                autoFocus={true}
                onClearPress={() => onClose}
                className="flex-1"
              />
            </View>
          </View>

          <ScrollView className="flex-1">
            {/* Suggested Users Section */}
            <View className="p-4 border-t border-gray-100">
              <Text className="text-lg font-semibold text-gray-900 mb-2">
                Suggested Users
              </Text>
              {suggestions.map((user) => (
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
                      <Text className="font-medium text-gray-900">
                        {user.name}
                      </Text>
                      <Text className="text-gray-500">{user.username}</Text>
                    </View>
                  </View>
                  <TouchableOpacity className="px-4 py-2 bg-indigo-600 rounded-full">
                    <Text className="text-white font-medium">Follow</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

export default FollowerModal;
