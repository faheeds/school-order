"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { formatInTimeZone } from "date-fns-tz";
import { getRequiredChoicesForMenuItem } from "@/lib/menu-config";
import { cn } from "@/lib/utils";

type DeliveryDate={id:string;schoolId:string;deliveryDate:string;cutoffAt:string;orderingOpen:boolean;school:{id:string;name:string;timezone:string}};
type MenuOption={id:string;name:string;optionType:"ADD_ON"|"REMOVAL";priceDeltaCents:number};
type MenuItem={id:string;slug:string;name:string;description:string|null;basePriceCents:number;options:MenuOption[]};
type CartItem={id:string;menuItemId:string;itemName:string;choice?:string;additions:string[];removals:string[];lineTotalCents:number};
type OrderFormProps={deliveryDates:DeliveryDate[];menuItemsByDeliveryDate:Record<string,MenuItem[]>;savedChildren?:{id:string;schoolId:string;studentName:string;grade:string;allergyNotes:string;dietaryNotes:string}[];initialParentProfile?:{parentName:string;parentEmail:string;parentChildId:string;studentName:string;grade:string;allergyNotes:string};initialSchoolId?:string;initialDeliveryDateId?:string;initialCartItems?:CartItem[]};

function formatCurrency(cents:number){return new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(cents/100)}
const CATEGORY_ORDER=["Signature Burgers & Sandwiches","Salads with Protein","Comfort Favorites","Sides & Snacks"];
function getMenuCategory(item:MenuItem){const prefix=item.description?.split(".")[0]?.trim();if(prefix&&CATEGORY_ORDER.includes(prefix))return prefix;if(item.name.includes("Burger")||item.name.includes("Sandwich"))return"Signature Burgers & Sandwiches";if(item.name.includes("Salad"))return"Salads with Protein";if(item.name.includes("Mac")||item.name.includes("Quesadilla"))return"Comfort Favorites";return"Sides & Snacks"}
function getMenuSummary(item:MenuItem){const parts=item.description?.split(". ");if(!parts?.length)return"";if(CATEGORY_ORDER.includes(parts[0].trim()))return parts.slice(1).join(". ").trim();return item.description??""}

