export async function getShots() {
  const r = await fetch("/api/dribbble");
  if (!r.ok) throw new Error("Could not load Dribbble shots");
  return r.json();
}
