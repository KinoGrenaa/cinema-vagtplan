type ShiftFormProps = {
  users: any[];
  workTypes: any[];
  startTime: string;
  setStartTime: (value: string) => void;
  endTime: string;
  setEndTime: (value: string) => void;
  note: string;
  setNote: (value: string) => void;
  userId: number;
  setUserId: (value: number) => void;
  workTypeId: number;
  setWorkTypeId: (value: number) => void;
  selectedShift: any;
  onSubmit: (event: React.FormEvent) => void;
  onDelete: () => void;
  onCancel: () => void;
  onOfferTrade: () => void;
};

export default function ShiftForm({
  users,
  workTypes,
  startTime,
  setStartTime,
  endTime,
  setEndTime,
  note,
  setNote,
  userId,
  setUserId,
  workTypeId,
  setWorkTypeId,
  selectedShift,
  onSubmit,
  onDelete,
  onCancel,
  onOfferTrade,
}: ShiftFormProps) {
  return (
    <div className="bg-white rounded-xl shadow p-6 mb-6">
      <h1 className="text-3xl font-bold mb-4">
        {selectedShift ? 'Rediger vagt' : 'Opret vagt'}
      </h1>

      <form
        onSubmit={onSubmit}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        <div>
          <label className="block mb-1 font-medium">Start</label>
          <input
            type="datetime-local"
            className="w-full border rounded-lg px-3 py-2"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
        </div>

        <div>
          <label className="block mb-1 font-medium">Slut</label>
          <input
            type="datetime-local"
            className="w-full border rounded-lg px-3 py-2"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
          />
        </div>

        <div>
          <label className="block mb-1 font-medium">Note</label>
          <input
            className="w-full border rounded-lg px-3 py-2"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Fx aftenvagt"
          />
        </div>

        <div>
          <label className="block mb-1 font-medium">Medarbejder</label>
          <select
            className="w-full border rounded-lg px-3 py-2"
            value={userId}
            onChange={(e) => setUserId(Number(e.target.value))}
          >
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.firstName} {user.lastName}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block mb-1 font-medium">Arbejdstype</label>
          <select
            className="w-full border rounded-lg px-3 py-2"
            value={workTypeId}
            onChange={(e) => setWorkTypeId(Number(e.target.value))}
          >
            {workTypes.map((workType) => (
              <option key={workType.id} value={workType.id}>
                {workType.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-end gap-2">
          <button
            type="submit"
            className="w-full bg-black text-white py-3 rounded-lg"
          >
            {selectedShift ? 'Gem ændringer' : 'Opret vagt'}
          </button>
        </div>
      </form>

      {selectedShift && (
        <div className="flex gap-3 mt-4">
          <button
            onClick={onDelete}
            className="bg-red-600 text-white px-5 py-2 rounded-lg"
          >
            Slet vagt
          </button>

          <button
            onClick={onCancel}
            className="bg-gray-200 px-5 py-2 rounded-lg"
          >
            Annuller
          </button>
          <button
            onClick={onOfferTrade}
            className="bg-blue-600 text-white px-5 py-2 rounded-lg"
            >
            Send i byttepulje
</button>
        </div>
      )}
    </div>
  );
}