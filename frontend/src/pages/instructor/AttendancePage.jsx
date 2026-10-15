import { useEffect, useState } from 'react';
import FormField from '../../components/common/FormField';
import {
  listAttendanceCustomers,
  listMyClasses,
  previewAttendance,
  recordAttendance,
} from '../../api/attendance.api';

const pad = (n) => String(n).padStart(2, '0');
const toDateTimeInput = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

function formatTimeRange(time, durationMinutes) {
  const [h, m] = time.split(':').map(Number);
  const endTotal = h * 60 + m + (durationMinutes || 60);
  return `${time}–${pad(Math.floor(endTotal / 60) % 24)}:${pad(endTotal % 60)}`;
}

const classLabel = (cls) => `${cls.dayOfWeek} ${formatTimeRange(cls.time, cls.durationMinutes)} · ${cls.classType}`;

export default function AttendancePage() {
  const [classes, setClasses] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [classId, setClassId] = useState('');
  const [attendedAt, setAttendedAt] = useState(() => toDateTimeInput(new Date()));
  const [attendeeIds, setAttendeeIds] = useState([]);
  const [pickedCustomerId, setPickedCustomerId] = useState('');
  const [warnings, setWarnings] = useState(null);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function refreshCustomers() {
    setCustomers(await listAttendanceCustomers());
  }

  useEffect(() => {
    listMyClasses().then(setClasses);
    refreshCustomers();
  }, []);

  const attendees = attendeeIds.map((id) => customers.find((c) => c.customerId === id)).filter(Boolean);
  const availableCustomers = customers.filter((c) => !attendeeIds.includes(c.customerId));

  function addAttendee() {
    if (!pickedCustomerId) return;
    setAttendeeIds([...attendeeIds, pickedCustomerId]);
    setPickedCustomerId('');
  }

  function payload() {
    return { classId, attendedAt: new Date(attendedAt).toISOString(), customerIds: attendeeIds };
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    if (attendeeIds.length === 0) {
      setError('Add at least one customer.');
      return;
    }
    setSubmitting(true);
    try {
      const preview = await previewAttendance(payload());
      const found = [preview.scheduleWarning, ...preview.attendees.map((a) => a.warning)].filter(Boolean);
      if (found.length > 0) {
        setWarnings(found);
        return;
      }
      await save();
    } catch (err) {
      setError(err?.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function save() {
    setWarnings(null);
    setSubmitting(true);
    try {
      const result = await recordAttendance(payload());
      const names = result.checkIns
        .map((c) => `${c.name} (${c.unlimited ? 'unlimited' : `balance ${c.classBalance}`})`)
        .join(', ');
      const { dayOfWeek, time } = result.classSchedule;
      setSuccessMessage(`Attendance saved for the ${dayOfWeek} ${time} class. Checked in: ${names}. Check-in confirmations sent.`);
      setAttendeeIds([]);
      await refreshCustomers();
    } catch (err) {
      setError(err?.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h2>Attendance</h2>
      </div>

      {successMessage && <p className="success-message">{successMessage}</p>}

      {classes.length === 0 ? (
        <p className="empty-message">You have no classes scheduled.</p>
      ) : (
        <form className="entity-form" onSubmit={handleSubmit}>
          {error && <p className="form-error">{error}</p>}
          <div className="form-grid">
            <FormField
              label="Class"
              type="select"
              name="classId"
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              required
              options={classes.map((cls) => ({ value: cls._id, label: classLabel(cls) }))}
            />
            <FormField
              label="Date and time"
              type="datetime-local"
              name="attendedAt"
              value={attendedAt}
              onChange={(e) => setAttendedAt(e.target.value)}
              required
            />
          </div>

          <div className="attendee-picker">
            <FormField
              label="Add customer"
              type="select"
              name="customer"
              value={pickedCustomerId}
              onChange={(e) => setPickedCustomerId(e.target.value)}
              options={availableCustomers.map((c) => ({
                value: c.customerId,
                label: `${c.customerId} - ${c.firstName} ${c.lastName}`,
              }))}
            />
            <button type="button" className="btn btn-secondary" onClick={addAttendee} disabled={!pickedCustomerId}>
              Add
            </button>
          </div>

          {attendees.length > 0 ? (
            <ul className="attendee-list">
              {attendees.map((c) => (
                <li key={c.customerId}>
                  <span>
                    {c.customerId} - {c.firstName} {c.lastName}
                    <span className="attendee-balance"> · balance {c.classBalance}</span>
                  </span>
                  <button
                    type="button"
                    className="btn btn-link"
                    onClick={() => setAttendeeIds(attendeeIds.filter((id) => id !== c.customerId))}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="form-summary">No customers added yet.</p>
          )}

          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Saving...' : 'Save Attendance'}
          </button>
        </form>
      )}

      {warnings && (
        <div className="modal-backdrop">
          <div className="modal">
            <h3>Please check before saving</h3>
            <ul className="warning-list">
              {warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
            <p className="form-summary">Saving anyway may take a customer's balance below zero.</p>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setWarnings(null)}>
                Go back
              </button>
              <button type="button" className="btn btn-primary" onClick={save} disabled={submitting}>
                Save anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
