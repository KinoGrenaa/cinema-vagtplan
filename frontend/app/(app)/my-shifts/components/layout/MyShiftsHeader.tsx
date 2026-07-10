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
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900">
        <h1 className="text-3xl font-bold">Mine vagter</h1>
        <p className="mt-2 text-gray-500 dark:text-gray-400">
          Oversigt over dine vagter pr. måned.
        </p>
      </div>

      {!userLoaded && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 text-gray-500 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
          Henter bruger...
        </div>
      )}

      {isMasterWithoutOwnCinema && (
        <div className="rounded-2xl border border-yellow-300 bg-yellow-50 p-5 text-yellow-900 shadow-sm dark:border-yellow-900/70 dark:bg-yellow-950/30 dark:text-yellow-100">
          <h2 className="text-lg font-semibold">
            Denne side er til egne vagter
          </h2>
          <p className="mt-2 text-sm">
            MASTER-brugere har ikke egne vagter i en konkret biograf. Brug
            vagtplanen eller vælg en almindelig bruger, hvis du skal teste
            medarbejderflowet.
          </p>
        </div>
      )}
    </>
  );
}