export function OrderForm({deliveryDates,menuItemsByDeliveryDate,savedChildren=[],initialParentProfile,initialSchoolId,initialDeliveryDateId,initialCartItems=[]}:OrderFormProps){
const defaultSchoolId=initialSchoolId||deliveryDates[0]?.school.id||"";const defaultDeliveryDateId=initialDeliveryDateId||deliveryDates.find((item)=>item.school.id===defaultSchoolId)?.id||deliveryDates[0]?.id||"";
const [selectedSchoolId,setSelectedSchoolId]=useState(defaultSchoolId);
const [selectedDeliveryDateId,setSelectedDeliveryDateId]=useState(defaultDeliveryDateId);
const [selectedMenuItemId,setSelectedMenuItemId]=useState("");
const [selectedChoice,setSelectedChoice]=useState("");
const [selectedAdditions,setSelectedAdditions]=useState<string[]>([]);
const [selectedRemovals,setSelectedRemovals]=useState<string[]>([]);
const [cartItems,setCartItems]=useState<CartItem[]>(initialCartItems);
const [error,setError]=useState("");
const customizeSectionRef=useRef<HTMLDivElement|null>(null);
const studentNameInputRef=useRef<HTMLInputElement|null>(null);
const [selectedParentChildId,setSelectedParentChildId]=useState(initialParentProfile?.parentChildId??savedChildren[0]?.id??"");
const [parentName,setParentName]=useState(initialParentProfile?.parentName??"");
const [parentEmail,setParentEmail]=useState(initialParentProfile?.parentEmail??"");
const [studentName,setStudentName]=useState(initialParentProfile?.studentName??"");
const [grade,setGrade]=useState(initialParentProfile?.grade??"");
const [allergyNotes,setAllergyNotes]=useState(initialParentProfile?.allergyNotes??"");

const schools=useMemo(()=>deliveryDates.reduce<DeliveryDate["school"][]>((acc,item)=>{if(!acc.find((school)=>school.id===item.school.id))acc.push(item.school);return acc;},[]),[deliveryDates]);
const schoolDeliveryDates=useMemo(()=>deliveryDates.filter((item)=>item.school.id===selectedSchoolId),[deliveryDates,selectedSchoolId]);
const selectedDelivery=deliveryDates.find((item)=>item.id===selectedDeliveryDateId);
const menuItems=menuItemsByDeliveryDate[selectedDeliveryDateId]??[];
const selectedMenuItem=menuItems.find((item)=>item.id===selectedMenuItemId);
const groupedMenuItems=useMemo(()=>{const groups=menuItems.reduce<Record<string,MenuItem[]>>((acc,item)=>{const category=getMenuCategory(item);acc[category]=acc[category]??[];acc[category].push(item);return acc;},{});return CATEGORY_ORDER.reduce<Record<string,MenuItem[]>>((ordered,category)=>{if(groups[category]?.length)ordered[category]=groups[category];return ordered;},{});},[menuItems]);
const selectedItemTotalCents=useMemo(()=>{if(!selectedMenuItem)return 0;const additionsCost=selectedMenuItem.options.filter((option)=>option.optionType==="ADD_ON"&&selectedAdditions.includes(option.name)).reduce((sum,option)=>sum+option.priceDeltaCents,0);return selectedMenuItem.basePriceCents+additionsCost;},[selectedAdditions,selectedMenuItem]);
const totalCents=useMemo(()=>cartItems.reduce((sum,item)=>sum+item.lineTotalCents,0),[cartItems]);
const requiredChoices=selectedMenuItem?getRequiredChoicesForMenuItem(selectedMenuItem.slug):[];
const addOnOptions=selectedMenuItem?.options.filter((option)=>option.optionType==="ADD_ON"&&!requiredChoices.includes(option.name))??[];
const removalOptions=selectedMenuItem?.options.filter((option)=>option.optionType==="REMOVAL")??[];
const selectedDeliverySummary=selectedDelivery?formatInTimeZone(selectedDelivery.deliveryDate,selectedDelivery.school.timezone,"EEEE, MMMM d"):"";
const selectedCutoffSummary=selectedDelivery?formatInTimeZone(selectedDelivery.cutoffAt,selectedDelivery.school.timezone,"MMM d h:mm a zzz"):"";

useEffect(()=>{if(!selectedParentChildId)return;const child=savedChildren.find((entry)=>entry.id===selectedParentChildId);if(!child)return;setSelectedSchoolId(child.schoolId);setSelectedDeliveryDateId((current)=>{const matchingCurrent=deliveryDates.find((date)=>date.id===current&&date.schoolId===child.schoolId);return matchingCurrent?.id??deliveryDates.find((date)=>date.schoolId===child.schoolId)?.id??current;});setStudentName(child.studentName);setGrade(child.grade);setAllergyNotes(child.allergyNotes);},[deliveryDates,savedChildren,selectedParentChildId]);

function switchToManualEntry(){setSelectedParentChildId("");setStudentName("");setGrade("");setAllergyNotes("");window.requestAnimationFrame(()=>studentNameInputRef.current?.focus());}
function toggleSelection(value:string,current:string[],setter:(items:string[])=>void){setter(current.includes(value)?current.filter((item)=>item!==value):[...current,value]);}
function jumpToCustomize(){customizeSectionRef.current?.scrollIntoView({behavior:"smooth",block:"start"});}
function addSelectedItemToCart(){if(!selectedMenuItem){setError("Select an item before adding it to the cart.");return;}if(requiredChoices.length&&!selectedChoice){setError(`Choose a required option for ${selectedMenuItem.name} before adding it to the cart.`);return;}setCartItems((current)=>[...current,{id:crypto.randomUUID(),menuItemId:selectedMenuItem.id,itemName:selectedMenuItem.name,choice:selectedChoice||undefined,additions:selectedAdditions,removals:selectedRemovals,lineTotalCents:selectedItemTotalCents}]);setSelectedChoice("");setSelectedAdditions([]);setSelectedRemovals([]);setSelectedMenuItemId("");setError("");}
function removeCartItem(id:string){setCartItems((current)=>current.filter((item)=>item.id!==id));}
async function handleSubmit(event:React.FormEvent<HTMLFormElement>){event.preventDefault();setError("");if(!cartItems.length){setError("Add at least one item to the cart before continuing to payment.");return;}const payload={parentName,parentEmail,schoolId:selectedDelivery?.school.id,deliveryDateId:selectedDeliveryDateId,parentChildId:selectedParentChildId||undefined,studentName,grade,cartItems:cartItems.map((item)=>({menuItemId:item.menuItemId,choice:item.choice,additions:item.additions,removals:item.removals})),allergyNotes,dietaryNotes:null,specialInstructions:null};const response=await fetch("/api/checkout/create-session",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});const data=await response.json();if(!response.ok){setError(data.error||"Unable to start checkout.");return;}window.location.href=data.checkoutUrl;}

