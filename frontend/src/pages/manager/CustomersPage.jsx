import { useEffect, useState } from 'react';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import ContactForm from '../../components/common/ContactForm';
import DataTable from '../../components/common/DataTable';
import DuplicateNameDialog from '../../components/common/DuplicateNameDialog';
import {
  checkDuplicateCustomer,
  createCustomer,
  deactivateCustomer,
  listCustomers,
  updateCustomer,
} from '../../api/customers.api';

const COLUMNS = [
  { key: 'customerId', header: 'ID' },
  { key: 'name', header: 'Name', render: (row) => `${row.firstName} ${row.lastName}` },
  { key: 'email', header: 'Email' },
  { key: 'phone', header: 'Phone' },
  { key: 'preferredContact', header: 'Preferred Contact' },
  { key: 'classBalance', header: 'Class Balance' },
];

function deleteMessage(customer) {
  const base = `${customer.customerId} - ${customer.firstName} ${customer.lastName} will be removed from the list.`;
  if (customer.classBalance > 0) {
    const classes = customer.classBalance === 1 ? '1 class' : `${customer.classBalance} classes`;
    return `${base} This customer still has ${classes} remaining.`;
  }
  return base;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [pendingForm, setPendingForm] = useState(null);
  const [duplicateMatches, setDuplicateMatches] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  async function refresh() {
    const data = await listCustomers();
    setCustomers(data);
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
      const updated = await updateCustomer(editing._id, form);
      setSuccessMessage(`Customer ${updated.customerId} updated.`);
      closeForm();
      await refresh();
      return;
    }
    const { duplicateExists, matches } = await checkDuplicateCustomer(form.firstName, form.lastName);
    if (duplicateExists) {
      setPendingForm(form);
      setDuplicateMatches(matches);
      return;
    }
    await finalizeCreate(form);
  }

  async function finalizeCreate(form) {
    const created = await createCustomer(form);
    setSuccessMessage(`Customer saved. ID: ${created.customerId}. Welcome notification sent via ${created.preferredContact}.`);
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
      await deactivateCustomer(target._id);
      setSuccessMessage(`Customer ${target.customerId} deleted.`);
      if (editing?._id === target._id) closeForm();
      await refresh();
    } catch (err) {
      setErrorMessage(err?.response?.data?.message || 'Could not delete the customer. Please try again.');
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h2>Customers</h2>
        <button type="button" className="btn btn-primary" onClick={() => (showForm ? closeForm() : setShowForm(true))}>
          {showForm ? 'Cancel' : 'Add Customer'}
        </button>
      </div>

      {successMessage && <p className="success-message">{successMessage}</p>}
      {errorMessage && <p className="form-error">{errorMessage}</p>}

      {showForm && editing && <h3 className="form-heading">Edit customer {editing.customerId}</h3>}
      {showForm && (
        <ContactForm
          key={editing?._id || 'new'}
          initialValues={editing}
          onSubmit={handleSubmit}
          submitLabel={editing ? 'Save Changes' : 'Save Customer'}
        />
      )}

      {duplicateMatches && (
        <DuplicateNameDialog
          matches={duplicateMatches}
          idField="customerId"
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
          title="Delete customer?"
          message={deleteMessage(deleting)}
          confirmLabel="Delete"
          danger
          onConfirm={handleDelete}
          onCancel={() => setDeleting(null)}
        />
      )}

      <DataTable
        columns={COLUMNS}
        rows={customers}
        emptyMessage="No customers yet."
        onEdit={startEdit}
        onDelete={setDeleting}
      />
    </div>
  );
}
