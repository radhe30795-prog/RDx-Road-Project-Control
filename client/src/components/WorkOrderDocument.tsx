import React, { useState, useEffect } from "react";
import { trpc } from "../lib/trpc";
import { toast } from "sonner";

export type WoLang = "hi" | "en";

export interface WoTermSection {
  no: number;
  title: string;
  body: string;
}

/**
 * Default Hindi कायादेश terms template.
 * Placeholders: {{employer}} {{subcontractor}} {{roadName}} {{roadLength}} {{woNo}} {{woDate}} {{scope}}
 */
export const DEFAULT_WO_TERMS: WoTermSection[] = [
  {
    no: 1,
    title: "विशेष नियम एवं शर्तें",
    body: "उप-ठेकेदार {{subcontractor}} को {{roadName}} (लंबाई {{roadLength}} कि.मी.) पर संरचना कार्य हेतु उप-ठेकेदार के रूप में नियुक्त किया जाता है। यह कार्यादेश {{employer}} (मुख्य ठेकेदार) द्वारा जारी किया गया है। उप-ठेकेदार को कार्य प्रारंभ करने से पूर्व सभी नियमों एवं शर्तों को ध्यानपूर्वक पढ़कर स्वीकार करना होगा।",
  },
  {
    no: 2,
    title: "भुगतान की शर्तें",
    body: "कुल कार्यादेश मूल्य का 15% सुरक्षा निक्षेप (Security Deposit) के रूप में रोका जाएगा, जो कार्य संतोषजनक रूप से पूर्ण होने एवं दोष दायित्व अवधि समाप्त होने के पश्चात वापस किया जाएगा। रनिंग बिल प्रत्येक 15 दिवस में प्रस्तुत किए जाएंगे तथा माप-पुस्तिका (Measurement Book) में दर्ज माप के आधार पर भुगतान किया जाएगा। सभी दरों में जी.एस.टी. पृथक से देय होगा।",
  },
  { no: 3, title: "मूल्य सूची (BOQ)", body: "__BOQ_TABLE__" },
  {
    no: 4,
    title: "सामग्री एवं सुरक्षा",
    body: "मुख्य ठेकेदार द्वारा आपूर्ति की गई समस्त सामग्री का उप-ठेकेदार पूर्ण उत्तरदायी होगा। सामग्री के भंडारण, रख-रखाव एवं अपव्यय की रोकथाम हेतु उप-ठेकेदार उचित सुरक्षा व्यवस्था करेगा। सामग्री की किसी भी प्रकार की हानि/चोरी होने पर उसकी भरपाई उप-ठेकेदार से की जाएगी।",
  },
  {
    no: 5,
    title: "गुणवत्ता",
    body: "समस्त कार्य अनुमोदित ड्राइंग, विनिर्देशों (Specifications) एवं MORTH मानकों के अनुरूप होगा। गुणवत्ता परीक्षण हेतु आवश्यक नमूने/क्यूब उप-ठेकेदार अपने व्यय पर उपलब्ध कराएगा। अस्वीकृत कार्य को उप-ठेकेदार अपने व्यय पर पुनः करेगा।",
  },
  {
    no: 6,
    title: "सामान्य नियम",
    body: "उप-ठेकेदार कार्यस्थल पर पर्याप्त कुशल श्रमिक, औजार एवं उपकरण उपलब्ध रखेगा। कार्य की प्रगति लक्ष्य तिथि के अनुरूप बनाए रखना उप-ठेकेदार का दायित्व होगा। मुख्य ठेकेदार के अभियंता के निर्देशों का पालन अनिवार्य होगा।",
  },
  {
    no: 7,
    title: "सुरक्षा आवश्यकताएँ",
    body: "कार्यस्थल पर श्रमिकों की सुरक्षा हेतु सभी आवश्यक उपाय (हेलमेट, सुरक्षा बेल्ट, बैरिकेडिंग, संकेत बोर्ड आदि) उप-ठेकेदार अपने व्यय पर करेगा। किसी भी दुर्घटना की पूर्ण जिम्मेदारी उप-ठेकेदार की होगी।",
  },
  {
    no: 8,
    title: "समाप्ति",
    body: "नियमों एवं शर्तों का उल्लंघन होने पर मुख्य ठेकेदार को यह कार्यादेश तत्काल प्रभाव से समाप्त करने का अधिकार होगा। ऐसी स्थिति में अब तक किए गए कार्य का भुगतान माप के आधार पर किया जाएगा तथा शेष कार्य अन्य एजेंसी से कराने पर होने वाला अतिरिक्त व्यय उप-ठेकेदार से वसूल किया जाएगा।",
  },
  {
    no: 9,
    title: "अप्रत्याशित परिस्थितियाँ",
    body: "बाढ़, भूकंप, महामारी अथवा अन्य अप्रत्याशित परिस्थितियों (Force Majeure) के कारण कार्य बाधित होने पर दोनों पक्ष आपसी सहमति से समय-वृद्धि पर विचार करेंगे। ऐसी परिस्थिति की सूचना 7 दिवस के भीतर लिखित में देना अनिवार्य होगा।",
  },
  {
    no: 10,
    title: "अधिकार क्षेत्र",
    body: "इस कार्यादेश से उत्पन्न किसी भी विवाद का निपटारा आपसी बातचीत से किया जाएगा। विवाद अनसुलझा रहने पर अंबिकापुर (छत्तीसगढ़) न्यायालय का अधिकार क्षेत्र होगा।",
  },
];

