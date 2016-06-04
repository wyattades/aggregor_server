#!/bin/bash

db-migrate down --config './config/database.json' -e $NODE_ENV
