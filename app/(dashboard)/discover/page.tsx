import { DiscoveryForm } from '@/components/discover/DiscoveryForm';

export default function DiscoverPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Discover Opportunities</h1>
        <p className="text-sm text-slate-600">Generate backlink opportunities from seed keywords and opportunity types.</p>
      </header>
      <DiscoveryForm />
    </div>
  );
}
