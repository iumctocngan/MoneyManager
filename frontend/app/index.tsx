import { Redirect } from 'expo-router';
import { useStore } from '@/store/app-store';

/**
 * Entry point của app — chỉ làm nhiệm vụ redirect, không render UI.
 * Nếu đã đăng nhập (có authToken) thì vào tabs; ngược lại về trang login.
 * Logic này chạy sau khi root _layout đã hoàn tất hydration và initializeApp.
 */
export default function Index() {
  const authToken = useStore((state) => state.authToken);

  return <Redirect href={authToken ? '/tabs' : '/auth/login'} />;
}
