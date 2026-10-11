import { useEffect, useState } from 'react';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import DataTable from '../../components/common/DataTable';
import ClassForm from '../../components/classes/ClassForm';
import ConflictSuggestionModal from '../../components/classes/ConflictSuggestionModal';
import { createClass, deactivateClass, listClasses, updateClass } from '../../api/classes.api';
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
  { key: 'payRate', header: 'Pay Rate', render: (row) => `$${Number(row.payRate).toFixed(2)}` },
];

function toFormValues(cls) {
  return {
    instructorId: cls.instructor?.instructorId || '',
    dayOfWeek: cls.dayOfWeek,
    time: cls.time,
    classType: cls.classType,
    payRate: String(cls.payRate),
  };
}

export default function ClassesPage() {
  const [classes, setClasses] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [conflictInfo, setConflictInfo] = useState(null);
  const [pendingForm, setPendingForm] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [formError, setFormError] = useState('');

  async function refresh() {
    const [classData, instructorData] = await Promise.all([listClasses(), listInstructors()]);
    setClasses(classData);
    setInstructors(instructorData);
  }

  useEffect(() => {
    refresh();
  }, []);

  function closeForm() {
    setShowForm(false);
    setEditing(null);
  }

  function startEdit(row) {
    setSuccessMessage('');
    setErrorMessage('');
    setFormError('');
    setEditing(row);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function normalize(form) {
    return { ...form, payRate: Number(form.payRate) };
  }

  function save(form) {
    return editing ? updateClass(editing._id, normalize(form)) : createClass(normalize(form));
  }

  async function handleSubmit(form) {
    setSuccessMessage('');
    setErrorMessage('');
    setFormError('');
    try {
      onSaved(await save(form));
    } catch (err) {
      if (err?.response?.status === 409) {
        setPendingForm(form);
        setConflictInfo(err.response.data.details);
      } else {
        throw err;
      }
    }
  }

  function onSaved(saved) {
    const summary = `${saved.dayOfWeek} at ${saved.time} with ${saved.instructor.firstName} ${saved.instructor.lastName}`;
    setSuccessMessage(editing ? `Class updated: ${summary}.` : `Class published: ${summary}. Manager and instructor notified.`);
    closeForm();
    setConflictInfo(null);
    setPendingForm(null);
    refresh();
  }

  async function handlePickSuggestion(suggestion) {
    try {
      onSaved(await save({ ...pendingForm, dayOfWeek: suggestion.dayOfWeek, time: suggestion.time }));
    } catch (err) {
      setFormError(err?.response?.data?.message || 'Could not publish the selected slot. Please try again.');
      setConflictInfo(null);
      setPendingForm(null);
    }
  }

  async function handleDelete() {
    const target = deleting;
    setDeleting(null);
    setSuccessMessage('');
    setErrorMessage('');
    try {
      await deactivateClass(target._id);
      setSuccessMessage(`Class deleted: ${target.dayOfWeek} at ${target.time}.`);
      if (editing?._id === target._id) closeForm();
      await refresh();
    } catch (err) {
      setErrorMessage(err?.response?.data?.message || 'Could not delete the class. Please try again.');
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h2>Classes</h2>
        <button type="button" className="btn btn-primary" onClick={() => (showForm ? closeForm() : setShowForm(true))}>
          {showForm ? 'Cancel' : 'Add Class'}
        </button>
      </div>

      {successMessage && <p className="success-message">{successMessage}</p>}
      {errorMessage && <p className="form-error">{errorMessage}</p>}

      {showForm && editing && (
        <h3 className="form-heading">
          Edit class: {editing.dayOfWeek} {formatTimeRange(editing.time, editing.durationMinutes)}
        </h3>
      )}
      {showForm && (
        <ClassForm
          key={editing?._id || 'new'}
          instructors={instructors}
          initialValues={editing ? toFormValues(editing) : undefined}
          onSubmit={handleSubmit}
          submitLabel={editing ? 'Save Changes' : 'Publish Class'}
          externalError={formError}
        />
      )}

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

      {deleting && (
        <ConfirmDialog
          title="Delete class?"
          message={`The ${deleting.classType} class on ${deleting.dayOfWeek} ${formatTimeRange(deleting.time, deleting.durationMinutes)} will be removed from the schedule.`}
          confirmLabel="Delete"
          danger
          onConfirm={handleDelete}
          onCancel={() => setDeleting(null)}
        />
      )}

      <DataTable
        columns={COLUMNS}
        rows={classes}
        emptyMessage="No classes scheduled yet."
        onEdit={startEdit}
        onDelete={setDeleting}
      />
    </div>
  );
}
