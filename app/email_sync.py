import base64
import json
import os
from datetime import datetime, timezone

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from google.oauth2.credentials import Credentials  # ✓ keep this

from app.settings import SCOPES, TOKEN_PATH


class EmailClient:
    def __init__(self):
        if not os.path.exists(TOKEN_PATH):
            raise Exception("Google token does not exists")
        creds = Credentials.from_authorized_user_file(TOKEN_PATH, SCOPES)
        self.service = build("gmail", "v1", credentials=creds)

    def get_message(self, msg):
        txt = (
            self.service.users()
            .messages()
            .get(userId="me", id=msg["id"], format="full")  # ensures body is included
            .execute()
        )

        payload = txt.get("payload", {})
        headers = payload.get("headers", [])

        # Helper to extract header by name
        def get_header(name):
            return next(
                (h["value"] for h in headers if h["name"].lower() == name.lower()),
                None,
            )

        subject = get_header("Subject") or "No Subject"
        sender = get_header("From") or ""
        date_str = get_header("Date")
        thread_id = txt.get("threadId", "")

        # Parse date
        internal_date_ms = txt.get(
            "internalDate"
        )  # comes as a string e.g. "1554492714000"
        received_date = None
        if internal_date_ms:
            received_date = datetime.fromtimestamp(
                int(internal_date_ms) / 1000, tz=timezone.utc
            )

        # Extract body text
        body = self._extract_body(payload)
        data = {
            "id": msg["id"],
            "subject": subject,
            "snippet": txt.get("snippet", ""),
            "sender": sender,
            "thread_id": thread_id,
            "received_date": received_date,
            "body": body,
        }
        return data

    def fetch_emails(self, last_email_date=None):
        query = "-label:spam -label:trash"
        results = (
            self.service.users()
            .messages()
            .list(
                userId="me",
                maxResults=10,
                labelIds=["INBOX"],
            )
            .execute()
        )

        messages = results.get("messages", [])

        email_data = []

        for msg in messages:
            data = self.get_message(msg)

            email_data.append(data)
        return {"total": len(email_data), "emails": email_data}

    def _extract_body(self, payload):
        """Recursively extract plain text body from payload."""
        # Direct body
        body_data = payload.get("body", {}).get("data")
        mime_type = payload.get("mimeType", "")

        if body_data and mime_type == "text/plain":
            return base64.urlsafe_b64decode(body_data).decode("utf-8", errors="replace")

        # Multipart — recurse into parts
        for part in payload.get("parts", []):
            if part.get("mimeType") == "text/plain":
                data = part.get("body", {}).get("data")
                if data:
                    return base64.urlsafe_b64decode(data).decode(
                        "utf-8", errors="replace"
                    )
            # Nested multipart
            if part.get("mimeType", "").startswith("multipart"):
                result = self._extract_body(part)
                if result:
                    return result

        return ""
