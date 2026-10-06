import React, { useMemo, useState } from "react";
import { FileText, Printer, Building2, UserCheck, Award, LogOut, Mail } from "lucide-react";
import { trpc } from "../lib/trpc";

type LetterType = "offer" | "appointment" | "experience" | "relieving";

const LETTER_TABS: { id: LetterType; label: string; icon: any }[] = [
  { id: "offer", label: "Offer Letter", icon: Mail },
  { id: "appointment", label: "Appointment Letter", icon: UserCheck },
  { id: "experience", label: "Experience Letter", icon: Award },
  { id: "relieving", label: "Relieving Letter", icon: LogOut },
];

const fieldClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100";
const labelClass = "text-[10px] font-bold uppercase tracking-wider text-slate-500";

function fmtDate(d: string): string {
  if (!d) return "";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtMoney(n: number | string): string {
  const v = Number(n || 0);
  return "₹" + v.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

interface LetterData {
  companyName: string;
  companyAddress: string;
  refNo: string;
  letterDate: string;
  candidateName: string;
  candidateAddress: string;
  designation: string;
  department: string;
  joiningDate: string;
  monthlySalary: string;
  annualCtc: string;
  offerValidTill: string;
  reportingTo: string;
  probationMonths: string;
  basicPct: string;
  hraPct: string;
  exitDate: string;
  lastWorkingDay: string;
  conduct: string;
  authorizedBy: string;
  authorizedDesignation: string;
}

const emptyData: LetterData = {
  companyName: "Shri Sai Associates",
  companyAddress: "Raigarh, Chhattisgarh",
  refNo: "",
  letterDate: todayISO(),
  candidateName: "",
  candidateAddress: "",
  designation: "",
  department: "",
  joiningDate: todayISO(),
  monthlySalary: "",
  annualCtc: "",
  offerValidTill: "",
  reportingTo: "Project Manager",
  probationMonths: "6",
  basicPct: "50",
  hraPct: "20",
  exitDate: "",
  lastWorkingDay: todayISO(),
  conduct: "excellent",
  authorizedBy: "",
  authorizedDesignation: "Project Manager",
};

export default function HrLettersPage() {
  const [letterType, setLetterType] = useState<LetterType>("offer");
  const [employeeId, setEmployeeId] = useState<number | "">("");
  const [data, setData] = useState<LetterData>(emptyData);

  const { data: employees } = trpc.hr.employees.useQuery({ status: "Active" });
  const { data: allEmployees } = trpc.hr.employees.useQuery({});
  const { data: departments } = trpc.hr.departments.useQuery();
  const { data: designations } = trpc.hr.designations.useQuery();

  const employeeList = letterType === "offer" ? allEmployees : employees;

  const deptName = (id: number | null | undefined) =>
    departments?.find((d) => d.id === id)?.name || "";
  const desigName = (id: number | null | undefined) =>
    designations?.find((d) => d.id === id)?.name || "";

  const set = (k: keyof LetterData, v: string) => setData((p) => ({ ...p, [k]: v }));

  const pickEmployee = (id: number) => {
    setEmployeeId(id);
    const emp: any = employeeList?.find((e: any) => e.id === id);
    if (!emp) return;
    const monthly = Number(emp.basicRate || 0);
    setData((p) => ({
      ...p,
      candidateName: emp.fullName || "",
      candidateAddress: emp.address || "",
      designation: desigName(emp.designationId) || emp.employmentType || "",
      department: deptName(emp.departmentId),
      joiningDate: emp.joiningDate || todayISO(),
      monthlySalary: monthly > 0 ? String(Math.round(monthly)) : "",
      annualCtc: monthly > 0 ? String(Math.round(monthly * 12)) : "",
      exitDate: emp.exitDate || "",
      lastWorkingDay: emp.exitDate || todayISO(),
      refNo: `HR/${new Date().getFullYear()}/${String(emp.id).padStart(4, "0")}`,
    }));
  };

  // Salary breakup derived from monthly salary + percentages
  const salaryBreakup = useMemo(() => {
    const monthly = Number(data.monthlySalary || 0);
    const basicPct = Number(data.basicPct || 0);
    const hraPct = Number(data.hraPct || 0);
    const basic = Math.round((monthly * basicPct) / 100);
    const hra = Math.round((monthly * hraPct) / 100);
    const other = Math.max(0, monthly - basic - hra);
    return { basic, hra, other, total: monthly };
  }, [data.monthlySalary, data.basicPct, data.hraPct]);

  const letterTitle =
    letterType === "offer"
      ? "Offer of Employment"
      : letterType === "appointment"
        ? "Appointment Letter"
        : letterType === "experience"
          ? "Experience Certificate"
          : "Relieving Letter";

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .hr-letter-print, .hr-letter-print * { visibility: visible !important; }
          .hr-letter-print { position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; margin: 0 !important; padding: 40px 48px !important; box-shadow: none !important; }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* Header */}
      <div className="no-print flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600" /> HR Letters
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Professional HR letters — employee select karein, details bharein, print karein
          </p>
        </div>
        <button
          onClick={() => window.print()}
          disabled={!data.candidateName}
          className="px-5 py-2 rounded-lg text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-40 flex items-center gap-2"
        >
          <Printer className="w-4 h-4" /> 🖨️ Print Letter
        </button>
      </div>

      {/* Letter type tabs */}
      <div className="no-print flex flex-wrap gap-2 mb-4">
        {LETTER_TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setLetterType(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${
                letterType === t.id
                  ? "bg-slate-900 text-white shadow"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              <Icon className="w-4 h-4" /> {t.label}
            </button>
          );
        })}
      </div>

      <div className="no-print grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Input form */}
        <div className="lg:col-span-1 bg-white rounded-xl border border-slate-200 p-4 space-y-3 max-h-[75vh] overflow-y-auto">
          <h3 className="text-sm font-bold text-slate-800">Letter Details</h3>

          <div>
            <label className={labelClass}>Employee / Candidate select karein</label>
            <select
              value={employeeId}
              onChange={(e) => (e.target.value ? pickEmployee(Number(e.target.value)) : setEmployeeId(""))}
              className={fieldClass}
            >
              <option value="">— Select —</option>
              {(employeeList || []).map((e: any) => (
                <option key={e.id} value={e.id}>
                  {e.fullName} ({e.employeeCode})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelClass}>Company Name</label>
              <input value={data.companyName} onChange={(e) => set("companyName", e.target.value)} className={fieldClass} />
            </div>
            <div>
              <label className={labelClass}>Ref No.</label>
              <input value={data.refNo} onChange={(e) => set("refNo", e.target.value)} className={fieldClass} placeholder="HR/2026/0001" />
            </div>
          </div>

          <div>
            <label className={labelClass}>Company Address</label>
            <input value={data.companyAddress} onChange={(e) => set("companyAddress", e.target.value)} className={fieldClass} />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelClass}>Letter Date</label>
              <input type="date" value={data.letterDate} onChange={(e) => set("letterDate", e.target.value)} className={fieldClass} />
            </div>
            <div>
              <label className={labelClass}>Name</label>
              <input value={data.candidateName} onChange={(e) => set("candidateName", e.target.value)} className={fieldClass} />
            </div>
          </div>

          <div>
            <label className={labelClass}>Address</label>
            <input value={data.candidateAddress} onChange={(e) => set("candidateAddress", e.target.value)} className={fieldClass} />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelClass}>Designation / Position</label>
              <input value={data.designation} onChange={(e) => set("designation", e.target.value)} className={fieldClass} />
            </div>
            <div>
              <label className={labelClass}>Department</label>
              <input value={data.department} onChange={(e) => set("department", e.target.value)} className={fieldClass} />
            </div>
          </div>

          {letterType === "offer" && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelClass}>Monthly Salary (₹)</label>
                  <input type="number" value={data.monthlySalary} onChange={(e) => set("monthlySalary", e.target.value)} className={fieldClass} />
                </div>
                <div>
                  <label className={labelClass}>Annual CTC (₹)</label>
                  <input type="number" value={data.annualCtc} onChange={(e) => set("annualCtc", e.target.value)} className={fieldClass} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelClass}>Joining Date</label>
                  <input type="date" value={data.joiningDate} onChange={(e) => set("joiningDate", e.target.value)} className={fieldClass} />
                </div>
                <div>
                  <label className={labelClass}>Offer Valid Till</label>
                  <input type="date" value={data.offerValidTill} onChange={(e) => set("offerValidTill", e.target.value)} className={fieldClass} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Reporting To</label>
                <input value={data.reportingTo} onChange={(e) => set("reportingTo", e.target.value)} className={fieldClass} />
              </div>
            </>
          )}

          {letterType === "appointment" && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelClass}>Joining Date</label>
                  <input type="date" value={data.joiningDate} onChange={(e) => set("joiningDate", e.target.value)} className={fieldClass} />
                </div>
                <div>
                  <label className={labelClass}>Probation (months)</label>
                  <input type="number" value={data.probationMonths} onChange={(e) => set("probationMonths", e.target.value)} className={fieldClass} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className={labelClass}>Monthly Gross (₹)</label>
                  <input type="number" value={data.monthlySalary} onChange={(e) => set("monthlySalary", e.target.value)} className={fieldClass} />
                </div>
                <div>
                  <label className={labelClass}>Basic %</label>
                  <input type="number" value={data.basicPct} onChange={(e) => set("basicPct", e.target.value)} className={fieldClass} />
                </div>
                <div>
                  <label className={labelClass}>HRA %</label>
                  <input type="number" value={data.hraPct} onChange={(e) => set("hraPct", e.target.value)} className={fieldClass} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Reporting To</label>
                <input value={data.reportingTo} onChange={(e) => set("reportingTo", e.target.value)} className={fieldClass} />
              </div>
            </>
          )}

          {letterType === "experience" && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelClass}>From (Joining)</label>
                  <input type="date" value={data.joiningDate} onChange={(e) => set("joiningDate", e.target.value)} className={fieldClass} />
                </div>
                <div>
                  <label className={labelClass}>To (Exit)</label>
                  <input type="date" value={data.exitDate} onChange={(e) => set("exitDate", e.target.value)} className={fieldClass} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Conduct / Performance</label>
                <select value={data.conduct} onChange={(e) => set("conduct", e.target.value)} className={fieldClass}>
                  <option value="excellent">Excellent</option>
                  <option value="very good">Very Good</option>
                  <option value="good">Good</option>
                  <option value="satisfactory">Satisfactory</option>
                </select>
              </div>
            </>
          )}

          {letterType === "relieving" && (
            <div>
              <label className={labelClass}>Last Working Day</label>
              <input type="date" value={data.lastWorkingDay} onChange={(e) => set("lastWorkingDay", e.target.value)} className={fieldClass} />
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelClass}>Authorized By (Name)</label>
              <input value={data.authorizedBy} onChange={(e) => set("authorizedBy", e.target.value)} className={fieldClass} placeholder="Signatory name" />
            </div>
            <div>
              <label className={labelClass}>Signatory Designation</label>
              <input value={data.authorizedDesignation} onChange={(e) => set("authorizedDesignation", e.target.value)} className={fieldClass} />
            </div>
          </div>
        </div>

        {/* Letter preview */}
        <div className="lg:col-span-2">
          <div className="hr-letter-print bg-white rounded-xl border border-slate-200 shadow-sm p-8 md:p-10 text-slate-900" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
            {/* Letterhead */}
            <div className="text-center border-b-2 border-slate-900 pb-4 mb-6">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Building2 className="w-6 h-6" />
                <h2 className="text-2xl font-bold tracking-wide">{data.companyName || "Company Name"}</h2>
              </div>
              <p className="text-xs text-slate-600">{data.companyAddress}</p>
            </div>

            <div className="flex justify-between text-sm mb-6">
              <span>
                <strong>Ref:</strong> {data.refNo || "—"}
              </span>
              <span>
                <strong>Date:</strong> {fmtDate(data.letterDate)}
              </span>
            </div>

            {letterType === "offer" && <OfferLetterBody d={data} />}
            {letterType === "appointment" && <AppointmentLetterBody d={data} breakup={salaryBreakup} />}
            {letterType === "experience" && <ExperienceLetterBody d={data} />}
            {letterType === "relieving" && <RelievingLetterBody d={data} />}

            {/* Signature */}
            <div className="mt-12 flex justify-between text-sm">
              <div>
                <p className="mb-10">Yours faithfully,</p>
                <p className="font-bold">For {data.companyName}</p>
                <p className="mt-8">({data.authorizedBy || "________________"})</p>
                <p className="text-xs text-slate-600">{data.authorizedDesignation}</p>
              </div>
              {(letterType === "offer" || letterType === "appointment") && (
                <div className="text-right">
                  <p className="mb-2 font-bold">Accepted by candidate:</p>
                  <p className="mt-10">({data.candidateName || "________________"})</p>
                  <p className="text-xs text-slate-600">Date: ______________</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Letter bodies ---------------- */

function OfferLetterBody({ d }: { d: LetterData }) {
  return (
    <div className="text-sm leading-7 space-y-4">
      <div>
        <p className="font-bold">To,</p>
        <p className="font-bold">{d.candidateName || "[Candidate Name]"}</p>
        {d.candidateAddress && <p>{d.candidateAddress}</p>}
      </div>
      <p className="font-bold underline">Subject: {`Offer of Employment — ${d.designation || "[Position]"}`}</p>
      <p>Dear {d.candidateName?.split(" ")[0] || "Candidate"},</p>
      <p>
        We are pleased to offer you employment with <strong>{d.companyName}</strong> for the position of{" "}
        <strong>{d.designation || "[Position]"}</strong>
        {d.department ? (
          <>
            {" "}in the <strong>{d.department}</strong> department
          </>
        ) : null}
        . Your expected date of joining is <strong>{fmtDate(d.joiningDate)}</strong>, and you will report to the{" "}
        <strong>{d.reportingTo}</strong>.
      </p>
      <p>
        Your compensation will be <strong>{fmtMoney(d.monthlySalary)} per month</strong>
        {d.annualCtc ? (
          <>
            {" "}(annual CTC <strong>{fmtMoney(d.annualCtc)}</strong>)
          </>
        ) : null}
        , subject to statutory deductions as applicable.
      </p>
      <p>
        This offer is valid until <strong>{d.offerValidTill ? fmtDate(d.offerValidTill) : "[validity date]"}</strong>.
        Please confirm your acceptance by signing and returning a copy of this letter before the validity date.
      </p>
      <p>
        This offer is subject to verification of your documents and successful completion of joining formalities.
        A detailed appointment letter will be issued on your joining.
      </p>
      <p>We look forward to welcoming you to our team.</p>
    </div>
  );
}

function AppointmentLetterBody({
  d,
  breakup,
}: {
  d: LetterData;
  breakup: { basic: number; hra: number; other: number; total: number };
}) {
  const terms = [
    `You are appointed as ${d.designation || "[Designation]"}${d.department ? ` in the ${d.department} department` : ""} with effect from ${fmtDate(d.joiningDate)}.`,
    `You will be on probation for a period of ${d.probationMonths || "6"} months from the date of joining. On satisfactory completion, your services may be confirmed in writing.`,
    `You will report to the ${d.reportingTo} and carry out duties assigned to you diligently and to the best of your ability.`,
    `Your normal working hours and weekly off will be as per company policy and site requirements.`,
    `You will be entitled to leave as per company policy, applicable after confirmation.`,
    `Either party may terminate this employment by giving one month's written notice or salary in lieu thereof.`,
    `You shall maintain strict confidentiality of the company's technical, commercial and business information during and after employment.`,
    `Your services are transferable to any project/site of the company as per work requirements.`,
  ];
  return (
    <div className="text-sm leading-7 space-y-4">
      <div>
        <p className="font-bold">To,</p>
        <p className="font-bold">{d.candidateName || "[Employee Name]"}</p>
        {d.candidateAddress && <p>{d.candidateAddress}</p>}
      </div>
      <p className="font-bold underline">Subject: Appointment Letter</p>
      <p>Dear {d.candidateName?.split(" ")[0] || "Candidate"},</p>
      <p>
        With reference to your application and subsequent discussions, we are pleased to appoint you in{" "}
        <strong>{d.companyName}</strong> on the following terms and conditions:
      </p>
      <div className="border border-slate-300 rounded-lg overflow-hidden my-4">
        <table className="w-full text-sm">
          <tbody>
            <Row k="Designation" v={d.designation} />
            <Row k="Department" v={d.department} />
            <Row k="Date of Joining" v={fmtDate(d.joiningDate)} />
            <Row k="Probation Period" v={`${d.probationMonths || "6"} months`} />
            <Row k="Reporting To" v={d.reportingTo} />
          </tbody>
        </table>
      </div>
      <p className="font-bold">Salary Breakup (per month):</p>
      <div className="border border-slate-300 rounded-lg overflow-hidden my-2">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-100">
              <th className="text-left px-4 py-2 font-bold">Component</th>
              <th className="text-right px-4 py-2 font-bold">Amount</th>
            </tr>
          </thead>
          <tbody>
            <Row k="Basic Salary" v={fmtMoney(breakup.basic)} />
            <Row k="House Rent Allowance (HRA)" v={fmtMoney(breakup.hra)} />
            <Row k="Other Allowances" v={fmtMoney(breakup.other)} />
            <tr className="bg-slate-50 font-bold">
              <td className="px-4 py-2">Gross Monthly Salary</td>
              <td className="px-4 py-2 text-right">{fmtMoney(breakup.total)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-600">
        Statutory deductions (PF, ESI, TDS) as applicable will be made from the above.
      </p>
      <p className="font-bold mt-4">Terms & Conditions:</p>
      <ol className="list-decimal ml-6 space-y-1">
        {terms.map((t, i) => (
          <li key={i}>{t}</li>
        ))}
      </ol>
      <p>
        Please sign and return the duplicate copy of this letter as a token of your acceptance of the above terms.
      </p>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <tr className="border-t border-slate-200">
      <td className="px-4 py-1.5 font-semibold w-1/2">{k}</td>
      <td className="px-4 py-1.5">{v || "—"}</td>
    </tr>
  );
}

function ExperienceLetterBody({ d }: { d: LetterData }) {
  return (
    <div className="text-sm leading-7 space-y-4">
      <p className="font-bold underline text-center text-base">TO WHOM IT MAY CONCERN</p>
      <p>
        This is to certify that <strong>{d.candidateName || "[Employee Name]"}</strong> was employed with{" "}
        <strong>{d.companyName}</strong> as <strong>{d.designation || "[Designation]"}</strong>
        {d.department ? (
          <>
            {" "}in the <strong>{d.department}</strong> department
          </>
        ) : null}{" "}
        from <strong>{fmtDate(d.joiningDate)}</strong> to <strong>{d.exitDate ? fmtDate(d.exitDate) : "[exit date]"}</strong>.
      </p>
      <p>
        During {d.candidateName?.split(" ")[0] || "his/her"} tenure with us, we found{" "}
        {d.candidateName?.split(" ")[0] || "him/her"} sincere, hardworking and dedicated towards{" "}
        {d.candidateName?.split(" ")[0] ? "their" : "his/her"} duties.{" "}
        {d.candidateName?.split(" ")[0] || "His/Her"} conduct and performance during the employment period was{" "}
        <strong>{d.conduct}</strong>.
      </p>
      <p>We wish {d.candidateName?.split(" ")[0] || "him/her"} all success in {d.candidateName?.split(" ")[0] ? "their" : "his/her"} future endeavours.</p>
    </div>
  );
}

function RelievingLetterBody({ d }: { d: LetterData }) {
  return (
    <div className="text-sm leading-7 space-y-4">
      <div>
        <p className="font-bold">To,</p>
        <p className="font-bold">{d.candidateName || "[Employee Name]"}</p>
        {d.candidateAddress && <p>{d.candidateAddress}</p>}
      </div>
      <p className="font-bold underline">Subject: Relieving Letter</p>
      <p>Dear {d.candidateName?.split(" ")[0] || "Employee"},</p>
      <p>
        With reference to your resignation, we hereby confirm that you have been relieved from the services of{" "}
        <strong>{d.companyName}</strong> with effect from the close of working hours on{" "}
        <strong>{fmtDate(d.lastWorkingDay)}</strong>, when you were serving as{" "}
        <strong>{d.designation || "[Designation]"}</strong>
        {d.department ? (
          <>
            {" "}in the <strong>{d.department}</strong> department
          </>
        ) : null}
        .
      </p>
      <p>
        We confirm that you have completed all handover formalities and there are <strong>no dues</strong> pending
        from your side as on the last working day. Your full and final settlement will be processed as per company
        policy.
      </p>
      <p>
        We thank you for your contributions during your tenure with us and wish you every success in your future
        endeavours.
      </p>
    </div>
  );
}
