FROM node:18-alpine

# Configure and install Java
ENV JAVA_HOME=/usr/lib/jvm/java-11-openjdk
RUN apk add --update --no-cache openjdk11

# Install npm packages
WORKDIR /app
COPY package.json package-lock.json /app
RUN npm ci
WORKDIR /app/mainapp
COPY mainapp/package.json mainapp/package-lock.json /app/mainapp
RUN npm ci

# Install mainapp
COPY . /app
RUN npm run build

# souslesens default config
ENV USER_USERNAME="admin"
ENV USER_PASSWORD="admin"
ENV DEFAULT_SPARQL_URL="http://localhost:8890/sparql"

# Entrypoint
WORKDIR /app
CMD sh /app/entrypoint.sh
