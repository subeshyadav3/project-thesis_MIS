#!/usr/bin/env python3
"""
TPMS Academic Diagrams Generator
Generates 8 high-resolution publication-grade diagrams for IOE BE Project Report
"""
import os
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as patches
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch

DOCS_DIR  = os.path.dirname(os.path.abspath(__file__))
IMG_DIR   = os.path.join(DOCS_DIR, "Images")
os.makedirs(IMG_DIR, exist_ok=True)

def save(fig, name):
    for p in [os.path.join(DOCS_DIR, name), os.path.join(IMG_DIR, name)]:
        fig.savefig(p, dpi=300, bbox_inches='tight', facecolor=fig.get_facecolor())
    plt.close(fig)
    print(f"  [+] {name}")

# ─────────────────────────────────────────────────────────────────────────────
# FIG 1 — 3-TIER SYSTEM ARCHITECTURE (classic horizontal layers, real tech)
# ─────────────────────────────────────────────────────────────────────────────
def fig1_architecture():
    fig, ax = plt.subplots(figsize=(14, 9.5), dpi=300)
    fig.patch.set_facecolor('#F8F9FA')
    ax.set_facecolor('#F8F9FA')
    ax.set_xlim(0, 14); ax.set_ylim(0, 9.5); ax.axis('off')

    # Title
    ax.text(7, 9.15, 'THESIS & PROJECT MANAGEMENT SYSTEM — 3-TIER SYSTEM ARCHITECTURE',
            ha='center', va='center', fontsize=12.5, fontweight='bold', color='#0D1B2A',
            fontfamily='DejaVu Sans')

    def tier_box(y, h, label, sub, bg, border):
        ax.add_patch(FancyBboxPatch((0.3, y), 13.4, h,
            boxstyle="round,pad=0.12", facecolor=bg, edgecolor=border, lw=1.8))
        ax.text(0.62, y + h - 0.25, label, va='top', fontsize=9.5,
                fontweight='bold', color=border, fontfamily='DejaVu Sans')
        ax.text(0.62, y + h - 0.52, sub, va='top', fontsize=7.8,
                color='#555555', fontfamily='DejaVu Sans', style='italic')

    def node(x, y, w, h, title, tech, bg='#FFFFFF', border='#333333'):
        ax.add_patch(FancyBboxPatch((x, y), w, h,
            boxstyle="round,pad=0.07", facecolor=bg, edgecolor=border, lw=1.3))
        ax.text(x + w/2, y + h*0.62, title, ha='center', va='center',
                fontsize=7.8, fontweight='bold', color='#1A1A1A', fontfamily='DejaVu Sans')
        ax.text(x + w/2, y + h*0.25, tech, ha='center', va='center',
                fontsize=6.8, color='#555555', fontfamily='DejaVu Sans', style='italic')

    def arrow(x1, y1, x2, y2, label='', color='#555555'):
        ax.annotate('', xy=(x2, y2), xytext=(x1, y1),
            arrowprops=dict(arrowstyle='->', color=color, lw=1.6,
                            connectionstyle='arc3,rad=0.0'))
        if label:
            mx, my = (x1+x2)/2, (y1+y2)/2
            ax.text(mx+0.08, my, label, fontsize=6.5, color=color,
                    fontfamily='DejaVu Sans', fontweight='bold',
                    bbox=dict(boxstyle='round,pad=0.15', facecolor='#F8F9FA',
                              edgecolor='none', alpha=0.85))

    # ── TIER 1: Presentation Tier ──────────────────────────────────────────
    tier_box(6.55, 2.3, 'TIER 1 — PRESENTATION (Client Layer)',
             'React 18 SPA  •  Vite 5 Build Tool  •  Axios HTTP Client  •  CSS Variables',
             '#EBF5FB', '#1A5276')

    clients = [
        ('Student\nPortal',       'Group/Thesis\nSubmission',  '#D6EAF8'),
        ('Supervisor\nPortal',    'Evaluation\nWorkbench',     '#D6EAF8'),
        ('Examiner\nPortal',      'Defense\nScoring',          '#D6EAF8'),
        ('Coordinator\nPortal',   'Bulk Import &\nOversight',  '#D6EAF8'),
        ('Maintainer\nPortal',    'System Admin\nControl',     '#D6EAF8'),
    ]
    cw, gap = 2.2, 0.38
    cx0 = 0.6
    for i, (t, s, bg) in enumerate(clients):
        cx = cx0 + i*(cw + gap)
        node(cx, 6.80, cw, 1.7, t, s, bg=bg, border='#1A5276')

    # ── Protocol Label ─────────────────────────────────────────────────────
    ax.add_patch(patches.Rectangle((4.5, 5.92), 5.0, 0.42,
        facecolor='#FFF9C4', edgecolor='#F39C12', lw=1.2))
    ax.text(7.0, 6.13, 'HTTPS  ·  REST/JSON  ·  JWT Bearer Token  ·  TLS 1.3',
            ha='center', va='center', fontsize=8, color='#7D6608', fontweight='bold')

    # Bidirectional arrow between tiers 1 & 2
    arrow(7.0, 5.92, 7.0, 5.65, color='#1A5276')
    arrow(7.0, 5.65, 7.0, 5.92, color='#1A5276')

    # ── TIER 2: Application Tier ───────────────────────────────────────────
    tier_box(2.5, 3.1, 'TIER 2 — APPLICATION (Backend Processing Layer)',
             'Node.js 18  ·  Express.js 4.18  ·  Prisma ORM 5  ·  Puppeteer 22  ·  FastAPI 0.110',
             '#EAFAF1', '#1E8449')

    # Express subsystem
    ax.add_patch(FancyBboxPatch((0.55, 2.72), 8.4, 2.65,
        boxstyle="round,pad=0.08", facecolor='#D5F5E3', edgecolor='#1E8449', lw=1.2,
        linestyle='--'))
    ax.text(0.80, 5.18, 'Node.js / Express REST API Server  (Port 5000)',
            va='top', fontsize=8, fontweight='bold', color='#1E8449')

    express_nodes = [
        ('Auth &\nRBAC Guard',    'bcryptjs\nJWT',          1.05, 3.85),
        ('Group &\nThesis Ctrl',  'Prisma ORM\nTransactions', 3.00, 3.85),
        ('Evaluation\nEngine',    '5-Criteria\nRubric',      4.95, 3.85),
        ('Puppeteer\nPDF Engine', 'Headless\nChromium',      6.90, 3.85),
        ('XLSX Import\nParser',   'Anomaly\nDetection',      1.05, 2.85),
        ('Email\nWorker',         'Nodemailer\nSMTP Async',  3.00, 2.85),
        ('Exam Forward\nGateway', 'Result\nExport',          4.95, 2.85),
    ]
    for t, s, nx, ny in express_nodes:
        node(nx, ny, 1.72, 0.80, t, s, bg='#FFFFFF', border='#1E8449')

    # FastAPI subsystem
    ax.add_patch(FancyBboxPatch((9.25, 2.72), 4.2, 2.65,
        boxstyle="round,pad=0.08", facecolor='#FEF9E7', edgecolor='#CA6F1E', lw=1.2,
        linestyle='--'))
    ax.text(9.45, 5.18, 'FastAPI RAG Microservice  (Port 8000)',
            va='top', fontsize=8, fontweight='bold', color='#CA6F1E')

    fastapi_nodes = [
        ('FastAPI\nGateway',         'Async\nuvicorn',         9.40, 3.85),
        ('Chunk &\nEmbed Pipeline',  'SentenceTransformers\nall-MiniLM-L6', 11.00, 3.85),
        ('ChromaDB\nVector Store',   'Cosine Similarity\nTop-K Retrieval', 9.40, 2.85),
        ('LLM Inference\nEngine',    'Llama-3 / Gemini\nRAG Prompt',      11.00, 2.85),
    ]
    for t, s, nx, ny in fastapi_nodes:
        node(nx, ny, 1.65, 0.80, t, s, bg='#FFFFFF', border='#CA6F1E')

    # Inter-service arrow Express ↔ FastAPI
    ax.annotate('', xy=(9.25, 3.90), xytext=(8.95, 3.90),
        arrowprops=dict(arrowstyle='<->', color='#CA6F1E', lw=1.8))
    ax.text(9.1, 4.08, 'IPC / REST\nHTTP', ha='center', fontsize=6.5,
            color='#CA6F1E', fontweight='bold')

    # Arrow Tier2 -> Tier3
    ax.add_patch(patches.Rectangle((4.5, 1.92), 5.0, 0.38,
        facecolor='#FDEDEC', edgecolor='#C0392B', lw=1.2))
    ax.text(7.0, 2.11, 'TCP / SQL (Prisma)  ·  File I/O  ·  SMTP  ·  ChromaDB gRPC',
            ha='center', va='center', fontsize=7.8, color='#7B241C', fontweight='bold')

    arrow(3.5, 1.92, 3.5, 1.62, color='#922B21')
    arrow(7.0, 1.92, 7.0, 1.62, color='#922B21')
    arrow(11.5, 1.92, 11.5, 1.62, color='#922B21')

    # ── TIER 3: Data Tier ──────────────────────────────────────────────────
    tier_box(0.18, 1.60, 'TIER 3 — PERSISTENCE (Data & Infrastructure Layer)',
             'PostgreSQL 16  ·  ChromaDB 0.4  ·  Local File Store  ·  SMTP Server',
             '#FDEDEC', '#922B21')

    data_nodes = [
        ('PostgreSQL\nDatabase',     'Prisma ORM · 18 Models\nACID Transactions',    '#FADBD8'),
        ('File Storage\n/uploads',   'PDF Sheets · Docx\nExcel Templates',            '#FADBD8'),
        ('ChromaDB\nVector Store',   'Dense Embeddings\nSimilarity Index',            '#FADBD8'),
        ('SMTP\nMail Server',        'Nodemailer Transport\nEmail Notifications',     '#FADBD8'),
    ]
    dw = 2.9; dx0 = 0.58
    for i, (t, s, bg) in enumerate(data_nodes):
        dx = dx0 + i*(dw + 0.38)
        node(dx, 0.38, dw, 1.20, t, s, bg=bg, border='#922B21')

    save(fig, 'fig_1_system_architecture.png')


