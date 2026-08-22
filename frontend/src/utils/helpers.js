/** Read the current user from localStorage; returns {} when absent. */
export function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem('user') || '{}');
  } catch {
    return {};
  }
}

/** Extract the server-provided error message from an axios error, with a fallback. */
export function getApiMessage(err, fallback = 'Something went wrong') {
  if (!err) return fallback;
  return (
    err.response?.data?.error ||
    err.response?.data?.message ||
    err.message ||
    fallback
  );
}

export default { getCurrentUser, getApiMessage };
