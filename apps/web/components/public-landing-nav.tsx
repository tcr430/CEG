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
      <Link href={isAuthenticated ? "/app" : "/sign-up"} className="landingV2NavCta">
        {isAuthenticated ? "Dashboard" : "Create account"}
      </Link>
    </nav>
  );
}
