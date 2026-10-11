import { useEffect, useState } from 'react';
import ContactForm from '../../components/common/ContactForm';
import DataTable from '../../components/common/DataTable';
import DuplicateNameDialog from '../../components/common/DuplicateNameDialog';
import { checkDuplicateCustomer, createCustomer, listCustomers } from '../../api/customers.api';

const COLUMNS = [
  { key: 'customerId', header: 'ID' },
  { key: 'name', header: 'Name', render: (row) => `${row.firstName} ${row.lastName}` },
  { key: 'email', header: 'Email' },
  { key: 'phone', header: 'Phone' },
  { key: 'preferredContact', header: 'Preferred Contact' },
  { key: 'classBalance', header: 'Class Balance' },
];

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [pendingForm, setPendingForm] = useState(null);
  const [duplicateMatches, setDuplicateMatches] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  async function refresh() {
    const data = await listCustomers();
    setCustomers(data);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleSubmit(form) {
    setSuccessMessage('');
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
    setShowForm(false);
    setPendingForm(null);
    setDuplicateMatches(null);
    await refresh();
  }

  return (
    <div className="page">
      <div className="page-header">
        <h2>Customers</h2>
        <button type="button" className="btn btn-primary" onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Cancel' : 'Add Customer'}
        </button>
      </div>

      {successMessage && <p className="success-message">{successMessage}</p>}

      {showForm && <ContactForm onSubmit={handleSubmit} submitLabel="Save Customer" />}

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

      <DataTable columns={COLUMNS} rows={customers} emptyMessage="No customers yet." />
    </div>
  );
}
