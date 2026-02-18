from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.units import inch

output_path = 'output/pdf/oms_app_summary_one_page.pdf'

doc = SimpleDocTemplate(
    output_path,
    pagesize=letter,
    leftMargin=0.55 * inch,
    rightMargin=0.55 * inch,
    topMargin=0.45 * inch,
    bottomMargin=0.45 * inch,
)

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(
    name='TitleCompact',
    parent=styles['Title'],
    fontName='Helvetica-Bold',
    fontSize=17,
    leading=20,
    spaceAfter=6,
    textColor=colors.HexColor('#1f2937'),
))
styles.add(ParagraphStyle(
    name='H2',
    parent=styles['Heading2'],
    fontName='Helvetica-Bold',
    fontSize=11,
    leading=13,
    spaceBefore=3,
    spaceAfter=3,
    textColor=colors.HexColor('#111827'),
))
styles.add(ParagraphStyle(
    name='Body',
    parent=styles['BodyText'],
    fontName='Helvetica',
    fontSize=8.7,
    leading=11,
    textColor=colors.HexColor('#111827'),
))
styles.add(ParagraphStyle(
    name='Small',
    parent=styles['BodyText'],
    fontName='Helvetica',
    fontSize=8.2,
    leading=10,
    textColor=colors.HexColor('#374151'),
))
styles.add(ParagraphStyle(
    name='Cell',
    parent=styles['BodyText'],
    fontName='Helvetica',
    fontSize=8.0,
    leading=10,
    textColor=colors.HexColor('#111827'),
    wordWrap='LTR',
))

story = []
story.append(Paragraph('OMS App Summary - Didacticos Jugando y Educando', styles['TitleCompact']))
story.append(Paragraph('Evidence source: repository files only (README, src, server, supabase).', styles['Small']))
story.append(Spacer(1, 4))

story.append(Paragraph('What it is', styles['H2']))
story.append(Paragraph(
    'A React + TypeScript order management system (OMS) that centralizes Mercado Libre and Wix orders in one operational dashboard. '
    'It lets staff sync orders, monitor status, filter/search, inspect details, and keep status-history audit records.',
    styles['Body']
))

story.append(Paragraph('Who it\'s for', styles['H2']))
story.append(Paragraph(
    'Primary persona: order operations staff at Didacticos Jugando y Educando (inferred from dashboard labels, manual sync buttons, and status workflow). '
    'Explicit persona definition: Not found in repo.',
    styles['Body']
))

story.append(Paragraph('What it does', styles['H2']))
for b in [
    'Shows a unified orders table for channels mercadolibre and wix.',
    'Syncs Mercado Libre and Wix orders via dedicated actions in the dashboard.',
    'Normalizes channel-specific payloads into one common order schema.',
    'Supports order filtering by status, channel, and text search (ID, nickname, email).',
    'Supports order status transitions: nuevo, preparando, listo, enviado, cancelado.',
    'Stores every status change in order_status_history for traceability.',
    'Handles Mercado Libre pack and shipping fields (pack_id and shipping_id) when present.',
]:
    story.append(Paragraph(f'- {b}', styles['Body']))

story.append(Paragraph('How it works (repo-evidenced architecture)', styles['H2']))
arch_rows = [
    [Paragraph('<b>UI layer</b>', styles['Cell']), Paragraph('React app with main entry, app container, and dashboard page using React Query state management.', styles['Cell'])],
    [Paragraph('<b>Data hooks</b>', styles['Cell']), Paragraph('useOrders reads from Supabase. useSyncML and useSyncWix call local proxy endpoints, then upsert into Supabase.', styles['Cell'])],
    [Paragraph('<b>Proxy service</b>', styles['Cell']), Paragraph('Express server exposes two sync endpoints and a health endpoint, and calls external APIs server-side to avoid browser CORS issues.', styles['Cell'])],
    [Paragraph('<b>External APIs</b>', styles['Cell']), Paragraph('Mercado Libre Orders API with OAuth token refresh, plus Wix eCommerce Orders search API.', styles['Cell'])],
    [Paragraph('<b>Data store</b>', styles['Cell']), Paragraph('Supabase PostgreSQL with orders and order_status_history tables, indexes, updated_at trigger, and permissive MVP RLS policies.', styles['Cell'])],
    [Paragraph('<b>Flow</b>', styles['Cell']), Paragraph('Operator clicks sync. UI hook calls local proxy. Proxy fetches external orders. Data is normalized and upserted. Orders query is invalidated and UI refreshes.', styles['Cell'])],
    [Paragraph('<b>Gaps</b>', styles['Cell']), Paragraph('Auth and user-role model, plus production deployment topology: Not found in repo.', styles['Cell'])],
]

table = Table(arch_rows, colWidths=[1.35 * inch, 5.55 * inch])
table.setStyle(TableStyle([
    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ('LINEBELOW', (0, 0), (-1, -2), 0.25, colors.HexColor('#d1d5db')),
    ('LEFTPADDING', (0, 0), (-1, -1), 5),
    ('RIGHTPADDING', (0, 0), (-1, -1), 5),
    ('TOPPADDING', (0, 0), (-1, -1), 2.5),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 2.5),
    ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f9fafb')),
]))
story.append(table)

story.append(Paragraph('How to run (minimal getting started)', styles['H2']))
for b in [
    'npm install',
    'Create .env.local from .env.example and fill Supabase, Mercado Libre, and Wix variables.',
    'Apply DB schema by running supabase/schema.sql in Supabase SQL Editor.',
    'Start proxy server for sync endpoints: npm run server',
    'Start frontend: npm run dev and open http://localhost:5173',
]:
    story.append(Paragraph(f'- {b}', styles['Body']))

doc.build(story)
print(output_path)
