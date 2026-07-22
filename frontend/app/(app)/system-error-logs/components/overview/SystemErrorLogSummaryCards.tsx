type SystemErrorLogSummaryCard = {
  label: string;
  value: number;
};

type SystemErrorLogSummaryCardsProps = {
  cards: SystemErrorLogSummaryCard[];
};

export default function SystemErrorLogSummaryCards({
  cards,
}: SystemErrorLogSummaryCardsProps) {
  return (
    <section className="grid gap-3 md:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-2xl border border-gray-200 bg-white p-4 text-gray-900 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100"
        >
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {card.label}
          </p>

          <p className="mt-1 text-3xl font-bold text-gray-950 dark:text-white">
            {card.value}
          </p>
        </div>
      ))}
    </section>
  );
}
