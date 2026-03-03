import base64
import os
from datetime import datetime, timezone

from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

from app.settings import SCOPES, TOKEN_PATH


class EmailClient:
    def __init__(self):
        if not os.path.exists(TOKEN_PATH):
            raise Exception("Google token does not exist")
        creds = Credentials.from_authorized_user_file(TOKEN_PATH, SCOPES)
        self.service = build("gmail", "v1", credentials=creds)

    def fetch_emails(self, last_email_date=None):
        """
        Fetch recent threads from INBOX.
        For each thread, retrieve ALL messages (including sent replies).
        Returns a flat list of email dicts, each carrying its thread_id.
        """
        # Step 1: list recent threads in INBOX
        results = (
            self.service.users()
            .threads()
            .list(
                userId="me",
                maxResults=10,
                labelIds=["INBOX"],
                q="-label:spam -label:trash",
            )
            .execute()
        )

        threads = results.get("threads", [])
        email_data = []

        # Step 2: for each thread, fetch ALL messages inside it (incl. sent replies)
        for thread in threads:
            thread_messages = self._get_thread_messages(thread["id"])
            email_data.extend(thread_messages)

        return {"total": len(email_data), "emails": email_data}

    def _get_thread_messages(self, thread_id: str) -> list[dict]:
        """Fetch all messages belonging to a thread."""
        thread_data = (
            self.service.users()
            .threads()
            .get(userId="me", id=thread_id, format="full")
            .execute()
        )

        messages = thread_data.get("messages", [])
        return [self._parse_message(msg) for msg in messages]

    def _parse_message(self, txt: dict) -> dict:
        payload = txt.get("payload", {})
        headers = payload.get("headers", [])

        def get_header(name):
            return next(
                (h["value"] for h in headers if h["name"].lower() == name.lower()),
                None,
            )

        subject = get_header("Subject") or "No Subject"
        sender = get_header("From") or ""
        thread_id = txt.get("threadId", "")

        internal_date_ms = txt.get("internalDate")
        received_date = None
        if internal_date_ms:
            received_date = datetime.fromtimestamp(
                int(internal_date_ms) / 1000, tz=timezone.utc
            )

        body = self._extract_body(payload)

        return {
            "google_id": txt["id"],
            "thread_id": thread_id,
            "subject": subject,
            "snippet": txt.get("snippet", ""),
            "sender": sender,
            "received_date": received_date,
            "body": body,
        }

    def _extract_body(self, payload):
        """Recursively extract plain text body from payload."""
        body_data = payload.get("body", {}).get("data")
        mime_type = payload.get("mimeType", "")

        if body_data and mime_type == "text/plain":
            return base64.urlsafe_b64decode(body_data).decode("utf-8", errors="replace")

        for part in payload.get("parts", []):
            if part.get("mimeType") == "text/plain":
                data = part.get("body", {}).get("data")
                if data:
                    return base64.urlsafe_b64decode(data).decode(
                        "utf-8", errors="replace"
                    )
            if part.get("mimeType", "").startswith("multipart"):
                result = self._extract_body(part)
                if result:
                    return result

        return ""
