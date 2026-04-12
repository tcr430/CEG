import Link from "next/link";

type FooterLink = {
  label: string;
  href: string;
};

type FooterColumnProps = {
  title: string;
  links: FooterLink[];
};

function FooterColumn({ title, links }: FooterColumnProps) {
  return (
    <div className="publicFooterColumn">
      <h3>{title}</h3>
      <ul>
        {links.map((link) => (
          <li key={`${title}-${link.href}-${link.label}`}>
            <Link href={link.href}>{link.label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

const footerColumns: FooterColumnProps[] = [
  {
    title: "Product",
    links: [
      { label: "Workflow", href: "/#workflow" },
      { label: "Memory", href: "/#memory" },
      { label: "Trust", href: "/#trust" },
      { label: "Pricing", href: "/pricing" },
      { label: "Create workspace", href: "/sign-up" },
    ],
  },
  {
    title: "Solutions",
    links: [
      { label: "Agencies", href: "/pricing" },
      { label: "SDR teams", href: "/sign-up?plan=pro" },
      { label: "Founders", href: "/sign-up?plan=free" },
      { label: "Reply handling", href: "/#product-surface" },
      { label: "Prospect research", href: "/#workflow" },
    ],
  },
  {
    title: "Platform",
    links: [
      { label: "Sender profiles", href: "/pricing" },
      { label: "Campaign context", href: "/#memory" },
      { label: "Research snapshots", href: "/#product-surface" },
      { label: "Draft handoff", href: "/#product-surface" },
      { label: "Performance summaries", href: "/#product-surface" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Product overview", href: "/" },
      { label: "Pricing", href: "/pricing" },
      { label: "Security and trust", href: "/#trust" },
      { label: "About OutFlow", href: "/about" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Contact", href: "/contact" },
      { label: "Terms", href: "/terms" },
      { label: "Privacy", href: "/privacy" },
    ],
  },
];

export function MarketingFooter() {
  return (
    <footer className="publicFooter" aria-label="Footer">
      <div className="publicFooterGrid">
        <div className="publicFooterBrandBlock">
          <Link href="/" className="publicBrand" aria-label="OutFlow home">
            <span className="publicBrandMark">OF</span>
            <span>OutFlow</span>
          </Link>
          <p className="publicFooterPositioning">
            Agency-grade outbound workflow for structured research, drafts, replies,
            and review.
          </p>
          <p className="publicFooterTrust">
            Controlled execution for serious client work. AI proposes, human approves.
          </p>
          <div className="publicFooterMeta">
            <span>© 2026 OutFlow</span>
            <div className="publicFooterInlineLinks">
              <Link href="/privacy">Privacy</Link>
              <Link href="/terms">Terms</Link>
            </div>
          </div>
        </div>

        <div className="publicFooterColumns">
          {footerColumns.map((column) => (
            <FooterColumn key={column.title} title={column.title} links={column.links} />
          ))}
        </div>
      </div>
    </footer>
  );
}
