"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type Category = { id: string; name: string; slug: string; parentId: string | null };
type Product = { id: string; name: string; sku: string | null; price: string | number | null; stock: number | null; status: boolean; images: unknown; sourceUrl?: string | null; category?: { id: string; name: string; slug: string } | null };
type Config = { activeDesign: string; whatsappNumber: string | null; siteSettings: { siteName?: string } };

function imageUrl(images: unknown) {
  return Array.isArray(images) && typeof images[0] === "string" ? images[0] : null;
}

function price(value: Product["price"]) {
  return value === null || value === undefined ? "Price on request" : `AED ${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
}

function availability(stock: number | null) {
  return stock !== null && stock > 0 ? `${stock} available` : "Out of stock";
}

function whatsappUrl(number: string | null, products: Product[]) {
  if (!number || products.length === 0) return null;
  const message = ["Hello, I am interested in:", ...products.map((product) => `- ${product.name}${product.sku ? ` (${product.sku})` : ""}`)].join("\n");
  return `https://wa.me/${number.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`;
}

function ProductCard({ product, design, wished, selected, onWishlist, onSelect }: { product: Product; design: string; wished: boolean; selected: boolean; onWishlist: () => void; onSelect: () => void }) {
  const image = imageUrl(product.images);
  return (
    <article className={design === "design2" ? "group border-b border-stone-300 pb-5" : "group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"}>
      <div className={`relative ${design === "design2" ? "aspect-[4/3]" : "aspect-square"} overflow-hidden bg-slate-100`} style={image ? { backgroundImage: `url(${image})`, backgroundPosition: "center", backgroundSize: "cover" } : undefined}>
        {!image ? <div className="flex h-full items-center justify-center px-6 text-center text-sm text-slate-400">No image available</div> : null}
        <button type="button" aria-label={wished ? "Remove from wishlist" : "Add to wishlist"} onClick={onWishlist} className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/90 text-lg shadow-sm">{wished ? "♥" : "♡"}</button>
        <label className="absolute bottom-3 left-3 flex items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm"><input type="checkbox" checked={selected} onChange={onSelect} /> Select</label>
      </div>
      <Link href={`/products/${product.id}`} className="block p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-700">{product.category?.name ?? "Catalog"}</p>
        <h2 className="mt-2 line-clamp-2 font-semibold text-slate-950">{product.name}</h2>
        <div className="mt-3 flex items-end justify-between gap-3"><p className="font-semibold text-slate-950">{price(product.price)}</p><p className={`text-xs ${product.stock && product.stock > 0 ? "text-emerald-700" : "text-rose-600"}`}>{availability(product.stock)}</p></div>
      </Link>
    </article>
  );
}