# ─────────────────────────────────────────────────────────────────────────────
# FIG 2 — USE CASE DIAGRAM
# ─────────────────────────────────────────────────────────────────────────────
def fig2_use_case():
    fig, ax = plt.subplots(figsize=(12, 8.5), dpi=300)
    fig.patch.set_facecolor('#FAFAFA')
    ax.set_facecolor('#FAFAFA')
    ax.set_xlim(0, 12); ax.set_ylim(0, 8.5); ax.axis('off')

    ax.text(6, 8.2, 'USE CASE DIAGRAM — Thesis & Project Management System',
            ha='center', va='center', fontsize=12, fontweight='bold', color='#0D1B2A')

    # System boundary
    ax.add_patch(FancyBboxPatch((2.5, 0.4), 7.0, 7.5,
        boxstyle='round,pad=0.2', facecolor='#F0F4FF', edgecolor='#1A5276', lw=1.8,
        linestyle='--'))
    ax.text(6.0, 7.75, '<<SYSTEM BOUNDARY: TPMS Platform>>',
            ha='center', fontsize=8.5, color='#1A5276', fontweight='bold', style='italic')

    def actor(x, y, name):
        # head
        ax.add_patch(patches.Circle((x, y+0.55), 0.22, facecolor='#D6EAF8', edgecolor='#1A5276', lw=1.5))
        # body
        ax.plot([x, x], [y+0.33, y+0.05], color='#1A5276', lw=1.5)
        # arms
        ax.plot([x-0.28, x+0.28], [y+0.22, y+0.22], color='#1A5276', lw=1.5)
        # legs
        ax.plot([x, x-0.22], [y+0.05, y-0.22], color='#1A5276', lw=1.5)
        ax.plot([x, x+0.22], [y+0.05, y-0.22], color='#1A5276', lw=1.5)
        ax.text(x, y-0.42, name, ha='center', fontsize=7.5,
                fontweight='bold', color='#1A5276')

    def usecase(x, y, label, w=2.4, h=0.48):
        ax.add_patch(patches.Ellipse((x, y), w, h, facecolor='#FFFFFF',
                                    edgecolor='#1A5276', lw=1.2))
        ax.text(x, y, label, ha='center', va='center', fontsize=7.2,
                fontweight='bold', color='#0D1B2A', wrap=True)

    def assoc(ax_, actor_xy, uc_xy):
        ax_.plot([actor_xy[0], uc_xy[0]], [actor_xy[1], uc_xy[1]],
                 color='#555555', lw=0.9, linestyle=':')

    # Actors left
    actors_left = [
        (1.1, 6.4, 'Student'),
        (1.1, 4.2, 'Supervisor'),
        (1.1, 2.0, 'External\nExaminer'),
    ]
    for x, y, n in actors_left:
        actor(x, y, n)

    # Actors right
    actors_right = [
        (10.9, 5.8, 'Program\nCoordinator'),
        (10.9, 2.5, 'Maintainer'),
    ]
    for x, y, n in actors_right:
        actor(x, y, n)

    # Use Cases
    ucs = [
        (6.0, 7.0,  'UC1: Authenticate & Login'),
        (6.0, 6.1,  'UC2: Form Project Group'),
        (6.0, 5.2,  'UC3: Submit Proposal & Upload Documents'),
        (6.0, 4.35, 'UC4: Query RAG AI Proposal Assistant'),
        (6.0, 3.5,  'UC5: Enter Evaluation Marks (5 Criteria)'),
        (6.0, 2.65, 'UC6: Generate & Download PDF Sheet'),
        (6.0, 1.8,  'UC7: Bulk Import Student Rosters (Excel)'),
        (6.0, 0.95, 'UC8: Assign Supervisors & Examiners'),
    ]
    for x, y, lbl in ucs:
        usecase(x, y, lbl, w=3.8, h=0.46)

    # Associations
    links = [
        ((1.1, 6.95), (4.1, 7.0)),
        ((1.1, 6.95), (4.1, 6.1)),
        ((1.1, 6.95), (4.1, 5.2)),
        ((1.1, 6.95), (4.1, 4.35)),
        ((1.1, 4.75), (4.1, 3.5)),
        ((1.1, 4.75), (4.1, 2.65)),
        ((1.1, 2.55), (4.1, 3.5)),
        ((1.1, 2.55), (4.1, 2.65)),
        ((10.9, 6.35), (7.9, 7.0)),
        ((10.9, 6.35), (7.9, 1.8)),
        ((10.9, 6.35), (7.9, 0.95)),
        ((10.9, 3.05), (7.9, 7.0)),
    ]
    for a, b in links:
        ax.plot([a[0], b[0]], [a[1], b[1]], color='#777777', lw=0.85, linestyle=':')

    save(fig, 'fig_2_use_case_diagram.png')


