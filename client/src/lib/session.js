// 로그인 세션을 localStorage에 저장 (부대/역할/병사). 비밀번호 없는 MVP 선택 방식.
const KEY = 'mnt_session';

export function getSession() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || null;
  } catch {
    return null;
  }
}

export function saveSession(s) {
  localStorage.setItem(KEY, JSON.stringify(s));
}

export function clearSession() {
  localStorage.removeItem(KEY);
}