return <form onSubmit={handleSubmit} className="grid gap-6 pb-28 lg:grid-cols-[minmax(0,1.15fr)_22rem] lg:items-start lg:pb-0">
  <div className="space-y-5">
    <section className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/92 shadow-soft">
      <div className="border-b border-brand-100/70 bg-[linear-gradient(180deg,_rgba(235,247,242,0.95)_0%,_rgba(255,255,255,0.98)_100%)] px-5 py-5 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">Order setup</p>
        <h2 className="mt-2 text-xl font-semibold tracking-tight text-ink">Choose a school, date, and student</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">Large touch targets, a calmer visual hierarchy, and a cleaner mobile flow.</p>
      </div>
      <div className="space-y-6 px-5 py-5 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">School</span>
            <select name="schoolId" className="w-full rounded-2xl border-slate-200 bg-white text-sm" value={selectedSchoolId} onChange={(event)=>{const nextSchoolId=event.target.value;const nextDates=deliveryDates.filter((item)=>item.school.id===nextSchoolId);setSelectedSchoolId(nextSchoolId);setSelectedDeliveryDateId(nextDates[0]?.id??"");setSelectedMenuItemId("");setSelectedChoice("");setSelectedAdditions([]);setSelectedRemovals([]);setCartItems([]);}}>
              {schools.map((school)=><option key={school.id} value={school.id}>{school.name}</option>)}
            </select>
          </label>
          <div className="rounded-2xl bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Selected delivery</p>
            <p className="mt-1 text-sm font-semibold text-ink">{selectedDeliverySummary||"Choose a date below"}</p>
            <p className="mt-1 text-xs text-slate-500">{selectedCutoffSummary?`Ordering closes ${selectedCutoffSummary}`:"Only open delivery dates are shown."}</p>
          </div>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-ink">Available delivery dates</h3>
            <p className="text-xs text-slate-500">{schoolDeliveryDates.length} upcoming</p>
          </div>
          <input type="hidden" name="deliveryDateId" value={selectedDeliveryDateId}/>
          <div className="flex snap-x gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:grid lg:grid-cols-2 lg:overflow-visible xl:grid-cols-3">
            {schoolDeliveryDates.map((date)=>{const isSelected=selectedDeliveryDateId===date.id;return <button key={date.id} type="button" onClick={()=>{setSelectedDeliveryDateId(date.id);setSelectedMenuItemId("");setSelectedChoice("");setSelectedAdditions([]);setSelectedRemovals([]);setCartItems([]);}} className={cn("min-w-[15rem] snap-start rounded-[1.5rem] border px-4 py-4 text-left transition lg:min-w-0",isSelected?"border-brand-500 bg-brand-50 shadow-sm":"border-slate-200 bg-white hover:border-brand-200 hover:bg-slate-50")}>
              <div className="flex items-start gap-3">
                <div className={cn("flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl border text-center",isSelected?"border-brand-200 bg-white":"border-slate-200 bg-slate-50")}>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-700">{formatInTimeZone(date.deliveryDate,date.school.timezone,"MMM")}</p>
                  <p className="mt-1 text-2xl font-bold leading-none text-ink">{formatInTimeZone(date.deliveryDate,date.school.timezone,"d")}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink">{formatInTimeZone(date.deliveryDate,date.school.timezone,"EEEE")}</p>
                  <p className="mt-1 text-sm text-slate-600">{formatInTimeZone(date.deliveryDate,date.school.timezone,"MMMM d")}</p>
                  <p className="mt-2 text-xs text-slate-500">Cutoff {formatInTimeZone(date.cutoffAt,date.school.timezone,"MMM d h:mm a")}</p>
                </div>
              </div>
            </button>})}
          </div>
        </div>
        <div className="space-y-4 rounded-[1.5rem] bg-slate-50/80 p-4">
          <div className="flex items-center justify-between gap-3">
            <div><h3 className="text-sm font-semibold text-ink">Student details</h3><p className="text-xs text-slate-500">Use a saved child or enter details manually.</p></div>
            {savedChildren.length?<button type="button" onClick={switchToManualEntry} className="text-xs font-semibold text-brand-700 hover:text-brand-800">Manual entry</button>:null}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2"><span className="text-sm font-medium text-slate-700">Parent name</span><input name="parentName" required className="w-full rounded-2xl border-slate-200 bg-white text-sm" value={parentName} onChange={(event)=>setParentName(event.target.value)}/></label>
            <label className="space-y-2"><span className="text-sm font-medium text-slate-700">Parent email</span><input type="email" name="parentEmail" required className="w-full rounded-2xl border-slate-200 bg-white text-sm" value={parentEmail} onChange={(event)=>setParentEmail(event.target.value)}/></label>
            {savedChildren.length?<label className="space-y-2 sm:col-span-2"><span className="text-sm font-medium text-slate-700">Saved child</span><select name="parentChildId" className="w-full rounded-2xl border-slate-200 bg-white text-sm" value={selectedParentChildId} onChange={(event)=>{if(!event.target.value){switchToManualEntry();return;}setSelectedParentChildId(event.target.value);}}><option value="">Use manual entry</option>{savedChildren.map((child)=><option key={child.id} value={child.id}>{child.studentName}</option>)}</select></label>:null}
            <label className="space-y-2"><span className="text-sm font-medium text-slate-700">Student name</span><input ref={studentNameInputRef} name="studentName" required className="w-full rounded-2xl border-slate-200 bg-white text-sm" value={studentName} onChange={(event)=>setStudentName(event.target.value)}/></label>
            <label className="space-y-2"><span className="text-sm font-medium text-slate-700">Grade</span><input name="grade" required className="w-full rounded-2xl border-slate-200 bg-white text-sm" value={grade} onChange={(event)=>setGrade(event.target.value)}/></label>
            <label className="space-y-2 sm:col-span-2"><span className="text-sm font-medium text-slate-700">Allergy notes</span><textarea name="allergyNotes" rows={3} className="w-full rounded-2xl border-slate-200 bg-white text-sm" value={allergyNotes} onChange={(event)=>setAllergyNotes(event.target.value)}/></label>
          </div>
        </div>
      </div>
    </section>

    <section className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/92 shadow-soft">
      <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">Menu</p>
        <h2 className="mt-2 text-xl font-semibold tracking-tight text-ink">Pick lunch items</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">Tap an item to customize it. The selected item opens below in a focused section.</p>
      </div>
      <div className="space-y-6 px-5 py-5 sm:px-6">
        {Object.entries(groupedMenuItems).map(([category,items])=><div key={category} className="space-y-3">
          <div className="flex items-center justify-between gap-3"><h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">{category}</h3><p className="text-xs text-slate-400">{items.length} items</p></div>
          <div className="grid gap-3 lg:grid-cols-2">
            {items.map((item)=>{const isSelected=selectedMenuItemId===item.id;return <button key={item.id} type="button" onClick={()=>{setSelectedMenuItemId(item.id);setSelectedChoice("");setSelectedAdditions([]);setSelectedRemovals([]);}} className={cn("rounded-[1.5rem] border px-4 py-4 text-left transition",isSelected?"border-brand-500 bg-brand-50 shadow-sm":"border-slate-200 bg-white hover:border-brand-200 hover:bg-slate-50")}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="font-semibold text-ink">{item.name}</p><p className="mt-1 text-sm leading-6 text-slate-600">{getMenuSummary(item)}</p></div><span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-ink">{formatCurrency(item.basePriceCents)}</span></div></button>})}
          </div>
        </div>)}
      </div>
    </section>

    {selectedMenuItem?<section ref={customizeSectionRef} className="overflow-hidden rounded-[2rem] border border-brand-100 bg-white shadow-soft">
      <div className="border-b border-brand-100 bg-brand-50/70 px-5 py-5 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">Customize</p>
        <h2 className="mt-2 text-xl font-semibold tracking-tight text-ink">{selectedMenuItem.name}</h2>
        <p className="mt-2 text-sm text-slate-600">Choose the options you want, then add this item to the cart.</p>
      </div>
      <div className="space-y-5 px-5 py-5 sm:px-6">
        {requiredChoices.length?<fieldset className="space-y-3"><legend className="text-sm font-semibold text-ink">Required choice</legend><div className="grid gap-2">{requiredChoices.map((choice)=><label key={choice} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"><input type="radio" name="gourmetChoice" checked={selectedChoice===choice} onChange={()=>setSelectedChoice(choice)}/><span>{choice}</span></label>)}</div></fieldset>:null}
        <div className="grid gap-5 lg:grid-cols-2">
          <fieldset className="space-y-3"><legend className="text-sm font-semibold text-ink">Add-ons</legend>{addOnOptions.length?addOnOptions.map((option)=><label key={option.id} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"><input type="checkbox" checked={selectedAdditions.includes(option.name)} onChange={()=>toggleSelection(option.name,selectedAdditions,setSelectedAdditions)} className="rounded border-slate-300"/><span>{option.name}{option.priceDeltaCents?` (+${formatCurrency(option.priceDeltaCents)})`:""}</span></label>):<p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500">No add-ons for this item.</p>}</fieldset>
          <fieldset className="space-y-3"><legend className="text-sm font-semibold text-ink">Removals</legend>{removalOptions.length?removalOptions.map((option)=><label key={option.id} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"><input type="checkbox" checked={selectedRemovals.includes(option.name)} onChange={()=>toggleSelection(option.name,selectedRemovals,setSelectedRemovals)} className="rounded border-slate-300"/><span>{option.name}</span></label>):<p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500">No removals for this item.</p>}</fieldset>
        </div>
        <div className="rounded-[1.5rem] bg-ink px-4 py-4 text-white"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-200">Ready to add</p><p className="mt-1 text-sm text-slate-100">{selectedChoice?`Choice: ${selectedChoice}. `:""}{selectedAdditions.length?`Add-ons: ${selectedAdditions.join(", ")}. `:"No add-ons selected. "}{selectedRemovals.length?`Remove: ${selectedRemovals.join(", ")}.`:"No removals selected."}</p></div><div className="flex flex-wrap items-center gap-3"><p className="text-lg font-semibold">{formatCurrency(selectedItemTotalCents)}</p><button type="button" onClick={addSelectedItemToCart} className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-ink transition hover:bg-brand-100">Add to cart</button></div></div></div>
      </div>
    </section>:<section className="rounded-[2rem] border border-dashed border-slate-200 bg-white/70 px-5 py-8 text-center shadow-soft"><p className="text-sm text-slate-500">Choose a menu item to see its customization options here.</p></section>}

    <section className="rounded-[2rem] border border-brand-100 bg-white shadow-soft lg:hidden">
      <div className="border-b border-brand-100 bg-brand-50/70 px-5 py-4"><h2 className="text-lg font-semibold text-ink">Cart summary</h2><p className="mt-1 text-sm text-slate-600">{cartItems.length?`${cartItems.length} item${cartItems.length===1?"":"s"} ready for checkout`:"Your cart is empty so far."}</p></div>
      <div className="space-y-4 px-5 py-5">
        {cartItems.length?cartItems.map((item)=><div key={item.id} className="rounded-[1.5rem] border border-slate-200 bg-white px-4 py-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="font-semibold text-ink">{item.itemName}</p>{item.choice?<p className="mt-1 text-sm text-slate-600">Choice: {item.choice}</p>:null}<p className="mt-1 text-sm text-slate-600">Add-ons: {item.additions.length?item.additions.join(", "):"None"}</p><p className="mt-1 text-sm text-slate-600">Remove: {item.removals.length?item.removals.join(", "):"None"}</p></div><button type="button" onClick={()=>removeCartItem(item.id)} className="text-sm font-semibold text-rose-600 hover:text-rose-700">Remove</button></div></div>):<p className="rounded-2xl bg-slate-50 px-4 py-4 text-sm text-slate-500">Add an item to see it here before checkout.</p>}
        {selectedDelivery?<div className="rounded-[1.5rem] bg-slate-50 px-4 py-4 text-sm text-slate-600"><p><span className="font-semibold text-ink">School:</span> {selectedDelivery.school.name}</p><p className="mt-1"><span className="font-semibold text-ink">Delivery:</span> {selectedDeliverySummary}</p><p className="mt-1"><span className="font-semibold text-ink">Ordering closes:</span> {selectedCutoffSummary}</p></div>:null}
      </div>
    </section>

    {error?<p className="rounded-2xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>:null}
    {selectedMenuItem?<div className="sticky bottom-24 z-10 rounded-[1.75rem] border border-brand-200 bg-white/95 p-4 shadow-soft backdrop-blur md:bottom-4 lg:hidden"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-700">Quick add</p><p className="font-semibold text-ink">{selectedMenuItem.name}</p><p className="text-sm text-slate-600">{selectedChoice?`Choice: ${selectedChoice}. `:""}{selectedAdditions.length?`Add-ons: ${selectedAdditions.join(", ")}. `:"No add-ons selected. "}{selectedRemovals.length?`Remove: ${selectedRemovals.join(", ")}.`:"No removals selected."}</p></div><div className="flex flex-wrap items-center gap-3"><button type="button" onClick={jumpToCustomize} className="rounded-full border border-slate-200 px-4 py-3 text-sm font-semibold text-ink hover:border-brand-300 hover:text-brand-700">Review</button><button type="button" onClick={addSelectedItemToCart} className="rounded-full bg-brand-600 px-5 py-3 text-sm font-semibold text-white hover:bg-brand-700">Add {formatCurrency(selectedItemTotalCents)}</button></div></div></div>:null}
  </div>

  <aside className="hidden rounded-[2rem] border border-brand-100 bg-ink p-6 text-white shadow-soft lg:sticky lg:top-6 lg:block">
    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-200">Checkout</p>
    <h2 className="mt-2 text-2xl font-semibold">Cart summary</h2>
    <p className="mt-2 text-sm leading-6 text-slate-200">Review the order before payment. You can remove any item here.</p>
    <div className="mt-6 space-y-3">
      {cartItems.length?cartItems.map((item)=><div key={item.id} className="rounded-[1.5rem] bg-white/10 p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="font-semibold text-white">{item.itemName}</p>{item.choice?<p className="mt-1 text-sm text-slate-200">Choice: {item.choice}</p>:null}<p className="mt-1 text-sm text-slate-200">Add-ons: {item.additions.length?item.additions.join(", "):"None"}</p><p className="mt-1 text-sm text-slate-200">Remove: {item.removals.length?item.removals.join(", "):"None"}</p></div><button type="button" onClick={()=>removeCartItem(item.id)} className="text-xs font-semibold text-brand-100 underline underline-offset-2">Remove</button></div></div>):<p className="rounded-[1.5rem] bg-white/10 p-4 text-sm text-slate-200">No items in cart yet.</p>}
    </div>
    {selectedDelivery?<div className="mt-6 rounded-[1.5rem] bg-white/10 p-4 text-sm text-slate-100"><p><span className="font-semibold text-white">School:</span> {selectedDelivery.school.name}</p><p className="mt-1"><span className="font-semibold text-white">Delivery:</span> {selectedDeliverySummary}</p><p className="mt-1"><span className="font-semibold text-white">Ordering closes:</span> {selectedCutoffSummary}</p></div>:null}
    <div className="mt-6 rounded-[1.5rem] bg-white/10 p-4"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-100">Cart total</p><p className="mt-2 text-3xl font-semibold">{formatCurrency(totalCents)}</p><p className="mt-2 text-sm text-slate-200">Stripe checkout will include every item currently in the cart.</p><button type="submit" disabled={!cartItems.length} className="mt-4 w-full rounded-full bg-white px-6 py-3 font-semibold text-ink transition hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-60">Continue to payment</button></div>
  </aside>

  <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-soft backdrop-blur lg:hidden"><div className="mx-auto flex max-w-7xl items-center gap-3"><div className="min-w-0 flex-1"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Cart total</p><p className="truncate text-sm text-slate-600">{cartItems.length?`${cartItems.length} item${cartItems.length===1?"":"s"} selected`:"Add items to continue"}</p></div><div className="text-right"><p className="text-lg font-semibold text-ink">{formatCurrency(totalCents)}</p></div><button type="submit" disabled={!cartItems.length} className="rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60">Checkout</button></div></div>
</form>;
}
