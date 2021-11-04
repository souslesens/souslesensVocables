FROM node:16-alpine3.11

COPY . /app
WORKDIR /app

ENV USER_USERNAME="admin"
ENV USER_PASSWORD="admin"
ENV DEFAULT_SPARQL_URL="http://localhost:8890/sparql"

RUN npm ci && cd mainapp && npm ci && npm run build && cd ..
CMD sh /app/entrypoint.sh
