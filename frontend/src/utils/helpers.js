/** Read the current user from localStorage; returns {} when absent. */
export function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem('user') || '{}');
  } catch {
    return {};
  }
}

export default { getCurrentUser };
