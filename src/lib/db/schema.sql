-- Schools (Marcas do Grupo)
CREATE TABLE IF NOT EXISTS schools (
    id TEXT PRIMARY KEY,
    group_name TEXT NOT NULL DEFAULT 'Raiz Educação',
    brand_name TEXT NOT NULL,
    website TEXT,
    units_status TEXT NOT NULL DEFAULT 'units_missing',
    units_count INTEGER DEFAULT 0,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Units (Unidades)
CREATE TABLE IF NOT EXISTS units (
    id TEXT PRIMARY KEY,
    school_id TEXT NOT NULL,
    unit_name TEXT,
    address_raw TEXT NOT NULL,
    address_normalized TEXT NOT NULL,
    city TEXT,
    state TEXT,
    zip TEXT,
    lat REAL,
    lng REAL,
    geocode_status TEXT NOT NULL DEFAULT 'pending',
    geocode_confidence REAL,
    geocode_provider TEXT,
    geocode_place_id TEXT,
    code TEXT,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (school_id) REFERENCES schools(id),
    UNIQUE(school_id, address_normalized, unit_name)
);

-- Vendors (Fornecedores)
CREATE TABLE IF NOT EXISTS vendors (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    contact_name TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    payment_terms TEXT,
    lead_time_days INTEGER,
    cities_covered TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Vendor Imports
CREATE TABLE IF NOT EXISTS vendor_imports (
    id TEXT PRIMARY KEY,
    vendor_id TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    imported_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    row_count_total INTEGER DEFAULT 0,
    row_count_inserted INTEGER DEFAULT 0,
    row_count_updated INTEGER DEFAULT 0,
    row_count_invalid INTEGER DEFAULT 0,
    row_count_geocode_errors INTEGER DEFAULT 0,
    notes TEXT,
    FOREIGN KEY (vendor_id) REFERENCES vendors(id)
);

-- Media Assets (Inventário)
CREATE TABLE IF NOT EXISTS media_assets (
    id TEXT PRIMARY KEY,
    vendor_id TEXT NOT NULL,
    external_code TEXT,
    type TEXT NOT NULL,
    address_raw TEXT NOT NULL,
    address_normalized TEXT NOT NULL,
    city TEXT,
    state TEXT,
    zip TEXT,
    lat REAL,
    lng REAL,
    geocode_status TEXT NOT NULL DEFAULT 'pending',
    geocode_confidence REAL,
    format TEXT,
    orientation TEXT,
    side TEXT,
    base_price REAL,
    availability_status TEXT,
    audience_notes TEXT,
    photo_url TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    fingerprint_hash TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (vendor_id) REFERENCES vendors(id)
);

-- Campaigns (Campanhas)
CREATE TABLE IF NOT EXISTS campaigns (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    objective TEXT,
    start_date DATE,
    end_date DATE,
    budget REAL,
    radius_km REAL,
    allowed_types TEXT,
    target_school_ids TEXT,
    target_unit_ids TEXT,
    budget_mode TEXT DEFAULT 'total',
    status TEXT NOT NULL DEFAULT 'draft',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Scenarios
CREATE TABLE IF NOT EXISTS scenarios (
    id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL,
    name TEXT NOT NULL,
    assumptions TEXT,
    score_weights TEXT,
    budget_curve TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id)
);

-- Plan Lines
CREATE TABLE IF NOT EXISTS plan_lines (
    id TEXT PRIMARY KEY,
    scenario_id TEXT NOT NULL,
    campaign_id TEXT NOT NULL,
    unit_id TEXT NOT NULL,
    asset_id TEXT NOT NULL,
    distance_km REAL,
    eta_minutes REAL,
    score_final REAL,
    unit_price REAL DEFAULT 0,
    total_price REAL DEFAULT 0,
    quantity INTEGER DEFAULT 1,
    period TEXT,
    start_date DATE,
    end_date DATE,
    status TEXT NOT NULL DEFAULT 'suggested',
    overlap_mode TEXT NOT NULL DEFAULT 'avoid',
    cluster_id TEXT,
    proposal_file_path TEXT,
    contract_file_path TEXT,
    invoice_file_path TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (scenario_id) REFERENCES scenarios(id),
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id),
    FOREIGN KEY (unit_id) REFERENCES units(id),
    FOREIGN KEY (asset_id) REFERENCES media_assets(id),
    FOREIGN KEY (cluster_id) REFERENCES asset_clusters(id)
);

-- Asset Clusters
CREATE TABLE IF NOT EXISTS asset_clusters (
    id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL,
    scenario_id TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'dominance',
    address_key TEXT,
    lat REAL,
    lng REAL,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id),
    FOREIGN KEY (scenario_id) REFERENCES scenarios(id)
);

