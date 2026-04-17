import Link from "next/link";

type PublicLandingNavProps = {
  isAuthenticated: boolean;
};

export function PublicLandingNav({ isAuthenticated }: PublicLandingNavProps) {
  return (
    <div className="publicNavWrap">
      <nav className="publicNav" aria-label="Public navigation">
        <Link href="/" className="publicBrand" aria-label="OutFlow home">
          <span className="publicBrandMark">OF</span>
          <span>OutFlow</span>
        </Link>
        <div className="publicNavLinks">
          <Link href="/#workflow">Workflow</Link>
          <Link href="/#memory">Memory</Link>
          <Link href="/#trust">Trust</Link>
          <Link href="/pricing">Pricing</Link>
        </div>
        <div className="publicNavActions">
          {isAuthenticated ? null : (
            <Link href="/sign-in" className="publicNavLogin">
              Log in
            </Link>
          )}
          <Link href={isAuthenticated ? "/app/billing" : "/create-account"} className="publicNavCta">
            {isAuthenticated ? "Choose plan" : "Create account"}
          </Link>
        </div>
      </nav>
    </div>
  );
}
