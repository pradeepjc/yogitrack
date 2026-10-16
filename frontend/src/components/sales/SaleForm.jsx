import { useState } from 'react';
import FormField from '../common/FormField';

const PAYMENT_MODES = ['Cash', 'Credit Card', 'Debit Card', 'Check'];

const pad = (n) => String(n).padStart(2, '0');
const toDateInput = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const toDateTimeInput = (d) => `${toDateInput(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

function emptyForm() {
  return {
    customerId: '',
    packageId: '',
    amountPaid: '',
    paymentMode: '',
    paidAt: toDateTimeInput(new Date()),
    validityStart: '',
    validityEnd: '',
  };
}

export default function SaleForm({ customers, packages, onSubmit, onCancel }) {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Expired packages can no longer be sold.
  const today = toDateInput(new Date());
  const sellablePackages = packages.filter((pkg) => pkg.endDate.slice(0, 10) >= today);

  const selectedPackage = packages.find((pkg) => pkg.packageId === form.packageId);
  // Package dates are stored as UTC midnight, so the date part is the calendar date.
  const packageStart = selectedPackage?.startDate.slice(0, 10);
  const packageEnd = selectedPackage?.endDate.slice(0, 10);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function handlePackageChange(e) {
    const pkg = packages.find((p) => p.packageId === e.target.value);
    if (!pkg) {
      setForm({ ...form, packageId: '', amountPaid: '', validityStart: '', validityEnd: '' });
      return;
    }
    const start = pkg.startDate.slice(0, 10);
    setForm({
      ...form,
      packageId: pkg.packageId,
      amountPaid: String(pkg.price),
      validityStart: start > today ? start : today,
      validityEnd: pkg.endDate.slice(0, 10),
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await onSubmit({ ...form, amountPaid: Number(form.amountPaid), paidAt: new Date(form.paidAt).toISOString() });
    } catch (err) {
      setError(err?.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="entity-form" onSubmit={handleSubmit}>
      {error && <p className="form-error">{error}</p>}
      <div className="form-grid">
        <FormField
          label="Customer"
          type="select"
          name="customerId"
          value={form.customerId}
          onChange={handleChange}
          required
          options={customers.map((c) => ({
            value: c.customerId,
            label: `${c.customerId} - ${c.firstName} ${c.lastName}`,
          }))}
        />
        <FormField
          label="Package"
          type="select"
          name="packageId"
          value={form.packageId}
          onChange={handlePackageChange}
          required
          options={sellablePackages.map((p) => ({ value: p.packageId, label: `${p.packageId} - ${p.name}` }))}
        />
      </div>

      {selectedPackage && (
        <p className="form-summary">
          {selectedPackage.category} · {selectedPackage.isUnlimited ? 'Unlimited' : selectedPackage.numberOfClasses}{' '}
          {selectedPackage.classType} {selectedPackage.numberOfClasses === 1 ? 'class' : 'classes'} · $
          {selectedPackage.price.toFixed(2)} · available {packageStart} to {packageEnd}
        </p>
      )}

      <div className="form-grid">
        <FormField
          label="Amount paid"
          type="number"
          name="amountPaid"
          value={form.amountPaid}
          onChange={handleChange}
          min="0"
          step="0.01"
          required
        />
        <FormField
          label="Mode of payment"
          type="select"
          name="paymentMode"
          value={form.paymentMode}
          onChange={handleChange}
          required
          options={PAYMENT_MODES.map((mode) => ({ value: mode, label: mode }))}
        />
        <FormField
          label="Payment date and time"
          type="datetime-local"
          name="paidAt"
          value={form.paidAt}
          onChange={handleChange}
          required
        />
        <FormField
          label="Valid from"
          type="date"
          name="validityStart"
          value={form.validityStart}
          onChange={handleChange}
          min={packageStart}
          max={packageEnd}
          required
        />
        <FormField
          label="Valid until"
          type="date"
          name="validityEnd"
          value={form.validityEnd}
          onChange={handleChange}
          min={form.validityStart || packageStart}
          max={packageEnd}
          required
        />
      </div>
      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? 'Saving...' : 'Record Sale'}
        </button>
        {onCancel && (
          <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={submitting}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
