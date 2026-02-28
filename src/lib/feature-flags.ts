/**
 * Simple server-side feature flags backed by environment variables.
 *
 * To enable a provider integration, set the corresponding env var to "true"
 * or ensure the provider's API key is set. To force-disable a provider
 * even when credentials exist, set FEATURE_<NAME>=false.
 */

interface FeatureFlags {
  /** DataForSEO domain metrics and backlink data */
  dataforseo: boolean;
  /** Google Custom Search for discovery and keyword alerts */
  googleSearch: boolean;
  /** Hunter.io contact enrichment */
  hunter: boolean;
  /** Anthropic Claude for outreach generation and site analysis */
  anthropic: boolean;
  /** Stripe billing integration */
  stripe: boolean;
  /** Link verification (external HTTP fetches) */
  linkVerification: boolean;
}

function isEnabled(flagEnv: string | undefined, credentialEnv: string | undefined): boolean {
  // Explicit flag takes priority
  if (flagEnv === 'false') return false;
  if (flagEnv === 'true') return true;
  // Fall back to checking if credentials are configured
  return !!credentialEnv && credentialEnv.length > 0;
}

export function getFeatureFlags(): FeatureFlags {
  return {
    dataforseo: isEnabled(
      process.env.FEATURE_DATAFORSEO,
      process.env.DATAFORSEO_LOGIN,
    ),
    googleSearch: isEnabled(
      process.env.FEATURE_GOOGLE_SEARCH,
      process.env.GOOGLE_CSE_API_KEY,
    ),
    hunter: isEnabled(
      process.env.FEATURE_HUNTER,
      process.env.HUNTER_API_KEY,
    ),
    anthropic: isEnabled(
      process.env.FEATURE_ANTHROPIC,
      process.env.ANTHROPIC_API_KEY,
    ),
    stripe: isEnabled(
      process.env.FEATURE_STRIPE,
      process.env.STRIPE_WEBHOOK_SECRET,
    ),
    linkVerification: isEnabled(
      process.env.FEATURE_LINK_VERIFICATION,
      'enabled', // No credential needed — enabled by default
    ),
  };
}

/**
 * Check if a specific feature is enabled. Throws if the feature is disabled
 * and `throwIfDisabled` is true; otherwise returns the flag value.
 */
export function requireFeature(
  feature: keyof FeatureFlags,
  throwIfDisabled = false,
): boolean {
  const flags = getFeatureFlags();
  const enabled = flags[feature];
  if (!enabled && throwIfDisabled) {
    throw new Error(`Feature "${feature}" is not enabled. Check your environment configuration.`);
  }
  return enabled;
}
