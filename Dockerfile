FROM node:22-alpine

# Configure and install Java
ENV JAVA_HOME=/usr/lib/jvm/java-11-openjdk
RUN apk add --update --no-cache openjdk11 git

# Install npm packages
WORKDIR /app
COPY package.json package-lock.json /app/
WORKDIR /app/mainapp
COPY mainapp/package.json /app/mainapp/
WORKDIR /app
RUN npm ci

# Install mainapp
COPY . /app
RUN npm run mainapp:build

# souslesens default config
ENV USER_USERNAME="admin"
ENV USER_PASSWORD="admin"
ENV DEFAULT_SPARQL_URL="http://localhost:8890/sparql"

# Entrypoint
CMD ["sh", "/app/entrypoint.sh"]
