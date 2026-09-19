import { useState } from 'react';
import FormField from '../common/FormField';

const EMPTY_FORM = {
  firstName: '',
  lastName: '',
  address: '',
  phone: '',
  email: '',
  preferredContact: '',
};

export default function InstructorForm({ initialValues, onSubmit, submitLabel = 'Save Instructor' }) {
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
        <FormField label="First name" name="firstName" value={form.firstName} onChange={handleChange} required />
        <FormField label="Last name" name="lastName" value={form.lastName} onChange={handleChange} required />
        <FormField label="Address" name="address" value={form.address} onChange={handleChange} required />
        <FormField label="Phone" name="phone" value={form.phone} onChange={handleChange} required />
        <FormField label="Email" type="email" name="email" value={form.email} onChange={handleChange} required />
        <FormField
          label="Preferred mode of communication"
          type="select"
          name="preferredContact"
          value={form.preferredContact}
          onChange={handleChange}
          required
          options={[
            { value: 'phone', label: 'Phone' },
            { value: 'email', label: 'Email' },
          ]}
        />
      </div>
      <button type="submit" className="btn btn-primary" disabled={submitting}>
        {submitting ? 'Saving...' : submitLabel}
      </button>
    </form>
  );
}
