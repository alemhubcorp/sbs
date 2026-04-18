import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getOptionalAccessToken } from '../../../../lib/auth';
import { buildPdf, storeComplianceDocument } from '../../../compliance-documents';

export const runtime = 'nodejs';

const apiBaseUrl =
  process.env.API_INTERNAL_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

type InvoiceContext = {
  kind: 'deal' | 'order';
  id: string;
  invoiceNumber: string;
  dueDate: string;
  amountMinor: number;
  currency: string;
  status: string;
  paymentMethod: string;
  paymentProvider: string;
  transactionId?: string | null;
  paymentReference?: string | null;
  bankReference?: string | null;
  buyer: { name: string; email?: string | null };
  supplier: { name: string; email?: string | null };
  order: { id: string; status: string; paymentStatus: string; createdAt: string } | null;
  deal: { id: string; status: string; buyerStatus: string; supplierStatus: string; createdAt: string } | null;
  payment: { id: string; attempts?: Array<{ id: string; attemptType: string; method: string; provider: string; status: string }> } | null;
  paymentInstructions: Array<{ label: string; value: string }>;
  timeline: Array<{ id: string; title: string; body: string; createdAt: string }>;
  platform: {
    legalName?: string;
    address?: string;
    registrationNumber?: string;
    taxVatNumber?: string;
    invoicingEmail?: string;
    invoiceFooter?: string;
    complianceDisclaimerText?: string;
  };
  bank: {
    beneficiaryName?: string;
    bankName?: string;
    iban?: string;
    swiftBic?: string;
    accountNumber?: string;
    supportEmail?: string;
    supportPhone?: string;
  };
  compliance: {
    legalDisclaimer?: string;
    termsSnippet?: string;
    refundPaymentNote?: string;
    complianceStatement?: string;
    signatureNameTitle?: string;
    signatureImageUrl?: string;
    companySealImageUrl?: string;
  };
  signature: { nameTitle?: string };
  pdfUrl: string;
};

function buildInvoiceLines(context: InvoiceContext) {
  return [
    `Invoice ${context.invoiceNumber ?? context.id}`,
    `Buyer: ${context.buyer.name} <${context.buyer.email ?? 'n/a'}>`,
    `Supplier: ${context.supplier.name} <${context.supplier.email ?? 'n/a'}>`,
    `Amount: ${context.currency} ${(Number(context.amountMinor ?? 0) / 100).toFixed(2)}`,
    `Status: ${context.status ?? 'pending'}`,
    `Payment method: ${context.paymentMethod ?? 'manual'}`,
    `Provider: ${context.paymentProvider ?? 'internal_manual'}`,
    `Payment reference: ${context.paymentReference ?? 'n/a'}`,
    `Transaction ID: ${context.transactionId ?? 'n/a'}`,
    `Bank reference: ${context.bankReference ?? 'n/a'}`,
    `Platform legal name: ${context.platform.legalName ?? 'n/a'}`,
    `Platform address: ${context.platform.address ?? 'n/a'}`,
    `Registration number: ${context.platform.registrationNumber ?? 'n/a'}`,
    `Tax / VAT: ${context.platform.taxVatNumber ?? 'n/a'}`,
    `Invoice footer: ${context.platform.invoiceFooter ?? 'n/a'}`,
    `Compliance disclaimer: ${context.platform.complianceDisclaimerText ?? 'n/a'}`,
    `Beneficiary: ${context.bank.beneficiaryName ?? 'n/a'}`,
    `Bank: ${context.bank.bankName ?? 'n/a'}`,
    `IBAN: ${context.bank.iban ?? 'n/a'}`,
    `SWIFT/BIC: ${context.bank.swiftBic ?? 'n/a'}`,
    `Account number: ${context.bank.accountNumber ?? 'n/a'}`,
    `Legal disclaimer: ${context.compliance.legalDisclaimer ?? 'n/a'}`,
    `Compliance statement: ${context.compliance.complianceStatement ?? 'n/a'}`,
    `Terms snippet: ${context.compliance.termsSnippet ?? 'n/a'}`,
    `Refund note: ${context.compliance.refundPaymentNote ?? 'n/a'}`,
    `Issued by: ${context.platform.legalName ?? 'n/a'}`,
    `Support: ${context.platform.invoicingEmail ?? 'n/a'}`,
    `Support phone: ${context.bank.supportPhone ?? 'n/a'}`,
    `Signature: ${context.signature.nameTitle ?? 'Authorized Signatory'}`
  ];
}

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const token = await getOptionalAccessToken();
  if (!token) {
    return NextResponse.json({ message: 'Authentication required.' }, { status: 401 });
  }

  const { id } = await context.params;
  const dealResponse = await fetch(`${apiBaseUrl}/api/platform/invoice-context/deal/${id}`, {
    cache: 'no-store',
    headers: { authorization: `Bearer ${token}` }
  });
  const response = dealResponse.ok
    ? dealResponse
    : await fetch(`${apiBaseUrl}/api/platform/invoice-context/order/${id}`, {
        cache: 'no-store',
        headers: { authorization: `Bearer ${token}` }
      });

  if (!response.ok) {
    return NextResponse.json(
      { message: `Unable to load invoice context (${response.status}).` },
      { status: response.status }
    );
  }

  const contextData = (await response.json()) as InvoiceContext;
  const pdf = buildPdf(buildInvoiceLines(contextData));

  await storeComplianceDocument({
    apiBaseUrl,
    accessToken: token,
    documentType: 'commercial',
    documentName: `invoice-${contextData.invoiceNumber ?? id}.pdf`,
    storageKey: `documents/invoice/${contextData.kind}/${id}/${contextData.invoiceNumber ?? id}.pdf`,
    contentType: 'application/pdf',
    pdf,
    metadata: {
      kind: contextData.kind,
      entityType: contextData.kind === 'deal' ? 'deal' : 'order',
      entityId: id,
      invoiceNumber: contextData.invoiceNumber,
      paymentMethod: contextData.paymentMethod,
      paymentProvider: contextData.paymentProvider
    },
    ...(contextData.kind === 'deal' ? { dealId: id } : {})
  }).catch((error) => {
    console.error('invoice document storage failed', error);
  });

  return new NextResponse(pdf, {
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `attachment; filename="invoice-${id}.pdf"`,
      'cache-control': 'no-store'
    }
  });
}
