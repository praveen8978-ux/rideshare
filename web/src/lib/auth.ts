export const getToken = () =>
  typeof window !== 'undefined' ? localStorage.getItem('token') : null;

export const setTokens = (token: string, refreshToken: string) => {
  localStorage.setItem('token', token);
  localStorage.setItem('refreshToken', refreshToken);
};

export const clearTokens = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
};

export const getUser = () => {
  if (typeof window === 'undefined') return null;
  const u = localStorage.getItem('user');
  return u ? JSON.parse(u) : null;
};

export const setUser = (user: object) =>
  localStorage.setItem('user', JSON.stringify(user));

export const isLoggedIn = () => !!getToken();