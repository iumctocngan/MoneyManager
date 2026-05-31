import { Redirect } from 'expo-router';

// File này tồn tại vì Expo Router yêu cầu mỗi tab phải có file tương ứng.
// Tab giữa được render bởi TabBarButton trong tabs/_layout.tsx và điều hướng thẳng tới modal.
// Redirect này là fallback phòng trường hợp người dùng vào route này bằng deep link.
export default function AddButtonPlaceholder() {
  return <Redirect href="/transaction/add" />;
}
