import { useEffect, useState } from 'react';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import DataTable from '../../components/common/DataTable';
import PackageForm from '../../components/packages/PackageForm';
import { createPackage, deactivatePackage, listPackages, updatePackage } from '../../api/packages.api';

// Dates are stored as UTC midnight; format in UTC so they don't shift a day in local time.
const formatDate = (value) => new Date(value).toLocaleDateString(undefined, { timeZone: 'UTC' });

const COLUMNS = [
  { key: 'packageId', header: 'ID' },
  { key: 'name', header: 'Name' },
  { key: 'category', header: 'Category' },
  { key: 'numberOfClasses', header: 'Classes', render: (row) => (row.isUnlimited ? 'Unlimited' : row.numberOfClasses) },
  { key: 'classType', header: 'Class Type' },
  { key: 'startDate', header: 'Start', render: (row) => formatDate(row.startDate) },
  { key: 'endDate', header: 'End', render: (row) => formatDate(row.endDate) },
  { key: 'price', header: 'Price', render: (row) => `$${row.price.toFixed(2)}` },
];

function toFormValues(pkg) {
  return {
    name: pkg.name,
    category: pkg.category,
    numberOfClasses: pkg.isUnlimited ? 'unlimited' : String(pkg.numberOfClasses),
    classType: pkg.classType,
    startDate: pkg.startDate.slice(0, 10),
    endDate: pkg.endDate.slice(0, 10),
    price: String(pkg.price),
  };
}

export default function PackagesPage() {
  const [packages, setPackages] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  async function refresh() {
    const data = await listPackages();
    setPackages(data);
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
      const updated = await updatePackage(editing._id, form);
      setSuccessMessage(`Package ${updated.packageId} updated.`);
    } else {
      const created = await createPackage(form);
      setSuccessMessage(`Package saved. ID: ${created.packageId}.`);
    }
    closeForm();
    await refresh();
  }

  async function handleDelete() {
    const target = deleting;
    setDeleting(null);
    setSuccessMessage('');
    setErrorMessage('');
    try {
      await deactivatePackage(target._id);
      setSuccessMessage(`Package ${target.packageId} deleted.`);
      if (editing?._id === target._id) closeForm();
      await refresh();
    } catch (err) {
      setErrorMessage(err?.response?.data?.message || 'Could not delete the package. Please try again.');
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h2>Packages</h2>
        {!showForm && (
          <button type="button" className="btn btn-primary" onClick={() => setShowForm(true)}>
            Add Package
          </button>
        )}
      </div>

      {successMessage && <p className="success-message">{successMessage}</p>}
      {errorMessage && <p className="form-error">{errorMessage}</p>}

      {showForm && editing && <h3 className="form-heading">Edit package {editing.packageId}</h3>}
      {showForm && (
        <PackageForm
          key={editing?._id || 'new'}
          initialValues={editing ? toFormValues(editing) : undefined}
          onSubmit={handleSubmit}
          onCancel={closeForm}
          submitLabel={editing ? 'Save Changes' : 'Save Package'}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title="Delete package?"
          message={`${deleting.packageId} - ${deleting.name} will be removed from the list and can no longer be sold. Past sales are kept.`}
          confirmLabel="Delete"
          danger
          onConfirm={handleDelete}
          onCancel={() => setDeleting(null)}
        />
      )}

      <DataTable
        columns={COLUMNS}
        rows={packages}
        emptyMessage="No packages yet."
        onEdit={startEdit}
        onDelete={setDeleting}
      />
    </div>
  );
}
