import { useState } from 'react';
import FormField from '../common/FormField';

const EMPTY_FORM = {
  name: '',
  category: '',
  numberOfClasses: '',
  classType: '',
  startDate: '',
  endDate: '',
  price: '',
};

export default function PackageForm({ initialValues, onSubmit, onCancel, submitLabel = 'Save Package' }) {
  const [form, setForm] = useState(initialValues || EMPTY_FORM);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await onSubmit(form);
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
        <FormField label="Package name" name="name" value={form.name} onChange={handleChange} required />
        <FormField
          label="Category"
          type="select"
          name="category"
          value={form.category}
          onChange={handleChange}
          required
          options={[
            { value: 'General', label: 'General' },
            { value: 'Senior', label: 'Senior' },
          ]}
        />
        <FormField
          label="Number of classes"
          type="select"
          name="numberOfClasses"
          value={form.numberOfClasses}
          onChange={handleChange}
          required
          options={[
            { value: '1', label: '1' },
            { value: '4', label: '4' },
            { value: '10', label: '10' },
            { value: 'unlimited', label: 'Unlimited' },
          ]}
        />
        <FormField
          label="Class type"
          type="select"
          name="classType"
          value={form.classType}
          onChange={handleChange}
          required
          options={[
            { value: 'General', label: 'General' },
            { value: 'Special', label: 'Special' },
          ]}
        />
        <FormField label="Start date" type="date" name="startDate" value={form.startDate} onChange={handleChange} required />
        <FormField
          label="End date"
          type="date"
          name="endDate"
          value={form.endDate}
          onChange={handleChange}
          min={form.startDate || undefined}
          required
        />
        <FormField
          label="Price"
          type="number"
          name="price"
          value={form.price}
          onChange={handleChange}
          min="0"
          step="0.01"
          required
        />
      </div>
      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? 'Saving...' : submitLabel}
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
