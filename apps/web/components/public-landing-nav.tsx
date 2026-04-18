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
          <Link href="/#product">Product</Link>
          <Link href="/#how-it-works">How it works</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/#trust">Trust</Link>
        </div>
        <div className="publicNavActions">
          {isAuthenticated ? null : (
            <Link href="/sign-in" className="publicNavLogin">
              Log in
            </Link>
          )}
          <Link href={isAuthenticated ? "/app/billing" : "/create-account"} className="publicNavCta">
            {isAuthenticated ? "Open billing" : "Start your agency workspace"}
          </Link>
        </div>
      </nav>
    </div>
  );
}
