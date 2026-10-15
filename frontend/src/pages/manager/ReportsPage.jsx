import { useEffect, useState } from 'react';
import DataTable from '../../components/common/DataTable';
import {
  getCustomerPackagesReport,
  getInstructorClassesReport,
  getPackageSalesReport,
  getTeacherPaymentsReport,
} from '../../api/reports.api';

const money = (value) => `$${Number(value).toFixed(2)}`;
// Validity dates are stored as UTC midnight; format in UTC so they don't shift a day in local time.
const formatDate = (value) => new Date(value).toLocaleDateString(undefined, { timeZone: 'UTC' });

function formatTimeRange(time, durationMinutes) {
  const [h, m] = time.split(':').map(Number);
  const endTotal = h * 60 + m + (durationMinutes || 60);
  const pad = (n) => String(n).padStart(2, '0');
  return `${time}–${pad(Math.floor(endTotal / 60) % 24)}:${pad(endTotal % 60)}`;
}

const instructorCell = (row) => `${row.instructorId} - ${row.instructorName}`;
const classCell = (row) => `${row.dayOfWeek} ${formatTimeRange(row.time, row.durationMinutes)}`;

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

const SALES_COLUMNS = [
  { key: 'package', header: 'Package', render: (row) => `${row.packageId} - ${row.name}${row.isActive ? '' : ' (deleted)'}` },
  { key: 'category', header: 'Category' },
  { key: 'classType', header: 'Class Type' },
  { key: 'classes', header: 'Classes' },
  { key: 'price', header: 'Price', render: (row) => money(row.price) },
  { key: 'unitsSold', header: 'Sold' },
  { key: 'revenue', header: 'Revenue', render: (row) => money(row.revenue) },
  { key: 'lastSoldAt', header: 'Last Sale', render: (row) => (row.lastSoldAt ? new Date(row.lastSoldAt).toLocaleDateString() : '—') },
];

const INSTRUCTOR_COLUMNS = [
  { key: 'instructor', header: 'Instructor', render: instructorCell },
  { key: 'class', header: 'Class', render: (row) => (row.hasClass ? classCell(row) : 'No classes') },
  { key: 'classType', header: 'Type', render: (row) => row.classType || '—' },
  { key: 'payRate', header: 'Pay Rate', render: (row) => (row.hasClass ? money(row.payRate) : '—') },
  { key: 'checkIns', header: 'Check-ins' },
];

const CUSTOMER_COLUMNS = [
  { key: 'customer', header: 'Customer', render: (row) => `${row.customerId} - ${row.customerName}` },
  { key: 'classBalance', header: 'Balance' },
  {
    key: 'package',
    header: 'Package',
    render: (row) => (row.status ? `${row.packageId} - ${row.packageName}` : 'No packages'),
  },
  { key: 'classType', header: 'Class Type', render: (row) => row.classType || '—' },
  { key: 'remaining', header: 'Remaining', render: (row) => (row.status ? row.remaining : '—') },
  {
    key: 'validity',
    header: 'Valid',
    render: (row) => (row.status ? `${formatDate(row.validityStart)} – ${formatDate(row.validityEnd)}` : '—'),
  },
  {
    key: 'status',
    header: 'Status',
    render: (row) =>
      row.status ? <span className={`status-badge status-${row.status.toLowerCase()}`}>{row.status}</span> : '—',
  },
];

const PAY_BY_INSTRUCTOR_COLUMNS = [
  { key: 'instructor', header: 'Instructor', render: instructorCell },
  { key: 'checkIns', header: 'Check-ins' },
  { key: 'amount', header: 'Amount Due', render: (row) => money(row.amount) },
];

const PAY_BY_CLASS_COLUMNS = [
  { key: 'instructor', header: 'Instructor', render: instructorCell },
  { key: 'class', header: 'Class', render: classCell },
  { key: 'classType', header: 'Type' },
  { key: 'payRate', header: 'Pay Rate', render: (row) => money(row.payRate) },
  { key: 'checkIns', header: 'Check-ins' },
  { key: 'amount', header: 'Amount', render: (row) => money(row.amount) },
];

const TABS = [
  { key: 'sales', label: 'Package Sales' },
  { key: 'instructors', label: 'Instructors & Classes' },
  { key: 'customers', label: 'Customer Packages' },
  { key: 'payments', label: 'Teacher Payments' },
];

const LOADERS = {
  sales: () => getPackageSalesReport(),
  instructors: () => getInstructorClassesReport(),
  customers: () => getCustomerPackagesReport(),
  payments: (month) => getTeacherPaymentsReport(month),
};

export default function ReportsPage() {
  const [tab, setTab] = useState('sales');
  const [month, setMonth] = useState(currentMonth);
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setReport(null);
    setError('');
    LOADERS[tab](month)
      .then((data) => {
        if (!cancelled) setReport({ tab, data });
      })
      .catch((err) => {
        if (!cancelled) setError(err?.response?.data?.message || 'Could not load the report. Please try again.');
      });
    return () => {
      cancelled = true;
    };
  }, [tab, month]);

  // Ignore data that belongs to the previous tab while the new one loads.
  const data = report?.tab === tab ? report.data : null;

  return (
    <div className="page">
      <div className="page-header">
        <h2>Reports</h2>
      </div>

      <div className="report-tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            className={`report-tab${tab === t.key ? ' active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'payments' && (
        <label className="form-field report-filter">
          <span>Month</span>
          <input type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} />
        </label>
      )}

      {error && <p className="form-error">{error}</p>}
      {!data && !error && <p className="page-loading">Loading...</p>}

      {data && tab === 'sales' && (
        <>
          <p className="report-summary">
            {data.totals.unitsSold} sold · {money(data.totals.revenue)} revenue
          </p>
          <DataTable columns={SALES_COLUMNS} rows={data.rows} emptyMessage="No packages yet." />
        </>
      )}

      {data && tab === 'instructors' && (
        <DataTable columns={INSTRUCTOR_COLUMNS} rows={data.rows} emptyMessage="No instructors yet." />
      )}

      {data && tab === 'customers' && (
        <DataTable columns={CUSTOMER_COLUMNS} rows={data.rows} emptyMessage="No customers yet." />
      )}

      {data && tab === 'payments' && (
        <>
          <p className="report-summary">
            {data.totals.checkIns} check-ins · {money(data.totals.amount)} total due
          </p>
          <h3 className="report-section">By instructor</h3>
          <DataTable columns={PAY_BY_INSTRUCTOR_COLUMNS} rows={data.byInstructor} emptyMessage="No check-ins this month." />
          <h3 className="report-section">By class</h3>
          <DataTable columns={PAY_BY_CLASS_COLUMNS} rows={data.byClass} emptyMessage="No check-ins this month." />
        </>
      )}
    </div>
  );
}
