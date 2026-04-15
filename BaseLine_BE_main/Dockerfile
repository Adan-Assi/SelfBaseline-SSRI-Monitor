# 1. Use a lightweight Python base image
FROM python:3.10-slim

# 2. Set the working directory inside the container
WORKDIR /app

# 3. Copy the requirements file first (for caching speed)
COPY requirements.txt .

# 4. Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# 5. Copy the rest of your application code (including .env)
COPY . .

# 6. Open the port specifically for Cloud Run
ENV PORT=8080

# 7. Start the server using the $PORT environment variable
CMD exec uvicorn main:app --host 0.0.0.0 --port $PORT