# Base image with Node.js
FROM node:20-slim

# Install dependencies, Ghostscript, QPDF, and LibreOffice
RUN apt-get update && apt-get install -y ghostscript qpdf libreoffice && rm -rf /var/lib/apt/lists/*

# Set up working directory
WORKDIR /app

# Copy code and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the application
COPY . .

# Build the production bundle
RUN npm run build

# Start the Vinxi/TanStack Start production server
EXPOSE 3000
CMD ["npm", "run", "start"]
