import assert from "node:assert/strict";
import {
  readFileSync,
} from "node:fs";
import test from "node:test";

const modalSource =
  readFileSync(
    "app/(app)/my-time/components/modals/MyTimeEditModal.tsx",
    "utf8",
  );

const typesSource =
  readFileSync(
    "app/(app)/my-time/helpers/core/myTimeTypes.ts",
    "utf8",
  );

test(
  "my-time redigering viser planlagt vagt før de faktiske felter",
  () => {
    assert.ok(
      modalSource.includes(
        "Planlagt vagt",
      ),
    );

    assert.ok(
      modalSource.includes(
        "editingEntry.shift.startTime",
      ),
    );

    assert.ok(
      modalSource.includes(
        "editingEntry.shift.endTime",
      ),
    );

    assert.ok(
      modalSource.includes(
        "editingEntry.shift.jobFunction",
      ),
    );

    assert.ok(
      modalSource.indexOf(
        "Planlagt vagt",
      ) <
        modalSource.indexOf(
          'value={editClockIn}',
        ),
    );
  },
);

test(
  "planlagt vagt bruger samme minutafrunding som backendens afvigelsesgrundlag",
  () => {
    assert.ok(
      modalSource.includes(
        "minuteStep * 60 * 1000",
      ),
    );

    assert.ok(
      modalSource.includes(
        "Math.round(",
      ),
    );

    assert.ok(
      modalSource.includes(
        'timeZone: "Europe/Copenhagen"',
      ),
    );
  },
);

test(
  "my-time typen indeholder planlagt start og slut på vagten",
  () => {
    assert.ok(
      typesSource.includes(
        "startTime?: string;",
      ),
    );

    assert.ok(
      typesSource.includes(
        "endTime?: string;",
      ),
    );
  },
);

test(
  "de faktiske redigeringsfelter bevarer registreringens aktuelle værdier",
  () => {
    assert.ok(
      modalSource.includes(
        'value={editClockIn}',
      ),
    );

    assert.ok(
      modalSource.includes(
        'value={editClockOut}',
      ),
    );
  },
);