/** English translation of the work order terms (same 10 sections). */
export const DEFAULT_WO_TERMS_EN: WoTermSection[] = [
  {
    no: 1,
    title: "Special Terms & Conditions",
    body: "The sub-contractor {{subcontractor}} is hereby appointed as sub-contractor for structure work on {{roadName}} (length {{roadLength}} km). This work order is issued by {{employer}} (main contractor). The sub-contractor must carefully read and accept all terms and conditions before commencing work.",
  },
  {
    no: 2,
    title: "Payment Terms",
    body: "15% of the total work order value shall be retained as Security Deposit, refundable after satisfactory completion of work and expiry of the defect liability period. Running bills shall be submitted every 15 days and payment shall be made on the basis of measurements recorded in the Measurement Book. GST shall be payable extra on all rates.",
  },
  { no: 3, title: "Bill of Quantities (BOQ)", body: "__BOQ_TABLE__" },
  {
    no: 4,
    title: "Material & Security",
    body: "The sub-contractor shall be fully responsible for all materials supplied by the main contractor. The sub-contractor shall make proper security arrangements for storage, upkeep and prevention of wastage of materials. Any loss/theft of material shall be recovered from the sub-contractor.",
  },
  {
    no: 5,
    title: "Quality",
    body: "All work shall conform to approved drawings, specifications and MORTH standards. The sub-contractor shall provide samples/cubes for quality testing at his own cost. Rejected work shall be redone by the sub-contractor at his own cost.",
  },
  {
    no: 6,
    title: "General Rules",
    body: "The sub-contractor shall maintain adequate skilled labour, tools and equipment at site. Maintaining progress as per target dates shall be the sub-contractor's responsibility. Compliance with the instructions of the main contractor's engineer is mandatory.",
  },
  {
    no: 7,
    title: "Safety Requirements",
    body: "The sub-contractor shall take all necessary safety measures for workers at site (helmets, safety belts, barricading, sign boards etc.) at his own cost. The sub-contractor shall bear full responsibility for any accident.",
  },
  {
    no: 8,
    title: "Termination",
    body: "In case of violation of terms and conditions, the main contractor reserves the right to terminate this work order with immediate effect. In such case, payment for work done shall be made on measurement basis, and any extra cost incurred in getting the remaining work executed through another agency shall be recovered from the sub-contractor.",
  },
  {
    no: 9,
    title: "Unforeseen Circumstances",
    body: "In case of work disruption due to floods, earthquake, pandemic or other unforeseen circumstances (Force Majeure), both parties shall consider time extension by mutual agreement. Written intimation of such circumstances within 7 days is mandatory.",
  },
  {
    no: 10,
    title: "Jurisdiction",
    body: "Any dispute arising out of this work order shall be settled through mutual discussion. If the dispute remains unresolved, the courts at Ambikapur (Chhattisgarh) shall have jurisdiction.",
  },
];

