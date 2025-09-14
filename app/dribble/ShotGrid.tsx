"use client";
import useSWR from "swr";
import { getShots } from "../../lib/dribble"

import ShotCard from "./ShotCard";

export default function ShotGrid() {
  const { data } = useSWR("dribbble", getShots);
  if (!data) return <p className="text-center text-sm">Loading…</p>;

  return (
    <section className="grid gap-4 grid-cols-2 md:grid-cols-3">
      {data.map((s: any) => <ShotCard key={s.id} s={s} />)}
    </section>
  );
}
