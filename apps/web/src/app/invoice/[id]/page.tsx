import { notFound } from 'next/navigation';
import { InvoiceView } from '../../payment-presentations-client';

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!id) {
    notFound();
  }

  return (
    <InvoiceView
      dealId={id}
    />
  );
}
