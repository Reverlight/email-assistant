import os

from httplib2 import Credentials
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

from app.settings import SCOPES, TOKEN_PATH


class EmailClient:
    def __init__(self):
        if not os.path.exists(TOKEN_PATH):
            raise Exception('Google token does not exists')
        creds = Credentials.from_authorized_user_file(TOKEN_PATH, SCOPES)
        self.service = build("gmail", "v1", credentials=creds)
    
    def fetch_emails(self, last_email_date=None):
        # Fetch emails after last email date
        query = "-label:spam -label:trash"

        results = self.service.users().messages().list(
            userId='me', 
            maxResults=10,
            labelIds=['INBOX'],
        ).execute()
        messages = results.get('messages', [])
        
        email_data = []
        
        for msg in messages:
            # 2. Fetch the detailed message content
            txt = self.service.users().messages().get(userId='me', id=msg['id']).execute()
            
            # Extract Subject from headers
            payload = txt.get("payload", {})
            headers = payload.get("headers", [])
            subject = next((h['value'] for h in headers if h['name'] == 'Subject'), "No Subject")
            
            email_data.append({
                "id": msg['id'],
                "subject": subject,
                "snippet": txt.get('snippet', '')
            })
            
        return {"total": len(email_data), "emails": email_data}