import {
  ActivityIndicator,
  Image,
  ImageBackground,
  StyleSheet,
  Text,
} from "react-native";

export default function Splashscreen() {
  return (
    <ImageBackground
      source={require("../../assets/images/background.png")}
      style={styles.container}
      resizeMode="cover"
    >
      <Image
        source={require("../../assets/images/logo.png")}
        style={styles.logo}
        resizeMode="contain"
      />
      <Text style={styles.title}>Gig Finances</Text>
      <ActivityIndicator
        size="small"
        color="#10b981"
        style={{ marginTop: 24 }}
      />
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    height: "100%",
    backgroundColor: "#081421",
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    marginTop: "-45%",
    width: 200,
    height: 200,
    borderRadius: 50,
  },
  title: {
    marginTop: 43,
    fontSize: 32,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.75,
    shadowColor: "rgba(16, 185, 129, 0.3)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 4,
  },
});
