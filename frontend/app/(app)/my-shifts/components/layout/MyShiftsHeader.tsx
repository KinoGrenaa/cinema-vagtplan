type MyShiftsHeaderProps = {
  userLoaded: boolean;
  isMasterWithoutOwnCinema: boolean;
};

export default function MyShiftsHeader({
  userLoaded,
  isMasterWithoutOwnCinema,
}: MyShiftsHeaderProps) {
  return (
    <>
      <header className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900">
        <h1 className="text-3xl font-bold text-gray-950 dark:text-gray-50">
          Mine vagter
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Oversigt over dine vagter pr. måned.
        </p>
      </header>

      {!userLoaded && (
        <div
          className="rounded-2xl border border-gray-200 bg-white p-6 text-gray-600 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400"
          role="status"
          aria-live="polite"
        >
          Henter bruger...
        </div>
      )}

      {isMasterWithoutOwnCinema && (
        <section className="rounded-2xl border border-amber-300 bg-amber-50 p-5 text-amber-950 shadow-sm dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-100">
          <h2 className="text-lg font-semibold">
            Denne side er til egne vagter
          </h2>
          <p className="mt-2 text-sm leading-6">
            MASTER-brugere har ikke egne vagter i en konkret biograf. Brug
            vagtplanen eller vælg en almindelig bruger, hvis du skal teste
            medarbejderflowet.
          </p>
        </section>
      )}
    </>
  );
}
