import { redirect } from 'next/navigation';

// The dashboard layout already gates on platform admin.
export default function Dashboard() {
  redirect('/dashboard/overview');
}
