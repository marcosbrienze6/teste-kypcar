export function extractPlateFromWebhook(payload) {
  const candidates = [
    payload?.plate,
    payload?.license_plate,
    payload?.vehicle_plate,
    payload?.vehicle?.plate,
    payload?.data?.plate,
    payload?.data?.vehicle?.plate,
    payload?.event?.plate,
    payload?.payload?.plate,
  ];

  const value = candidates.find((candidate) => typeof candidate === "string" && candidate.trim().length > 0);
  return value ? value.trim().toUpperCase() : null;
}
