import { INestApplication } from '@nestjs/common';

// Optional Swagger imports - will be available after npm install
let DocumentBuilder: any;
let SwaggerModule: any;

try {
  const swagger = require('@nestjs/swagger');
  DocumentBuilder = swagger.DocumentBuilder;
  SwaggerModule = swagger.SwaggerModule;
} catch (e) {
  // Swagger not installed yet
}

export function setupSwagger(app: INestApplication) {
  if (!DocumentBuilder || !SwaggerModule) {
    throw new Error(
      '@nestjs/swagger is not installed. Run: npm install @nestjs/swagger swagger-ui-express --legacy-peer-deps',
    );
  }

  const config = new DocumentBuilder()
    .setTitle('Team Connect API')
    .setDescription(
      'Team Connect - Complete WFH Collaboration Platform API Documentation',
    )
    .setVersion('1.0')
    .addTag('auth', 'Authentication endpoints')
    .addTag('users', 'User management')
    .addTag('teams', 'Team management')
    .addTag('meetings', 'Meeting management and video conferencing')
    .addTag('tasks', 'Task management and Kanban')
    .addTag('messages', 'Real-time messaging and chat')
    .addTag('channels', 'Channel management')
    .addTag('notifications', 'Notification system')
    .addTag('workflows', 'Workflow automation')
    .addTag('wiki', 'Knowledge base and wiki')
    .addTag('drive', 'File storage and document management')
    .addTag('calendar', 'Calendar and scheduling')
    .addTag('reports', 'Analytics and reports')
    .addTag('standups', 'Daily standup management')
    .addTag('announcements', 'Announcement system')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth', // This name here is important for matching up with @ApiBearerAuth() in your controller!
    )
    .addServer('http://localhost:3000', 'Local development')
    .addServer('https://api.teamconnect.com', 'Production')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
      tryItOutEnabled: true,
      requestSnippetsEnabled: true,
      defaultModelsExpandDepth: 3,
      defaultModelExpandDepth: 3,
      docExpansion: 'list',
      filter: true,
      showExtensions: true,
      showCommonExtensions: true,
      displayRequestDuration: true,
      showMutatedRequest: true,
    },
    customSiteTitle: 'Team Connect API Documentation',
    customfavIcon: '/favicon.ico',
    customCss: `
      /* ============================================
         MODERN DARK THEME SWAGGER UI
         Professional, Easy to Read, High Contrast
         ============================================ */
      
      /* Hide topbar */
      .swagger-ui .topbar { display: none !important; }
      
      /* Base container - Dark theme */
      .swagger-ui { 
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', Roboto, 'Helvetica Neue', Arial, sans-serif;
        background: #0f172a;
        color: #e2e8f0;
      }
      
      body { background: #0f172a !important; }
      
      /* ========== INFO SECTION ========== */
      .swagger-ui .info { 
        margin: 24px 0;
        padding: 32px;
        background: linear-gradient(135deg, #1e40af 0%, #312e81 100%);
        border-radius: 12px;
        color: #ffffff;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
        border: 1px solid #334155;
      }
      
      .swagger-ui .info .title {
        color: #ffffff !important;
        font-size: 2.25em;
        font-weight: 700;
        margin-bottom: 16px;
        line-height: 1.2;
        letter-spacing: -0.02em;
      }
      
      .swagger-ui .info .description {
        color: rgba(255, 255, 255, 0.95) !important;
        font-size: 1.05em;
        line-height: 1.7;
        margin-top: 12px;
      }
      
      .swagger-ui .info .base-url {
        color: rgba(255, 255, 255, 0.9) !important;
        font-size: 0.95em;
        font-weight: 500;
      }
      
      /* ========== SCHEME CONTAINER ========== */
      .swagger-ui .scheme-container { 
        background: #1e293b; 
        padding: 20px 24px; 
        margin: 24px 0; 
        border-radius: 10px;
        border: 1px solid #334155;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      }
      
      .swagger-ui .scheme-container label {
        color: #e2e8f0 !important;
      }
      
      /* ========== TAGS SECTION ========== */
      .swagger-ui .opblock-tag {
        font-size: 1.5em;
        font-weight: 700;
        margin: 48px 0 24px 0;
        padding-bottom: 16px;
        border-bottom: 3px solid #3b82f6;
        color: #e2e8f0;
        letter-spacing: -0.01em;
      }
      
      .swagger-ui .opblock-tag small {
        color: #94a3b8 !important;
      }
      
      /* ========== OPERATION BLOCKS ========== */
      .swagger-ui .opblock {
        border-radius: 10px;
        margin-bottom: 24px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        transition: all 0.25s ease;
        border: 1px solid #334155;
        background: #1e293b;
      }
      
      .swagger-ui .opblock:hover {
        box-shadow: 0 8px 24px rgba(0,0,0,0.5);
        transform: translateY(-2px);
        border-color: #475569;
      }
      
      .swagger-ui .opblock.opblock-post {
        border-left: 4px solid #10b981;
      }
      
      .swagger-ui .opblock.opblock-get {
        border-left: 4px solid #3b82f6;
      }
      
      .swagger-ui .opblock.opblock-patch {
        border-left: 4px solid #f59e0b;
      }
      
      .swagger-ui .opblock.opblock-delete {
        border-left: 4px solid #ef4444;
      }
      
      .swagger-ui .opblock-summary {
        padding: 16px 24px;
        background: #1e293b;
        border-bottom: 1px solid #334155;
      }
      
      .swagger-ui .opblock-summary-path {
        color: #e2e8f0 !important;
        font-weight: 600;
      }
      
      .swagger-ui .opblock-summary-description {
        color: #94a3b8 !important;
      }
      
      .swagger-ui .opblock-summary-method {
        border-radius: 6px;
        font-weight: 700;
        padding: 6px 12px;
        font-size: 12px;
        letter-spacing: 0.5px;
        text-transform: uppercase;
      }
      
      .swagger-ui .opblock-summary-method.post {
        background: #10b981;
        color: #ffffff;
      }
      
      .swagger-ui .opblock-summary-method.get {
        background: #3b82f6;
        color: #ffffff;
      }
      
      .swagger-ui .opblock-summary-method.patch {
        background: #f59e0b;
        color: #ffffff;
      }
      
      .swagger-ui .opblock-summary-method.delete {
        background: #ef4444;
        color: #ffffff;
      }
      
      /* ========== RESPONSES SECTION ========== */
      .swagger-ui .responses-wrapper {
        padding: 20px 24px;
        background: #1e293b;
      }
      
      .swagger-ui .responses-inner {
        padding: 0;
      }
      
      .swagger-ui .response {
        margin: 0;
        padding: 0;
        border: none;
      }
      
      .swagger-ui .response-col_status {
        font-weight: 700;
        font-size: 15px;
        width: 100px;
        padding: 12px 16px;
        background: #0f172a;
        border-right: 2px solid #334155;
        color: #e2e8f0;
      }
      
      .swagger-ui .response-col_status[data-code="200"],
      .swagger-ui .response-col_status[data-code="201"] {
        color: #10b981;
        background: #064e3b;
      }
      
      .swagger-ui .response-col_status[data-code="400"],
      .swagger-ui .response-col_status[data-code="401"],
      .swagger-ui .response-col_status[data-code="403"],
      .swagger-ui .response-col_status[data-code="404"] {
        color: #ef4444;
        background: #7f1d1d;
      }
      
      .swagger-ui .response-col_description {
        color: #e2e8f0;
        font-size: 14px;
        padding: 12px 16px;
        background: #1e293b;
      }
      
      .swagger-ui .response-table {
        width: 100%;
        border-collapse: collapse;
        border: 1px solid #334155;
        border-radius: 8px;
        overflow: hidden;
        background: #1e293b;
      }
      
      .swagger-ui .response-table thead {
        background: #0f172a;
      }
      
      .swagger-ui .response-table thead th {
        padding: 14px 16px;
        text-align: left;
        font-weight: 700;
        color: #e2e8f0;
        font-size: 13px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        border-bottom: 2px solid #334155;
      }
      
      .swagger-ui .response-table tbody tr {
        border-bottom: 1px solid #334155;
        transition: background 0.15s ease;
      }
      
      .swagger-ui .response-table tbody tr:hover {
        background: #334155;
      }
      
      .swagger-ui .response-table tbody tr:last-child {
        border-bottom: none;
      }
      
      .swagger-ui .response-table tbody td {
        padding: 14px 16px;
        vertical-align: middle;
        color: #e2e8f0;
      }
      
      /* ========== INPUT FIELDS ========== */
      .swagger-ui input[type="text"],
      .swagger-ui input[type="email"],
      .swagger-ui input[type="password"],
      .swagger-ui input[type="number"],
      .swagger-ui textarea,
      .swagger-ui select {
        border-radius: 8px;
        border: 2px solid #334155;
        padding: 10px 14px;
        font-size: 14px;
        transition: all 0.2s ease;
        background: #0f172a;
        color: #e2e8f0;
        font-family: inherit;
      }
      
      .swagger-ui input[type="text"]:focus,
      .swagger-ui input[type="email"]:focus,
      .swagger-ui input[type="password"]:focus,
      .swagger-ui input[type="number"]:focus,
      .swagger-ui textarea:focus,
      .swagger-ui select:focus {
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
        outline: none;
        background: #1e293b;
      }
      
      /* ========== PARAMETERS ========== */
      .swagger-ui .parameters-container {
        padding: 20px 24px;
        background: #1e293b;
      }
      
      .swagger-ui .parameter__name {
        font-weight: 700;
        color: #e2e8f0;
        font-size: 14px;
      }
      
      .swagger-ui .parameter__type {
        color: #60a5fa;
        font-weight: 600;
        font-size: 13px;
        background: #1e3a8a;
        padding: 2px 8px;
        border-radius: 4px;
      }
      
      .swagger-ui .parameter__in {
        color: #94a3b8;
        font-size: 12px;
        font-weight: 500;
      }
      
      .swagger-ui .parameter__description {
        color: #cbd5e1;
        font-size: 13px;
        margin-top: 6px;
        line-height: 1.6;
      }
      
      /* ========== BUTTONS ========== */
      .swagger-ui .btn.execute {
        background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
        border: none;
        border-radius: 8px;
        padding: 12px 28px;
        font-weight: 700;
        font-size: 14px;
        transition: all 0.2s ease;
        box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
        color: #ffffff;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      
      .swagger-ui .btn.execute:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 16px rgba(59, 130, 246, 0.5);
        background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
      }
      
      .swagger-ui .btn.execute:active {
        transform: translateY(0);
      }
      
      .swagger-ui .btn.authorize {
        background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
        border: none;
        border-radius: 8px;
        color: #ffffff;
        padding: 10px 24px;
        font-weight: 700;
        font-size: 14px;
        transition: all 0.2s ease;
        box-shadow: 0 4px 10px rgba(59, 130, 246, 0.4);
      }
      
      .swagger-ui .btn.authorize:hover {
        background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
        transform: translateY(-1px);
        box-shadow: 0 6px 14px rgba(59, 130, 246, 0.5);
      }
      
      .swagger-ui .btn.try-out__btn {
        border-radius: 8px;
        padding: 10px 20px;
        font-weight: 600;
        transition: all 0.2s ease;
        border: 2px solid #334155;
        background: #1e293b;
        color: #e2e8f0;
      }
      
      .swagger-ui .btn.try-out__btn:hover {
        background: #334155;
        border-color: #3b82f6;
        color: #60a5fa;
      }
      
      /* ========== TABLES ========== */
      .swagger-ui table {
        border-radius: 8px;
        overflow: hidden;
        border: 1px solid #334155;
        background: #1e293b;
      }
      
      .swagger-ui table thead tr {
        background: #0f172a;
      }
      
      .swagger-ui table thead th {
        padding: 14px 16px;
        font-weight: 700;
        color: #e2e8f0;
        border-bottom: 2px solid #334155;
        font-size: 13px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      
      .swagger-ui table tbody tr {
        border-bottom: 1px solid #334155;
        transition: background 0.15s ease;
      }
      
      .swagger-ui table tbody tr:hover {
        background: #334155;
      }
      
      .swagger-ui table tbody tr:last-child {
        border-bottom: none;
      }
      
      .swagger-ui table tbody td {
        padding: 14px 16px;
        color: #e2e8f0;
        font-size: 14px;
      }
      
      /* ========== CODE BLOCKS ========== */
      .swagger-ui .highlight-code {
        border-radius: 8px;
        background: #0f172a;
        color: #e2e8f0;
        padding: 20px;
        overflow-x: auto;
        border: 1px solid #334155;
      }
      
      .swagger-ui .microlight {
        font-family: 'Monaco', 'Menlo', 'Fira Code', 'Ubuntu Mono', monospace;
        font-size: 13px;
        line-height: 1.6;
        color: #e2e8f0;
      }
      
      /* ========== SCHEMAS SECTION HEADER ========== */
      .swagger-ui .models {
        margin-top: 48px;
        padding: 0;
      }
      
      .swagger-ui .models h4 {
        font-size: 2em;
        font-weight: 800;
        color: #e2e8f0 !important;
        margin-bottom: 32px;
        padding-bottom: 16px;
        border-bottom: 4px solid #3b82f6;
        text-transform: uppercase;
        letter-spacing: 1px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      }
      
      .swagger-ui .models-control {
        margin-bottom: 24px;
      }
      
      /* ========== MODEL BOXES ========== */
      .swagger-ui .model-box {
        border-radius: 12px;
        border: 2px solid #334155;
        background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
        padding: 28px;
        margin: 24px 0;
        box-shadow: 0 4px 16px rgba(0,0,0,0.4);
        transition: all 0.3s ease;
        position: relative;
        overflow: hidden;
      }
      
      .swagger-ui .model-box::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 4px;
        background: linear-gradient(90deg, #3b82f6, #8b5cf6, #ec4899);
        opacity: 0;
        transition: opacity 0.3s ease;
      }
      
      .swagger-ui .model-box:hover {
        border-color: #475569;
        box-shadow: 0 8px 24px rgba(0,0,0,0.5);
        transform: translateY(-3px);
      }
      
      .swagger-ui .model-box:hover::before {
        opacity: 1;
      }
      
      .swagger-ui .model-box-control {
        color: #60a5fa !important;
        font-weight: 700;
        font-size: 16px;
        padding: 8px 12px;
        background: #0f172a;
        border-radius: 6px;
        border: 1px solid #334155;
        transition: all 0.2s ease;
      }
      
      .swagger-ui .model-box-control:hover {
        background: #1e293b;
        border-color: #60a5fa;
        color: #93c5fd !important;
      }
      
      /* ========== MODEL TITLE ========== */
      .swagger-ui .model-title {
        color: #e2e8f0 !important;
        font-size: 1.4em;
        font-weight: 700;
        margin-bottom: 16px;
        padding-bottom: 12px;
        border-bottom: 2px solid #334155;
        font-family: 'Monaco', 'Menlo', 'Fira Code', monospace;
      }
      
      .swagger-ui .model-title__text {
        color: #60a5fa !important;
      }
      
      /* ========== PROPERTIES ========== */
      .swagger-ui .property-row {
        padding: 16px 20px;
        margin: 10px 0;
        border-radius: 10px;
        background: #0f172a;
        border-left: 5px solid #334155;
        border: 1px solid #334155;
        transition: all 0.25s ease;
        display: flex;
        flex-wrap: wrap;
        align-items: flex-start;
        gap: 12px;
      }
      
      .swagger-ui .property-row:hover {
        background: #1e293b;
        border-color: #3b82f6;
        border-left-color: #3b82f6;
        transform: translateX(6px);
        box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
      }
      
      .swagger-ui .property {
        color: #cbd5e1 !important;
        font-size: 14px;
        line-height: 1.8;
        width: 100%;
      }
      
      .swagger-ui .property-name {
        color: #60a5fa !important;
        font-weight: 700;
        font-size: 16px;
        font-family: 'Monaco', 'Menlo', 'Fira Code', monospace;
        margin-right: 12px;
        display: inline-block;
        padding: 4px 0;
      }
      
      .swagger-ui .property-name.required {
        color: #fbbf24 !important;
        position: relative;
      }
      
      .swagger-ui .property-name.required::before {
        content: '●';
        color: #ef4444;
        font-weight: 900;
        margin-right: 6px;
        font-size: 12px;
        vertical-align: middle;
      }
      
      .swagger-ui .property-type {
        color: #10b981 !important;
        font-weight: 700;
        font-size: 13px;
        background: linear-gradient(135deg, #064e3b 0%, #065f46 100%);
        padding: 5px 12px;
        border-radius: 6px;
        margin-left: 8px;
        font-family: 'Monaco', 'Menlo', 'Fira Code', monospace;
        display: inline-block;
        border: 1px solid #047857;
        box-shadow: 0 2px 4px rgba(16, 185, 129, 0.2);
      }
      
      .swagger-ui .property-enum {
        color: #f59e0b !important;
        font-weight: 600;
        background: #78350f;
        padding: 3px 8px;
        border-radius: 4px;
        margin-left: 8px;
        font-size: 12px;
      }
      
      /* ========== PROPERTY DESCRIPTION ========== */
      .swagger-ui .property-description {
        color: #cbd5e1 !important;
        font-size: 14px;
        margin-top: 12px;
        padding: 12px 16px;
        background: #0a0f1a;
        border-radius: 6px;
        line-height: 1.7;
        border-left: 3px solid #475569;
        width: 100%;
      }
      
      /* ========== PROPERTY EXAMPLE ========== */
      .swagger-ui .property-example {
        margin-top: 12px;
        padding: 10px 16px;
        background: #0a0f1a;
        border-radius: 6px;
        width: 100%;
      }
      
      .swagger-ui .property-example-value {
        color: #60a5fa !important;
        font-family: 'Monaco', 'Menlo', 'Fira Code', monospace;
        font-size: 13px;
        font-weight: 600;
        background: #1e3a8a;
        padding: 6px 10px;
        border-radius: 4px;
        display: inline-block;
        border: 1px solid #3b82f6;
      }
      
      .swagger-ui .renderedMarkdown {
        color: #cbd5e1 !important;
      }
      
      .swagger-ui .renderedMarkdown p {
        color: #cbd5e1 !important;
        margin: 6px 0;
        line-height: 1.7;
      }
      
      .swagger-ui .renderedMarkdown code {
        background: #0f172a;
        color: #60a5fa;
        padding: 2px 6px;
        border-radius: 3px;
        font-family: 'Monaco', 'Menlo', 'Fira Code', monospace;
        font-size: 12px;
        border: 1px solid #334155;
      }
      
      /* ========== NESTED OBJECTS ========== */
      .swagger-ui .model-jump-to-path {
        color: #60a5fa !important;
        font-weight: 600;
        text-decoration: none;
        transition: color 0.2s ease;
      }
      
      .swagger-ui .model-jump-to-path:hover {
        color: #93c5fd !important;
        text-decoration: underline;
      }
      
      /* ========== PROPERTY CONSTRAINTS ========== */
      .swagger-ui .prop-constraint {
        color: #f59e0b !important;
        font-size: 12px;
        background: #78350f;
        padding: 2px 6px;
        border-radius: 3px;
        margin-left: 8px;
        font-weight: 600;
      }
      
      /* ========== SCHEMA COLLAPSIBLE ========== */
      .swagger-ui .model-toggle {
        color: #60a5fa !important;
        font-size: 18px;
        transition: transform 0.2s ease;
      }
      
      .swagger-ui .model-toggle:hover {
        color: #93c5fd !important;
        transform: scale(1.1);
      }
      
      /* ========== SCHEMA TREE VIEW ========== */
      .swagger-ui .model-container {
        margin-left: 0;
        padding-left: 0;
      }
      
      .swagger-ui .model-container .model-box {
        margin-left: 0;
      }
      
      /* ========== PROPERTY NESTING ========== */
      .swagger-ui .model-container .model-container {
        margin-left: 24px;
        margin-top: 12px;
        padding-left: 16px;
        border-left: 2px solid #334155;
      }
      
      .swagger-ui .model-container .model-container .property-row {
        background: #0a0f1a;
      }
      
      /* ========== SCHEMA BADGES ========== */
      .swagger-ui .prop-format {
        color: #94a3b8 !important;
        font-size: 11px;
        font-style: italic;
        margin-left: 6px;
      }
      
      /* ========== REQUIRED FIELDS INDICATOR ========== */
      .swagger-ui .model-box .required {
        color: #ef4444 !important;
        font-weight: 700;
        margin-left: 4px;
      }
      
      /* ========== SCHEMA SUMMARY ========== */
      .swagger-ui .model-box-control-wrapper {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 16px;
        padding-bottom: 12px;
        border-bottom: 1px solid #334155;
      }
      
      /* ========== ARRAY INDICATORS ========== */
      .swagger-ui .prop-format[title*="array"],
      .swagger-ui .prop-type[title*="array"] {
        color: #a855f7 !important;
        background: #581c87;
      }
      
      /* ========== OBJECT INDICATORS ========== */
      .swagger-ui .prop-type[title*="object"] {
        color: #3b82f6 !important;
        background: #1e3a8a;
      }
      
      /* ========== STRING INDICATORS ========== */
      .swagger-ui .prop-type[title*="string"] {
        color: #10b981 !important;
        background: #064e3b;
      }
      
      /* ========== NUMBER INDICATORS ========== */
      .swagger-ui .prop-type[title*="number"],
      .swagger-ui .prop-type[title*="integer"] {
        color: #f59e0b !important;
        background: #78350f;
      }
      
      /* ========== BOOLEAN INDICATORS ========== */
      .swagger-ui .prop-type[title*="boolean"] {
        color: #ec4899 !important;
        background: #831843;
      }
      
      /* ========== SCHEMA EXPAND/COLLAPSE ========== */
      .swagger-ui .model-toggle.collapsed {
        transform: rotate(-90deg);
      }
      
      /* ========== SCHEMA CONTENT ========== */
      .swagger-ui .model-jump-to-path {
        display: inline-block;
        margin-left: 8px;
      }
      
      /* ========== PROPERTY TABLE ========== */
      .swagger-ui .model-box table {
        width: 100%;
        border-collapse: separate;
        border-spacing: 0;
      }
      
      .swagger-ui .model-box table tbody tr {
        background: #0f172a;
        border-bottom: 1px solid #334155;
      }
      
      .swagger-ui .model-box table tbody tr:hover {
        background: #1e293b;
      }
      
      .swagger-ui .model-box table tbody td {
        padding: 12px 16px;
        color: #cbd5e1;
        vertical-align: top;
      }
      
      .swagger-ui .model-box table tbody td:first-child {
        font-weight: 700;
        color: #60a5fa;
        font-family: 'Monaco', 'Menlo', 'Fira Code', monospace;
        width: 30%;
      }
      
      .swagger-ui .model-box table tbody td:nth-child(2) {
        color: #10b981;
        font-weight: 600;
        font-family: 'Monaco', 'Menlo', 'Fira Code', monospace;
        width: 20%;
      }
      
      .swagger-ui .model-box table tbody td:nth-child(3) {
        color: #94a3b8;
        font-size: 13px;
        width: 50%;
      }
      
      /* ========== EXAMPLE VALUES ========== */
      .swagger-ui .example-value {
        background: #0f172a;
        padding: 6px 10px;
        border-radius: 6px;
        font-family: 'Monaco', 'Menlo', 'Fira Code', 'Ubuntu Mono', monospace;
        color: #60a5fa;
        font-weight: 600;
        font-size: 12px;
        border: 1px solid #334155;
      }
      
      /* ========== SCROLLBAR ========== */
      .swagger-ui ::-webkit-scrollbar {
        width: 12px;
        height: 12px;
      }
      
      .swagger-ui ::-webkit-scrollbar-track {
        background: #1e293b;
        border-radius: 6px;
      }
      
      .swagger-ui ::-webkit-scrollbar-thumb {
        background: #475569;
        border-radius: 6px;
        border: 2px solid #1e293b;
      }
      
      .swagger-ui ::-webkit-scrollbar-thumb:hover {
        background: #64748b;
      }
      
      /* ========== MARKDOWN ========== */
      .swagger-ui .markdown p {
        margin: 10px 0;
        line-height: 1.7;
        color: #e2e8f0;
      }
      
      .swagger-ui .markdown code {
        background: #0f172a;
        padding: 3px 8px;
        border-radius: 4px;
        font-family: 'Monaco', 'Menlo', 'Fira Code', 'Ubuntu Mono', monospace;
        font-size: 12px;
        color: #60a5fa;
        font-weight: 600;
        border: 1px solid #334155;
      }
      
      /* ========== OPERATION DESCRIPTION ========== */
      .swagger-ui .opblock-description-wrapper {
        padding: 20px 24px;
        color: #cbd5e1;
        font-size: 14px;
        line-height: 1.7;
        background: #0f172a;
        border-top: 1px solid #334155;
      }
      
      /* ========== REQUEST BODY ========== */
      .swagger-ui .request-body {
        padding: 20px 24px;
        background: #1e293b;
      }
      
      .swagger-ui .request-body-content-type {
        margin-bottom: 16px;
        font-weight: 700;
        color: #e2e8f0;
        font-size: 14px;
      }
      
      /* ========== RESPONSE CONTENT TYPE ========== */
      .swagger-ui .response-content-type {
        margin-top: 16px;
        font-size: 13px;
        color: #94a3b8;
        font-weight: 600;
      }
      
      /* ========== LOADING ========== */
      .swagger-ui .loading-container {
        padding: 40px;
        text-align: center;
      }
      
      /* ========== BUTTON GROUP ========== */
      .swagger-ui .btn-group {
        display: flex;
        gap: 12px;
        align-items: center;
        flex-wrap: wrap;
      }
      
      /* ========== TEXT COLORS ========== */
      .swagger-ui .opblock-summary-path,
      .swagger-ui .opblock-summary-operation-id,
      .swagger-ui .opblock-summary-description {
        color: #e2e8f0 !important;
      }
      
      .swagger-ui h4,
      .swagger-ui h5 {
        color: #e2e8f0 !important;
      }
      
      .swagger-ui label {
        color: #cbd5e1 !important;
      }
      
      /* ========== FIXES ========== */
      .swagger-ui .response .response-col_description__inner {
        padding: 0;
      }
      
      /* Override all white backgrounds */
      .swagger-ui .opblock.opblock-post .opblock-summary,
      .swagger-ui .opblock.opblock-get .opblock-summary,
      .swagger-ui .opblock.opblock-patch .opblock-summary,
      .swagger-ui .opblock.opblock-delete .opblock-summary {
        background: #1e293b !important;
      }
      
      .swagger-ui .opblock-body {
        background: #1e293b !important;
      }
      
      .swagger-ui .opblock-section {
        background: #1e293b !important;
      }
    `,
  });

  return document;
}
