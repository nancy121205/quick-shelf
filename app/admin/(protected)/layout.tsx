import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "../../../lib/admin-auth";
import { AdminSignOut } from "./sign-out";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/login");
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-slate-950 p-5 text-white lg:block">
          <Link href="/admin" className="block text-lg font-semibold">Catalog Maker</Link>
          <p className="mt-1 text-xs text-slate-400">Operations console</p>
          <nav className="mt-10 space-y-1 text-sm">
            <Link className="block rounded-lg px-3 py-2 hover:bg-white/10" href="/admin">Dashboard</Link>
            <Link className="block rounded-lg px-3 py-2 hover:bg-white/10" href="/admin/products">Products</Link>
            <Link className="block rounded-lg px-3 py-2 hover:bg-white/10" href="/admin/categories">Categories</Link>
            <Link className="block rounded-lg px-3 py-2 hover:bg-white/10" href="/admin/sync">Sync</Link>
            <Link className="block rounded-lg px-3 py-2 hover:bg-white/10" href="/admin/settings">Settings</Link>
          </nav>
          <AdminSignOut />
        </aside>
        <div className="min-w-0 flex-1">
          <header className="border-b border-slate-200 bg-white px-6 py-4 lg:hidden">
            <div className="flex items-center justify-between">
              <Link href="/admin" className="font-semibold">Catalog Maker</Link>
              <AdminSignOut />
            </div>
            <nav className="mt-4 flex gap-4 overflow-x-auto text-sm text-slate-600">
              <Link href="/admin">Dashboard</Link>
              <Link href="/admin/products">Products</Link>
              <Link href="/admin/categories">Categories</Link>
              <Link href="/admin/sync">Sync</Link>
              <Link href="/admin/settings">Settings</Link>
            </nav>
          </header>
          <main className="mx-auto max-w-7xl p-6 lg:p-10">{children}</main>
        </div>
      </div>
    </div>
  );
}