import { supabase } from './supabase';
import type { DocumentType, BusinessType } from '@/types/business';
import type { DocumentTemplate as DBTemplate } from '@/types/super-admin';
import { getDocumentTemplate as getHardcodedTemplate } from './document-templates';

export interface DocumentTemplate {
  id: string;
  name: string;
  documentType: DocumentType;
  businessTypes: BusinessType[];
  layout: 'modern' | 'classic' | 'minimal' | 'detailed';
  fields: TemplateField[];
  styling: TemplateStyling;
}

export interface TemplateField {
  id: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'boolean' | 'select';
  required: boolean;
  defaultValue?: string;
  options?: string[];
  businessSpecific?: BusinessType[];
}

export interface TemplateStyling {
  primaryColor: string;
  headerStyle: 'gradient' | 'solid' | 'minimal';
  showLogo: boolean;
  showQRCode: boolean;
  showPaymentTerms: boolean;
  showDeliveryInfo: boolean;
}

/**
 * Fetch document templates from database
 */
export async function fetchDocumentTemplates(
  documentType?: DocumentType,
  businessType?: BusinessType
): Promise<DBTemplate[]> {
  try {
    let query = supabase
      .from('document_templates')
      .select('*')
      .eq('is_active', true);

    if (documentType) {
      query = query.eq('document_type', documentType);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Failed to fetch document templates:', error);
      return [];
    }

    if (!data) return [];

    return data.map((row: any) => ({
      id: row.id,
      name: row.name,
      documentType: row.document_type,
      businessType: row.business_type,
      templateData: row.template_data,
      requiredFields: Array.isArray(row.required_fields) 
        ? row.required_fields 
        : (typeof row.required_fields === 'string' ? JSON.parse(row.required_fields) : []),
      numberingRule: row.numbering_rule,
      isActive: row.is_active,
      version: row.version,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  } catch (error) {
    console.error('Error fetching document templates:', error);
    return [];
  }
}

/**
 * Get document template for a specific document type and business type
 * Falls back to hardcoded templates if database templates are not available
 */
export async function getDocumentTemplate(
  documentType: DocumentType,
  businessType: BusinessType
): Promise<DocumentTemplate> {
  try {
    // Try to fetch from database first
    const dbTemplates = await fetchDocumentTemplates(documentType, businessType);
    
    // Filter by business type if specified
    const matchingTemplate = dbTemplates.find(t => 
      !t.businessType || t.businessType === businessType
    );

    if (matchingTemplate) {
      // Convert database template to app template format
      const templateData = matchingTemplate.templateData || {};
      const requiredFields = matchingTemplate.requiredFields || [];

      return {
        id: matchingTemplate.id,
        name: matchingTemplate.name,
        documentType: matchingTemplate.documentType as DocumentType,
        businessTypes: matchingTemplate.businessType ? [matchingTemplate.businessType as BusinessType] : ['other'],
        layout: templateData.layout || 'modern',
        fields: requiredFields.map((fieldId: string, index: number) => ({
          id: fieldId,
          label: fieldId.charAt(0).toUpperCase() + fieldId.slice(1).replace(/_/g, ' '),
          type: 'text' as const,
          required: true,
        })),
        styling: {
          primaryColor: templateData.primaryColor || '#0066CC',
          headerStyle: (templateData.headerStyle || 'gradient') as 'gradient' | 'solid' | 'minimal',
          showLogo: templateData.showLogo !== false,
          showQRCode: templateData.showQRCode || false,
          showPaymentTerms: templateData.showPaymentTerms !== false,
          showDeliveryInfo: templateData.showDeliveryInfo || false,
        },
      };
    }
  } catch (error) {
    console.error('Error fetching database template, falling back to hardcoded:', error);
  }

  // Fallback to hardcoded templates
  return getHardcodedTemplate(documentType, businessType);
}

