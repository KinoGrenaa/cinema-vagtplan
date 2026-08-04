import { redirect } from 'next/navigation';

export default function RetiredDayPeriodsPage() {
  redirect('/job-functions?migratedFrom=day-periods');
}
