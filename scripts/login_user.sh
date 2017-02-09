#!/bin/bash
curl -X POST \
     -H 'Content-Type: application/json' \
     -d '{"username": "$1", "password": "$2"}' \
     localhost:3000/user/login
