// lib/measurement-fields.js
// Only numeric body-measurement columns may be written from request bodies.
export const isMeasurementField = (key) =>
  typeof key === "string" && /^[a-zA-Z]+(Snug|Static|Dynamic)$/.test(key);
