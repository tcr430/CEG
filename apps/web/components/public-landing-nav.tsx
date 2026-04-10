import Link from "next/link";

type PublicLandingNavProps = {
  isAuthenticated: boolean;
};

export function PublicLandingNav({ isAuthenticated }: PublicLandingNavProps) {
  return (
    <nav className="landingV2Nav" aria-label="Public navigation">
      <Link href="/" className="landingV2Brand" aria-label="OutFlow home">
        <span className="landingV2BrandMark">OF</span>
        <span>OutFlow</span>
      </Link>
      <div className="landingV2NavLinks">
        <Link href="/#workflow">Workflow</Link>
        <Link href="/#memory">Memory</Link>
        <Link href="/#trust">Trust</Link>
        <Link href="/pricing">Pricing</Link>
      </div>
      <div className="landingV2NavActions">
        {isAuthenticated ? null : (
          <Link href="/sign-in" className="landingV2NavLogin">
            Log in
          </Link>
        )}
        <Link href={isAuthenticated ? "/app" : "/sign-up"} className="landingV2NavCta">
          {isAuthenticated ? "Dashboard" : "Create account"}
        </Link>
      </div>
    </nav>
  );
}
