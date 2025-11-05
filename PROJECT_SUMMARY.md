# Boost Lifestyle - WhatsApp Customer Service Platform

## Overview
A comprehensive customer service management system integrated with WhatsApp Business API, Shopify, and AI-powered chatbot (Zaara).

## Tech Stack
- **Frontend**: React + TypeScript + Vite + TailwindCSS
- **Backend**: Lovable Cloud (Supabase-powered)
  - Database: PostgreSQL
  - Edge Functions: Deno runtime
  - Authentication: Built-in auth system
- **Integrations**:
  - WhatsApp Business API
  - Shopify (products, orders, customers)
  - OpenAI GPT for AI chatbot

## Project Structure

### Frontend Pages
- `/` - Dashboard with stats overview
- `/inbox` - WhatsApp message management
- `/customers` - Customer database with stats
- `/orders` - Order management with stats
- `/products` - Product catalog
- `/ai-management` - AI chatbot configuration
- `/warranty` - Warranty management
- `/faqs` - FAQ management
- `/analytics` - Analytics dashboard
- `/settings` - System configuration

### Backend (Edge Functions)

#### `whatsapp-webhook`
- **Purpose**: Receives incoming WhatsApp messages from Meta
- **Method**: GET (verification), POST (messages)
- **Security**: Public endpoint (no JWT) - Meta webhook verification
- **Flow**:
  1. Receives message from WhatsApp
  2. Saves to `chat_history` table
  3. Invokes `process-zaara-message` for AI response

#### `process-zaara-message`
- **Purpose**: AI-powered message processing and response
- **Method**: POST
- **Features**:
  - Customer intent detection
  - Order/product information lookup
  - FAQ search
  - Automated responses via OpenAI GPT
  - Sends response via WhatsApp Business API

#### `send-whatsapp-message`
- **Purpose**: Send messages through WhatsApp Business API
- **Method**: POST
- **Features**: Template messages, text messages, media support

#### `sync-shopify-orders`
- **Purpose**: Sync orders from Shopify
- **Method**: POST
- **Features**: 
  - Background processing to avoid CPU timeout
  - Batch processing (250 orders/batch)
  - Incremental sync support
  - Phone number standardization

#### `sync-shopify-customers`
- **Purpose**: Sync customers from Shopify
- **Method**: POST
- **Features**:
  - Batch processing (500 customers/batch)
  - Deduplication by phone number
  - Incremental sync support

#### `sync-shopify-products`
- **Purpose**: Sync products from Shopify
- **Method**: POST
- **Features**: Product catalog synchronization

## Database Schema

### Key Tables

#### `chat_history`
- WhatsApp conversation logs
- Fields: phone_number, content, direction, sent_by, message_type, status

#### `customers`
- Customer database synced from Shopify
- Fields: phone_number, name, email, total_spend, order_count, tags

#### `shopify_orders`
- Orders synced from Shopify
- Fields: order_id, customer_phone, total_price, fulfillment_status, line_items

#### `shopify_products`
- Product catalog
- Fields: product_id, title, description, price, inventory, images

#### `faq_vectors`
- FAQ database with search capability
- Fields: question, answer, category, keywords, video_urls, image_urls

#### `system_settings`
- Configuration storage
- Fields: setting_key, setting_value, is_encrypted

#### `message_analytics`
- Daily message statistics
- Fields: date, inbound_count, outbound_count, zaara_handled, human_handled

### Database Functions

#### `search_faqs(search_term, result_limit)`
- Full-text FAQ search with relevance scoring
- Returns matching FAQs ordered by relevance

#### `increment_message_count(date, direction, handler)`
- Updates daily message analytics

## Configuration

### Required Secrets (in system_settings table)
- `whatsapp_phone_id`: WhatsApp Business phone ID
- `whatsapp_access_token`: Meta access token
- `whatsapp_business_account_id`: Business account ID
- `whatsapp_phone_number`: Phone number (923288981133)
- `openai_api_key`: OpenAI API key for GPT
- `shopify_store_url`: Shopify store URL
- `shopify_access_token`: Shopify API token

### WhatsApp Webhook Configuration
- **URL**: `https://szralwiwcilltwmxxczq.supabase.co/functions/v1/whatsapp-webhook`
- **Verify Token**: `boost_webhook_verify_2025_secure`
- **Subscribed Fields**: `messages`, `account_alerts`

## Key Features

### AI Chatbot (Zaara)
- Automated customer service responses
- Order tracking lookup
- Product information
- FAQ answers
- Intent-based routing (human handoff for complex queries)

### Customer Management
- Synced from Shopify
- Stats: Total customers, new this month, total orders, total revenue
- Search and filter capabilities

### Order Management
- Real-time sync from Shopify
- Stats: Total orders, pending, fulfilled, this month
- Order details with line items and tracking

### Product Catalog
- Synced from Shopify
- Product details, pricing, inventory
- Image galleries

### Analytics
- Message volume tracking
- AI vs human handling ratio
- Daily statistics

## Deployment
- **Frontend**: Auto-deployed via Lovable
- **Backend**: Edge functions auto-deployed on code push
- **Database**: Managed by Lovable Cloud (Supabase)

## Current Status
- WhatsApp integration: Configured, webhook setup in progress
- Shopify integration: Active with background sync
- AI chatbot: Operational with OpenAI GPT
- Database: Fully configured with RLS policies
- Frontend: All pages implemented with stats cards

## Recent Updates
1. Added stats cards to Customers page (total, new this month, orders, revenue)
2. Added stats cards to Orders page (total, pending, fulfilled, this month)
3. Fixed order sync CPU timeout with background processing
4. Fixed customer sync deduplication issues
5. Made webhook endpoint public for Meta verification
