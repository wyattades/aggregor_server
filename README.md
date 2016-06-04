# Aggregor Web App <img src="https://travis-ci.org/wyattades/webapp.svg?branch=master" >

Aggregor is an aggregating website that pulls feeds from other sources into a single, susinct web page

Web application prototype using Heroku &amp; NodeJS, refer to our <a href="https://realtimeboard.com/app/board/o9J_k1c4bgY=/">layout</a> for more info

  <b>Current Status:</b> creating barebones shell of user API in JS

## Configure development environment
---

### 1. Dot-env

The node module `dotenv` provides an easy way to configure environment variables to our node app. Dot-env expects a file `.env` in the root directory of the app, and there is a file `sample.env` with which to model this after. `.env` shouldn't ever be checked into VC as it may contain confidential information (passwords, private keys, etc.)

### 2. Database

1. Install and configure Postgres (https://www.postgresql.org/download/)
2. Configure `config/database.json` with database information. (https://www.npmjs.com/package/db-migrate)
4. Ensure environment variables are configured (`DB_URI`, etc.) prior to running app

#### 2.1 Migrations

Migrations can be run via the convenience scripts (`scripts/migrate_up.sh`, etc.) or directly with `db-migrate` (https://github.com/db-migrate/node-db-migrate)

#### 2.2 Seeding

The database is seeded from `config/seeds.sql`. This can be run directly through Postgres or with the convenience script `scripts/seed.sh`

!!! Don't forget to update the seed file if you change the schema !!!
