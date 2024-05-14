import { Text, View } from "react-native";
import { useTheme } from "@aws-amplify/ui-react-native";

const CustomFooter = () => {
  const {
    tokens: { space, fontSizes },
  } = useTheme();
  return (
    <View>
      <Text
        style={{
          fontSize: 12, //fontSizes.xxl,
          paddingTop: space.xxl,
          textAlign: "center",
        }}
      >
        Gracie Barra Brazilian Jiu Jitsu - AfterSchool Program
      </Text>
    </View>
  );
};
export default CustomFooter;
