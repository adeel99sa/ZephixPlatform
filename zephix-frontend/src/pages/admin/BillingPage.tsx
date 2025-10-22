import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';

type Billing = { plan: string; seats: number; renewalAt: string; paymentMethod?: string };

export default function BillingPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin','billing'],
    queryFn: async () => (await apiClient.get('/admin/billing')).data as Billing,
  });

  if (isLoading) return <div>Loading billing…</div>;
  if (error) return <div className="text-red-600">{fmt(error)}</div>;
  if (!data) return <div>No billing data.</div>;

  return (
    <div className="max-w-xl space-y-2">
      <h1 className="text-xl font-semibold">Billing & Plans</h1>
      <div>Plan: <b>{data.plan}</b></div>
      <div>Seats: <b>{data.seats}</b></div>
      <div>Renews: <b>{new Date(data.renewalAt).toLocaleDateString()}</b></div>
      <div>Payment Method: <b>{data.paymentMethod ?? '—'}</b></div>
    </div>
  );
}
function fmt(e: unknown){return e instanceof Error?e.message:typeof e==='string'?e:JSON.stringify(e)}
