const ESCAPE_MAP = {
  '<': '&lt;',
  '>': '&gt;',
  '&': '&amp;',
  '"': '&quot;',
  "'": '&#39;',
} as const;

export const sanitize = (str: unknown): string => {
  if (typeof str !== "string") return '';
  return str.replace(/[<>&"']/g, (m: string): string => 
    ESCAPE_MAP[m as keyof typeof ESCAPE_MAP]
  );
};
