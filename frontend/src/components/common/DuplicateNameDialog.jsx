import ConfirmDialog from './ConfirmDialog';

export default function DuplicateNameDialog({ matches, idField = 'instructorId', firstName, lastName, onConfirm, onCancel }) {
  return (
    <ConfirmDialog
      title="Possible duplicate name"
      message={
        <>
          {matches.length} existing record{matches.length > 1 ? 's' : ''} already {matches.length > 1 ? 'match' : 'matches'} "
          {firstName} {lastName}" ({matches.map((m) => m[idField]).join(', ')}). Do you
          still want to add this as a new record?
        </>
      }
      confirmLabel="Yes, add anyway"
      cancelLabel="Cancel"
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
