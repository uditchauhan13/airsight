// app/api/dribbble/route.ts
export async function GET() {
  const url =
    "https://api.dribbble.com/v2/user/shots?per_page=12&access_token=" +
    process.env.DRIBBBLE_ACCESS_TOKEN;

  const r = await fetch(url, { next: { revalidate: 60 } }); // 60-s cache
  if (!r.ok)
    return new Response(JSON.stringify({ error: "Dribbble request failed" }), {
      status: r.status,
      headers: { "Content-Type": "application/json" },
    });

  const shots = await r.json();
  return new Response(JSON.stringify(shots), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
