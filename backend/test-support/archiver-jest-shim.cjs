"use strict";

function unavailableInJest() {
  const error = new Error(
    "Archiver streaming is intentionally isolated from Jest. Run npm run test:xlsx-hardening to execute the real Node streaming regression.",
  );
  error.code = "ARCHIVER_JEST_ISOLATED";
  throw error;
}

unavailableInJest.create = unavailableInJest;
unavailableInJest.registerFormat = unavailableInJest;
unavailableInJest.isRegisteredFormat = () => false;

module.exports = unavailableInJest;
