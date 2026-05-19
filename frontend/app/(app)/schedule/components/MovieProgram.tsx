type MovieProgramProps = {
  movieShowings: any[];
};

export default function MovieProgram({ movieShowings }: MovieProgramProps) {
  return (
    <div className="bg-white rounded-xl shadow p-6 mt-6">
      <h2 className="text-3xl font-bold mb-4">Dagens program</h2>

      <div className="border rounded-lg overflow-hidden">
        <div className="grid grid-cols-5 bg-gray-50 font-medium text-sm">
          <div className="p-3 border-r">Film</div>
          <div className="p-3 border-r">Sal</div>
          <div className="p-3 border-r">Start</div>
          <div className="p-3 border-r">Slut</div>
          <div className="p-3">Billetter</div>
        </div>

        {movieShowings.map((movie) => (
          <div key={movie.id} className="grid grid-cols-5 border-t text-sm">
            <div className="p-3 border-r font-medium">{movie.title}</div>
            <div className="p-3 border-r">{movie.hall}</div>
            <div className="p-3 border-r">
              {new Date(movie.startTime).toLocaleTimeString("da-DK", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
            <div className="p-3 border-r">
              {new Date(movie.endTime).toLocaleTimeString("da-DK", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
            <div className="p-3">
              {movie.soldSeats} solgt / {movie.freeSeats} ledige
            </div>
          </div>
        ))}

        {movieShowings.length === 0 && (
          <div className="p-4 text-gray-500">Ingen film denne dag</div>
        )}
      </div>
    </div>
  );
}
