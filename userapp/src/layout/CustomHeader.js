import { Text, SafeAreaView, View, Image } from "react-native";
import { useTheme } from "@aws-amplify/ui-react-native";

const CustomHeader = () => {
  const {
    tokens: { space, fontSizes },
  } = useTheme();

  return (
    <SafeAreaView>
      <Image
        source={require("../../assets/icon.png")}
        style={{
          width: "20%",
          height: "30%",
          //paddingTop: 20,
          marginTop: 5,
          marginBottom: 5,
          resizeMode: "cover",
          alignSelf: "center",
          borderRadius: 100,
          overflow: "hidden",
        }}
      />
      <Text
        style={{
          fontSize: 15, //fontSizes.xxl,
          //paddingBottom: space.xxl,
          textAlign: "center",
        }}
      >
        After School Program
      </Text>
    </SafeAreaView>
  );
};
export default CustomHeader;