# ─────────────────────────────────────────────────────────────────────────────
# FIG 3 — ER DIAGRAM WITH PROPER DATA TYPES
# ─────────────────────────────────────────────────────────────────────────────
def fig3_er():
    fig, ax = plt.subplots(figsize=(16, 11), dpi=300)
    fig.patch.set_facecolor('#FAFAFA')
    ax.set_facecolor('#FAFAFA')
    ax.set_xlim(0, 16); ax.set_ylim(0, 11); ax.axis('off')

    ax.text(8, 10.7, 'ENTITY-RELATIONSHIP (ER) DIAGRAM — TPMS Database Schema (Key Entities)',
            ha='center', fontsize=12, fontweight='bold', color='#0D1B2A')
    ax.text(8, 10.4, 'PK = Primary Key  ·  FK = Foreign Key  ·  UQ = Unique  ·  NN = Not Null',
            ha='center', fontsize=8, color='#555555', style='italic')

    # Entity definition: (title, fields_list, cx, cy)
    # fields: (name, type_string, key_marker)  key_marker: 'PK', 'FK', 'UQ', ''
    entities = [
        ('USER', [
            ('id',          'UUID',            'PK'),
            ('email',       'VARCHAR(255)',     'UQ'),
            ('password',    'VARCHAR(255)',     'NN'),
            ('role',        'ENUM',            'NN'),
            ('programId',   'UUID',            'FK'),
            ('createdAt',   'TIMESTAMP',        ''),
            ('updatedAt',   'TIMESTAMP',        ''),
        ], 2.4, 9.2),

        ('PROGRAM', [
            ('id',          'UUID',            'PK'),
            ('name',        'VARCHAR(50)',      'UQ'),
            ('level',       'ENUM(BE/MSc)',     'NN'),
            ('code',        'VARCHAR(10)',      'UQ'),
        ], 2.4, 6.0),

        ('BATCH', [
            ('id',          'UUID',            'PK'),
            ('year',        'VARCHAR(10)',      'UQ'),
            ('programId',   'UUID',            'FK'),
            ('isActive',    'BOOLEAN',          'NN'),
        ], 2.4, 3.8),

        ('STUDENT', [
            ('id',          'UUID',            'PK'),
            ('userId',      'UUID',            'FK'),
            ('rollNo',      'VARCHAR(20)',      'UQ'),
            ('batchId',     'UUID',            'FK'),
            ('programId',   'UUID',            'FK'),
        ], 7.2, 9.2),

        ('GROUP', [
            ('id',          'UUID',            'PK'),
            ('groupNo',     'INTEGER',          'UQ'),
            ('code',        'VARCHAR(50)',      'UQ'),
            ('batchId',     'UUID',            'FK'),
            ('programId',   'UUID',            'FK'),
            ('status',      'VARCHAR(30)',      'NN'),
            ('type',        'ENUM(Minor/Major)','NN'),
        ], 7.2, 6.2),

        ('PROJECT', [
            ('id',          'UUID',            'PK'),
            ('title',       'VARCHAR(512)',     'NN'),
            ('groupId',     'UUID',            'FK'),
            ('supervisorId','UUID',            'FK'),
            ('status',      'VARCHAR(30)',      'NN'),
            ('type',        'ENUM(Minor/Major)','NN'),
            ('createdAt',   'TIMESTAMP',        ''),
        ], 7.2, 3.2),

        ('EVALUATION', [
            ('id',          'UUID',            'PK'),
            ('projectId',   'UUID',            'FK'),
            ('evaluatorId', 'UUID',            'FK'),
            ('stage',       'ENUM',            'NN'),
            ('totalMarks',  'DECIMAL(5,2)',     'NN'),
            ('remarks',     'TEXT',             ''),
            ('submittedAt', 'TIMESTAMP',        ''),
        ], 12.2, 7.8),

        ('CRITERION_MARK', [
            ('id',            'UUID',          'PK'),
            ('evaluationId',  'UUID',          'FK'),
            ('criterionNo',   'SMALLINT',      'NN'),
            ('maxMarks',      'DECIMAL(5,2)',   'NN'),
            ('marksObtained', 'DECIMAL(5,2)',   'NN'),
            ('comment',       'TEXT',           ''),
        ], 12.2, 5.0),

        ('PROPOSAL', [
            ('id',           'UUID',           'PK'),
            ('projectId',    'UUID',           'FK'),
            ('title',        'VARCHAR(512)',    'NN'),
            ('abstract',     'TEXT',            ''),
            ('fileUrl',      'VARCHAR(1024)',    ''),
            ('submittedAt',  'TIMESTAMP',        ''),
        ], 12.2, 2.5),
    ]

    def draw_entity(ax_, title, fields, cx, cy, w=2.85):
        row_h = 0.28
        body_h = len(fields) * row_h + 0.15
        header_h = 0.38
        # Shadow
        ax_.add_patch(patches.Rectangle((cx - w/2 + 0.06, cy - body_h - 0.06),
                       w, header_h + body_h,
                       facecolor='#CCCCCC', edgecolor='none', zorder=1))
        # Header
        ax_.add_patch(patches.Rectangle((cx - w/2, cy),
                       w, header_h, facecolor='#1A5276', edgecolor='#0D1B2A', lw=1.2, zorder=2))
        ax_.text(cx, cy + header_h/2, title, ha='center', va='center',
                fontsize=8.5, fontweight='bold', color='#FFFFFF', zorder=3)
        # Body
        ax_.add_patch(patches.Rectangle((cx - w/2, cy - body_h),
                       w, body_h, facecolor='#FFFFFF', edgecolor='#0D1B2A', lw=1.2, zorder=2))

        for i, (fname, ftype, key) in enumerate(fields):
            fy = cy - 0.20 - i * row_h
            # Separator line
            ax_.plot([cx - w/2 + 0.05, cx + w/2 - 0.05], [fy + row_h*0.5, fy + row_h*0.5],
                    color='#DDDDDD', lw=0.6, zorder=3)
            # Key marker color
            if key == 'PK':
                col = '#922B21'; suffix = ' [PK]'
            elif key == 'FK':
                col = '#1A5276'; suffix = ' [FK]'
            elif key == 'UQ':
                col = '#7D6608'; suffix = ' [UQ]'
            else:
                col = '#333333'; suffix = ''

            ax_.text(cx - w/2 + 0.12, fy, f'{fname}{suffix}',
                    va='center', fontsize=6.5, color=col,
                    fontweight='bold' if key in ('PK', 'FK') else 'normal',
                    fontfamily='monospace', zorder=3)
            ax_.text(cx + w/2 - 0.10, fy, ftype,
                    ha='right', va='center', fontsize=6.3, color='#666666', zorder=3)

        return (cx - w/2, cy + header_h, cx + w/2, cy - body_h)  # (x0, ytop, x1, ybot)

    rects = {}
    for (title, fields, cx, cy) in entities:
        rects[title] = draw_entity(ax, title, fields, cx, cy)

    # Relationships (labeled lines)
    rels = [
        # (from_entity, to_entity, card, label)
        ('USER',     'STUDENT',    '1 : 0..1', 'is a'),
        ('USER',     'PROGRAM',    'N : 1',    'belongs to'),
        ('PROGRAM',  'BATCH',      '1 : N',    'has'),
        ('STUDENT',  'GROUP',      'N : N',    'member of'),
        ('GROUP',    'PROJECT',    '1 : 1',    'has'),
        ('PROJECT',  'EVALUATION', '1 : N',    'evaluated by'),
        ('PROJECT',  'PROPOSAL',   '1 : N',    'has'),
        ('EVALUATION','CRITERION_MARK','1 : N','contains'),
    ]

    conn_points = {
        'USER':           (2.4,   9.10),
        'PROGRAM':        (2.4,   6.40),
        'BATCH':          (2.4,   4.20),
        'STUDENT':        (7.2,   9.10),
        'GROUP':          (7.2,   6.60),
        'PROJECT':        (7.2,   3.70),
        'EVALUATION':     (12.2,  8.20),
        'CRITERION_MARK': (12.2,  5.40),
        'PROPOSAL':       (12.2,  2.90),
    }

    drawn = set()
    line_colors = ['#922B21','#1E8449','#1A5276','#7D3C98','#CA6F1E','#1A5276','#229954','#D35400']
    for i, (e1, e2, card, lbl) in enumerate(rels):
        p1 = conn_points[e1]; p2 = conn_points[e2]
        col = line_colors[i % len(line_colors)]
        ax.annotate('', xy=p2, xytext=p1,
            arrowprops=dict(arrowstyle='->', color=col, lw=1.4,
                            connectionstyle='arc3,rad=0.08'))
        mx, my = (p1[0]+p2[0])/2, (p1[1]+p2[1])/2
        ax.text(mx, my + 0.18, f'{card}  [{lbl}]',
                ha='center', fontsize=6.5, color=col, fontweight='bold',
                bbox=dict(boxstyle='round,pad=0.12', facecolor='#FAFAFA',
                          edgecolor=col, lw=0.7, alpha=0.95))

    save(fig, 'fig_3_er_diagram.png')


