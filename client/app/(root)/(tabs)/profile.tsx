import { useUser } from "@clerk/clerk-expo";
import { ScrollView, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const Profile = () => {
  const { user } = useUser();

  return (
    <SafeAreaView className="flex-1">
      <ScrollView
        className="px-5"
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        <Text className="text-2xl font-JakartaBold my-5">
          My profile {user?.username}{" "}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

export default Profile;
