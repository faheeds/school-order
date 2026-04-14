import { PageShell } from "@/components/ui";

const proteins = ["Beef", "Crispy Chicken", "Grilled Chicken", "Beyond Vegan Meat"];
const removals = ["No changes", "Lettuce", "Tomato", "Pickles", "Onions", "Sauce"];
const desktopMenu = [
  { name: "Build Your Own Burger", detail: "Choose protein, toppings, and removals", price: "$9.99", active: true },
  { name: "4pc Chicken Wings", detail: "Required flavor choice", price: "$9.99", active: false },
  { name: "Mac n' Cheese", detail: "Comfort favorite", price: "$7.99", active: false }
];
const mobileMenu = [
  { name: "Build Your Own Burger", meta: "Protein required", price: "$9.99", selected: true },
  { name: "Chicken Wings", meta: "Flavor required", price: "$9.99", selected: false },
  { name: "Large Brownie", meta: "Quick add", price: "$4.99", selected: false }
];

export function OrderRedesignPreview() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,_#f7faf7_0%,_#eef6f1_50%,_#fffdfa_100%)]">
      <PageShell className="space-y-8">
        <section className="rounded-[2rem] border border-white/70 bg-white/90 p-6 shadow-soft backdrop-blur sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-brand-700">Concept Preview</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">Desktop website, mobile app</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
            This preview keeps desktop feeling like a polished website, while mobile becomes a guided app-style flow with a stronger hierarchy and simpler actions.
          </p>
        </section>

        <section className="grid gap-8 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Desktop</p>
                <h2 className="text-2xl font-semibold text-ink">Website-style ordering</h2>
              </div>
              <span className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">1440px</span>
            </div>

            <div className="overflow-hidden rounded-[2rem] border border-slate-200/70 bg-[#f8fbf8] shadow-[0_40px_100px_rgba(15,23,42,0.10)]">
              <div className="border-b border-slate-200/80 bg-white px-6 py-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand-700">Local Bigger Burger</p>
                    <p className="mt-1 text-lg font-semibold text-ink">Medina Academy Hot Lunch Preorders</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="rounded-full px-4 py-2 text-sm font-medium text-slate-600">Order Lunch</span>
                    <span className="rounded-full px-4 py-2 text-sm font-medium text-slate-600">My Account</span>
                    <button className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white">Checkout</button>
                  </div>
                </div>
              </div>

              <div className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1.15fr)_22rem]">
                <div className="space-y-6">
                  <div className="rounded-[1.75rem] border border-white/80 bg-white p-5 shadow-sm">
                    <div className="grid gap-4 md:grid-cols-3">
                      {["School", "Delivery date", "Child"].map((label, index) => (
                        <div key={label} className="space-y-2">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-ink">
                            {index === 0 ? "Medina Academy Bellevue" : index === 1 ? "Wednesday, April 15" : "Ayaan, Grade 5"}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[1.75rem] border border-white/80 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">Menu</p>
                        <h3 className="mt-1 text-xl font-semibold text-ink">Choose lunch item</h3>
                      </div>
                      <div className="flex gap-2 text-sm">
                        <span className="rounded-full bg-brand-50 px-3 py-1.5 font-semibold text-brand-700">Burgers</span>
                        <span className="rounded-full bg-slate-100 px-3 py-1.5 text-slate-500">Wings</span>
                        <span className="rounded-full bg-slate-100 px-3 py-1.5 text-slate-500">Sides</span>
                      </div>
                    </div>
                    <div className="mt-4 grid gap-3">
                      {desktopMenu.map((item) => (
                        <div key={item.name} className={`rounded-[1.5rem] border px-4 py-4 ${item.active ? "border-brand-500 bg-brand-50/70" : "border-slate-200 bg-white"}`}>
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold text-ink">{item.name}</p>
                              <p className="mt-1 text-sm text-slate-600">{item.detail}</p>
                            </div>
                            <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-ink">{item.price}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[1.75rem] border border-brand-100 bg-white p-5 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">Customize</p>
                    <h3 className="mt-1 text-xl font-semibold text-ink">Build Your Own Burger</h3>
                    <div className="mt-4 grid gap-5 lg:grid-cols-2">
                      <div className="space-y-3">
                        <p className="text-sm font-semibold text-ink">Protein required</p>
                        {proteins.map((protein, index) => (
                          <div key={protein} className={`rounded-2xl border px-4 py-3 text-sm ${index === 0 ? "border-brand-500 bg-brand-50" : "border-slate-200"}`}>
                            {protein}
                          </div>
                        ))}
                      </div>
                      <div className="space-y-3">
                        <p className="text-sm font-semibold text-ink">Removals</p>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {removals.map((item, index) => (
                            <div key={item} className={`rounded-2xl border px-4 py-3 text-sm ${index === 0 ? "border-brand-500 bg-brand-50" : "border-slate-200"}`}>
                              {item}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <aside className="rounded-[1.75rem] bg-ink p-5 text-white shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-200">Checkout</p>
                  <h3 className="mt-2 text-2xl font-semibold">Cart summary</h3>
                  <div className="mt-5 space-y-3">
                    <div className="rounded-[1.5rem] bg-white/10 p-4">
                      <p className="font-semibold">Build Your Own Burger</p>
                      <p className="mt-1 text-sm text-slate-200">Beef, cheddar, no onions</p>
                    </div>
                    <div className="rounded-[1.5rem] bg-white/10 p-4">
                      <p className="font-semibold">Large Brownie</p>
                      <p className="mt-1 text-sm text-slate-200">1 item</p>
                    </div>
                  </div>
                  <div className="mt-6 rounded-[1.5rem] bg-white/10 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-200">Total</p>
                    <p className="mt-2 text-3xl font-semibold">$14.98</p>
                    <button className="mt-4 w-full rounded-full bg-white px-5 py-3 text-sm font-semibold text-ink">Continue to payment</button>
                  </div>
                </aside>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Mobile</p>
                <h2 className="text-2xl font-semibold text-ink">App-style ordering</h2>
              </div>
              <span className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">iPhone</span>
            </div>

            <div className="mx-auto w-[23rem] rounded-[2.5rem] border border-slate-300 bg-[#0f172a] p-3 shadow-[0_50px_120px_rgba(15,23,42,0.24)]">
              <div className="overflow-hidden rounded-[2rem] bg-[#f7faf7]">
                <div className="bg-white px-5 pb-4 pt-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-700">Local Bigger Burger</p>
                      <p className="mt-1 text-lg font-semibold text-ink">Order lunch</p>
                    </div>
                    <div className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-500">2 items</div>
                  </div>
                </div>

                <div className="space-y-4 px-4 pb-24 pt-3">
                  <div className="rounded-[1.5rem] border border-white/70 bg-white p-4 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">School</p>
                    <div className="mt-2 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-medium text-ink">Medina Academy Bellevue</div>
                    <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Delivery date</p>
                    <div className="mt-2 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-medium text-ink">Wed, Apr 15</div>
                    <p className="mt-2 text-xs text-slate-500">Ordering closes Apr 14 at 4:30 PM</p>
                  </div>

                  <div className="rounded-[1.5rem] border border-white/70 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-ink">Menu</p>
                      <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">Burgers</span>
                    </div>
                    <div className="mt-3 space-y-3">
                      {mobileMenu.map((item) => (
                        <div key={item.name} className={`rounded-[1.35rem] border px-4 py-4 ${item.selected ? "border-brand-500 bg-brand-50/80" : "border-slate-200 bg-white"}`}>
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold text-ink">{item.name}</p>
                              <p className="mt-1 text-sm text-slate-600">{item.meta}</p>
                            </div>
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-ink">{item.price}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[1.5rem] border border-brand-100 bg-white p-4 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">Customize</p>
                    <h3 className="mt-1 text-lg font-semibold text-ink">Build Your Own Burger</h3>
                    <div className="mt-4 space-y-3">
                      <p className="text-sm font-semibold text-ink">Choose protein</p>
                      {proteins.map((protein, index) => (
                        <div key={protein} className={`rounded-2xl border px-4 py-3 text-sm ${index === 0 ? "border-brand-500 bg-brand-50" : "border-slate-200 bg-white"}`}>
                          {protein}
                        </div>
                      ))}
                    </div>
                    <div className="mt-5 space-y-3">
                      <p className="text-sm font-semibold text-ink">Removals</p>
                      <div className="grid gap-2">
                        {removals.map((item, index) => (
                          <div key={item} className={`rounded-2xl border px-4 py-3 text-sm ${index === 0 ? "border-brand-500 bg-brand-50" : "border-slate-200 bg-white"}`}>
                            {item}
                          </div>
                        ))}
                      </div>
                    </div>
                    <button className="mt-5 w-full rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white">Add to cart</button>
                  </div>
                </div>

                <div className="border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
                  <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Cart total</p>
                      <p className="text-sm text-slate-600">2 items selected</p>
                    </div>
                    <p className="text-lg font-semibold text-ink">$14.98</p>
                    <button className="rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white">Checkout</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </PageShell>
    </main>
  );
}
