import ShiftCard from './ShiftCard';

const hours = Array.from({ length: 25 }, (_, i) =>
  i.toString().padStart(2, '0'),
);

const TIMELINE_WIDTH = 2400;
const START_HOUR = 0;
const TOTAL_HOURS = 24;

type ShiftTimelineProps = {
  shifts: any[];
  users: any[];
  selectedDate: string;
  onSelectShift: (shift: any) => void;
  onMoveShift: (shift: any, newStartHour: number, newStartMinute: number) => void;
  onChangeShiftUser: (shift: any, newUserId: number) => void;
  onResizeShift: (
  shift: any,
  newStartHour: number,
  newStartMinute: number,
  newEndHour: number,
  newEndMinute: number,
) => void;
};

export default function ShiftTimeline({
  shifts,
  users,
  selectedDate,
  onSelectShift,
  onMoveShift,
  onChangeShiftUser,
  onResizeShift,
}: ShiftTimelineProps) {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const showNowLine = selectedDate === today;

  const nowLeft =
    ((now.getHours() * 60 + now.getMinutes()) / (24 * 60)) * TIMELINE_WIDTH;

  function calculateLeft(startTime: string) {
    const date = new Date(startTime);
    const minutes = date.getHours() * 60 + date.getMinutes();
    return (minutes / (TOTAL_HOURS * 60)) * TIMELINE_WIDTH;
  }

  function calculateWidth(startTime: string, endTime: string) {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const durationMinutes = (end.getTime() - start.getTime()) / 1000 / 60;
    return (durationMinutes / (TOTAL_HOURS * 60)) * TIMELINE_WIDTH;
  }

  return (
    <div className="border rounded-lg overflow-x-auto">
      <div style={{ width: TIMELINE_WIDTH }} className="relative">
        <div
          className="grid bg-gray-50 border-b text-xs text-gray-600"
          style={{ gridTemplateColumns: `repeat(${hours.length}, 1fr)` }}
        >
          {hours.map((hour) => (
            <div key={hour} className="p-2 border-r text-center">
              {hour}:00
            </div>
          ))}
        </div>

        <div className="relative h-96 bg-white">
          {Array.from({ length: 25 }).map((_, index) => (
            <div
              key={`hour-${index}`}
              className="absolute top-0 bottom-0 border-l border-gray-300 z-0"
              style={{ left: `${(index / 24) * TIMELINE_WIDTH}px` }}
            />
          ))}

          {Array.from({ length: 24 }).map((_, index) => (
            <div
              key={`half-${index}`}
              className="absolute top-0 bottom-0 border-l border-gray-100 z-0"
              style={{
                left: `${((index + 0.5) / 24) * TIMELINE_WIDTH}px`,
              }}
            />
          ))}

          {showNowLine && (
            <div
              className="absolute top-0 bottom-0 border-l-2 border-red-500 z-40"
              style={{ left: `${nowLeft}px` }}
            >
              <div className="bg-red-500 text-white text-xs px-2 py-1 rounded ml-1">
                Nu
              </div>
            </div>
          )}

          {shifts.map((shift, index) => (
            <ShiftCard
              key={shift.id}
              shift={shift}
              index={index}
              users={users}
              calculateLeft={calculateLeft}
              calculateWidth={calculateWidth}
              timelineWidth={TIMELINE_WIDTH}
              totalHours={TOTAL_HOURS}
              startHour={START_HOUR}
              onClick={() => onSelectShift(shift)}
              onMove={onMoveShift}
              onChangeUser={onChangeShiftUser}
              onResize={onResizeShift}
            />
          ))}
        </div>
      </div>
    </div>
  );
}