# ─────────────────────────────────────────────────────────────────────────────
# FIG 4 — SEQUENCE DIAGRAM: EXCEL BULK IMPORT
# ─────────────────────────────────────────────────────────────────────────────
def fig4_sequence_import():
    fig, ax = plt.subplots(figsize=(12, 7), dpi=300)
    fig.patch.set_facecolor('#FAFAFA')
    ax.set_facecolor('#FAFAFA')
    ax.set_xlim(0, 12); ax.set_ylim(0, 7); ax.axis('off')

    ax.text(6, 6.75, 'SEQUENCE DIAGRAM — Excel Bulk Roster Import & Registration Workflow',
            ha='center', fontsize=11.5, fontweight='bold', color='#0D1B2A')

    lifelines = [
        ('Coordinator', 1.0, '#1A5276'),
        ('React UI',    3.0, '#1E8449'),
        ('Express API', 5.5, '#7D3C98'),
        ('XLSX Engine', 8.0, '#CA6F1E'),
        ('Prisma / DB', 11.0,'#922B21'),
    ]
    top_y = 6.35; bot_y = 0.25

    for name, x, col in lifelines:
        ax.add_patch(FancyBboxPatch((x - 0.65, top_y - 0.48), 1.3, 0.48,
            boxstyle='round,pad=0.06', facecolor=col, edgecolor='#0D1B2A', lw=1.2))
        ax.text(x, top_y - 0.24, name, ha='center', va='center',
                fontsize=7.8, fontweight='bold', color='#FFFFFF')
        ax.plot([x, x], [top_y - 0.48, bot_y],
                color='#777777', lw=1.0, linestyle='--')

    msgs = [
        # (x1, x2, y, label, rtype)  rtype: 'call', 'return'
        (1.0, 3.0, 5.60, '1. Upload roster.xlsx via file picker', 'call'),
        (3.0, 5.5, 5.05, '2. POST /api/groups/bulk-import/preview  {file}', 'call'),
        (5.5, 8.0, 4.55, '3. parseRows(xlsx buffer) → rows[]', 'call'),
        (8.0, 5.5, 4.10, '4. return { valid: [], anomalies: [] }', 'return'),
        (5.5, 3.0, 3.65, '5. 200 OK — preview payload + warnings', 'return'),
        (1.0, 3.0, 3.15, '6. Review anomalies → click Confirm', 'call'),
        (3.0, 5.5, 2.68, '7. POST /api/groups/bulk-import/confirm  {data}', 'call'),
        (5.5,11.0, 2.22, '8. prisma.group.createMany() + assignments', 'call'),
        (11.0,5.5, 1.75, '9. return created[] + skipped[]', 'return'),
        (5.5, 3.0, 1.30, '10. 201 Created — {groups, students, supervisors}', 'return'),
        (3.0, 1.0, 0.85, '11. UI refreshes roster table  ✓', 'return'),
    ]
    for x1, x2, y, label, rtype in msgs:
        ls = '-' if rtype == 'call' else '--'
        col = '#0D1B2A' if rtype == 'call' else '#555555'
        dx = 0.0 if x2 > x1 else 0.0
        ax.annotate('', xy=(x2, y), xytext=(x1, y),
            arrowprops=dict(arrowstyle='->', color=col, lw=1.2,
                            linestyle=ls, mutation_scale=10))
        lx = (x1 + x2) / 2
        ax.text(lx, y + 0.10, label, ha='center', va='bottom',
                fontsize=6.8, color=col, fontfamily='DejaVu Sans')

    save(fig, 'fig_4_excel_import_sequence.png')


