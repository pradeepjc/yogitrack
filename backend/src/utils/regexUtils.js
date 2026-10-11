// Escapes regex metacharacters so user input is matched as literal text.
function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Case-insensitive match on the whole (trimmed) value.
function exactMatchRegex(value) {
  return new RegExp(`^${escapeRegex(String(value).trim())}$`, 'i');
}

// Case-insensitive "contains" match.
function containsRegex(value) {
  return new RegExp(escapeRegex(String(value).trim()), 'i');
}

module.exports = { escapeRegex, exactMatchRegex, containsRegex };
