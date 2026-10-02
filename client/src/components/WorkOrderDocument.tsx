import React, { useState } from "react";
import { trpc } from "../lib/trpc";
import { toast } from "sonner";

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
  const [editTerms, setEditTerms] = useState<WoTermSection[] | null>(null);
  const [newItem, setNewItem] = useState({ description: "", unit: "Nos", rate: "" });
  const [editingItem, setEditingItem] = useState<any | null>(null);

  const { data, isLoading, refetch } = trpc.subcontractors.workOrderDocument.useQuery({ workOrderId });
  const updateWo = trpc.subcontractors.updateWorkOrder.useMutation();
  const addItem = trpc.subcontractors.addWorkOrderItem.useMutation();
  const updItem = trpc.subcontractors.updateWorkOrderItem.useMutation();
  const delItem = trpc.subcontractors.deleteWorkOrderItem.useMutation();

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

  // Resolve sections: per-WO override (JSON) else template with placeholders filled
  let sections: WoTermSection[];
  if (wo.termsOverride) {
    try {
      sections = JSON.parse(wo.termsOverride);
    } catch {
      sections = DEFAULT_WO_TERMS.map((s) => ({ ...s, body: fillPlaceholders(s.body, vars) }));
    }
  } else {
    sections = DEFAULT_WO_TERMS.map((s) => ({ ...s, body: fillPlaceholders(s.body, vars) }));
  }
  const shownSections = editTerms || sections;

  const intro = `संदर्भित कार्य हेतु ${vars.subcontractor} को उप-ठेकेदार के रूप में नियुक्त किया जाता है। ${vars.employer}, रायगढ़ (मुख्य ठेकेदार) द्वारा ${vars.roadName} मार्ग (लंबाई ${vars.roadLength} कि.मी.) पर संरचना कार्य कराए जाने हेतु यह कार्यादेश निम्नलिखित नियमों एवं शर्तों के अधीन जारी किया जाता है।`;

  const startTermsEdit = () => {
    // Fill placeholders into editable copy so user edits final text
    setEditTerms(sections.map((s) => ({ ...s })));
    setTab("terms");
  };
  const saveTerms = async () => {
    if (!editTerms) return;
    await updateWo.mutateAsync({ id: wo.id, termsOverride: JSON.stringify(editTerms) });
    toast.success("शर्तें सहेजी गईं!");
    setEditTerms(null);
    setTab("doc");
    refetch();
  };
  const resetTerms = async () => {
    if (!confirm("डिफ़ॉल्ट शर्तों पर वापस जाएं?")) return;
    await updateWo.mutateAsync({ id: wo.id, termsOverride: null });
    setEditTerms(null);
    setTab("doc");
    refetch();
    toast.success("डिफ़ॉल्ट शर्तें लागू!");
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
      rate: newItem.rate || "0.00",
      sortOrder: srNo,
    });
    setNewItem({ description: "", unit: "Nos", rate: "" });
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

  const boqTable = (
    <table className="w-full border-collapse border border-slate-800 text-[13px] my-2">
      <thead>
        <tr className="bg-slate-100">
          <th className="border border-slate-800 px-2 py-1.5 w-14">क्र.सं.</th>
          <th className="border border-slate-800 px-2 py-1.5 text-left">कार्य का प्रकार</th>
          <th className="border border-slate-800 px-2 py-1.5 w-24">इकाई</th>
          <th className="border border-slate-800 px-2 py-1.5 w-32">दर (₹)</th>
        </tr>
      </thead>
      <tbody>
        {items.length === 0 ? (
          <tr>
            <td colSpan={4} className="border border-slate-800 px-2 py-3 text-center text-slate-500">
              कोई आइटम नहीं — "BOQ Items" टैब से जोड़ें
            </td>
          </tr>
        ) : (
          items.map((it: any, i: number) => (
            <tr key={it.id}>
              <td className="border border-slate-800 px-2 py-1.5 text-center">{it.srNo ?? i + 1}</td>
              <td className="border border-slate-800 px-2 py-1.5">{it.description}</td>
              <td className="border border-slate-800 px-2 py-1.5 text-center">{it.unit}</td>
              <td className="border border-slate-800 px-2 py-1.5 text-right font-semibold">
                {Number(it.rate || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </td>
            </tr>
          ))
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
        <button onClick={() => setTab("doc")} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${tab === "doc" ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-700"}`}>📄 दस्तावेज़</button>
        <button onClick={() => setTab("items")} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${tab === "items" ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-700"}`}>📋 BOQ Items ({items.length})</button>
        <button onClick={startTermsEdit} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${tab === "terms" ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-700"}`}>✏️ शर्तें बदलें</button>
        <div className="flex-1" />
        <button onClick={() => window.print()} className="px-4 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white">🖨️ प्रिंट</button>
        {onClose && <button onClick={onClose} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white border border-slate-200 text-slate-700">✕ बंद</button>}
      </div>

      {tab === "items" && (
        <div className="no-print p-4 overflow-y-auto space-y-4">
          <form onSubmit={handleAddItem} className="bg-amber-50 border border-amber-200 rounded-xl p-3 grid grid-cols-12 gap-2 text-xs">
            <input value={newItem.description} onChange={(e) => setNewItem({ ...newItem, description: e.target.value })} placeholder="कार्य का विवरण *" className="col-span-6 p-2 border border-slate-200 rounded-lg" required />
            <input value={newItem.unit} onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })} placeholder="इकाई" className="col-span-2 p-2 border border-slate-200 rounded-lg" />
            <input value={newItem.rate} onChange={(e) => setNewItem({ ...newItem, rate: e.target.value })} placeholder="दर ₹" type="number" step="0.01" className="col-span-2 p-2 border border-slate-200 rounded-lg" />
            <button className="col-span-2 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold">+ जोड़ें</button>
          </form>
          <div className="space-y-2">
            {items.map((it: any) => (
              <div key={it.id} className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg p-2 text-xs">
                {editingItem?.id === it.id ? (
                  <form onSubmit={handleUpdateItem} className="flex flex-1 items-center gap-2">
                    <input value={editingItem.srNo} onChange={(e) => setEditingItem({ ...editingItem, srNo: e.target.value })} type="number" className="w-12 p-1.5 border rounded" />
                    <input value={editingItem.description} onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })} className="flex-1 p-1.5 border rounded" />
                    <input value={editingItem.unit} onChange={(e) => setEditingItem({ ...editingItem, unit: e.target.value })} className="w-20 p-1.5 border rounded" />
                    <input value={editingItem.rate} onChange={(e) => setEditingItem({ ...editingItem, rate: e.target.value })} type="number" step="0.01" className="w-24 p-1.5 border rounded" />
                    <button className="px-2 py-1.5 bg-emerald-600 text-white rounded font-bold">✓</button>
                    <button type="button" onClick={() => setEditingItem(null)} className="px-2 py-1.5 bg-slate-200 rounded font-bold">✕</button>
                  </form>
                ) : (
                  <>
                    <span className="w-8 text-center font-bold text-slate-500">{it.srNo}</span>
                    <span className="flex-1 font-medium text-slate-800">{it.description}</span>
                    <span className="text-slate-500">{it.unit}</span>
                    <span className="font-mono font-bold w-24 text-right">₹{Number(it.rate || 0).toLocaleString("en-IN")}</span>
                    <button onClick={() => setEditingItem({ ...it, rate: String(it.rate ?? ""), srNo: String(it.srNo ?? 1) })} className="px-2 py-1 bg-amber-50 border border-amber-200 text-amber-700 rounded font-bold">✏️</button>
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
          <p className="text-xs text-slate-500">प्रत्येक धारा का शीर्षक व विवरण बदल सकते हैं। सहेजने पर यह कार्यादेश हेतु स्थायी रहेगा।</p>
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
            <button onClick={resetTerms} className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-600">↩ डिफ़ॉल्ट पर वापस</button>
            <button onClick={() => { setEditTerms(null); setTab("doc"); }} className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-600">रद्द करें</button>
            <button onClick={saveTerms} disabled={updateWo.isPending} className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold">✓ सहेजें</button>
          </div>
        </div>
      )}

      {tab === "doc" && (
        <div className="wo-doc-print overflow-y-auto p-6 bg-white text-slate-900" lang="hi" style={{ maxHeight: "70vh" }}>
          {/* Header */}
          <div className="text-center border-b-2 border-slate-900 pb-3 mb-4">
            <h1 className="text-2xl font-bold">कायादेश <span className="text-base font-normal">(Work Order)</span></h1>
            <div className="flex justify-between text-[13px] mt-2">
              <span><strong>संदर्भ:</strong> {vars.woNo}</span>
              <span><strong>दिनांक:</strong> {vars.woDate}</span>
            </div>
          </div>

          {/* प्रति */}
          <div className="mb-3 text-[13px]">
            <p className="font-bold">प्रति,</p>
            <p className="font-bold ml-4">{vars.subcontractor}</p>
            {subcontractor?.address && <p className="ml-4">{subcontractor.address}</p>}
            {subcontractor?.phone && <p className="ml-4">मो.: {subcontractor.phone}</p>}
          </div>

          {/* विषय */}
          <div className="mb-3 text-[13px]">
            <p><strong>विषय:</strong> {vars.roadName} (लंबाई {vars.roadLength} कि.मी.) पर संरचना कार्य हेतु कार्यादेश।</p>
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
              <p className="font-bold mb-8">उप-ठेकेदार</p>
              <p>हस्ताक्षर: _______________</p>
              <p className="mt-1">नाम: {vars.subcontractor}</p>
              <p className="mt-1">दिनांक: _______________</p>
            </div>
            <div className="text-center">
              <p className="font-bold mb-8">मुख्य ठेकेदार</p>
              <p>हस्ताक्षर: _______________</p>
              <p className="mt-1">नाम: {vars.employer}</p>
              <p className="mt-1">दिनांक: _______________</p>
              <p className="mt-1">(मुहर)</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