export const WO_TERMS: Record<WoLang, WoTermSection[]> = {
  hi: DEFAULT_WO_TERMS,
  en: DEFAULT_WO_TERMS_EN,
};

/** Document chrome labels per language. */
export const DOC_STRINGS: Record<
  WoLang,
  {
    title: string;
    titleSub: string;
    ref: string;
    date: string;
    to: string;
    subject: string;
    mob: string;
    sn: string;
    workType: string;
    unit: string;
    qty: string;
    rate: string;
    amount: string;
    total: string;
    noItems: string;
    subContractor: string;
    mainContractor: string;
    signature: string;
    name: string;
    seal: string;
  }
> = {
  hi: {
    title: "कायादेश",
    titleSub: "(Work Order)",
    ref: "संदर्भ",
    date: "दिनांक",
    to: "प्रति",
    subject: "विषय",
    mob: "मो.",
    sn: "क्र.सं.",
    workType: "कार्य का प्रकार",
    unit: "इकाई",
    qty: "मात्रा",
    rate: "दर (₹)",
    amount: "राशि (₹)",
    total: "कुल",
    noItems: 'कोई आइटम नहीं — "BOQ Items" टैब से जोड़ें',
    subContractor: "उप-ठेकेदार",
    mainContractor: "मुख्य ठेकेदार",
    signature: "हस्ताक्षर",
    name: "नाम",
    seal: "(मुहर)",
  },
  en: {
    title: "Work Order",
    titleSub: "(कायादेश)",
    ref: "Ref",
    date: "Date",
    to: "To",
    subject: "Subject",
    mob: "Mob.",
    sn: "S.No.",
    workType: "Description of Work",
    unit: "Unit",
    qty: "Qty",
    rate: "Rate (₹)",
    amount: "Amount (₹)",
    total: "Total",
    noItems: 'No items — add from the "BOQ Items" tab',
    subContractor: "Sub-Contractor",
    mainContractor: "Main Contractor",
    signature: "Signature",
    name: "Name",
    seal: "(Seal)",
  },
};

export const WO_INTRO: Record<WoLang, string> = {
  hi: "संदर्भित कार्य हेतु {{subcontractor}} को उप-ठेकेदार के रूप में नियुक्त किया जाता है। {{employer}}, रायगढ़ (मुख्य ठेकेदार) द्वारा {{roadName}} मार्ग (लंबाई {{roadLength}} कि.मी.) पर संरचना कार्य कराए जाने हेतु यह कार्यादेश निम्नलिखित नियमों एवं शर्तों के अधीन जारी किया जाता है।",
  en: "{{subcontractor}} is hereby appointed as sub-contractor for the referenced work. This work order is issued by {{employer}}, Raigarh (main contractor) for getting structure work executed on {{roadName}} road (length {{roadLength}} km), subject to the following terms and conditions.",
};

export const WO_SUBJECT: Record<WoLang, string> = {
  hi: "{{roadName}} (लंबाई {{roadLength}} कि.मी.) पर संरचना कार्य हेतु कार्यादेश।",
  en: "Work order for structure work on {{roadName}} (length {{roadLength}} km).",
};

function fillPlaceholders(text: string, vars: Record<string, string>) {
  let out = text;
  for (const [k, v] of Object.entries(vars)) {
    out = out.split(`{{${k}}}`).join(v);
  }
  return out;
}

