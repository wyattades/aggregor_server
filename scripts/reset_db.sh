#!/bin/sh
sudo --user=postgres dropdb aggregor
sudo --user=postgres createdb aggregor -O aggregor

node scripts/migrate_up.js
