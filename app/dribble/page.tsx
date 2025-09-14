import ShotGrid from "./ShotGrid";
export const metadata = { title: "Dribbble · AIRsight-AI" };

export default function DribbblePage() {
  return (
    <main className="mx-auto max-w-5xl p-6">
      <h1 className="text-2xl font-bold mb-6">Design Explorations</h1>
      <ShotGrid />
    </main>
  );
}
