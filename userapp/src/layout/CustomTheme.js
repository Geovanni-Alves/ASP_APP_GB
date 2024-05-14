import { useTheme } from "@aws-amplify/ui-react-native";
function getTheme() {
  const {
    tokens: { colors },
  } = useTheme();
  const theme = {
    name: "Custom Theme",
    tokens: {
      colors: {
        background: {
          primary: {
            value: colors.white["100"],
          },
          secondary: {
            value: colors.red["100"],
          },
        },
        font: {
          primary: colors.black,
          secondary: colors.black,
          interactive: {
            value: colors.blue["80"],
          },
        },
        brand: {
          primary: {
            10: colors.green["10"],
            80: colors.green["80"],
            90: colors.green["90"],
            100: colors.green["100"],
          },
        },
      },
    },
  };
  return theme;
}

export default getTheme;
