import os

from fastapi import FastAPI
from httplib2 import Credentials
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError


app = FastAPI()


@app.get("/")
def read_root():
    return {"Hello": "World"}


@app.get("/items/{item_id}")
def read_item(item_id: int, q: str | None = None):
    return {"item_id": item_id, "q": q}



@app.get("/emails")
def read_root():
    """Shows basic usage of the Gmail API. Lists the user's Gmail labels."""
    
    SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"]
    TOKEN_PATH = "google-token.json"
    creds = None

    # 1. Try to load the TOKEN (User session)
    if os.path.exists(TOKEN_PATH):
        creds = Credentials.from_authorized_user_file(TOKEN_PATH, SCOPES)

    # 2. If TOKEN is missing, invalid, or expired, we must get a new one
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            # This part uses your .env variables to start the login process
            client_config = {
                "installed": {
                    "client_id": os.getenv("GOOGLE_CLIENT_ID"),
                    "client_secret": os.getenv("GOOGLE_CLIENT_SECRET"),
                    "project_id": os.getenv("GOOGLE_PROJECT_ID"),
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                }
            }
            flow = InstalledAppFlow.from_client_config(client_config, SCOPES)
            # This will open your browser!
            creds = flow.run_local_server(
            host='0.0.0.0', 
            port=8080, 
            open_browser=False, # STOP THE HANGING
            success_message='Success! You can close this tab.'
        )

        # 3. NOW we save the real token file
        with open(TOKEN_PATH, "w") as token:
            token.write(creds.to_json())

    # Call the Gmail API
    service = build("gmail", "v1", credentials=creds)
    results = service.users().messages().list(userId='me', maxResults=10).execute()
    messages = results.get('messages', [])
    
    email_data = []
    
    for msg in messages:
        # 2. Fetch the detailed message content
        txt = service.users().messages().get(userId='me', id=msg['id']).execute()
        
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



@app.get("/process_email_thread")
def read_root():
    # RETURN POSSIBLE ACTIONS (with draft placeholders)
    # actions like: refund, get order, summarize (this is always present)
    return {"Hello": "World"}


@app.get("/run_shopify_action")
def read_root():
    # RUN SHOPIFY 
    return {"Hello": "World"}