export function CatalogApp({ wishlistOnly = false }: { wishlistOnly?: boolean }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [config, setConfig] = useState<Config>({ activeDesign: "design1", whatsappNumber: null, siteSettings: {} });
  const [filters, setFilters] = useState({ search: "", category: "", status: "" });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [query, setQuery] = useState("");
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(page), limit: "12" });
      if (filters.search) params.set("search", filters.search);
      if (filters.category) params.set("category", filters.category);
      if (filters.status) params.set("status", filters.status);
      const response = await fetch(`/api/products?${params.toString()}`);
      const payload = await response.json() as { success?: boolean; data?: Product[]; pagination?: { totalPages: number }; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Unable to load catalog");
      setProducts(payload.data ?? []);
      setTotalPages(payload.pagination?.totalPages ?? 0);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load catalog");
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadProducts(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadProducts]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const stored = JSON.parse(window.localStorage.getItem("quick-shelf-wishlist") ?? "[]") as unknown;
      if (Array.isArray(stored)) setWishlist(stored.filter((value): value is string => typeof value === "string"));
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const loadChrome = async () => {
      const [categoryResponse, configResponse] = await Promise.all([fetch("/api/categories"), fetch("/api/config")]);
      const categoryPayload = await categoryResponse.json() as { data?: Category[] };
      const configPayload = await configResponse.json() as { data?: Config };
      setCategories(categoryPayload.data ?? []);
      if (configPayload.data) setConfig(configPayload.data);
    };
    const timer = window.setTimeout(() => { void loadChrome(); }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const visibleProducts = wishlistOnly ? products.filter((product) => wishlist.includes(product.id)) : products;
  const selectedProducts = products.filter((product) => selected.includes(product.id));
  const selectedUrl = whatsappUrl(config.whatsappNumber, selectedProducts);
  const design = config.activeDesign === "design2" ? "design2" : "design1";
  const siteName = config.siteSettings.siteName ?? "Quick Shelf";

  function toggleWishlist(id: string) {
    const next = wishlist.includes(id) ? wishlist.filter((value) => value !== id) : [...wishlist, id];
    setWishlist(next);
    window.localStorage.setItem("quick-shelf-wishlist", JSON.stringify(next));
  }

  function applySearch(event: React.FormEvent) {
    event.preventDefault();
    setPage(1);
    setFilters({ ...filters, search: query.trim() });
  }

  return <main className={design === "design2" ? "min-h-screen bg-[#f5f0e8] text-stone-900" : "min-h-screen bg-slate-50 text-slate-950"}>
    <header className={design === "design2" ? "border-b border-stone-300 bg-[#f5f0e8]" : "border-b border-slate-200 bg-white"}>
      <div className="mx-auto max-w-7xl px-5 py-5 sm:px-8"><div className="flex items-center justify-between gap-4"><Link href="/" className="text-xl font-semibold tracking-tight">{siteName}</Link><div className="flex items-center gap-3 text-sm"><Link href="/wishlist" className="text-slate-600 hover:text-slate-950">Wishlist {wishlist.length ? `(${wishlist.length})` : ""}</Link><a href="/admin" className="hidden rounded-full border border-current px-3 py-1.5 sm:inline-block">Admin</a></div></div><form onSubmit={applySearch} className="mt-6 flex gap-2"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search products or SKU" className="min-w-0 flex-1 rounded-full border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-cyan-600" /><button className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white">Search</button></form></div>
    </header>
    <div className="mx-auto max-w-7xl px-5 py-7 sm:px-8"><div className="flex gap-2 overflow-x-auto pb-2"><button onClick={() => { setPage(1); setFilters({ ...filters, category: "" }); }} className={`shrink-0 rounded-full px-4 py-2 text-sm ${!filters.category ? "bg-slate-950 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"}`}>All products</button>{categories.map((category) => <button key={category.id} onClick={() => { setPage(1); setFilters({ ...filters, category: category.slug }); }} className={`shrink-0 rounded-full px-4 py-2 text-sm ${filters.category === category.slug ? "bg-slate-950 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"}`}>{category.name}</button>)}</div><div className="mt-6 flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-700">{wishlistOnly ? "Saved pieces" : design === "design2" ? "The collection" : "Available now"}</p><h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">{wishlistOnly ? "Your wishlist" : "Find something worth keeping"}</h1></div><select value={filters.status} onChange={(event) => { setPage(1); setFilters({ ...filters, status: event.target.value }); }} className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm"><option value="">All availability</option><option value="available">Available only</option></select></div>{error ? <div className="mt-8 rounded-2xl bg-rose-50 p-6 text-sm text-rose-700">{error}<button onClick={() => void loadProducts()} className="ml-3 font-semibold underline">Try again</button></div> : null}{loading ? <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">{Array.from({ length: 8 }, (_, index) => <div key={index} className="animate-pulse rounded-2xl bg-white"><div className="aspect-square rounded-2xl bg-slate-200" /><div className="space-y-3 p-4"><div className="h-3 w-1/3 rounded bg-slate-200" /><div className="h-5 rounded bg-slate-200" /></div></div>)}</div> : visibleProducts.length ? <div className={`mt-8 grid gap-x-4 gap-y-8 ${design === "design2" ? "sm:grid-cols-2 lg:grid-cols-3" : "grid-cols-2 lg:grid-cols-4"}`}>{visibleProducts.map((product) => <ProductCard key={product.id} product={product} design={design} wished={wishlist.includes(product.id)} selected={selected.includes(product.id)} onWishlist={() => toggleWishlist(product.id)} onSelect={() => setSelected(selected.includes(product.id) ? selected.filter((id) => id !== product.id) : [...selected, product.id])} />)}</div> : <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center"><h2 className="text-xl font-semibold">Nothing here yet</h2><p className="mt-2 text-sm text-slate-500">Try another search or browse all categories.</p></div>}{!wishlistOnly && totalPages > 1 ? <div className="mt-10 flex justify-center gap-3"><button disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded-full border px-4 py-2 text-sm disabled:opacity-40">Previous</button><span className="px-3 py-2 text-sm text-slate-500">Page {page} of {totalPages}</span><button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="rounded-full border px-4 py-2 text-sm disabled:opacity-40">Next</button></div> : null}</div>
    {selectedProducts.length ? <div className="fixed inset-x-4 bottom-4 z-10 mx-auto flex max-w-xl items-center justify-between gap-4 rounded-2xl bg-slate-950 px-4 py-3 text-white shadow-xl"><p className="text-sm">{selectedProducts.length} selected</p>{selectedUrl ? <a href={selectedUrl} target="_blank" rel="noreferrer" className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold">Enquire on WhatsApp</a> : <span className="text-xs text-slate-300">WhatsApp is not configured</span>}</div> : null}
  </main>;
}