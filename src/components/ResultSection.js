export default function ResultSection({ title, items = [] }) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-1 h-5 bg-gold" />
        <h3 className="font-display text-gold text-sm tracking-widest uppercase">
          {title}
        </h3>
      </div>

      {!items.length ? (
        <p className="text-sm text-white/40">表示できるデータがありません。</p>
      ) : (
        <div className="grid gap-3">
          {items.map((item, index) => (
            <div
              key={`${title}-${item.id || item.itemId || item.name || index}`}
              className="rounded-xl border border-white/10 bg-dark-700 p-4"
            >
              <div className="flex items-start gap-3">
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-12 h-12 rounded object-cover border border-white/10 shrink-0"
                  />
                ) : null}

                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-white break-words">
                      {item.name}
                    </p>

                    {typeof item.winRate === "number" ? (
                      <span className="text-xs text-gold">
                        {item.winRate.toFixed(1)}%
                      </span>
                    ) : null}

                    {typeof item.games === "number" ? (
                      <span className="text-xs text-white/45">
                        {item.games.toLocaleString()}試合
                      </span>
                    ) : null}

                    {item.lowSample ? (
                      <span className="text-[11px] px-2 py-1 rounded border border-yellow-500/30 bg-yellow-500/10 text-yellow-200">
                        low sample
                      </span>
                    ) : null}
                  </div>

                  {item.reason ? (
                    <p className="text-sm text-white/60">{item.reason}</p>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}