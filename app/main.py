from fastapi import FastAPI

app = FastAPI()


@app.get("/")
def read_root():
    return {"Hello": "World"}


@app.get("/items/{item_id}")
def read_item(item_id: int, q: str | None = None):
    return {"item_id": item_id, "q": q}


@app.get("/emails")
def read_root():
    # RETURN EMAILS
    # THREAD STACK BELOW EMAIL
    return {"Hello": "World"}


@app.get("/process_email_thread")
def read_root():
    # RETURN POSSIBLE ACTIONS (with draft placeholders)
    # actions like: refund, get order, summarize (this is always present)
    return {"Hello": "World"}


@app.get("/run_shopify_action")
def read_root():
    # RUN SHOPIFY 
    return {"Hello": "World"}
