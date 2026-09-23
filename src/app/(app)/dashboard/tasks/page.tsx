import { redirect } from 'next/navigation';

export default function DashboardTasksRedirect() {
  redirect('/collections?filter=due_today');
}
