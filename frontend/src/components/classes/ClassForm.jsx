import { useState } from 'react';
import FormField from '../common/FormField';

const EMPTY_FORM = { instructorId: '', dayOfWeek: '', time: '', classType: '', payRate: '' };

const DAY_OPTIONS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => ({ value: d, label: d }));

export default function ClassForm({ instructors, onSubmit, externalError }) {
  const [form, setForm] = useState(EMPTY_FORM);
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
      {(error || externalError) && <p className="form-error">{error || externalError}</p>}
      <div className="form-grid">
        <FormField
          label="Instructor"
          type="select"
          name="instructorId"
          value={form.instructorId}
          onChange={handleChange}
          required
          options={instructors.map((i) => ({
            value: i.instructorId,
            label: `${i.instructorId} - ${i.firstName} ${i.lastName}`,
          }))}
        />
        <FormField
          label="Day"
          type="select"
          name="dayOfWeek"
          value={form.dayOfWeek}
          onChange={handleChange}
          required
          options={DAY_OPTIONS}
        />
        <FormField label="Time (24h HH:mm)" type="time" name="time" value={form.time} onChange={handleChange} required />
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
        <FormField
          label="Pay rate"
          type="number"
          name="payRate"
          value={form.payRate}
          onChange={handleChange}
          min="0"
          step="0.01"
          required
        />
      </div>
      <button type="submit" className="btn btn-primary" disabled={submitting}>
        {submitting ? 'Publishing...' : 'Publish Class'}
      </button>
    </form>
  );
}
