import { prisma } from "../../../lib/prisma";

export const dynamic = "force-dynamic";

function formatDate(value: Date | null) {
  return value ? new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(value) : "Never";
}

export default async function AdminDashboardPage() {
  const [totalProducts, activeProducts, outOfStockProducts, totalCategories, shopifySync, wooSync, recentSyncs] = await Promise.all([
    prisma.product.count(),
    prisma.product.count({ where: { status: true } }),
    prisma.product.count({ where: { OR: [{ stock: null }, { stock: { lte: 0 } }] } }),
    prisma.category.count(),
    prisma.syncLog.findFirst({ where: { sourceType: "SHOPIFY" }, orderBy: { startedAt: "desc" }, select: { status: true, startedAt: true, productsCreated: true, productsUpdated: true, productsFailed: true } }),
    prisma.syncLog.findFirst({ where: { sourceType: "WOOCOMMERCE" }, orderBy: { startedAt: "desc" }, select: { status: true, startedAt: true, productsCreated: true, productsUpdated: true, productsFailed: true } }),
    prisma.syncLog.findMany({ orderBy: { startedAt: "desc" }, take: 8, select: { id: true, sourceType: true, status: true, startedAt: true, finishedAt: true, productsCreated: true, productsUpdated: true, productsFailed: true } }),
  ]);

  const cards: Array<[string, number]> = [
    ["Total products", totalProducts],
    ["Active products", activeProducts],
    ["Out of stock", outOfStockProducts],
    ["Categories", totalCategories],
  ];
  const syncCards = [{ label: "Shopify", sync: shopifySync }, { label: "WooCommerce", sync: wooSync }];

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700">Overview</p><h1 className="mt-2 text-3xl font-semibold">Catalog dashboard</h1><p className="mt-2 text-sm text-slate-500">A clear view of catalog health and source activity.</p></div>
        <a href="/admin/sync" className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white">Manage syncs</a>
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value]) => <div key={label} className="rounded-xl border border-slate-200 bg-white p-5"><p className="text-sm text-slate-500">{label}</p><p className="mt-3 text-3xl font-semibold">{value}</p></div>)}
      </div>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {syncCards.map(({ label, sync }) => <div key={label} className="rounded-xl border border-slate-200 bg-white p-5"><div className="flex justify-between"><h2 className="font-semibold">Last {label} sync</h2><span className="text-sm text-slate-500">{sync?.status ?? "No runs"}</span></div><p className="mt-3 text-sm text-slate-500">{formatDate(sync?.startedAt ?? null)}</p><p className="mt-4 text-sm text-slate-600">Created {sync?.productsCreated ?? 0} · Updated {sync?.productsUpdated ?? 0} · Failed {sync?.productsFailed ?? 0}</p></div>)}
      </div>
      <section className="mt-8 rounded-xl border border-slate-200 bg-white p-5"><h2 className="font-semibold">Recent sync history</h2><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[640px] text-left text-sm"><thead className="border-b border-slate-200 text-slate-500"><tr><th className="pb-3">Source</th><th className="pb-3">Status</th><th className="pb-3">Started</th><th className="pb-3">Results</th></tr></thead><tbody>{recentSyncs.map((sync) => <tr key={sync.id} className="border-b border-slate-100"><td className="py-3 font-medium">{sync.sourceType}</td><td className="py-3">{sync.status}</td><td className="py-3 text-slate-500">{formatDate(sync.startedAt)}</td><td className="py-3 text-slate-500">{sync.productsCreated} created · {sync.productsUpdated} updated · {sync.productsFailed} failed</td></tr>)}{recentSyncs.length === 0 ? <tr><td className="py-6 text-slate-500" colSpan={4}>No sync history yet.</td></tr> : null}</tbody></table></div></section>
    </div>
  );
}