# ─────────────────────────────────────────────────────────────────────────────
# FIG 5 — SEQUENCE: SUPERVISOR ASSIGNMENT
# ─────────────────────────────────────────────────────────────────────────────
def fig5_sequence_supervisor():
    fig, ax = plt.subplots(figsize=(12, 7), dpi=300)
    fig.patch.set_facecolor('#FAFAFA')
    ax.set_facecolor('#FAFAFA')
    ax.set_xlim(0, 12); ax.set_ylim(0, 7); ax.axis('off')

    ax.text(6, 6.75, 'SEQUENCE DIAGRAM — Supervisor Assignment & Non-Blocking Email Dispatch',
            ha='center', fontsize=11.5, fontweight='bold', color='#0D1B2A')

    lifelines = [
        ('Coordinator', 1.0, '#1A5276'),
        ('React UI',    3.2, '#1E8449'),
        ('Express API', 5.8, '#7D3C98'),
        ('Prisma DB',   8.5, '#922B21'),
        ('Nodemailer',  11.0,'#CA6F1E'),
    ]
    top_y = 6.35
    for name, x, col in lifelines:
        ax.add_patch(FancyBboxPatch((x - 0.68, top_y - 0.48), 1.36, 0.48,
            boxstyle='round,pad=0.06', facecolor=col, edgecolor='#0D1B2A', lw=1.2))
        ax.text(x, top_y - 0.24, name, ha='center', va='center',
                fontsize=7.8, fontweight='bold', color='#FFFFFF')
        ax.plot([x, x], [top_y - 0.48, 0.25], color='#777777', lw=1.0, linestyle='--')

    msgs = [
        (1.0, 3.2, 5.60, '1. Select supervisor from dropdown → Assign', 'call'),
        (3.2, 5.8, 5.08, '2. PATCH /api/groups/:id/supervisor  {supervisorId}', 'call'),
        (5.8, 8.5, 4.56, '3. BEGIN TRANSACTION — update project + create assignment', 'call'),
        (8.5, 5.8, 4.08, '4. COMMIT → {assignment record}', 'return'),
        (5.8, 11.0,3.60, '5. sendMail() — fire-and-forget (async queue)', 'call'),
        (5.8, 3.2, 3.10, '6. HTTP 200 OK — {assignment confirmed} [immediate]', 'return'),
        (3.2, 1.0, 2.62, '7. Toast: "Supervisor Assigned Successfully"', 'return'),
        (11.0,11.0,2.10, '8. async: SMTP delivers to supervisor & students', 'call'),
    ]
    for x1, x2, y, lbl, rtype in msgs:
        col = '#0D1B2A' if rtype == 'call' else '#555555'
        ls = '-' if rtype == 'call' else '--'
        if x1 == x2:
            ax.add_patch(patches.FancyArrowPatch((x1 + 0.15, y + 0.15),
                (x1 + 0.55, y + 0.15), arrowstyle='->', color=col,
                connectionstyle='arc3,rad=-0.4', lw=1.2))
            ax.text(x1 + 0.65, y + 0.16, lbl, va='center',
                    fontsize=6.8, color=col)
        else:
            ax.annotate('', xy=(x2, y), xytext=(x1, y),
                arrowprops=dict(arrowstyle='->', color=col, lw=1.2,
                                linestyle=ls, mutation_scale=10))
            ax.text((x1+x2)/2, y + 0.10, lbl, ha='center', va='bottom',
                    fontsize=6.8, color=col)

    save(fig, 'fig_5_supervisor_assignment_flow.png')


