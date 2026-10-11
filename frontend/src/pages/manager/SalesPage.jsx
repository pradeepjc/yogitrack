import { useEffect, useState } from 'react';
import DataTable from '../../components/common/DataTable';
import SaleForm from '../../components/sales/SaleForm';
import { listCustomers } from '../../api/customers.api';
import { listPackages } from '../../api/packages.api';
import { createSale, listSales } from '../../api/sales.api';

// Validity dates are stored as UTC midnight; format in UTC so they don't shift a day in local time.
const formatDate = (value) => new Date(value).toLocaleDateString(undefined, { timeZone: 'UTC' });
const formatDateTime = (value) => new Date(value).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });

const COLUMNS = [
  { key: 'saleId', header: 'ID' },
  {
    key: 'customer',
    header: 'Customer',
    render: (row) => (row.customer ? `${row.customer.customerId} - ${row.customer.firstName} ${row.customer.lastName}` : ''),
  },
  { key: 'package', header: 'Package', render: (row) => (row.package ? `${row.package.packageId} - ${row.package.name}` : '') },
  { key: 'amountPaid', header: 'Amount Paid', render: (row) => `$${row.amountPaid.toFixed(2)}` },
  { key: 'paymentMode', header: 'Payment' },
  { key: 'paidAt', header: 'Paid On', render: (row) => formatDateTime(row.paidAt) },
  { key: 'validity', header: 'Valid', render: (row) => `${formatDate(row.validityStart)} – ${formatDate(row.validityEnd)}` },
];

export default function SalesPage() {
  const [sales, setSales] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [packages, setPackages] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  async function refresh() {
    const [saleData, customerData, packageData] = await Promise.all([listSales(), listCustomers(), listPackages()]);
    setSales(saleData);
    setCustomers(customerData);
    setPackages(packageData);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleSubmit(form) {
    setSuccessMessage('');
    const { sale, classBalance } = await createSale(form);
    const name = `${sale.customer.firstName} ${sale.customer.lastName}`;
    setSuccessMessage(
      sale.isUnlimited
        ? `Sale recorded. ID: ${sale.saleId}. ${name} has unlimited ${sale.classType} classes from ${formatDate(sale.validityStart)} to ${formatDate(sale.validityEnd)}. Class balance stays at ${classBalance}.`
        : `Sale recorded. ID: ${sale.saleId}. ${name}'s new class balance is ${classBalance}.`
    );
    setShowForm(false);
    await refresh();
  }

  return (
    <div className="page">
      <div className="page-header">
        <h2>Sales</h2>
        <button type="button" className="btn btn-primary" onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Cancel' : 'Record Sale'}
        </button>
      </div>

      {successMessage && <p className="success-message">{successMessage}</p>}

      {showForm && <SaleForm customers={customers} packages={packages} onSubmit={handleSubmit} />}

      <DataTable columns={COLUMNS} rows={sales} emptyMessage="No sales recorded yet." />
    </div>
  );
}
