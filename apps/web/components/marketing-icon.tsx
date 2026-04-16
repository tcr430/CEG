export type MarketingIconName =
  | "house"
  | "aim"
  | "target"
  | "check"
  | "spark"
  | "timer"
  | "launch"
  | "focus"
  | "loop";

type MarketingIconProps = {
  name: MarketingIconName;
};

function iconPath(name: MarketingIconName) {
  switch (name) {
    case "house":
      return (
        <>
          <path d="M5.75 11 12 5.75 18.25 11" />
          <path d="M7.25 10.5v7.25h9.5V10.5" />
          <path d="M10.25 17.75v-4.25h3.5v4.25" />
        </>
      );
    case "aim":
      return (
        <>
          <circle cx="12" cy="12" r="6.5" />
          <circle cx="12" cy="12" r="2.5" />
          <path d="M12 3.75v2.25" />
          <path d="M12 18v2.25" />
          <path d="M3.75 12H6" />
          <path d="M18 12h2.25" />
        </>
      );
    case "target":
      return (
        <>
          <circle cx="12" cy="12" r="6.5" />
          <circle cx="12" cy="12" r="2.5" />
        </>
      );
    case "check":
      return <path d="M6.5 12.5 10.25 16 17.5 7.5" />;
    case "spark":
      return (
        <path d="m12 4 1.9 4.1L18 10l-4.1 1.9L12 16l-1.9-4.1L6 10l4.1-1.9Z" />
      );
    case "timer":
      return (
        <>
          <circle cx="12" cy="13" r="6.25" />
          <path d="M12 13V9.5" />
          <path d="m12 13 2.6 1.6" />
          <path d="M9.75 4.75h4.5" />
          <path d="M12 4.75v2" />
        </>
      );
    case "launch":
      return (
        <>
          <path d="M7.5 16.5 16.5 7.5" />
          <path d="M9 7.5h7.5V15" />
        </>
      );
    case "focus":
      return (
        <>
          <path d="M12 6.5a5.5 5.5 0 1 1 0 11" />
          <path d="M12 9.25a2.75 2.75 0 1 1 0 5.5" />
        </>
      );
    case "loop":
      return (
        <>
          <path d="M7.25 9.25A5 5 0 0 1 16 8.5l1.25 1.25" />
          <path d="M16.75 14.75A5 5 0 0 1 8 15.5l-1.25-1.25" />
          <path d="M17.25 6.75v3.5h-3.5" />
          <path d="M6.75 17.25v-3.5h3.5" />
        </>
      );
  }
}

export function MarketingIcon({ name }: MarketingIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="marketingIconSvg"
    >
      {iconPath(name)}
    </svg>
  );
}
