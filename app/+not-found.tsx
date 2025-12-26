import { Link, Stack } from "expo-router";
import { AlertCircle } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Not Found" }} />
      <View style={styles.container}>
        <AlertCircle size={64} color="#94A3B8" />
        <Text style={styles.title}>Page not found</Text>
        <Text style={styles.subtitle}>This page doesn&apos;t exist</Text>

        <Link href="/(tabs)" style={styles.link}>
          <Text style={styles.linkText}>Go to Dashboard</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#F8FAFC",
  },
  title: {
    fontSize: 24,
    fontWeight: "700" as const,
    color: "#0F172A",
    marginTop: 16,
  },
  subtitle: {
    fontSize: 15,
    color: "#64748B",
    marginTop: 8,
  },
  link: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#0066CC",
  },
  linkText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: "#FFF",
  },
});
