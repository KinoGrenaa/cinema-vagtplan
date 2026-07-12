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
          className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900"
        >
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {card.label}
          </p>
          <p className="mt-1 text-3xl font-bold">{card.value}</p>
        </div>
      ))}
    </section>
  );
}
