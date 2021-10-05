FROM node:16-alpine3.11

COPY . /app
WORKDIR /app

# Init config
RUN cp config/users/users.json.default config/users/users.json && \
    cp config/profiles.json.default config/profiles.json && \
    cp config/sources.json.default config/sources.json && \
    cp config/blenderSources.json.default config/blenderSources.json && \
    cp config/mainConfig.json.default config/mainConfig.json

RUN npm ci
CMD npm start
