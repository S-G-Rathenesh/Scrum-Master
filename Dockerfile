# Use Python 3.12 slim as base image
FROM python:3.12-slim

# Set working directory
WORKDIR /app

# Install system dependencies and Node.js
RUN apt-get update && apt-get install -y \
    curl \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copy backend requirements and install Python dependencies
COPY backend/requirements.txt /app/backend/
RUN pip install --no-cache-dir -r /app/backend/requirements.txt

# Copy the entire backend directory
COPY backend /app/backend

# Copy the Scrum Master agent directory (needed for subprocess)
COPY scrum-master /app/scrum-master

# Set working directory to backend
WORKDIR /app/backend

# Expose port
EXPOSE 8000

# Set environment variables
ENV PYTHONUNBUFFERED=1

# Command to run the persistent FastAPI application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
