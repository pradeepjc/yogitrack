function formatTimeRange(time, durationMinutes) {
  const [h, m] = time.split(':').map(Number);
  const endTotal = h * 60 + m + (durationMinutes || 60);
  const endH = String(Math.floor(endTotal / 60) % 24).padStart(2, '0');
  const endM = String(endTotal % 60).padStart(2, '0');
  return `${time}–${endH}:${endM}`;
}

export default function ConflictSuggestionModal({ conflictingClass, suggestions, onPickSuggestion, onCancel }) {
  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h3>Studio already booked</h3>
        <p>
          {conflictingClass?.dayOfWeek}{' '}
          {conflictingClass && formatTimeRange(conflictingClass.time, conflictingClass.durationMinutes)}
          {conflictingClass?.instructor ? ` — ${conflictingClass.instructor.firstName} ${conflictingClass.instructor.lastName}'s class` : ''}.
        </p>
        <p>Choose an alternative slot:</p>
        <ul className="suggestion-list">
          {suggestions.map((s) => (
            <li key={`${s.dayOfWeek}-${s.time}`}>
              <button type="button" className="btn btn-secondary" onClick={() => onPickSuggestion(s)}>
                {s.dayOfWeek} at {s.time}
              </button>
            </li>
          ))}
        </ul>
        <div className="modal-actions">
          <button type="button" className="btn btn-link" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