# ─────────────────────────────────────────────────────────────────────────────
# FIG 6 — SEQUENCE: EVALUATION & PDF
# ─────────────────────────────────────────────────────────────────────────────
def fig6_sequence_eval():
    fig, ax = plt.subplots(figsize=(12, 7), dpi=300)
    fig.patch.set_facecolor('#FAFAFA')
    ax.set_facecolor('#FAFAFA')
    ax.set_xlim(0, 12); ax.set_ylim(0, 7); ax.axis('off')

    ax.text(6, 6.75, 'SEQUENCE DIAGRAM — Marks Entry, Calculation & Puppeteer PDF Generation',
            ha='center', fontsize=11.5, fontweight='bold', color='#0D1B2A')

    lifelines = [
        ('Evaluator',     1.0, '#1A5276'),
        ('Workbench UI',  3.2, '#1E8449'),
        ('Eval API',      5.8, '#7D3C98'),
        ('Prisma DB',     8.5, '#922B21'),
        ('Puppeteer',     11.0,'#CA6F1E'),
    ]
    top_y = 6.35
    for name, x, col in lifelines:
        ax.add_patch(FancyBboxPatch((x - 0.68, top_y - 0.48), 1.36, 0.48,
            boxstyle='round,pad=0.06', facecolor=col, edgecolor='#0D1B2A', lw=1.2))
        ax.text(x, top_y - 0.24, name, ha='center', va='center',
                fontsize=7.8, fontweight='bold', color='#FFFFFF')
        ax.plot([x, x], [top_y - 0.48, 0.25], color='#777777', lw=1.0, linestyle='--')

    msgs = [
        (1.0, 3.2, 5.60, '1. Enter 5 × criteria marks + comments', 'call'),
        (3.2, 5.8, 5.08, '2. POST /api/evaluations/marks  {marks[], stage}', 'call'),
        (5.8, 8.5, 4.56, '3. INSERT CriterionMark × 5 + totalMarks (SUM)', 'call'),
        (8.5, 5.8, 4.08, '4. return {evaluationId, totalMarks: 87.5}', 'return'),
        (3.2, 5.8, 3.58, '5. GET /api/print/preview/project/:id', 'call'),
        (5.8,11.0, 3.08, '6. render HTML template (TU header + marks + words)', 'call'),
        (11.0,11.0,2.58, '7. puppeteer.goto(htmlUrl) → page.pdf({format: A4})', 'call'),
        (11.0, 5.8,2.10, '8. return PDF binary buffer', 'return'),
        (5.8, 3.2, 1.62, '9. stream PDF → inline preview iframe', 'return'),
        (3.2, 1.0, 1.14, '10. Preview shown — Evaluator downloads ✓', 'return'),
    ]
    for x1, x2, y, lbl, rtype in msgs:
        col = '#0D1B2A' if rtype == 'call' else '#555555'
        ls = '-' if rtype == 'call' else '--'
        if x1 == x2:
            ax.add_patch(patches.FancyArrowPatch((x1 + 0.15, y + 0.15),
                (x1 + 0.55, y + 0.15), arrowstyle='->', color=col,
                connectionstyle='arc3,rad=-0.4', lw=1.2))
            ax.text(x1 + 0.65, y + 0.16, lbl, va='center', fontsize=6.8, color=col)
        else:
            ax.annotate('', xy=(x2, y), xytext=(x1, y),
                arrowprops=dict(arrowstyle='->', color=col, lw=1.2,
                                linestyle=ls, mutation_scale=10))
            ax.text((x1+x2)/2, y + 0.10, lbl, ha='center', va='bottom',
                    fontsize=6.8, color=col)

    save(fig, 'fig_6_evaluation_submission_sequence.png')


