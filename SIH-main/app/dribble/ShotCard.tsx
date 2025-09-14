type Shot = {
  id: number;
  title: string;
  html_url: string;
  images: { hidpi?: string; normal: string };
  user: { name: string };
};

export default function ShotCard({ s }: { s: Shot }) {
  return (
    <a
      href={s.html_url}
      target="_blank"
      rel="noreferrer"
      className="rounded-xl overflow-hidden shadow hover:scale-105 transition"
    >
      <img
        src={s.images.hidpi || s.images.normal}
        alt={s.title}
        className="w-full object-cover"
      />
      <div className="p-3 bg-gray-900 text-white">
        <h3 className="text-sm font-semibold truncate">{s.title}</h3>
        <p className="text-xs opacity-70">by {s.user.name}</p>
      </div>
    </a>
  );
}
