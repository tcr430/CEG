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
      { label: "Product overview", href: "/#product" },
      { label: "How it works", href: "/#how-it-works" },
      { label: "Trust", href: "/#trust" },
      { label: "Pricing", href: "/pricing" },
      { label: "Create account", href: "/create-account" },
    ],
  },
  {
    title: "Agency use cases",
    links: [
      { label: "Multi-client outbound operations", href: "/#product" },
      { label: "Prospect research workflow", href: "/#how-it-works" },
      { label: "Review and approval", href: "/#trust" },
      { label: "Reply handling", href: "/#how-it-works" },
      { label: "Plan comparison", href: "/pricing" },
    ],
  },
  {
    title: "Platform",
    links: [
      { label: "Campaign context", href: "/#product-detail" },
      { label: "Research snapshots", href: "/#product-detail" },
      { label: "Draft review workflow", href: "/#trust" },
      { label: "Draft handoff", href: "/#trust" },
      { label: "Reply handling", href: "/#product-detail" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "About OutFlow", href: "/about" },
      { label: "Pricing", href: "/pricing" },
      { label: "Trust model", href: "/#trust" },
      { label: "Privacy", href: "/privacy" },
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
            Outbound workflow software for agencies running personalized cold email.
          </p>
          <p className="publicFooterTrust">
            Keep client context, prospect research, draft review, and reply handling
            in one controlled workflow.
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