# ─────────────────────────────────────────────────────────────────────────────
# FIG 7 — DFD LEVEL 1 (Formal Yourdon-Coad notation)
# ─────────────────────────────────────────────────────────────────────────────
def fig7_dfd():
    fig, ax = plt.subplots(figsize=(14, 9.5), dpi=300)
    fig.patch.set_facecolor('#FAFAFA')
    ax.set_facecolor('#FAFAFA')
    ax.set_xlim(0, 14); ax.set_ylim(0, 9.5); ax.axis('off')

    ax.text(7, 9.2, 'DATA FLOW DIAGRAM — Level 1 (Yourdon-Coad Notation)',
            ha='center', fontsize=12, fontweight='bold', color='#0D1B2A')
    ax.text(7, 8.90,
            '□ External Entity  ○ Process  ═══ Data Store  → Data Flow',
            ha='center', fontsize=8, color='#555555', style='italic')

    def ext_entity(x, y, label, w=1.6, h=0.55):
        ax.add_patch(patches.Rectangle((x - w/2, y - h/2), w, h,
            facecolor='#D6EAF8', edgecolor='#1A5276', lw=1.5))
        ax.text(x, y, label, ha='center', va='center', fontsize=7.8,
                fontweight='bold', color='#1A5276')

    def process(x, y, pid, label, r=0.62):
        ax.add_patch(patches.Circle((x, y), r, facecolor='#EAFAF1',
                                    edgecolor='#1E8449', lw=1.5, zorder=2))
        ax.text(x, y + 0.15, pid, ha='center', va='center',
                fontsize=7.5, fontweight='bold', color='#1E8449', zorder=3)
        ax.text(x, y - 0.18, label, ha='center', va='center',
                fontsize=6.8, color='#0D1B2A', zorder=3)

    def datastore(x, y, label, w=2.5, h=0.45):
        ax.plot([x - w/2, x + w/2], [y + h/2, y + h/2], color='#922B21', lw=1.5)
        ax.plot([x - w/2, x + w/2], [y - h/2, y - h/2], color='#922B21', lw=1.5)
        ax.add_patch(patches.Rectangle((x - w/2, y - h/2 + 0.02), 0.38, h - 0.04,
            facecolor='#FADBD8', edgecolor='#922B21', lw=1))
        ax.text(x - w/2 + 0.19, y, 'D', ha='center', va='center',
                fontsize=7, fontweight='bold', color='#922B21')
        ax.text(x + 0.12, y, label, ha='left', va='center',
                fontsize=7.5, color='#0D1B2A', fontweight='bold')

    def flow(x1, y1, x2, y2, label, col='#333333', rad=0.0):
        ax.annotate('', xy=(x2, y2), xytext=(x1, y1),
            arrowprops=dict(arrowstyle='->', color=col, lw=1.3,
                            connectionstyle=f'arc3,rad={rad}'))
        mx, my = (x1+x2)/2, (y1+y2)/2
        ax.text(mx, my + 0.12, label, ha='center', va='bottom',
                fontsize=6.5, color=col,
                bbox=dict(boxstyle='round,pad=0.1', facecolor='#FAFAFA',
                          edgecolor='none', alpha=0.9))

    # External Entities
    ext_entity(1.1, 7.8, 'Student /\nGroup')
    ext_entity(1.1, 5.2, 'Supervisor /\nFaculty')
    ext_entity(1.1, 2.5, 'External\nExaminer')
    ext_entity(12.9, 7.2, 'Program\nCoordinator')
    ext_entity(12.9, 3.5, 'Exam\nDepartment')

    # Processes
    process(4.0, 7.8, 'P1', 'Authentication\n& RBAC')
    process(4.0, 5.0, 'P2', 'Group & Thesis\nRegistration')
    process(4.0, 2.5, 'P3', 'Proposal &\nDocument Upload')
    process(9.0, 7.5, 'P4', 'Evaluation &\nMark Processing')
    process(9.0, 4.8, 'P5', 'PDF Sheet\nGeneration')
    process(9.0, 2.3, 'P6', 'RAG AI\nAssistant')

    # Data Stores
    datastore(6.8, 8.90, 'D1: Users & Auth Store',    2.8)
    datastore(6.8, 7.50, 'D2: Groups & Students',      2.8)
    datastore(6.8, 6.10, 'D3: Projects & Theses',      2.8)
    datastore(6.8, 4.70, 'D4: Evaluations & Marks',    2.8)
    datastore(6.8, 3.30, 'D5: Proposals & Documents',  2.8)
    datastore(6.8, 1.90, 'D6: ChromaDB Vectors',       2.8)

    # Flows
    flow(1.1, 7.80, 3.38, 7.80, 'credentials')
    flow(4.0, 7.22, 4.0,  5.62, 'auth token')
    flow(1.1, 5.20, 3.38, 5.00, 'group/thesis data')
    flow(1.1, 2.50, 3.38, 2.50, 'proposal PDF')
    flow(5.35, 8.90, 6.2, 8.90,  'read/write user')
    flow(5.35, 7.50, 6.2, 7.50,  'read/write group')
    flow(5.35, 5.00, 6.2, 6.10,  'read/write project')
    flow(7.50, 4.70, 8.38, 7.50, 'read marks', rad=-0.15)
    flow(9.0,  6.88, 9.0,  5.42, 'eval data')
    flow(5.35, 2.50, 6.2,  3.30, 'store proposal')
    flow(5.35, 6.10, 8.38, 4.80, 'project data', rad=0.1)
    flow(7.50, 1.90, 8.38, 2.30, 'vector chunks')
    flow(12.9, 7.20, 9.62, 7.50, 'assign supervisor', rad=0.05)
    flow(9.62, 7.50, 12.9, 3.50, 'final results', rad=0.1)

    save(fig, 'fig_7_dfd_level_1.png')


