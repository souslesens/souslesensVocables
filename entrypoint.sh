#! /bin/sh

# Create config files if not exists
node scripts/init_configs.js

# Run the configuration migrations
npm run migrate

# Start app
npm start
