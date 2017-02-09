#!/bin/bash
curl -X POST \
     -H 'Content-Type: application/json' \
     -d '{"username": "$1", "password": "$2", "email": "$3", "first_name": "$4", "last_name": "$5"}' \
     localhost:3000/user
