import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getOptionalAccessToken } from '../../../../lib/auth';
import { buildPdf, storeComplianceDocument } from '../../../compliance-documents';

export const runtime = 'nodejs';

const apiBaseUrl =
  process.env.API_INTERNAL_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const token = await getOptionalAccessToken();
  if (!token) {
    return NextResponse.json({ message: 'Authentication required.' }, { status: 401 });
  }

  const { id } = await context.params;
  const response = await fetch(`${apiBaseUrl}/api/platform/invoice-context/deal/${id}`, {
    cache: 'no-store',
    headers: { authorization: `Bearer ${token}` }
  });

  if (!response.ok) {
    return NextResponse.json({ message: `Unable to load deal summary context (${response.status}).` }, { status: response.status });
  }

  const contextData = (await response.json()) as any;
  const pdf = buildPdf([
    `Deal summary ${contextData.invoiceNumber ?? id}`,
    `Buyer: ${contextData.buyer?.name ?? 'n/a'} <${contextData.buyer?.email ?? 'n/a'}>`,
    `Supplier: ${contextData.supplier?.name ?? 'n/a'} <${contextData.supplier?.email ?? 'n/a'}>`,
    `Amount: ${contextData.currency ?? 'USD'} ${(Number(contextData.amountMinor ?? 0) / 100).toFixed(2)}`,
    `Status: ${contextData.status ?? 'pending'}`,
    `Payment method: ${contextData.paymentMethod ?? 'manual'}`,
    `Provider: ${contextData.paymentProvider ?? 'internal_manual'}`,
    `Reference: ${contextData.paymentReference ?? 'n/a'}`,
    `Transaction ID: ${contextData.transactionId ?? 'n/a'}`,
    `Platform: ${contextData.platform?.legalName ?? 'n/a'}`,
    `Prepared at: ${new Date().toISOString()}`
  ]);

  await storeComplianceDocument({
    apiBaseUrl,
    accessToken: token,
    documentType: 'commercial',
    documentName: `deal-summary-${id}.pdf`,
    storageKey: `documents/deal-summary/${id}/latest.pdf`,
    contentType: 'application/pdf',
    pdf,
    metadata: {
      kind: 'deal_summary',
      entityType: 'deal',
      entityId: id,
      invoiceNumber: contextData.invoiceNumber,
      status: contextData.status
    },
    dealId: id
  }).catch((error) => {
    console.error('deal summary document storage failed', error);
  });

  return new NextResponse(pdf, {
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `attachment; filename="deal-summary-${id}.pdf"`,
      'cache-control': 'no-store'
    }
  });
}
