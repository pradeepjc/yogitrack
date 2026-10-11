import { useEffect, useState } from 'react';
import ContactForm from '../../components/common/ContactForm';
import DataTable from '../../components/common/DataTable';
import DuplicateNameDialog from '../../components/common/DuplicateNameDialog';
import { checkDuplicateInstructor, createInstructor, listInstructors } from '../../api/instructors.api';

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
  const [pendingForm, setPendingForm] = useState(null);
  const [duplicateMatches, setDuplicateMatches] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  async function refresh() {
    const data = await listInstructors();
    setInstructors(data);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleSubmit(form) {
    setSuccessMessage('');
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
    setShowForm(false);
    setPendingForm(null);
    setDuplicateMatches(null);
    await refresh();
  }

  return (
    <div className="page">
      <div className="page-header">
        <h2>Instructors</h2>
        <button type="button" className="btn btn-primary" onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Cancel' : 'Add Instructor'}
        </button>
      </div>

      {successMessage && <p className="success-message">{successMessage}</p>}

      {showForm && <ContactForm onSubmit={handleSubmit} submitLabel="Save Instructor" />}

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

      <DataTable columns={COLUMNS} rows={instructors} emptyMessage="No instructors yet." />
    </div>
  );
}
