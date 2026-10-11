function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}

export default function DataTable({ columns, rows, emptyMessage = 'No records found.', onEdit, onDelete }) {
  if (!rows || rows.length === 0) {
    return <p className="empty-message">{emptyMessage}</p>;
  }

  const hasActions = Boolean(onEdit || onDelete);

  return (
    <div className="table-wrapper">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key}>{col.header}</th>
            ))}
            {hasActions && <th className="row-actions" aria-label="Actions" />}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row._id || row.id}>
              {columns.map((col) => (
                <td key={col.key}>{col.render ? col.render(row) : row[col.key]}</td>
              ))}
              {hasActions && (
                <td className="row-actions">
                  {onEdit && (
                    <button type="button" className="icon-btn" onClick={() => onEdit(row)} aria-label="Edit" title="Edit">
                      <PencilIcon />
                    </button>
                  )}
                  {onDelete && (
                    <button
                      type="button"
                      className="icon-btn icon-btn-danger"
                      onClick={() => onDelete(row)}
                      aria-label="Delete"
                      title="Delete"
                    >
                      <TrashIcon />
                    </button>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
