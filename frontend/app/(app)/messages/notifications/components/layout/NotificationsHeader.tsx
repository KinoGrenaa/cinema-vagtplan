"use client";

type NotificationsHeaderProps = {
  attentionCount: number;
};

export default function NotificationsHeader({
  attentionCount,
}: NotificationsHeaderProps) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900">
      <div>
        <h1 className="text-3xl font-bold">
          Notifikationer
        </h1>
        <p className="mt-2 text-gray-500 dark:text-gray-400">
          {attentionCount === 0
            ? "Intet kræver din opmærksomhed."
            : attentionCount === 1
              ? "Én notifikation kræver din opmærksomhed."
              :
              `${attentionCount} notifikationer kræver din opmærksomhed.`}
        </p>
      </div>
    </section>
  );
}
