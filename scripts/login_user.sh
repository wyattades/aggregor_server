#!/bin/bash
curl -X POST \
     -H 'Content-Type: application/json' \
     -d '{"username": "spenserw", "password": "iamtestingmypassword"}' \
     localhost:3000/user/login
