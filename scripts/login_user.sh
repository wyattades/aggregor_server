#!/bin/bash
curl -X POST \
     -H 'Content-Type: application/json' \
     -d '{"username": "spenserw", "password": "1234"}' \
     localhost:3000/user/login
