# Aggregor Web App <img src="https://travis-ci.org/wyattades/webapp.svg?branch=master" >

Aggregor is an aggregating website that pulls feeds from other sources into a single, susinct web page

Web application prototype using Heroku &amp; NodeJS, refer to our <a href="https://realtimeboard.com/app/board/o9J_k1c4bgY=/">layout</a> for more info

  <b>Current Status:</b> creating barebones shell of user API in JS

## Configure development environment
---

### Database

1. Install and configure Postgres (https://www.postgresql.org/download/)
2. Configure `config/database.json` with database information. (https://www.npmjs.com/package/db-migrate)
3. Migrate with db-migrate (`db-migrate --help`) or convenience scripts (`scripts/migrate_up.sh`, etc.)
4. Ensure environment variables are configured (`DB_URI`, etc.) prior to running app
