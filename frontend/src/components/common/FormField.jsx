export default function FormField({ label, type = 'text', name, value, onChange, options, required, ...rest }) {
  return (
    <label className="form-field">
      <span>
        {label}
        {required && <span className="required-mark"> *</span>}
      </span>
      {type === 'select' ? (
        <select name={name} value={value} onChange={onChange} required={required} {...rest}>
          <option value="">Select...</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : (
        <input type={type} name={name} value={value} onChange={onChange} required={required} {...rest} />
      )}
    </label>
  );
}
