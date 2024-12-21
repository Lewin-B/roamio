import { useUser } from "@clerk/clerk-expo";
import { Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const Rides = () => {
  const { user } = useUser();

  return (
    <SafeAreaView className="flex-1 bg-white">
      <Text>Itineraries</Text>
    </SafeAreaView>
  );
};

export default Rides;
