import { useState } from "react";
import { X } from "lucide-react";
import type {
  Gadget,
  LockerAction,
  LockerCondition,
  LockerReason,
} from "../types/gadget";

type ReturnedDeviceType = "Laptop" | "Smartphone";

type Props = {
  isOpen?: boolean;
  existing?: Gadget;
  onClose: () => void;
  onSubmit: (gadget: Gadget | Omit<Gadget, "id">) => void;
};

const today = () => new Date().toISOString().split("T")[0];

export default function AddReturnedDeviceModal({ isOpen = true, existing, onClose, onSubmit }: Props) {
  const [deviceType, setDeviceType] = useState<ReturnedDeviceType>(existing?.deviceType === "Smartphone" ? "Smartphone" : "Laptop");
  const [model, setModel] = useState(existing?.model || "");
  const [serialNumber, setSerialNumber] = useState(existing?.serialNumber || "");
  const [imei1, setImei1] = useState(existing?.imei1 || "");
  const [year, setYear] = useState(existing?.year || new Date().getFullYear());
  const [lockerReason, setLockerReason] = useState<LockerReason>(existing?.lockerReason || (existing?.returnedFrom ? "Staff Left" : "Device Issue"));
  const [lockerCondition, setLockerCondition] = useState<LockerCondition>(existing?.lockerCondition || (existing?.condition === "Poor" ? "Damaged" : "Good"));
  const [lockerAction, setLockerAction] = useState<LockerAction>(existing?.lockerAction || "Keep in Locker");
  const [lockerDate, setLockerDate] = useState(existing?.lockerDate || today());
  const [lockerLocation, setLockerLocation] = useState(existing?.lockerLocation || "IT Locker");
  const [returnedFrom, setReturnedFrom] = useState(existing?.returnedFrom || "");
  const [formerDepartment, setFormerDepartment] = useState(existing?.formerDepartment || "");
  const [staffLeftDate, setStaffLeftDate] = useState(existing?.staffLeftDate || "");
  const [reassignedTo, setReassignedTo] = useState(existing?.reassignedTo || existing?.assignedTo || "");
  const [outcomeDate, setOutcomeDate] = useState(existing?.outcomeDate || "");
  const [notes, setNotes] = useState(existing?.notes || "");

  if (!isOpen) return null;

  const isSmartphone = deviceType === "Smartphone";
  const needsOutcomeDate = ["Reassigned", "Sold", "Disposed"].includes(lockerAction);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const status = lockerAction === "Reassigned" ? "In-Use" : lockerAction === "Available for Reassignment" ? "In-Stock" : "Faulty";
    const base = {
      deviceType,
      model: model.trim(),
      year,
      serialNumber: serialNumber.trim(),
      imei1: isSmartphone ? imei1.trim() || undefined : undefined,
      status: status as Gadget["status"],
      lockerDevice: true,
      lockerReason,
      lockerCondition,
      lockerAction,
      lockerDate,
      lockerLocation: lockerLocation.trim() || undefined,
      returnedFrom: returnedFrom.trim() || undefined,
      formerDepartment: formerDepartment.trim() || undefined,
      staffLeftDate: staffLeftDate || undefined,
      reassignedTo: lockerAction === "Reassigned" ? reassignedTo.trim() || undefined : undefined,
      assignedTo: lockerAction === "Reassigned" ? reassignedTo.trim() || undefined : undefined,
      assignedDate: lockerAction === "Reassigned" ? outcomeDate || today() : undefined,
      outcomeDate: needsOutcomeDate ? outcomeDate || today() : undefined,
      notes: notes.trim() || undefined,
    };
    onSubmit(existing ? { ...base, id: existing.id } : base);
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-3xl p-8 shadow-2xl max-h-[90vh] overflow-y-auto relative">
          <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-900 dark:hover:text-white" aria-label="Close"><X size={22} /></button>
          <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white">{existing ? "Edit Locker Device" : "Record Locker Device"}</h2>
          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-2 mb-8">Keep inactive laptops and phones recorded without counting them as active staff gadgets.</p>

          <form onSubmit={handleSubmit} className="space-y-7">
            <Section title="Device details">
              <Field label="Device Type *"><select value={deviceType} onChange={(e) => setDeviceType(e.target.value as ReturnedDeviceType)} className={inputClass}><option value="Laptop">Laptop</option><option value="Smartphone">Phone</option></select></Field>
              <Field label="Model *"><input required value={model} onChange={(e) => setModel(e.target.value)} placeholder={isSmartphone ? "e.g., Samsung Galaxy A54" : "e.g., HP EliteBook 840"} className={inputClass} /></Field>
              <Field label="Serial Number *"><input required value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} className={inputClass} /></Field>
              {isSmartphone && <Field label="IMEI"><input value={imei1} onChange={(e) => setImei1(e.target.value)} maxLength={15} className={inputClass} /></Field>}
              <Field label="Year"><input type="number" min="2000" max={new Date().getFullYear() + 1} value={year} onChange={(e) => setYear(Number(e.target.value))} className={inputClass} /></Field>
            </Section>

            <Section title="Locker classification">
              <Field label="Reason Entered Locker *"><select value={lockerReason} onChange={(e) => setLockerReason(e.target.value as LockerReason)} className={inputClass}>{["Staff Left", "Device Issue", "Replaced", "Outdated", "Damaged"].map((v) => <option key={v}>{v}</option>)}</select></Field>
              <Field label="Current Condition *"><select value={lockerCondition} onChange={(e) => setLockerCondition(e.target.value as LockerCondition)} className={inputClass}>{["Good", "Repairable", "Damaged", "Outdated"].map((v) => <option key={v}>{v}</option>)}</select></Field>
              <Field label="Current Action *"><select value={lockerAction} onChange={(e) => setLockerAction(e.target.value as LockerAction)} className={inputClass}>{["Available for Reassignment", "Waiting for Repair", "Keep in Locker", "Reassigned", "Sell", "Sold", "Dispose", "Disposed"].map((v) => <option key={v}>{v}</option>)}</select></Field>
              <Field label="Date Added to Locker *"><input required type="date" value={lockerDate} onChange={(e) => setLockerDate(e.target.value)} className={inputClass} /></Field>
              <Field label="Storage Location"><input value={lockerLocation} onChange={(e) => setLockerLocation(e.target.value)} placeholder="e.g., IT Locker, Shelf 2" className={inputClass} /></Field>
              {lockerAction === "Reassigned" && <Field label="Reassigned To *"><input required value={reassignedTo} onChange={(e) => setReassignedTo(e.target.value)} className={inputClass} /></Field>}
              {needsOutcomeDate && <Field label={`${lockerAction} Date`}><input type="date" value={outcomeDate} onChange={(e) => setOutcomeDate(e.target.value)} className={inputClass} /></Field>}
            </Section>

            <Section title="Previous user (optional)">
              <Field label="Previous Staff Name"><input value={returnedFrom} onChange={(e) => setReturnedFrom(e.target.value)} placeholder="Leave blank if not applicable" className={inputClass} /></Field>
              <Field label="Department"><input value={formerDepartment} onChange={(e) => setFormerDepartment(e.target.value)} className={inputClass} /></Field>
              <Field label="Date Staff Left"><input type="date" value={staffLeftDate} onChange={(e) => setStaffLeftDate(e.target.value)} className={inputClass} /></Field>
            </Section>

            <div><label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">Notes</label><textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Fault details, missing charger, repair estimate, sale information..." className={inputClass} /></div>
            <div className="flex justify-end gap-3"><button type="button" onClick={onClose} className="px-6 py-2 border rounded-lg dark:border-gray-600 text-gray-900 dark:text-white">Cancel</button><button type="submit" className="bg-green-600 text-white px-7 py-2 rounded-lg hover:bg-green-700">{existing ? "Update Device" : "Save Device"}</button></div>
          </form>
        </div>
      </div>
    </>
  );
}

const inputClass = "w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="border-b dark:border-gray-700 pb-7"><h3 className="font-semibold mb-4 text-gray-900 dark:text-white">{title}</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-5">{children}</div></div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">{label}</span>{children}</label>;
}
