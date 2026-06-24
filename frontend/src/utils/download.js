import { API_ORIGIN } from '../services/api';

export async function downloadFile(fileUrl, fileName = 'document') {
  const fullUrl = fileUrl.startsWith('http') ? fileUrl : `${API_ORIGIN}${fileUrl}`;
  try {
    const res = await fetch(fullUrl);
    if (!res.ok) throw new Error('Download failed');
    const blob = await res.blob();
    const ext = fileUrl.match(/\.(\w+)$/)?.[1] || blob.type.split('/')[1] || 'pdf';
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    // fallback: open in new tab
    window.open(fullUrl, '_blank');
  }
}
