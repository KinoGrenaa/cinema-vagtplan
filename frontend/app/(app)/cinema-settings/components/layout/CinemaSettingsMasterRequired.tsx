export default function CinemaSettingsMasterRequired() {
  return (
    <main className="min-h-screen bg-gray-100 p-4 dark:bg-gray-950 md:p-8">
      <div className="mx-auto max-w-4xl rounded-2xl border border-yellow-200 bg-yellow-50 p-6 text-yellow-900 shadow-sm dark:border-yellow-900 dark:bg-yellow-950/30 dark:text-yellow-100">
        <div className="font-semibold">Biograf skal vælges</div>
        <p className="mt-2 text-sm">
          MASTER-brugere skal først vælge en biograf i MASTER-panelet.
        </p>
        <a
          href="/master"
          className="mt-4 inline-flex rounded-xl bg-yellow-700 px-4 py-2 text-sm font-semibold text-white hover:bg-yellow-800"
        >
          Gå til MASTER-panel
        </a>
      </div>
    </main>
  );
}
