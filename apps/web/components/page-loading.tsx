import { Card } from "@/components/ui/card";

type PageLoadingProps = {
  eyebrow: string;
  title: string;
  description: string;
  lines?: number;
  columns?: 1 | 2;
  cardCount?: number;
};

export function PageLoading({
  eyebrow,
  title,
  description,
  lines = 3,
  columns = 1,
  cardCount = 3,
}: PageLoadingProps) {
  const contentLines = Array.from({ length: lines }, (_, index) => index);
  const cards = Array.from({ length: cardCount }, (_, index) => index);

  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="lede">{description}</p>
      </section>

      <section
        className={`profileDetailGrid pageLoadingGrid${columns === 1 ? " pageLoadingGridSingle" : ""}`}
      >
        {cards.map((card) => (
          <Card key={card} className="p-5 loadingCard">
            <div className="loadingSkeleton loadingSkeletonTitle" />
            {contentLines.map((line) => (
              <div
                key={line}
                className={`loadingSkeleton${line === contentLines.length - 1 ? " loadingSkeletonShort" : ""}`}
              />
            ))}
          </Card>
        ))}
      </section>
    </main>
  );
}
