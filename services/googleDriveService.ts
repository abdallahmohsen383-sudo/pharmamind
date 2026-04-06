import { auth } from '../firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

export const GoogleDriveService = {
  async getAccessToken(): Promise<string | null> {
    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/drive.file');
    try {
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        // Store token and expiry for automatic backups
        localStorage.setItem('gdrive_token', credential.accessToken);
        localStorage.setItem('gdrive_token_expiry', (Date.now() + 3500 * 1000).toString()); // ~1 hour
        return credential.accessToken;
      }
      return null;
    } catch (error) {
      console.error("Error getting Google Drive access token:", error);
      throw error;
    }
  },

  getStoredToken(): string | null {
    const token = localStorage.getItem('gdrive_token');
    const expiry = localStorage.getItem('gdrive_token_expiry');
    if (token && expiry && Date.now() < parseInt(expiry, 10)) {
      return token;
    }
    return null;
  },

  async uploadBackup(token: string, jsonData: string, fileName: string) {
    const metadata = {
      name: fileName,
      mimeType: 'application/json',
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', new Blob([jsonData], { type: 'application/json' }));

    const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: form,
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || 'Failed to upload to Google Drive');
    }

    return await response.json();
  }
};
