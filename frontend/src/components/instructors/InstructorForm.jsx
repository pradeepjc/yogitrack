import { useState } from 'react';
import FormField from '../common/FormField';
import { isValidEmail, isValidPhone } from '../../utils/validators';

const EMPTY_FORM = {
  firstName: '',
  lastName: '',
  address: '',
  phone: '',
  email: '',
  preferredContact: '',
};

function validate(form) {
  const errors = {};
  Object.keys(EMPTY_FORM).forEach((name) => {
    if (!String(form[name] ?? '').trim()) {
      errors[name] = 'This field is required.';
    }
  });
  if (!errors.phone && !isValidPhone(form.phone)) {
    errors.phone = 'The phone number is invalid. Please enter a valid phone number to proceed.';
  }
  if (!errors.email && !isValidEmail(form.email)) {
    errors.email = 'The email is invalid. Please enter a valid email to proceed.';
  }
  return errors;
}

export default function InstructorForm({ initialValues, onSubmit, submitLabel = 'Save Instructor' }) {
  const [form, setForm] = useState(initialValues || EMPTY_FORM);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (fieldErrors[e.target.name]) {
      setFieldErrors({ ...fieldErrors, [e.target.name]: undefined });
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const errors = validate(form);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }
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
    <form className="entity-form" onSubmit={handleSubmit} noValidate>
      {error && <p className="form-error">{error}</p>}
      <div className="form-grid">
        <FormField
          label="First name"
          name="firstName"
          value={form.firstName}
          onChange={handleChange}
          error={fieldErrors.firstName}
          required
        />
        <FormField
          label="Last name"
          name="lastName"
          value={form.lastName}
          onChange={handleChange}
          error={fieldErrors.lastName}
          required
        />
        <FormField
          label="Address"
          name="address"
          value={form.address}
          onChange={handleChange}
          error={fieldErrors.address}
          required
        />
        <FormField
          label="Phone"
          type="tel"
          name="phone"
          value={form.phone}
          onChange={handleChange}
          placeholder="555-123-4567"
          error={fieldErrors.phone}
          required
        />
        <FormField
          label="Email"
          type="email"
          name="email"
          value={form.email}
          onChange={handleChange}
          placeholder="name@example.com"
          error={fieldErrors.email}
          required
        />
        <FormField
          label="Preferred mode of communication"
          type="select"
          name="preferredContact"
          value={form.preferredContact}
          onChange={handleChange}
          error={fieldErrors.preferredContact}
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