# ─────────────────────────────────────────────────────────────────────────────
# FIG 8 — GANTT CHART (precise, color-coded by phase category)
# ─────────────────────────────────────────────────────────────────────────────
def fig8_gantt():
    fig, ax = plt.subplots(figsize=(14, 7), dpi=300)
    fig.patch.set_facecolor('#F8F9FA')
    ax.set_facecolor('#F8F9FA')
    ax.set_xlim(-0.2, 14.2); ax.set_ylim(-0.5, 8.5); ax.axis('off')

    ax.text(7, 8.2, 'PROJECT SCHEDULE — Gantt Chart (16-Week Engineering Lifecycle)',
            ha='center', fontsize=12, fontweight='bold', color='#0D1B2A')

    phases = [
        # (week_start, week_end, label, category_color)
        (1,  3,  'Phase 1: Requirements Elicitation & Feasibility Study',       '#1A5276'),
        (2,  5,  'Phase 2: System Architecture & Domain Modeling',              '#1E8449'),
        (4,  7,  'Phase 3: Database Schema Design & Prisma Migration',          '#117A65'),
        (5, 10,  'Phase 4: Node.js REST API & RBAC Auth Implementation',       '#7D3C98'),
        (7, 12,  'Phase 5: React 18 Frontend & Role-Based Dashboards',         '#1A5276'),
        (10,13,  'Phase 6: Puppeteer PDF Engine & Excel Import Module',        '#922B21'),
        (12,14,  'Phase 7: FastAPI RAG AI Microservice & ChromaDB Integration','#CA6F1E'),
        (14,16,  'Phase 8: Integration Testing, Security Audit & Validation',  '#7D6608'),
        (15,16,  'Phase 9: Report Compilation & Defense Preparation',           '#555555'),
    ]

    # Grid
    ax.add_patch(patches.Rectangle((-0.2, -0.5), 14.4, 8.7,
        facecolor='#F8F9FA', edgecolor='#DDDDDD', lw=1))

    week_x0 = 0.0
    week_w  = 13.0 / 16      # 16 weeks across 13 units width

    for w in range(1, 17):
        wx = week_x0 + (w - 1) * week_w
        col = '#E8E8E8' if w % 2 == 0 else '#F0F0F0'
        ax.add_patch(patches.Rectangle((wx, -0.3), week_w, 7.5,
            facecolor=col, edgecolor='none', zorder=0))
        ax.text(wx + week_w/2, 7.3, f'W{w}',
                ha='center', va='center', fontsize=7.5,
                fontweight='bold', color='#333333')

    # Phase bars
    bar_h = 0.52
    y_positions = list(reversed([0.15 + i * 0.78 for i in range(len(phases))]))

    for i, (ws, we, label, col) in enumerate(phases):
        y = y_positions[i]
        x0 = week_x0 + (ws - 1) * week_w
        x1 = week_x0 + (we - 1) * week_w
        bw = x1 - x0

        # Bar shadow
        ax.add_patch(patches.Rectangle((x0 + 0.04, y - 0.04), bw, bar_h,
            facecolor='#AAAAAA', edgecolor='none', zorder=1, alpha=0.4))
        # Bar
        ax.add_patch(FancyBboxPatch((x0, y), bw, bar_h,
            boxstyle='round,pad=0.05', facecolor=col, edgecolor='#0D1B2A',
            lw=0.8, zorder=2, alpha=0.92))
        # Week count inside bar
        wks = we - ws + 1
        ax.text(x0 + bw/2, y + bar_h/2, f'{wks}w',
                ha='center', va='center', fontsize=7.5,
                fontweight='bold', color='#FFFFFF', zorder=3)
        # Milestone diamond at end
        ax.plot(x1, y + bar_h/2, 'D', color='#FFD700',
                markersize=7, markeredgecolor='#0D1B2A',
                markeredgewidth=0.8, zorder=4)
        # Label to the left
        ax.text(-0.15, y + bar_h/2, label, ha='right', va='center',
                fontsize=7.5, color='#1A1A1A', fontweight='bold',
                fontfamily='DejaVu Sans')

    # Legend
    legend_items = [
        ('Planning',     '#1A5276'),
        ('Design',       '#1E8449'),
        ('Development',  '#7D3C98'),
        ('Testing',      '#7D6608'),
        ('◆ Milestone',  '#FFD700'),
    ]
    lx, ly = 0.5, -0.35
    for j, (ltxt, lcol) in enumerate(legend_items):
        ax.add_patch(FancyBboxPatch((lx + j*2.5, ly), 0.35, 0.28,
            boxstyle='round,pad=0.04', facecolor=lcol,
            edgecolor='#333333', lw=0.8))
        ax.text(lx + j*2.5 + 0.45, ly + 0.14, ltxt, va='center',
                fontsize=7, color='#333333', fontfamily='DejaVu Sans')

    save(fig, 'fig_8_gantt_chart.png')


if __name__ == '__main__':
    print('[*] Generating all 8 high-resolution diagrams...')
    fig1_architecture()
    fig2_use_case()
    fig3_er()
    fig4_sequence_import()
    fig5_sequence_supervisor()
    fig6_sequence_eval()
    fig7_dfd()
    fig8_gantt()
    print('[+] All diagrams generated.')
