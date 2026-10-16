import { useEffect, useState } from 'react';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import ContactForm from '../../components/common/ContactForm';
import DataTable from '../../components/common/DataTable';
import DuplicateNameDialog from '../../components/common/DuplicateNameDialog';
import {
  checkDuplicateInstructor,
  createInstructor,
  deactivateInstructor,
  listInstructors,
  updateInstructor,
} from '../../api/instructors.api';

const COLUMNS = [
  { key: 'instructorId', header: 'ID' },
  { key: 'name', header: 'Name', render: (row) => `${row.firstName} ${row.lastName}` },
  { key: 'email', header: 'Email' },
  { key: 'phone', header: 'Phone' },
  { key: 'preferredContact', header: 'Preferred Contact' },
];

export default function InstructorsPage() {
  const [instructors, setInstructors] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [pendingForm, setPendingForm] = useState(null);
  const [duplicateMatches, setDuplicateMatches] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  async function refresh() {
    const data = await listInstructors();
    setInstructors(data);
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
    setEditing(row);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleSubmit(form) {
    setSuccessMessage('');
    setErrorMessage('');
    if (editing) {
      const updated = await updateInstructor(editing._id, form);
      setSuccessMessage(`Instructor ${updated.instructorId} updated.`);
      closeForm();
      await refresh();
      return;
    }
    const { duplicateExists, matches } = await checkDuplicateInstructor(form.firstName, form.lastName);
    if (duplicateExists) {
      setPendingForm(form);
      setDuplicateMatches(matches);
      return;
    }
    await finalizeCreate(form);
  }

  async function finalizeCreate(form) {
    const created = await createInstructor(form);
    setSuccessMessage(`Instructor saved. ID: ${created.instructorId}. Welcome notification sent via ${created.preferredContact}.`);
    closeForm();
    setPendingForm(null);
    setDuplicateMatches(null);
    await refresh();
  }

  async function handleDelete() {
    const target = deleting;
    setDeleting(null);
    setSuccessMessage('');
    setErrorMessage('');
    try {
      await deactivateInstructor(target._id);
      setSuccessMessage(`Instructor ${target.instructorId} deleted.`);
      if (editing?._id === target._id) closeForm();
      await refresh();
    } catch (err) {
      setErrorMessage(err?.response?.data?.message || 'Could not delete the instructor. Please try again.');
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h2>Instructors</h2>
        {!showForm && (
          <button type="button" className="btn btn-primary" onClick={() => setShowForm(true)}>
            Add Instructor
          </button>
        )}
      </div>

      {successMessage && <p className="success-message">{successMessage}</p>}
      {errorMessage && <p className="form-error">{errorMessage}</p>}

      {showForm && editing && <h3 className="form-heading">Edit instructor {editing.instructorId}</h3>}
      {showForm && (
        <ContactForm
          key={editing?._id || 'new'}
          initialValues={editing}
          onSubmit={handleSubmit}
          onCancel={closeForm}
          submitLabel={editing ? 'Save Changes' : 'Save Instructor'}
        />
      )}

      {duplicateMatches && (
        <DuplicateNameDialog
          matches={duplicateMatches}
          firstName={pendingForm.firstName}
          lastName={pendingForm.lastName}
          onConfirm={() => finalizeCreate(pendingForm)}
          onCancel={() => {
            setDuplicateMatches(null);
            setPendingForm(null);
          }}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title="Delete instructor?"
          message={`${deleting.instructorId} - ${deleting.firstName} ${deleting.lastName} will be removed from the list.`}
          confirmLabel="Delete"
          danger
          onConfirm={handleDelete}
          onCancel={() => setDeleting(null)}
        />
      )}

      <DataTable
        columns={COLUMNS}
        rows={instructors}
        emptyMessage="No instructors yet."
        onEdit={startEdit}
        onDelete={setDeleting}
      />
    </div>
  );
}
