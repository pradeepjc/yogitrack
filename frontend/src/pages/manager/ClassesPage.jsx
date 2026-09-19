import { useEffect, useState } from 'react';
import DataTable from '../../components/common/DataTable';
import ClassForm from '../../components/classes/ClassForm';
import ConflictSuggestionModal from '../../components/classes/ConflictSuggestionModal';
import { createClass, listClasses } from '../../api/classes.api';
import { listInstructors } from '../../api/instructors.api';

function formatTimeRange(time, durationMinutes) {
  const [h, m] = time.split(':').map(Number);
  const endTotal = h * 60 + m + (durationMinutes || 60);
  const endH = String(Math.floor(endTotal / 60) % 24).padStart(2, '0');
  const endM = String(endTotal % 60).padStart(2, '0');
  return `${time}–${endH}:${endM}`;
}

const COLUMNS = [
  {
    key: 'instructor',
    header: 'Instructor',
    render: (row) => (row.instructor ? `${row.instructor.instructorId} - ${row.instructor.firstName} ${row.instructor.lastName}` : ''),
  },
  { key: 'dayOfWeek', header: 'Day' },
  { key: 'time', header: 'Time', render: (row) => formatTimeRange(row.time, row.durationMinutes) },
  { key: 'classType', header: 'Type' },
  { key: 'payRate', header: 'Pay Rate' },
];

export default function ClassesPage() {
  const [classes, setClasses] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [conflictInfo, setConflictInfo] = useState(null);
  const [pendingForm, setPendingForm] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [formError, setFormError] = useState('');

  async function refresh() {
    const [classData, instructorData] = await Promise.all([listClasses(), listInstructors()]);
    setClasses(classData);
    setInstructors(instructorData);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleSubmit(form) {
    setSuccessMessage('');
    setFormError('');
    try {
      const created = await createClass(normalize(form));
      onCreated(created);
    } catch (err) {
      if (err?.response?.status === 409) {
        setPendingForm(form);
        setConflictInfo(err.response.data.details);
      } else {
        throw err;
      }
    }
  }

  function normalize(form) {
    return { ...form, payRate: Number(form.payRate) };
  }

  function onCreated(created) {
    setSuccessMessage(
      `Class published: ${created.dayOfWeek} at ${created.time} with ${created.instructor.firstName} ${created.instructor.lastName}. Manager and instructor notified.`
    );
    setShowForm(false);
    setConflictInfo(null);
    setPendingForm(null);
    refresh();
  }

  async function handlePickSuggestion(suggestion) {
    const mergedForm = normalize({ ...pendingForm, dayOfWeek: suggestion.dayOfWeek, time: suggestion.time });
    try {
      const created = await createClass(mergedForm);
      onCreated(created);
    } catch (err) {
      setFormError(err?.response?.data?.message || 'Could not publish the selected slot. Please try again.');
      setConflictInfo(null);
      setPendingForm(null);
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h2>Classes</h2>
        <button type="button" className="btn btn-primary" onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Cancel' : 'Add Class'}
        </button>
      </div>

      {successMessage && <p className="success-message">{successMessage}</p>}

      {showForm && <ClassForm instructors={instructors} onSubmit={handleSubmit} externalError={formError} />}

      {conflictInfo && (
        <ConflictSuggestionModal
          conflictingClass={conflictInfo.conflictingClass}
          suggestions={conflictInfo.suggestions}
          onPickSuggestion={handlePickSuggestion}
          onCancel={() => {
            setConflictInfo(null);
            setPendingForm(null);
          }}
        />
      )}

      <DataTable columns={COLUMNS} rows={classes} emptyMessage="No classes scheduled yet." />
    </div>
  );
}
