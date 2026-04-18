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
    return NextResponse.json({ message: `Unable to load escrow summary context (${response.status}).` }, { status: response.status });
  }

  const contextData = (await response.json()) as any;
  const pdf = buildPdf([
    `Escrow summary ${contextData.invoiceNumber ?? id}`,
    `Buyer: ${contextData.buyer?.name ?? 'n/a'}`,
    `Supplier: ${contextData.supplier?.name ?? 'n/a'}`,
    `Amount held: ${contextData.currency ?? 'USD'} ${(Number(contextData.amountMinor ?? 0) / 100).toFixed(2)}`,
    `Deal status: ${contextData.status ?? 'pending'}`,
    `Payment method: ${contextData.paymentMethod ?? 'manual'}`,
    `Transaction ID: ${contextData.transactionId ?? 'n/a'}`,
    `Bank reference: ${contextData.bankReference ?? 'n/a'}`,
    `Prepared at: ${new Date().toISOString()}`
  ]);

  await storeComplianceDocument({
    apiBaseUrl,
    accessToken: token,
    documentType: 'compliance',
    documentName: `escrow-summary-${id}.pdf`,
    storageKey: `documents/escrow-summary/${id}/latest.pdf`,
    contentType: 'application/pdf',
    pdf,
    metadata: {
      kind: 'escrow_summary',
      entityType: 'deal',
      entityId: id,
      status: contextData.status,
      paymentMethod: contextData.paymentMethod
    },
    dealId: id
  }).catch((error) => {
    console.error('escrow summary document storage failed', error);
  });

  return new NextResponse(pdf, {
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `attachment; filename="escrow-summary-${id}.pdf"`,
      'cache-control': 'no-store'
    }
  });
}
