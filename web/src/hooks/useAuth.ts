export function useAuth() {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role') || 'viewer';
  return { isAuth: !!token, role };
}
