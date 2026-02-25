# Use official Python image
FROM python:3.11-slim

# Set working directory
WORKDIR /app

RUN pip install uv

# Copy app code
COPY . .

# Expose port
EXPOSE 8000

# Run FastAPI using Uvicorn
CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]