function formatDate(d: string | Date | null | undefined) {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return String(d);
  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${dt.getFullYear()}`;
}

export default function WorkOrderDocument({ workOrderId, onClose }: { workOrderId: number; onClose?: () => void }) {
  const [tab, setTab] = useState<"doc" | "items" | "terms">("doc");
  const [lang, setLang] = useState<WoLang>("hi");
  const [editTerms, setEditTerms] = useState<WoTermSection[] | null>(null);
  const [newItem, setNewItem] = useState({ description: "", unit: "Nos", quantity: "1", rate: "" });
  const [editingItem, setEditingItem] = useState<any | null>(null);

  const { data, isLoading, refetch } = trpc.subcontractors.workOrderDocument.useQuery({ workOrderId });
  const updateWo = trpc.subcontractors.updateWorkOrder.useMutation();
  const addItem = trpc.subcontractors.addWorkOrderItem.useMutation();
  const updItem = trpc.subcontractors.updateWorkOrderItem.useMutation();
  const delItem = trpc.subcontractors.deleteWorkOrderItem.useMutation();

  // Sync language from persisted per-WO preference
  useEffect(() => {
    const dl = (data as any)?.wo?.docLang;
    if (dl === "hi" || dl === "en") setLang(dl);
  }, [data]);

  const switchLang = async (l: WoLang) => {
    setLang(l);
    try {
      await updateWo.mutateAsync({ id: workOrderId, docLang: l });
    } catch {
      /* persistence is best-effort; view toggle still works */
    }
  };

  /** Parse termsOverride: lang-keyed object {hi:[...],en:[...]} or legacy plain array (treated as Hindi). */
  const parseOverride = (raw: string | null | undefined): Partial<Record<WoLang, WoTermSection[]>> => {
    if (!raw) return {};
    try {
      const p = JSON.parse(raw);
      if (Array.isArray(p)) return { hi: p };
      if (p && typeof p === "object") return p;
    } catch {
      /* fall through */
    }
    return {};
  };

  if (isLoading) return <div className="p-8 text-center text-sm text-slate-500">कार्यादेश लोड हो रहा है…</div>;
  if (!data) return <div className="p-8 text-center text-sm text-red-500">कार्यादेश नहीं मिला।</div>;

  const { wo, subcontractor, road, project, items } = data as any;
  const vars: Record<string, string> = {
    employer: project?.contractor || "मैसर्स श्री साई एसोसिएट्स",
    subcontractor: subcontractor?.name || "—",
    roadName: road ? `${road.roadId} — ${road.roadName}` : "—",
    roadLength: road?.roadLengthKm ? String(road.roadLengthKm) : "—",
    woNo: wo.workOrderNo || "—",
    woDate: formatDate(wo.createdAt),
    scope: wo.scope || "—",
  };

  // Resolve sections for current language: per-WO override (lang-keyed) else template with placeholders filled
  const override = parseOverride(wo.termsOverride);
  let sections: WoTermSection[];
  if (override[lang]) {
    sections = override[lang]!;
  } else {
    sections = WO_TERMS[lang].map((s) => ({ ...s, body: fillPlaceholders(s.body, vars) }));
  }
  const shownSections = editTerms || sections;
  const T = DOC_STRINGS[lang];

  const intro = fillPlaceholders(WO_INTRO[lang], vars);
  const subject = fillPlaceholders(WO_SUBJECT[lang], vars);

  const startTermsEdit = () => {
    // Fill placeholders into editable copy so user edits final text (current language only)
    setEditTerms(sections.map((s) => ({ ...s })));
    setTab("terms");
  };
  const saveTerms = async () => {
    if (!editTerms) return;
    const merged = { ...override, [lang]: editTerms };
    await updateWo.mutateAsync({ id: wo.id, termsOverride: JSON.stringify(merged) });
    toast.success(lang === "hi" ? "शर्तें सहेजी गईं!" : "Terms saved!");
    setEditTerms(null);
    setTab("doc");
    refetch();
  };
  const resetTerms = async () => {
    if (!confirm(lang === "hi" ? "डिफ़ॉल्ट शर्तों पर वापस जाएं?" : "Reset to default terms?")) return;
    const merged = { ...override };
    delete merged[lang];
    await updateWo.mutateAsync({ id: wo.id, termsOverride: Object.keys(merged).length ? JSON.stringify(merged) : null });
    setEditTerms(null);
    setTab("doc");
    refetch();
    toast.success(lang === "hi" ? "डिफ़ॉल्ट शर्तें लागू!" : "Default terms restored!");
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.description.trim()) return;
    const srNo = items.length + 1;
    await addItem.mutateAsync({
      workOrderId: wo.id,
      srNo,
      description: newItem.description.trim(),
      unit: newItem.unit,
      quantity: newItem.quantity || "1.000",
      rate: newItem.rate || "0.00",
      sortOrder: srNo,
    });
    setNewItem({ description: "", unit: "Nos", quantity: "1", rate: "" });
    toast.success("आइटम जोड़ा गया!");
    refetch();
  };
  const handleUpdateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    await updItem.mutateAsync({
      id: editingItem.id,
      description: editingItem.description,
      unit: editingItem.unit,
      quantity: editingItem.quantity,
      rate: editingItem.rate,
      srNo: Number(editingItem.srNo) || 1,
    });
    setEditingItem(null);
    toast.success("आइटम अपडेट!");
    refetch();
  };
  const handleDeleteItem = async (id: number) => {
    if (!confirm("यह आइटम हटाएं?")) return;
    await delItem.mutateAsync({ id });
    toast.success("आइटम हटाया गया!");
    refetch();
  };

  const itemsTotal = items.reduce(
    (s: number, it: any) => s + parseFloat(String(it.quantity || 0)) * parseFloat(String(it.rate || 0)),
    0
  );

  const boqTable = (
    <table className="w-full border-collapse border border-slate-800 text-[13px] my-2">
      <thead>
        <tr className="bg-slate-100">
          <th className="border border-slate-800 px-2 py-1.5 w-14">{T.sn}</th>
          <th className="border border-slate-800 px-2 py-1.5 text-left">{T.workType}</th>
          <th className="border border-slate-800 px-2 py-1.5 w-20">{T.unit}</th>
          <th className="border border-slate-800 px-2 py-1.5 w-20">{T.qty}</th>
          <th className="border border-slate-800 px-2 py-1.5 w-28">{T.rate}</th>
          <th className="border border-slate-800 px-2 py-1.5 w-32">{T.amount}</th>
        </tr>
      </thead>
      <tbody>
        {items.length === 0 ? (
          <tr>
            <td colSpan={6} className="border border-slate-800 px-2 py-3 text-center text-slate-500">
              {T.noItems}
            </td>
          </tr>
        ) : (
          <>
            {items.map((it: any, i: number) => {
              const q = parseFloat(String(it.quantity || 0));
              const r = parseFloat(String(it.rate || 0));
              return (
                <tr key={it.id}>
                  <td className="border border-slate-800 px-2 py-1.5 text-center">{it.srNo ?? i + 1}</td>
                  <td className="border border-slate-800 px-2 py-1.5">{it.description}</td>
                  <td className="border border-slate-800 px-2 py-1.5 text-center">{it.unit}</td>
                  <td className="border border-slate-800 px-2 py-1.5 text-center font-mono">
                    {q.toLocaleString("en-IN", { minimumFractionDigits: 3 })}
                  </td>
                  <td className="border border-slate-800 px-2 py-1.5 text-right font-mono">
                    {r.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="border border-slate-800 px-2 py-1.5 text-right font-mono font-semibold">
                    {(q * r).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              );
            })}
            <tr className="bg-slate-100">
              <td colSpan={5} className="border border-slate-800 px-2 py-1.5 text-right font-bold">
                {T.total}
              </td>
              <td className="border border-slate-800 px-2 py-1.5 text-right font-mono font-bold">
                ₹{itemsTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </td>
            </tr>
          </>
        )}
      </tbody>
    </table>
  );

  return (
    <div className="flex flex-col h-full">
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .wo-doc-print, .wo-doc-print * { visibility: visible !important; }
          .wo-doc-print { position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; max-height: none !important; overflow: visible !important; padding: 24px !important; }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* Toolbar */}
      <div className="no-print flex flex-wrap items-center gap-2 p-3 border-b border-slate-200 bg-slate-50">
        <div className="flex rounded-lg overflow-hidden border border-slate-300 text-xs font-bold">
          <button onClick={() => switchLang("hi")} className={`px-3 py-1.5 ${lang === "hi" ? "bg-orange-500 text-white" : "bg-white text-slate-600"}`}>हिंदी</button>
          <button onClick={() => switchLang("en")} className={`px-3 py-1.5 ${lang === "en" ? "bg-orange-500 text-white" : "bg-white text-slate-600"}`}>English</button>
        </div>
        <button onClick={() => setTab("doc")} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${tab === "doc" ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-700"}`}>📄 {lang === "hi" ? "दस्तावेज़" : "Document"}</button>
        <button onClick={() => setTab("items")} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${tab === "items" ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-700"}`}>📋 BOQ Items ({items.length})</button>
        <button onClick={startTermsEdit} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${tab === "terms" ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-700"}`}>✏️ {lang === "hi" ? "शर्तें बदलें" : "Edit Terms"}</button>
        <div className="flex-1" />
        <button onClick={() => window.print()} className="px-4 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white">🖨️ {lang === "hi" ? "प्रिंट" : "Print"}</button>
        {onClose && <button onClick={onClose} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white border border-slate-200 text-slate-700">✕ {lang === "hi" ? "बंद" : "Close"}</button>}
      </div>

      {tab === "items" && (
        <div className="no-print p-4 overflow-y-auto space-y-4">
          <form onSubmit={handleAddItem} className="bg-amber-50 border border-amber-200 rounded-xl p-3 grid grid-cols-12 gap-2 text-xs">
            <input value={newItem.description} onChange={(e) => setNewItem({ ...newItem, description: e.target.value })} placeholder="कार्य का विवरण *" className="col-span-5 p-2 border border-slate-200 rounded-lg" required />
            <input value={newItem.unit} onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })} placeholder="इकाई" className="col-span-2 p-2 border border-slate-200 rounded-lg" />
            <input value={newItem.quantity} onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })} placeholder="मात्रा" type="number" step="0.001" className="col-span-2 p-2 border border-slate-200 rounded-lg" />
            <input value={newItem.rate} onChange={(e) => setNewItem({ ...newItem, rate: e.target.value })} placeholder="दर ₹" type="number" step="0.01" className="col-span-2 p-2 border border-slate-200 rounded-lg" />
            <button className="col-span-1 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold">+ जोड़ें</button>
          </form>
          <div className="space-y-2">
            {items.map((it: any) => (
              <div key={it.id} className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg p-2 text-xs">
                {editingItem?.id === it.id ? (
                  <form onSubmit={handleUpdateItem} className="flex flex-1 items-center gap-2">
                    <input value={editingItem.srNo} onChange={(e) => setEditingItem({ ...editingItem, srNo: e.target.value })} type="number" className="w-12 p-1.5 border rounded" />
                    <input value={editingItem.description} onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })} className="flex-1 p-1.5 border rounded" />
                    <input value={editingItem.unit} onChange={(e) => setEditingItem({ ...editingItem, unit: e.target.value })} className="w-20 p-1.5 border rounded" />
                    <input value={editingItem.quantity} onChange={(e) => setEditingItem({ ...editingItem, quantity: e.target.value })} type="number" step="0.001" className="w-20 p-1.5 border rounded" />
                    <input value={editingItem.rate} onChange={(e) => setEditingItem({ ...editingItem, rate: e.target.value })} type="number" step="0.01" className="w-24 p-1.5 border rounded" />
                    <button className="px-2 py-1.5 bg-emerald-600 text-white rounded font-bold">✓</button>
                    <button type="button" onClick={() => setEditingItem(null)} className="px-2 py-1.5 bg-slate-200 rounded font-bold">✕</button>
                  </form>
                ) : (
                  <>
                    <span className="w-8 text-center font-bold text-slate-500">{it.srNo}</span>
                    <span className="flex-1 font-medium text-slate-800">{it.description}</span>
                    <span className="text-slate-500">{it.unit}</span>
                    <span className="font-mono text-slate-600 w-16 text-right">{parseFloat(String(it.quantity || 0)).toLocaleString("en-IN")}</span>
                    <span className="font-mono font-bold w-24 text-right">₹{Number(it.rate || 0).toLocaleString("en-IN")}</span>
                    <span className="font-mono text-emerald-700 font-bold w-24 text-right">₹{(parseFloat(String(it.quantity || 0)) * parseFloat(String(it.rate || 0))).toLocaleString("en-IN")}</span>
                    <button onClick={() => setEditingItem({ ...it, quantity: String(it.quantity ?? "1"), rate: String(it.rate ?? ""), srNo: String(it.srNo ?? 1) })} className="px-2 py-1 bg-amber-50 border border-amber-200 text-amber-700 rounded font-bold">✏️</button>
                    <button onClick={() => handleDeleteItem(it.id)} className="px-2 py-1 bg-red-50 border border-red-200 text-red-700 rounded font-bold">🗑️</button>
                  </>
                )}
              </div>
            ))}
            {items.length === 0 && <p className="text-center text-slate-400 text-xs py-4">अभी कोई BOQ आइटम नहीं है। ऊपर से जोड़ें।</p>}
          </div>
        </div>
      )}

      {tab === "terms" && editTerms && (
        <div className="no-print p-4 overflow-y-auto space-y-3">
          <p className="text-xs text-slate-500">{lang === "hi" ? "प्रत्येक धारा का शीर्षक व विवरण बदल सकते हैं। सहेजने पर यह कार्यादेश हेतु स्थायी रहेगा।" : "You can edit each section's title and body. Saving makes it permanent for this work order."} ({lang === "hi" ? "हिंदी" : "English"})</p>
          {editTerms.map((s, i) => (
            <div key={s.no} className="bg-white border border-slate-200 rounded-xl p-3 space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-700 text-sm">{s.no}.</span>
                <input value={s.title} onChange={(e) => { const c = [...editTerms]; c[i] = { ...c[i], title: e.target.value }; setEditTerms(c); }} className="flex-1 p-1.5 border border-slate-200 rounded font-bold text-sm" />
              </div>
              {s.no === 3 ? (
                <p className="text-[11px] text-slate-500 italic">यह धारा BOQ तालिका है — आइटम "BOQ Items" टैब से प्रबंधित होते हैं।</p>
              ) : (
                <textarea value={s.body} rows={4} onChange={(e) => { const c = [...editTerms]; c[i] = { ...c[i], body: e.target.value }; setEditTerms(c); }} className="w-full p-2 border border-slate-200 rounded-lg text-xs leading-relaxed" />
              )}
            </div>
          ))}
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={resetTerms} className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-600">↩ {lang === "hi" ? "डिफ़ॉल्ट पर वापस" : "Reset to default"}</button>
            <button onClick={() => { setEditTerms(null); setTab("doc"); }} className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-600">{lang === "hi" ? "रद्द करें" : "Cancel"}</button>
            <button onClick={saveTerms} disabled={updateWo.isPending} className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold">✓ {lang === "hi" ? "सहेजें" : "Save"}</button>
          </div>
        </div>
      )}

      {tab === "doc" && (
        <div className="wo-doc-print overflow-y-auto p-6 bg-white text-slate-900" lang={lang} style={{ maxHeight: "70vh" }}>
          {/* Header */}
          <div className="text-center border-b-2 border-slate-900 pb-3 mb-4">
            <h1 className="text-2xl font-bold">{T.title} <span className="text-base font-normal">{T.titleSub}</span></h1>
            <div className="flex justify-between text-[13px] mt-2">
              <span><strong>{T.ref}:</strong> {vars.woNo}</span>
              <span><strong>{T.date}:</strong> {vars.woDate}</span>
            </div>
          </div>

          {/* प्रति / To */}
          <div className="mb-3 text-[13px]">
            <p className="font-bold">{T.to},</p>
            <p className="font-bold ml-4">{vars.subcontractor}</p>
            {subcontractor?.address && <p className="ml-4">{subcontractor.address}</p>}
            {subcontractor?.phone && <p className="ml-4">{T.mob}: {subcontractor.phone}</p>}
          </div>

          {/* विषय / Subject */}
          <div className="mb-3 text-[13px]">
            <p><strong>{T.subject}:</strong> {subject}</p>
          </div>

          {/* Intro */}
          <p className="mb-4 text-[13px] leading-relaxed text-justify">{intro}</p>

          {/* Sections */}
          {shownSections.map((s) => (
            <div key={s.no} className="mb-3 text-[13px]">
              <p className="font-bold mb-1">{s.no}. {s.title}</p>
              {s.no === 3 ? boqTable : <p className="leading-relaxed text-justify ml-1">{s.body}</p>}
            </div>
          ))}

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-8 mt-10 text-[13px]">
            <div className="text-center">
              <p className="font-bold mb-8">{T.subContractor}</p>
              <p>{T.signature}: _______________</p>
              <p className="mt-1">{T.name}: {vars.subcontractor}</p>
              <p className="mt-1">{T.date}: _______________</p>
            </div>
            <div className="text-center">
              <p className="font-bold mb-8">{T.mainContractor}</p>
              <p>{T.signature}: _______________</p>
              <p className="mt-1">{T.name}: {vars.employer}</p>
              <p className="mt-1">{T.date}: _______________</p>
              <p className="mt-1">{T.seal}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
