#!/bin/sh
sudo --user=postgres dropdb aggregor
sudo --user=postgres createdb aggregor -O aggregor
sudo --user=postgres psql -c 'CREATE EXTENSION pgcrypto;' aggregor

node scripts/migrate_up.js
