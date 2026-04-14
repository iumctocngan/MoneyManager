import { Redirect } from 'expo-router';
import { useStore } from '@/store/app-store';

export default function Index() {
  const authToken = useStore((state) => state.authToken);

  return <Redirect href={(authToken ? '/tabs' : '/auth/login') as any} />;
}
