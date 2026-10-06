"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import bag from "./landing_images/bag.webp"
import plant from "./landing_images/plant.webp"
import table from "./landing_images/table.webp"

type Category = { id: string; name: string; slug: string };
type Product = { id: string; name: string; price: string | number | null; images: unknown; category: { name: string; slug: string } | null };

function imageUrl(images: unknown) { return Array.isArray(images) && typeof images[0] === "string" ? images[0] : null; }
function money(value: Product["price"]) { return value === null || value === undefined ? "Price on request" : `AED ${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2 })}`; }

export function LandingPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [siteName, setSiteName] = useState("Quick Shelf");
  const [wishlist, setWishlist] = useState<string[]>([]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void Promise.all([fetch("/api/categories"), fetch("/api/products?page=1&limit=6"), fetch("/api/config")]).then(async ([categoryResponse, productResponse, configResponse]) => {
        const categoryPayload = await categoryResponse.json() as { data?: Category[] };
        const productPayload = await productResponse.json() as { data?: Product[] };
        const configPayload = await configResponse.json() as { data?: { siteSettings?: { siteName?: string } } };
        setCategories(categoryPayload.data ?? []);
        setProducts(productPayload.data ?? []);
        setSiteName(configPayload.data?.siteSettings?.siteName ?? "Quick Shelf");
      }).catch(() => undefined);
      const stored = JSON.parse(window.localStorage.getItem("quick-shelf-wishlist") ?? "[]") as unknown;
      if (Array.isArray(stored)) setWishlist(stored.filter((value): value is string => typeof value === "string"));
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  function toggleWishlist(id: string) {
    const next = wishlist.includes(id) ? wishlist.filter((value) => value !== id) : [...wishlist, id];
    setWishlist(next);
    window.localStorage.setItem("quick-shelf-wishlist", JSON.stringify(next));
  }

  return <main className="min-h-screen overflow-hidden bg-[#f8f5ef] text-[#202522]">
    <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8"><Link href="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#1f7069] text-xs font-bold text-white">QS</span>{siteName}</Link><nav className="flex items-center gap-1 text-sm"><Link href="/catalog" className="rounded-full px-3 py-2 text-stone-600 hover:bg-white">Catalog</Link><Link href="/wishlist" className="rounded-full px-3 py-2 text-stone-600 hover:bg-white">Wishlist</Link><Link href="/admin" className="ml-1 rounded-full border border-stone-300 px-3 py-2 text-stone-600 hover:border-stone-800 hover:text-stone-900">Admin</Link></nav></header>
    <section className="mx-auto grid max-w-7xl items-center gap-12 px-5 pb-16 pt-12 sm:px-8 lg:grid-cols-[1fr_0.9fr] lg:pb-24 lg:pt-20">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#1f7069]">
          Your curated product catalog
        </p>

        <h1 className="mt-5 max-w-xl text-5xl font-semibold leading-[0.98] tracking-[-0.04em] sm:text-7xl">
          Everything worth keeping, in one place.
        </h1>

        <p className="mt-6 max-w-lg text-base leading-7 text-stone-600 sm:text-lg">
          Browse a fast, beautifully organized collection of products,
          essentials, and finds selected for everyday life.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/catalog"
            className="rounded-full bg-[#202522] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#1f7069]"
          >
            Browse catalog <span aria-hidden="true">↗</span>
          </Link>

          <a
            href="#categories"
            className="rounded-full border border-stone-300 bg-white/60 px-6 py-3 text-sm font-semibold text-stone-700 transition hover:border-stone-700"
          >
            Explore categories
          </a>
        </div>
      </div>

      <div className="relative min-h-[380px] rounded-[2rem] bg-[#dce9e4] p-5 sm:p-8">
        <div className="absolute -right-5 -top-5 h-24 w-24 rounded-full border border-[#98beb7]" />

        <div className="relative grid h-full grid-cols-[1.25fr_0.75fr] gap-4">

          {/* Main hero image */}
          <div className="mt-12 overflow-hidden rounded-[1.5rem] bg-white shadow-xl">
            <div
              className="aspect-[4/5] bg-cover bg-center"
              style={{
                backgroundImage: `url(${bag.src})`,
              }}
            />

            <div className="p-4">
              <p className="text-xs uppercase tracking-[0.15em] text-stone-500">
                Featured collection
              </p>

              <p className="mt-1 font-semibold">
                Everyday essentials
              </p>
            </div>
          </div>

          {/* Small images */}
          <div className="space-y-4 pt-3">

            {/* Plant */}
            <div className="rounded-2xl bg-white/85 p-3 shadow-sm transition hover:-translate-y-1">
              <div
                className="aspect-square rounded-xl bg-cover bg-center"
                style={{
                  backgroundImage: `url(${plant.src})`,
                }}
              />

              <p className="mt-2 line-clamp-1 text-xs font-semibold">
                Fresh finds
              </p>
            </div>

            {/* Table */}
            <div className="rounded-2xl bg-white/85 p-3 shadow-sm transition hover:-translate-y-1">
              <div
                className="aspect-square rounded-xl bg-cover bg-center"
                style={{
                  backgroundImage: `url(${table.src})`,
                }}
              />

              <p className="mt-2 line-clamp-1 text-xs font-semibold">
                Home collection
              </p>
            </div>

            {/* Product count */}
            <div className="rounded-2xl bg-[#202522] p-4 text-white">
              <p className="text-2xl font-semibold">
                {products.length || "—"}
              </p>

              <p className="mt-1 text-xs text-stone-300">
                products to explore
              </p>
            </div>

          </div>
        </div>
      </div>
    </section>
    <section id="categories" className="border-y border-stone-200/80 bg-white/55"><div className="mx-auto max-w-7xl px-5 py-14 sm:px-8"><div className="flex items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#1f7069]">Browse by mood</p><h2 className="mt-2 text-3xl font-semibold tracking-tight">Explore the collection</h2></div><Link href="/catalog" className="text-sm font-semibold text-stone-600 hover:text-[#1f7069]">View all ↗</Link></div><div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{categories.slice(0, 8).map((category, index) => <Link key={category.id} href={`/catalog?category=${encodeURIComponent(category.slug)}`} className="group rounded-2xl border border-stone-200 bg-[#f8f5ef] p-5 transition hover:-translate-y-1 hover:border-[#8fbab2] hover:shadow-md"><div className="flex items-center justify-between"><span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-sm font-semibold text-[#1f7069]">{String(index + 1).padStart(2, "0")}</span><span className="text-xl text-stone-400 transition group-hover:translate-x-1 group-hover:text-[#1f7069]">↗</span></div><h3 className="mt-9 font-semibold">{category.name}</h3><p className="mt-1 text-sm text-stone-500">Discover something new</p></Link>)}</div></div></section>
    <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8"><div className="flex items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#1f7069]">A few things you’ll love</p><h2 className="mt-2 text-3xl font-semibold tracking-tight">Featured products</h2></div><Link href="/catalog" className="text-sm font-semibold text-stone-600 hover:text-[#1f7069]">Browse all ↗</Link></div><div className="mt-7 grid grid-cols-2 gap-4 lg:grid-cols-4">{products.slice(0, 4).map((product) => <article key={product.id} className="group"><Link href={`/products/${product.id}`}><div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-[#e4ece8]" style={imageUrl(product.images) ? { backgroundImage: `url(${imageUrl(product.images)})`, backgroundPosition: "center", backgroundSize: "cover" } : undefined}>{!imageUrl(product.images) ? <span className="grid h-full place-items-center text-4xl font-semibold text-[#6b938b]">{product.name.slice(0, 1)}</span> : null}<button type="button" aria-label={wishlist.includes(product.id) ? "Remove from wishlist" : "Add to wishlist"} onClick={(event) => { event.preventDefault(); toggleWishlist(product.id); }} className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/90 text-lg shadow-sm">{wishlist.includes(product.id) ? "♥" : "♡"}</button></div><p className="mt-3 text-xs uppercase tracking-[0.14em] text-stone-500">{product.category?.name ?? "Catalog"}</p><h3 className="mt-1 line-clamp-2 font-semibold">{product.name}</h3><p className="mt-2 text-sm font-semibold">{money(product.price)}</p></Link></article>)}</div></section>
    <section className="bg-[#202522] text-white"><div className="mx-auto grid max-w-7xl gap-8 px-5 py-14 sm:px-8 md:grid-cols-3"><div><p className="text-lg font-semibold">Fast by design</p><p className="mt-2 text-sm leading-6 text-stone-300">A focused catalog that gets you to the right product quickly.</p></div><div><p className="text-lg font-semibold">Organized for discovery</p><p className="mt-2 text-sm leading-6 text-stone-300">Clear collections and useful details make browsing feel effortless.</p></div><div><p className="text-lg font-semibold">Simple to enquire</p><p className="mt-2 text-sm leading-6 text-stone-300">Save what you like and send one clear enquiry when you’re ready.</p></div></div></section>
    <section className="mx-auto max-w-7xl px-5 py-16 text-center sm:px-8"><h2 className="text-4xl font-semibold tracking-tight">Find your next favorite.</h2><Link href="/catalog" className="mt-6 inline-flex rounded-full bg-[#1f7069] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#202522]">Browse the catalog ↗</Link></section>
  </main>;
}