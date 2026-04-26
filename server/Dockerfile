FROM ghcr.io/puppeteer/puppeteer:latest

# We need to run as root to copy files and install any extra dependencies
USER root

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application code
COPY . .

# Expose port
EXPOSE 5000

# Start command
CMD ["npm", "start"]
