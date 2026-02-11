#! /bin/sh

# Create config files if not exists
npm run init:files

# Run the configuration migrations
npm run migrate

# Start app
npm start
