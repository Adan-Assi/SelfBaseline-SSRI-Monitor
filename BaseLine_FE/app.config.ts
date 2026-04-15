import type { ConfigContext, ExpoConfig } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => {
  const name = config.name ?? "BaseLine";
  const slug = config.slug ?? "BaseLine";

  return {
    ...config,
    name,
    slug,
    extra: {
      ...(config.extra ?? {}),
      dataMode: "real", // "real" | "partial" | "mock"
      apiBaseUrl: "https://mental-health-api-92209979855.us-east1.run.app",
    },
  };
};
