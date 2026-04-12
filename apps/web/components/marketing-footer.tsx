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
      { label: "Agencies", href: "/" },
      { label: "SDR teams", href: "/pricing" },
      { label: "Founders", href: "/pricing" },
      { label: "Reply handling", href: "/#product-surface" },
      { label: "Prospect research", href: "/#workflow" },
    ],
  },
  {
    title: "Platform",
    links: [
      { label: "Sender profiles", href: "/#memory" },
      { label: "Campaign context", href: "/#workflow" },
      { label: "Research snapshots", href: "/#product-surface" },
      { label: "Draft handoff", href: "/#trust" },
      { label: "Performance summaries", href: "/pricing" },
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
            The operating system for agency-grade hyperpersonalized cold email.
          </p>
          <p className="publicFooterTrust">
            Structured research, reviewable drafts, reply handling, and controlled
            execution for serious client work.
          </p>
          <div className="publicFooterMeta">
            <span>(c) 2026 OutFlow</span>
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
