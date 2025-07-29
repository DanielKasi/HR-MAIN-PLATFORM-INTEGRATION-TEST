import { IDocumentTemplate, IGeneratedDocumentTemplate, DocumentGenerationContext } from "@/app/types/types.utils";

export const getDocumentTemplates = async ({
  institutionId,
}: {
  institutionId: number;
}): Promise<IDocumentTemplate[]> => {
  try {
    const response = await fetch(`/api/documents/templates/?institution=${institutionId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch document templates');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching document templates:', error);
    return [];
  }
};

export const generateDocument = async ({
  templateId,
  context,
  contextId,
  placeholders,
}: {
  templateId: number;
  context: DocumentGenerationContext;
  contextId: number;
  placeholders?: { [key: string]: string };
}): Promise<IGeneratedDocumentTemplate | null> => {
  try {
    const queryParams = new URLSearchParams({
      context,
      context_id: contextId.toString(),
    });

    const endpoint = `/api/documents/generate-document/${templateId}/?${queryParams}`;
    
    if (!placeholders) {
      // GET request to fetch template with placeholders
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch document template placeholders');
      }

      return await response.json();
    } else {
      // POST request to generate document
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          context,
          context_id: contextId,
          placeholders,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate document');
      }

      return await response.json();
    }
  } catch (error) {
    console.error('Error generating document:', error);
    return null;
  }
};
