export function isDemoSeedEnabled(input: {
  nodeEnv?: string;
  enabledFlag?: string;
}): boolean {
  const nodeEnv = input.nodeEnv ?? process.env.NODE_ENV;
  const enabledFlag = input.enabledFlag ?? process.env.DEMO_SEED_ENABLED;

  if (nodeEnv === "production") {
    return false;
  }

  if (enabledFlag == null) {
    return false;
  }

  const normalized = enabledFlag.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

export function readDemoSeedVersion(settings: Record<string, unknown>): string | null {
  const demoSeed =
    typeof settings.demoSeed === "object" && settings.demoSeed !== null
      ? (settings.demoSeed as Record<string, unknown>)
      : null;

  return demoSeed && typeof demoSeed.version === "string" ? demoSeed.version : null;
}

export function readDemoSeedLoadedAt(settings: Record<string, unknown>): string | null {
  const demoSeed =
    typeof settings.demoSeed === "object" && settings.demoSeed !== null
      ? (settings.demoSeed as Record<string, unknown>)
      : null;

  return demoSeed && typeof demoSeed.loadedAt === "string" ? demoSeed.loadedAt : null;
}