#!/bin/bash

db-migrate up --config './config/database.json' -e $NODE_ENV
