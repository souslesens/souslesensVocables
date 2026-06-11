FROM node:22-alpine

# Configure and install Java
ENV JAVA_HOME=/usr/lib/jvm/java-11-openjdk
# chromium + font/render libs: required by the admin snapshots feature (Playwright). Playwright ships no
# musl/Alpine browser build, so we use the distro Chromium and skip Playwright's browser download below.
RUN apk add --update --no-cache openjdk11 git chromium nss freetype harfbuzz ca-certificates ttf-freefont

# Snapshot feature (api/v1/admin/snapshots): use the Alpine system Chromium instead of the
# Playwright-managed browser. PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH also signals the route to pass
# --no-sandbox (needed when Chromium runs as root in the container).
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium-browser

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
