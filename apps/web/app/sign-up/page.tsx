import { redirect } from "next/navigation";

type LegacySignUpPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LegacySignUpPage({
  searchParams,
}: LegacySignUpPageProps) {
  const params = (await searchParams) ?? {};
  const nextParams = new URLSearchParams();

  for (const [key, rawValue] of Object.entries(params)) {
    if (Array.isArray(rawValue)) {
      for (const value of rawValue) {
        nextParams.append(key, value);
      }
      continue;
    }

    if (typeof rawValue === "string") {
      nextParams.set(key, rawValue);
    }
  }

  const suffix = nextParams.toString();
  redirect(suffix.length > 0 ? `/create-account?${suffix}` : "/create-account");
}
