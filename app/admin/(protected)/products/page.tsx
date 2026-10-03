"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type Product = { id: string; name: string; sku: string | null; description: string | null; price: string | number | null; stock: number | null; status: boolean; sourceType: string; updatedAt: string; categoryId?: string | null; category: { id: string; name: string } | null };
type Category = { id: string; name: string };

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filters, setFilters] = useState({ search: "", source: "", categoryId: "" });
  const [editing, setEditing] = useState<Product | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams(Object.entries(filters).filter(([, value]) => value));
      const [productResponse, categoryResponse] = await Promise.all([fetch(`/api/admin/products?${query}`), fetch("/api/admin/categories")]);
      const productPayload = await productResponse.json() as { success: boolean; data?: Product[]; error?: string };
      const categoryPayload = await categoryResponse.json() as { success: boolean; data?: Category[]; error?: string };
      if (!productResponse.ok) throw new Error(productPayload.error ?? "Unable to load products");
      setProducts(productPayload.data ?? []);
      setCategories(categoryPayload.data ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load products");
    } finally { setLoading(false); }
  }, [filters]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    const form = new FormData(event.currentTarget);
    const response = await fetch(`/api/admin/products/${editing.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: form.get("name"), sku: form.get("sku") || null, description: form.get("description") || null, price: form.get("price") === "" ? null : Number(form.get("price")), stock: form.get("stock") === "" ? null : Number(form.get("stock")), status: form.get("status") === "true", categoryId: form.get("categoryId") || null }) });
    if (!response.ok) { setError("Unable to save product"); return; }
    setEditing(null); await load();
  }

  async function remove(product: Product) {
    if (!window.confirm(`Delete ${product.name}? This cannot be undone.`)) return;
    const response = await fetch(`/api/admin/products/${product.id}`, { method: "DELETE" });
    if (!response.ok) setError("Unable to delete product"); else await load();
  }

  return <div><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700">Catalog</p><h1 className="mt-2 text-3xl font-semibold">Products</h1></div></div><div className="mt-8 flex flex-wrap gap-3"><input aria-label="Search products" placeholder="Search name or SKU" value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" /><select aria-label="Filter source" value={filters.source} onChange={(event) => setFilters({ ...filters, source: event.target.value })} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"><option value="">All sources</option><option value="SHOPIFY">Shopify</option><option value="WOOCOMMERCE">WooCommerce</option></select><select aria-label="Filter category" value={filters.categoryId} onChange={(event) => setFilters({ ...filters, categoryId: event.target.value })} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"><option value="">All categories</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></div>{error ? <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}<div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white"><table className="w-full min-w-[900px] text-left text-sm"><thead className="border-b border-slate-200 text-slate-500"><tr>{["Name", "SKU", "Price", "Stock", "Source", "Category", "Updated", ""].map((heading) => <th key={heading} className="px-4 py-3 font-medium">{heading}</th>)}</tr></thead><tbody>{products.map((product) => <tr key={product.id} className="border-b border-slate-100"><td className="px-4 py-3 font-medium">{product.name}<span className={`ml-2 inline-block h-2 w-2 rounded-full ${product.status ? "bg-emerald-500" : "bg-slate-300"}`} /></td><td className="px-4 py-3 text-slate-500">{product.sku ?? "-"}</td><td className="px-4 py-3">{product.price ?? "-"}</td><td className="px-4 py-3">{product.stock ?? "-"}</td><td className="px-4 py-3">{product.sourceType}</td><td className="px-4 py-3">{product.category?.name ?? "Unassigned"}</td><td className="px-4 py-3 text-slate-500">{new Date(product.updatedAt).toLocaleDateString()}</td><td className="px-4 py-3"><button onClick={() => setEditing(product)} className="mr-3 text-cyan-700">Edit</button><button onClick={() => void remove(product)} className="text-red-600">Delete</button></td></tr>)}{!loading && products.length === 0 ? <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-500">No products match these filters.</td></tr> : null}</tbody></table>{loading ? <p className="p-6 text-sm text-slate-500">Loading products...</p> : null}</div>{editing ? <div className="fixed inset-0 z-20 flex items-center justify-center bg-slate-950/40 p-4"><form onSubmit={save} className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl"><div className="flex justify-between"><h2 className="text-xl font-semibold">Edit product</h2><button type="button" onClick={() => setEditing(null)} className="text-slate-500">Close</button></div><div className="mt-5 grid gap-4"><label className="text-sm">Name<input name="name" defaultValue={editing.name} className="mt-1 w-full rounded border px-3 py-2" /></label><label className="text-sm">SKU<input name="sku" defaultValue={editing.sku ?? ""} className="mt-1 w-full rounded border px-3 py-2" /></label><label className="text-sm">Description<textarea name="description" defaultValue={editing.description ?? ""} className="mt-1 w-full rounded border px-3 py-2" /></label><div className="grid grid-cols-2 gap-3"><label className="text-sm">Price<input name="price" type="number" step="0.01" defaultValue={editing.price ?? ""} className="mt-1 w-full rounded border px-3 py-2" /></label><label className="text-sm">Stock<input name="stock" type="number" defaultValue={editing.stock ?? ""} className="mt-1 w-full rounded border px-3 py-2" /></label></div><label className="text-sm">Category<select name="categoryId" defaultValue={editing.categoryId ?? editing.category?.id ?? ""} className="mt-1 w-full rounded border px-3 py-2"><option value="">Unassigned</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><label className="text-sm">Status<select name="status" defaultValue={String(editing.status)} className="mt-1 w-full rounded border px-3 py-2"><option value="true">Active</option><option value="false">Hidden</option></select></label></div><button className="mt-6 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white">Save changes</button></form></div> : null}</div>;
}