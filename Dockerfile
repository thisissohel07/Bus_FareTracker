# Stage 1: Build the React Frontend
FROM node:20-alpine AS frontend-build
WORKDIR /app/client

# Copy package files and install dependencies
COPY client/package*.json ./
RUN npm install

# Copy source code and build
COPY client/ ./
RUN npm run build

# Stage 2: Build the Node.js Backend with Puppeteer
FROM ghcr.io/puppeteer/puppeteer:latest

# Run as root to allow global npm installs if needed, and to copy files
USER root
WORKDIR /app/server

# Copy server package files and install dependencies
COPY server/package*.json ./
RUN npm install

# Copy server source code
COPY server/ ./

# Copy the built React app from Stage 1 into the location the server expects
COPY --from=frontend-build /app/client/dist /app/client/dist

# Expose the API and Frontend port
EXPOSE 5000

# Start the server
CMD ["npm", "start"]
