import { redirect } from 'next/navigation';

export default function RetiredWorkTypesPage() {
  redirect('/job-functions?migratedFrom=work-types');
}
