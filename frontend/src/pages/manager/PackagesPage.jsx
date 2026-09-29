import { useEffect, useState } from 'react';
import DataTable from '../../components/common/DataTable';
import PackageForm from '../../components/packages/PackageForm';
import { createPackage, listPackages } from '../../api/packages.api';

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

export default function PackagesPage() {
  const [packages, setPackages] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  async function refresh() {
    const data = await listPackages();
    setPackages(data);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleSubmit(form) {
    setSuccessMessage('');
    const created = await createPackage(form);
    setSuccessMessage(`Package saved. ID: ${created.packageId}.`);
    setShowForm(false);
    await refresh();
  }

  return (
    <div className="page">
      <div className="page-header">
        <h2>Packages</h2>
        <button type="button" className="btn btn-primary" onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Cancel' : 'Add Package'}
        </button>
      </div>

      {successMessage && <p className="success-message">{successMessage}</p>}

      {showForm && <PackageForm onSubmit={handleSubmit} />}

      <DataTable columns={COLUMNS} rows={packages} emptyMessage="No packages yet." />
    </div>
  );
}