-- Competitors (NOVO - Fase 4)
CREATE TABLE IF NOT EXISTS competitors (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    brand_name TEXT,
    address_raw TEXT,
    lat REAL,
    lng REAL,
    category TEXT,
    student_count_estimate INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Demographic Data (NOVO - Fase 4)
CREATE TABLE IF NOT EXISTS demographic_data (
    id TEXT PRIMARY KEY,
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    population_density REAL,
    avg_income REAL,
    flow_index REAL,
    year INTEGER DEFAULT 2024,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Geocoding Cache
CREATE TABLE IF NOT EXISTS geocoding_cache (
    address_hash TEXT PRIMARY KEY,
    address_raw TEXT NOT NULL,
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    confidence REAL,
    provider TEXT,
    place_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- App Config
CREATE TABLE IF NOT EXISTS app_config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_media_assets_vendor ON media_assets(vendor_id);
CREATE INDEX IF NOT EXISTS idx_media_assets_status ON media_assets(status);
CREATE INDEX IF NOT EXISTS idx_units_school ON units(school_id);
CREATE INDEX IF NOT EXISTS idx_plan_lines_scenario ON plan_lines(scenario_id);
CREATE INDEX IF NOT EXISTS idx_plan_lines_campaign ON plan_lines(campaign_id);
CREATE INDEX IF NOT EXISTS idx_plan_lines_status ON plan_lines(status);
CREATE INDEX IF NOT EXISTS idx_asset_clusters_scenario ON asset_clusters(scenario_id);
CREATE INDEX IF NOT EXISTS idx_competitors_lat_lng ON competitors(lat, lng);
CREATE INDEX IF NOT EXISTS idx_demographic_lat_lng ON demographic_data(lat, lng);

-- Eventos & Ativações (NOVO - Fase 5)
CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- 'escolar', 'sazonal', 'promocional'
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE,
    unit_ids TEXT, -- IDs das unidades escolares relacionadas
    school_ids TEXT, -- IDs das marcas relacionadas
    team_size INTEGER DEFAULT 0,
    target_leads INTEGER DEFAULT 0,
    budget_planned REAL DEFAULT 0,
    budget_executed REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS activation_points (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- 'shopping', 'metro', 'praca', 'parceria'
    address_raw TEXT,
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    flow_intensity REAL, -- 0-1 representação de fluxo
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS activations (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL,
    point_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'planejado', -- 'planejado', 'confirmado', 'concluido'
    team_notes TEXT,
    cost REAL DEFAULT 0,
    impact_leads INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events(id),
    FOREIGN KEY (point_id) REFERENCES activation_points(id)
);
-- Hub de Conteúdo & Performance (NOVO - Fase 6)
CREATE TABLE IF NOT EXISTS hub_brand_library (
    id TEXT PRIMARY KEY,
    school_id TEXT NOT NULL,
    abc_guidelines TEXT,
    tone_of_voice TEXT,
    institutional_differentials TEXT,
    personas TEXT,
    visual_guidelines TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (school_id) REFERENCES schools(id)
);

CREATE TABLE IF NOT EXISTS hub_pipelines (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL, -- 'Social Media', 'Design & Criação', 'Eventos'
    description TEXT,
    stages_json TEXT, -- JSON com os estágios específicos deste quadro
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS hub_content_requests (
    id TEXT PRIMARY KEY,
    school_id TEXT NOT NULL,
    unit_id TEXT,
    pipeline_id TEXT, -- Vínculo com o quadro específico
    requester_name TEXT,
    requester_area TEXT,
    demand_type TEXT NOT NULL, -- 'feed', 'stories', 'reels', 'email', 'whats', 'comunicado'
    channel TEXT, -- 'instagram', 'facebook', 'linkedin', 'ads'
    objective TEXT,
    target_audience TEXT,
    desired_publish_date DATE,
    priority TEXT DEFAULT 'média', -- 'baixa', 'média', 'alta', 'crítica'
    briefing_raw TEXT NOT NULL,
    briefing_ai TEXT,
    ia_legend_options TEXT, -- JSON com as 3 opções
    final_text TEXT,
    design_briefing TEXT,
    attachments TEXT, -- URLs ou caminhos
    status TEXT NOT NULL DEFAULT 'recebida',
    -- Workflow: 'recebida', 'triagem', 'complemento', 'ia', 'conteudo', 'revisao', 'design', 'aprovacao_interna', 'aprovacao_solicitante', 'ajustes', 'aprovada', 'agendada', 'publicada', 'finalizada', 'cancelada'
    responsible_id TEXT,
    social_post_link TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (school_id) REFERENCES schools(id),
    FOREIGN KEY (unit_id) REFERENCES units(id)
);

CREATE TABLE IF NOT EXISTS hub_social_performance (
    id TEXT PRIMARY KEY,
    request_id TEXT NOT NULL,
    recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    reach INTEGER DEFAULT 0,
    impressions INTEGER DEFAULT 0,
    likes INTEGER DEFAULT 0,
    comments INTEGER DEFAULT 0,
    shares INTEGER DEFAULT 0,
    saves INTEGER DEFAULT 0,
    views INTEGER DEFAULT 0,
    followers_gained INTEGER DEFAULT 0,
    FOREIGN KEY (request_id) REFERENCES hub_content_requests(id)
);

CREATE TABLE IF NOT EXISTS hub_ads_performance (
    id TEXT PRIMARY KEY,
    request_id TEXT NOT NULL,
    recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    investment REAL DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    leads INTEGER DEFAULT 0,
    conversions INTEGER DEFAULT 0,
    FOREIGN KEY (request_id) REFERENCES hub_content_requests(id)
);

CREATE INDEX IF NOT EXISTS idx_hub_requests_school ON hub_content_requests(school_id);
CREATE INDEX IF NOT EXISTS idx_hub_requests_status ON hub_content_requests(status);
CREATE INDEX IF NOT EXISTS idx_hub_social_request ON hub_social_performance(request_id);

CREATE TABLE IF NOT EXISTS hub_request_history (
    id TEXT PRIMARY KEY,
    request_id TEXT NOT NULL,
    actor_name TEXT,
    action TEXT NOT NULL, -- 'criacao', 'mudanca_status', 'comentario', 'ajuste'
    description TEXT,
    old_status TEXT,
    new_status TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (request_id) REFERENCES hub_content_requests(id)
);

CREATE INDEX IF NOT EXISTS idx_hub_history_request ON hub_request_history(request_id);

CREATE TABLE IF NOT EXISTS hub_request_comments (
    id TEXT PRIMARY KEY,
    request_id TEXT NOT NULL,
    user_name TEXT,
    text TEXT NOT NULL,
    attachment_url TEXT,
    attachment_name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (request_id) REFERENCES hub_content_requests(id)
);

CREATE INDEX IF NOT EXISTS idx_hub_comments_request ON hub_request_comments(request_id);

-- System Users (NOVO)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT DEFAULT 'user', -- 'admin', 'user', 'requester'
    password_hash TEXT, -- Reservado para futura auth real
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
