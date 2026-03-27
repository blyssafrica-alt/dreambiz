-- Seed default supplier email templates
-- Run after admin_mailing_schema.sql
-- Safe to run multiple times (skips if name exists)

INSERT INTO public.email_templates (name, html, variables, created_at)
SELECT 'Supplier Approved', '<h1>You''re approved</h1><p>Hi {{first_name}},</p><p>Your supplier application has been approved. Complete your store and add your first products to start getting buyer enquiries.</p><p><a href="https://dreambiz.app/supplier" style="background:#0EA5E9;color:#fff;padding:12px 24px;text-decoration:none;border-radius:8px;">Open Supplier Dashboard</a></p><p>Best,<br/>DreamBiz</p><hr/><p style="font-size:11px;color:#888;"><a href="{{unsubscribe_url}}">Unsubscribe</a></p>', '["first_name","business_name","unsubscribe_url"]'::jsonb, NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.email_templates WHERE name = 'Supplier Approved');

INSERT INTO public.email_templates (name, html, variables, created_at)
SELECT 'Approved but No Products', '<h1>Add your first 10 products</h1><p>Hi {{first_name}},</p><p>Your store is live - the next step is products. Add at least 10 listings so buyers can find you.</p><p><a href="https://dreambiz.app/supplier/products" style="background:#0EA5E9;color:#fff;padding:12px 24px;text-decoration:none;border-radius:8px;">Add Products</a></p><p>Best,<br/>DreamBiz</p><hr/><p style="font-size:11px;color:#888;"><a href="{{unsubscribe_url}}">Unsubscribe</a></p>', '["first_name","business_name","unsubscribe_url"]'::jsonb, NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.email_templates WHERE name = 'Approved but No Products');

INSERT INTO public.email_templates (name, html, variables, created_at)
SELECT 'No Enquiries in 14 Days', '<h1>Want more enquiries?</h1><p>Hi {{first_name}},</p><p>We noticed low enquiries recently. Here are 3 quick improvements:</p><ul><li>Better product photos</li><li>Clearer pricing</li><li>Right categories and tags</li></ul><p><a href="https://dreambiz.app/supplier/products" style="background:#0EA5E9;color:#fff;padding:12px 24px;text-decoration:none;border-radius:8px;">Improve Listings</a></p><p>Best,<br/>DreamBiz</p><hr/><p style="font-size:11px;color:#888;"><a href="{{unsubscribe_url}}">Unsubscribe</a></p>', '["first_name","business_name","unsubscribe_url"]'::jsonb, NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.email_templates WHERE name = 'No Enquiries in 14 Days');

INSERT INTO public.email_templates (name, html, variables, created_at)
SELECT 'Free Month Ending', '<h1>Your free month ends in {{days_left}} days</h1><p>Hi {{first_name}},</p><p>Keep your store visible to buyers by upgrading your supplier plan.</p><p><a href="https://dreambiz.app/supplier/subscription" style="background:#0EA5E9;color:#fff;padding:12px 24px;text-decoration:none;border-radius:8px;">Upgrade Plan</a></p><p>Best,<br/>DreamBiz</p><hr/><p style="font-size:11px;color:#888;"><a href="{{unsubscribe_url}}">Unsubscribe</a></p>', '["first_name","business_name","days_left","unsubscribe_url"]'::jsonb, NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.email_templates WHERE name = 'Free Month Ending');

INSERT INTO public.email_templates (name, html, variables, created_at)
SELECT 'Ads Upsell', '<h1>Promote your store to more buyers</h1><p>Hi {{first_name}},</p><p>Boost visibility with DreamBiz ads - promote your store or specific products.</p><p><a href="https://dreambiz.app/supplier/ads" style="background:#0EA5E9;color:#fff;padding:12px 24px;text-decoration:none;border-radius:8px;">Create an Ad</a></p><p>Best,<br/>DreamBiz</p><hr/><p style="font-size:11px;color:#888;"><a href="{{unsubscribe_url}}">Unsubscribe</a></p>', '["first_name","business_name","unsubscribe_url"]'::jsonb, NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.email_templates WHERE name = 'Ads Upsell');
